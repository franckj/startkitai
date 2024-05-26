import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

import { getConfigFile } from '#helpers/configs.js';
import { toFile } from 'openai';
import { uploadResponseImages } from '#helpers/storage.js';

const imageSettings = getConfigFile('prompts/images.yml');

/**
 * Creates an inpainting using OpenAI's images.edit method and uploads the resulting image to long-term storage.
 *
 * @param {Object} params - The parameters for creating an inpainting.
 * @param {string} params.key - The API key
 * @param {Object} params.user - The user object containing details about the user.
 * @param {string} params.originalImage - The original image data in base64 encoding.
 * @param {string} params.imageMask - The image mask data in base64 encoding, defining areas to inpaint.
 * @param {string} params.prompt - The prompt describing the desired inpainting result.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of objects containing the revised prompt and the public URL of the uploaded inpainted image.
 */
export async function createInpainting({
	key,
	user,
	originalImage,
	imageMask,
	prompt,
	upload = true
}) {
	const client = getOpenAIProvider(key);
	const { editModels, options } = imageSettings;

	const image = await toFile(originalImage[0].buffer);
	const mask = await toFile(imageMask[0].buffer);
	const output = await retryWithFallbacks(
		async (model) => {
			const imageOutput = await client.images.edit({
				image,
				mask,
				prompt: prompt,
				user: user.uuid,
				size: '1024x1024',
				model
			});
			return {
				model,
				...imageOutput
			};
		},
		{
			models: editModels
		}
	);

	const images = upload ? await uploadResponseImages(output, { userUuid: user.uuid }) : output.data;
	return {
		images,
		usage: {
			model: output.model,
			size: options.size,
			quality: options.quality
		}
	};
}

export async function createVariation({ key, user, upload = true, originalImage }) {
	const client = getOpenAIProvider(key);
	const { editModels, options } = imageSettings;

	const image = await toFile(originalImage.buffer);
	const output = await retryWithFallbacks(
		async (model) => {
			const imageOutput = await client.images.createVariation({
				image,
				user: user.uuid,
				size: '1024x1024',
				model
			});
			return {
				model,
				...imageOutput
			};
		},
		{
			models: editModels
		}
	);

	const images = upload ? await uploadResponseImages(output, { userUuid: user.uuid }) : output.data;
	return {
		images,
		usage: {
			model: output.model,
			size: options.size,
			quality: options.quality
		}
	};
}
