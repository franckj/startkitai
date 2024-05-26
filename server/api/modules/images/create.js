import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

import { getConfigFile } from '#helpers/configs.js';
import { uploadResponseImages } from '#helpers/storage.js';

const imageSettings = getConfigFile('prompts/images.yml');

/**
 * Generates an image based on the given prompt using OpenAI's image generation.
 *
 * @param {Object} params - The parameters for image generation.
 * @param {string} params.prompt - The text prompt to generate the image from.
 * @param {string} params.userUuid - The UUID of the user requesting the image.
 * @param {string} params.key - The API key for accessing the OpenAI provider.
 * @returns {Promise<Object>} A promise that resolves to an object containing the revised prompt, the URL of the generated image, and usage information.
 */
export async function createImageFromPrompt({ prompt, userUuid, upload = true, key }) {
	const { models, options } = imageSettings;
	const { quality = 'standard', size = '1024x1024' } = options;
	const client = getOpenAIProvider(key);

	const output = await retryWithFallbacks(
		async (model) => {
			const imageResponse = await client.images.generate({
				model,
				prompt,
				...options,
				user: userUuid
			});
			return {
				model,
				...imageResponse
			};
		},
		{
			models
		}
	);

	const images = upload ? await uploadResponseImages(output, { userUuid }) : output.data;
	return {
		images,
		usage: {
			model: output.model,
			size,
			quality
		}
	};
}
