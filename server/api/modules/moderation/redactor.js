import { generateCompletionsReply } from '#api/modules/chat/completions.js';
import { getConfigFile } from '#helpers/configs.js';

const redactSettings = getConfigFile('prompts/moderation/redactor.yml');

export async function redactText({ text, user, key }) {
	const messages = [
		{ role: 'system', content: redactSettings.systemPrompt },
		{ role: 'user', content: text }
	];
	const { result, usage } = await generateCompletionsReply({
		options: {
			...redactSettings.options,
			messages
		},
		models: redactSettings.models,
		user,
		key
	});
	return { result, usage };
}
