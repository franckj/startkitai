import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

/**
 * Basic function to call the chat completions API
 * with a simple prompt.
 *
 * No chat history, no bells and whistles. Just for doing simple calls.
 *
 */
export async function generateCompletionsReply({ models, options, user, key }) {
	const client = getOpenAIProvider(key);
	const output = await retryWithFallbacks(
		async (model) => {
			return {
				...(await client.chat.completions.create({
					...options,
					model,
					user: user.uuid
				})),
				model
			};
		},
		{
			models
		}
	);

	const { usage, choices, model } = output;
	const { prompt_tokens, completion_tokens } = usage;
	let result = choices[0]?.message?.content;
	if (options.response_format.type === 'json_object') {
		result = JSON.parse(result);
	}
	return {
		result,
		usage: [
			{
				model,
				promptTokens: prompt_tokens,
				completionTokens: completion_tokens
			}
		]
	};
}
