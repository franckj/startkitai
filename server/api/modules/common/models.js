import { getOpenAIProvider } from '#ai/openai';

export async function getModels({ key } = {}) {
	const client = getOpenAIProvider(key);
	const list = await client.models.list();
	return list;
}

export async function isModelAvailable({ key, model }) {
	const client = getOpenAIProvider(key);
	const m = await client.models.retrieve(model);
	return !!m;
}
