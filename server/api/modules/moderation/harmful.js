import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

import EventEmitter from 'events';
import { getConfigFile } from '#helpers/configs.js';
import { parallel } from '#helpers/llm-async.js';
import { splitIntoLogicalChunks } from '#api/modules/common/chunks.js';

const moderationSettings = getConfigFile('prompts/moderation/harmful.yml');

/**
 * Checks if a given text is harmful.
 * The function splits the text into chunks and checks each chunk for harmful content.
 *
 * @param {Object} params - The parameters for this function.
 * @param {string} params.text - The text to be analyzed for harmful content.
 * @param {Object} params.user - The user object, containing at least the UUID.
 * @param {string} params.key - The API key for the OpenAI provider.
 * @returns {Promise<Object>} An object containing two properties: `flagged` (a boolean indicating if any harmful content was detected) and `categories` (an array of strings representing the categories of detected harmful content).
 */
export async function isTextHarmful({ text, user, key }) {
	const client = getOpenAIProvider(key);

	const chunks = splitIntoLogicalChunks(text, moderationSettings.chunk_size);

	const outputs = await parallel(
		new EventEmitter(),
		chunks.map(() => {
			return retryWithFallbacks(
				(model) => {
					return client.moderations.create({
						input: text,
						model,
						user: user.uuid
					});
				},
				{
					models: moderationSettings.models
				}
			);
		})
	);

	const { flagged, categories } = outputs.reduce(
		(out, result) => {
			const { results } = result;
			if (!results.length) {
				return out;
			}

			const { categories, flagged } = results[0];
			if (flagged) {
				return {
					...out,
					flagged: true,
					categories: Object.keys(categories)
						.filter((c) => moderationSettings.categories.includes(c))
						.reduce((out, key) => (categories[key] ? [...out, key] : out), [])
				};
			}

			return out;
		},
		{
			flagged: false,
			categories: []
		}
	);
	return { flagged, categories: [...new Set(categories)] };
}

export function getCategories() {
	return moderationSettings.categories;
}
