import { getOpenAIProvider } from '#ai/openai.js';

export async function basicCompletionRequest({
	key,
	systemPrompt,
	userPrompt,
	model = 'gpt-4-turbo'
}) {
	const result = await getOpenAIProvider(key).chat.completions.create({
		model,
		messages: [
			{
				role: 'system',
				content: systemPrompt
			},
			{
				role: 'user',
				content: userPrompt
			}
		]
	});
	const { usage, choices } = result;
	return { text: choices[0]?.message?.content, usage };
}
