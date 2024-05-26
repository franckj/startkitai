import { generateCompletionsReply } from '#api/modules/chat/completions.js';
import { getConfigFile } from '#helpers/configs.js';

const sentimentSettings = getConfigFile('prompts/moderation/sentiment.yml');

export async function getSentiment({ text, user, key }) {
	const messages = [
		{ role: 'system', content: sentimentSettings.systemPrompt },
		{ role: 'user', content: text }
	];
	const { result, usage } = await generateCompletionsReply({
		options: {
			...sentimentSettings.options,
			messages
		},
		models: sentimentSettings.models,
		user,
		key
	});
	return { result, usage };
}
