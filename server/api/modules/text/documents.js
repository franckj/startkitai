import { parallel, waterfall } from '#helpers/llm-async.js';

import EventEmitter from 'events';
import { chatRequestWithTools } from '#api/modules/chat/chat.js';
import { createLogger } from '#helpers/logger.js';
import createTextFunctions from './functions.js';
import { tools as documentAnalysisTools } from './tools.js';
import { getConfigFile } from '#helpers/configs.js';
import { getOpenAIProvider } from '#ai/openai.js';
import { getReadableTextFromURL } from '#helpers/crawler.js';

const logger = createLogger('text');
const textOptions = getConfigFile('prompts/text.yml');

// Work In Progress: Jivings, need to get usage working for this
export async function generateTextReply({ prompt, /*user,*/ key, sources }) {
	const emitter = new EventEmitter();

	// there are three steps that work best for creating a piece of
	// long form content. Using our "waterfall", we pass the result of
	// each step into the prompt of the next one
	waterfall(emitter, [
		// step 1, summarizing the sources
		() => {
			return parallel(
				emitter,
				sources.map(async function (source) {
					return {
						step: 1,
						stream: await summarizeTextFromUrl({ url: source, prompt, key }),
						meta: { source }
					};
				})
			);
		},
		// step 2, creating a content outline using the sources
		(summaries) => {
			return createOutline({ summaries, prompt, key });
		},
		// step 3, creating the final post using the outline and sources
		(summaries, outline) => {
			// the result is only the output from the ai
			// so we want to add the sources back onto the summary prompts
			// so the final post can use the proper references
			const sourceSummaries = summaries.map((s, i) => ({ source: sources[i], summary: s }));
			return createPost({
				prompt,
				sources: sourceSummaries,
				outline,
				key
			});
		}
	]).then(() => {
		emitter.emit('data', { type: 'result', data: {} });
	});

	return emitter;
}

export async function summarizeTextFromUrl({ url, prompt, key }) {
	const content = await getReadableTextFromURL(url);
	return await summarizeText(content, prompt, key);
}

async function createPost({ prompt, sources, outline, key }) {
	return await getOpenAIProvider(key).chat.completions.create({
		model: 'gpt-4-turbo',
		messages: [
			{
				role: 'system',
				content:
					'You are an expert blogger, you will be provided with an outline for a long-form blog post. As well as a set of general instructions on what kind of post to create.'
			},
			{
				role: 'user',
				content: [
					`Here's a description from your manager of the blog post you need to write:\n${prompt}`,
					`Here's some summarized background info from your researcher:\n${sources
						.map((s) => {
							return `Source: ${s.source}\nSummary: ${s.summary}`;
						})
						.join('\n')}`,
					`Here's an outline of the blog post from your researcher:\n${outline}`
				].join('\n\n')
			}
		],
		stream: true
	});
}

export async function createOutline({ summaries, prompt, key }) {
	try {
		let systemPrompt = [
			`You will be given summaries of text articles, your job is to create an outline of a long-form text post (like a blog post) that will be created using this outline`,
			`These parts will be given a source for an LLM to write a piece of long-form content, not read by a human, so no need to make it formatted nicely.`,
			`Remember you are not creating the long-form content, just creating an outline for later.`
		];
		if (prompt) {
			systemPrompt = [
				...systemPrompt,
				'The resulting long form content will be created with the following prompt, so focus on these areas for your outline:',
				prompt
			];
		}
		const userPrompt = summaries.join('\n\n');

		return await getOpenAIProvider(key).chat.completions.create({
			model: 'gpt-4-turbo',
			stream: true,
			messages: [
				{
					role: 'system',
					content: systemPrompt.join('\n')
				},
				{
					role: 'user',
					content: userPrompt
				}
			]
		});
	} catch (err) {
		logger.error(err.message);
		return 'Creating outline failed';
	}
}

export async function summarizeText(text, prompt, key) {
	try {
		let systemPrompt = [
			`You summarize text into its important parts. The text might be from a website or document.`,
			`These parts will be given a source for an LLM to write a piece of long-form content, not read by a human, so no need to make it formatted nicely.`,
			`Remember you are not creating the long-form content, just summarizing it for later.`
		];
		if (prompt) {
			systemPrompt = [
				...systemPrompt,
				'The resulting long form content will be created with the following prompt, so focus on these areas for your summarization:',
				prompt
			];
		}
		return await getOpenAIProvider(key).chat.completions.create({
			model: 'gpt-4-turbo',
			stream: true,
			messages: [
				{
					role: 'system',
					content: systemPrompt.join('\n')
				},
				{
					role: 'user',
					content: text
				}
			]
		});
	} catch (err) {
		logger.error(err.message);
		return 'Creating summary failed';
	}
}

export async function* queryOnAllDocuments({
	user,
	documents,
	description,
	query,
	key,
	contextId
}) {
	const documentAnalysisFunctions = createTextFunctions({
		contextId,
		documents,
		userUuid: user.uuid,
		namespaces: ['global']
	});
	let systemPrompt = textOptions.prompts.system
		.replace('{numberOfDocuments}', documents.length)
		.replace('{description}', description);
	let userPrompt = textOptions.prompts.user.replace('{query}', query);
	let output = [];

	for await (let message of chatRequestWithTools({
		tools: documentAnalysisTools,
		functions: documentAnalysisFunctions,
		user,
		key,
		requestOptions: {
			...textOptions.options,
			model: textOptions.models[0]
		},
		systemPrompt,
		userPrompt
	})) {
		yield message;
	}

	return output;
}
