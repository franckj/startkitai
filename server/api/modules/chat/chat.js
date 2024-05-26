import { tools as chatTools, ragTools } from './tools.js';
import { getChatHistory, saveChatHistory } from '#database/chat-history.js';
import { getMaxTokensRemaining, truncateChatForModel } from '#helpers/tokens.js';
import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

import { createLogger } from '#helpers/logger.js';
import { getConfigFile } from '#helpers/configs.js';
import getFunctions from './functions.js';

const logger = createLogger('chat');
const chatOptions = getConfigFile('prompts/chat.yml');

/**
 * Generates a chat reply.
 * We provide our default set of chat tools that enable web-crawling, fetching from the vector db,
 * and retreiving YouTube transcripts, and then delegate to `chatRequestWithTools`
 *
 * @async
 * @function generateChatReply
 * @param {Object} options - Options for generating the chat reply.
 * @param {string|Object} options.content - User input text to respond to.
 * @param {string} options.chatUuid - The unique identifier for the chat session.
 * @param {Object} options.user - The user object involved in the chat session.
 * @param {string} options.key - API key for authenticating with the service provider.
 * @param {Array<string>} [options.contextIds=[]] - Optional context identifiers for fetching related data.
 * @returns {AsyncGenerator} The async generator returned from `chatRequestWithTools`.
 */
export async function generateChatReply({
	text,
	images = [],
	chatUuid,
	user,
	key,
	contextIds = []
}) {
	let systemPrompt = chatOptions.prompts.system ?? '';
	let userPromptText = chatOptions.prompts.user ?? '';
	let userPrompt;
	let toolChoice = chatOptions.force_tool_choice;
	// the tools that we'll be using for this chat query
	let tools = [...chatTools, ...ragTools];
	// if context IDs are provided then add the tool that fetches data
	// from our vector database
	if (contextIds.length) {
		const promptWithContext = chatOptions.prompts.with_context.replace(
			'{contextSize}',
			contextIds.length
		);
		systemPrompt = [systemPrompt, promptWithContext].join('\n');
		if (chatOptions.force_tool_rag) {
			toolChoice = 'fetchRAGContext';
		}
	}

	// if there's a template in the prompt to put
	// the content then insert it
	if (userPromptText.includes('{content}')) {
		userPromptText = userPromptText.replace('{content}', text);
	}
	// content can be an array for vision requests with an image
	if (images.length) {
		userPrompt = [
			{
				type: 'text',
				text: userPromptText
			},
			...images.map(({ url }) => ({
				type: 'image_url',
				image_url: {
					url,
					detail: 'auto'
				}
			}))
		];
	} else {
		userPrompt = userPromptText;
	}

	const options = {
		top_p: 1,
		...chatOptions.options
	};

	return chatRequestWithTools({
		key,
		requestOptions: options,
		tools,
		toolChoice,
		images,
		functions: getFunctions({ contextIds, userUuid: user.uuid }),
		user,
		chatUuid,
		systemPrompt,
		userPrompt
	});
}

/**
 * Asynchronously generates chat responses, yielding metadata and content.
 * You can provide external `tools` for the AI to call when required
 *
 * @see https://startkit.ai/docs/api/chat for more info
 *
 * @generator
 * @function chatRequestWithTools
 * @param {Object} options - The options for the chat request.
 * @param {string} options.key - API key for the service provider.
 * @param {Array} [options.tools=[]] - List of tools to be used in the chat.
 * @param {Object} [options.functions={}] - Object containing functions related to the tools.
 * @param {Object} options.requestOptions - Options for customizing the request.
 * @param {Object} options.user - The user object containing at least a uuid.
 * @param {string} options.chatUuid - The unique identifier for the chat session.
 * @param {string} options.systemPrompt - The system's initial prompt message.
 * @param {string} options.userPrompt - The user's initial input message.
 * @yields {Object} Yields an object with type and data properties, indicating the nature of the yielded value (e.g., 'metadata', 'content', 'result').
 */
export async function* chatRequestWithTools({
	key,
	tools = [],
	functions = {},
	toolChoice = chatOptions.force_tool_choice ?? 'auto',
	requestOptions,
	user,
	chatUuid,
	systemPrompt,
	userPrompt
}) {
	try {
		// fetch the chat history from the database
		const history = chatUuid ? await getChatHistory({ userUuid: user.uuid, chatUuid }) : [];
		let newMessages = [
			{
				role: 'user',
				content: userPrompt
			}
		];
		let prevMessages = [
			...(history.length > 0
				? history
				: [
						{
							role: 'system',
							content: systemPrompt
						}
					])
		];
		let opts = { ...requestOptions };

		let promptTokens = 0;
		let completionTokens = 0;
		let totalTokens = 0;

		let hasSentMeta = false;
		let toolsUsage = [];
		let modelUsed;
		const client = getOpenAIProvider(key);
		// Each request to the AI might return an array of tools
		// that need to be called in sequence, we keep iterating
		// over the tools making requests to the AI until there
		// are no more tools to call
		while (true) {
			const stream = await retryWithFallbacks(
				(model) => {
					modelUsed = model;
					let allMessages = truncateChatForModel([...prevMessages, ...newMessages], model);
					// promptTokens += getTokenSize(allMessages, { images });
					// if the user has provided a maxTokens param
					// then use that or the remainingTokens, whichever
					// is bigger
					const remainingTokens = getMaxTokensRemaining(promptTokens, model);
					// you can force GPT to use a specific tool, but we only want it
					// to use it on the first message, otherwise it will keep calling
					// it over and over
					let useToolChoice = 'auto';
					if (toolChoice && newMessages.length === 1 && toolChoice !== 'auto') {
						useToolChoice = { type: 'function', function: { name: toolChoice } };
					}

					// make the request to openai
					return client.chat.completions.create({
						...opts,
						max_tokens: Math.min(requestOptions.maxTokens ?? Infinity, remainingTokens),
						model,
						messages: allMessages,
						tools,
						tool_choice: useToolChoice,
						stream: true,
						stream_options: {
							include_usage: true
						}
					});
				},
				{
					models: chatOptions.models
				}
			);

			let message = {};

			// begin streaming the response
			for await (const chunk of stream) {
				// the last message contains the usage info
				if (chunk.usage) {
					promptTokens += chunk.usage.prompt_tokens;
					completionTokens += chunk.usage.completion_tokens;
					totalTokens += chunk.usage.total_tokens;
				} else {
					message = messageReducer(message, chunk);
					// if we've already parsed tools the response
					// then send the details back to the client
					if (!hasSentMeta && !message.tool_calls) {
						hasSentMeta = true;
						yield { type: 'metadata', data: {} };
					}
					const content = chunk.choices[0]?.delta?.content || '';
					if (content) {
						// pass the chunk of content back to the client
						yield { type: 'content', data: content };
					}
				}
			}
			// add the reply to the current history
			newMessages.push(message);

			// if there are tools to call then lets do it!
			if (message.tool_calls) {
				let metadata = { tools: [] };
				for (const toolCall of message.tool_calls) {
					// call the tool
					const results = await callTool(toolCall, { functions, key });

					for (let result of results) {
						const newMessage = {
							tool_call_id: toolCall.id,
							role: 'tool',
							name: result.fnName,
							content: JSON.stringify(result.data)
						};
						// add the tools reply to the current history
						newMessages.push(newMessage);
						if (result.usage) {
							toolsUsage.push({ ...result.usage, tool: true });
						}

						metadata.tools.push({
							name: result.fnName,
							args: JSON.stringify(result.arguments),
							usage: result.usage
						});
					}
				}

				yield { type: 'metadata', data: metadata };
				hasSentMeta = true;
			} else {
				break;
			}
		}

		logger.info(`Generated chat reply (${completionTokens} tokens)`);

		// save the new history to the database
		const isNew = await saveChatHistory({
			userUuid: user.uuid,
			chatUuid,
			newMessages
		});

		yield {
			type: 'result',
			data: {
				chatUuid: isNew ? isNew.uuid : chatUuid,
				usage: [
					{
						promptTokens,
						completionTokens,
						totalTokens,
						model: modelUsed
					},
					...toolsUsage
				]
			}
		};
	} catch (err) {
		yield { type: 'error', data: err };
	}
}

function messageReducer(previous, item) {
	const reduce = (acc, delta) => {
		acc = { ...acc };
		for (const [key, value] of Object.entries(delta)) {
			if (acc[key] === undefined || acc[key] === null) {
				acc[key] = value;
				if (Array.isArray(acc[key])) {
					for (const arr of acc[key]) {
						delete arr.index;
					}
				}
			} else if (typeof acc[key] === 'string' && typeof value === 'string') {
				acc[key] += value;
			} else if (typeof acc[key] === 'number' && typeof value === 'number') {
				acc[key] = value;
			} else if (Array.isArray(acc[key]) && Array.isArray(value)) {
				const accArray = acc[key];
				for (let i = 0; i < value.length; i++) {
					const { index, ...chunkTool } = value[i];
					if (index - accArray.length > 1) {
						throw new Error(
							`Error: An array has an empty value when tool_calls are constructed. tool_calls: ${accArray}; tool: ${value}`
						);
					}
					accArray[index] = reduce(accArray[index], chunkTool);
				}
			} else if (typeof acc[key] === 'object' && typeof value === 'object') {
				acc[key] = reduce(acc[key], value);
			}
		}
		return acc;
	};
	return reduce(previous, item.choices[0]?.delta);
}

async function callTool(tool_call, { key, functions }) {
	if (tool_call.type !== 'function') throw new Error('Unexpected tool_call type:' + tool_call.type);
	const args = JSON.parse(tool_call.function.arguments);
	const fnName = tool_call.function.name;
	let results = [];
	try {
		if (fnName === 'multi_tool_use.parallel') {
			// undocumented feature to execute multiple tools at once
			logger.info(`executing multi-tool functions in parallel`);
			const { tool_uses } = args;
			results = await Promise.all(
				tool_uses.map(async ({ recipient_name, parameters }) => {
					logger.info(`calling function ${recipient_name}(${JSON.stringify(parameters)})`);
					const fnName = recipient_name.split('.')[1];
					if (!functions[fnName]) {
						logger.warn(`No function with name "${fnName}" found`);
						return null;
					}
					const { result, usage } = await functions[fnName]({ ...parameters, key });
					return { data: result, arguments: parameters, fnName, usage };
				})
			);
			return results;
		} else {
			// call a single function
			if (!functions[fnName]) {
				throw new Error(`No function with name "${fnName}" found`);
			}
			logger.info(`calling function ${fnName}(${tool_call.function.arguments})`);
			const { result, usage } = await functions[fnName]({ ...args, key });
			results.push({ data: result, fnName, arguments: args, usage: usage });
		}

		// make sure always to return a cost, in case the callTool
		// does another API request that costs money
		return results;
	} catch (err) {
		logger.error(`Problem calling tool function`);
		logger.error(err);
		return [
			{
				data: `Problem calling tool function - ${err.message}`,
				fnName,
				arguments: args,
				usage: {}
			}
		];
	}
}
