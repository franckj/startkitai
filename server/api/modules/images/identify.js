import { getConfigFile } from '#helpers/configs.js';
import { getOpenAIProvider } from '#ai/openai.js';

const visionSettings = getConfigFile('prompts/vision.yml');

export async function identifyImage({ imageUrl, prompt = visionSettings.prompts.user, key }) {
	const { model, options } = visionSettings;
	const { detail } = options;
	const messages = [
		{
			role: 'user',
			content: [
				{ type: 'text', text: prompt ?? '' },
				{
					type: 'image_url',
					image_url: {
						url: imageUrl,
						detail
					}
				}
			]
		}
	];
	const response = await getOpenAIProvider(key).chat.completions.create({
		messages,
		model
	});
	const { usage, choices } = response;
	return {
		result: choices[0]?.message?.content ?? '',
		usage: [
			{
				model,
				promptTokens: usage.prompt_tokens,
				completionTokens: usage.completion_tokens
			}
		]
	};
}
