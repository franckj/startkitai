import { createInpainting, createVariation } from './edit.js';
import usageLimiter, { createUsageResponse } from '#api/middleware/usage-limiter.js';

import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import { createImageFromPrompt } from './create.js';
import fileUploadMiddleware from '#api/middleware/file-upload.js';
import { identifyImage } from './identify.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';

/**
 * The Images API - Because everything looks better with images!
 *
 * {@link http://localhost:1337/api#tag/Images}
 */
const imageRouter = router();

const upload = fileUploadMiddleware({ dir: 'images', deleteAfterRequest: true, field: 'image' });

const imageMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 }),
	// start: usage-limits
	usageLimiter('image')
	// end: usage-limits
]);

imageRouter.post('/api/images/create', imageMiddleware, async (ctx) => {
	const { body, user, key } = ctx.request;
	const { prompt } = body;
	if (!prompt) {
		ctx.throw(400, 'Prompt is required');
	}

	const { images, usage } = await createImageFromPrompt({
		prompt: prompt,
		userUuid: user.uuid,
		key
	});
	const usageResponse = createUsageResponse(ctx, usage);
	ctx.body = { images, usage: usageResponse };
});

imageRouter.post('/api/images/detect', imageMiddleware, upload, async (ctx) => {
	const { body, key, user } = ctx.request;
	const image = ctx.file;
	const { prompt } = body;
	if (!image) {
		ctx.throw(400, 'An image is required');
	}
	if (!prompt) {
		ctx.throw(400, 'Prompt is required');
	}

	const { location } = image;
	const output = await identifyImage({
		imageUrl: location,
		userUuid: user.uuid,
		prompt,
		key
	});

	const usageResponse = createUsageResponse(ctx, output.usage);

	ctx.body = {
		result: output.result,
		usage: usageResponse
	};
});

/**
 * Endpoint for creating variations on an image.
 *
 * It accepts a single image and returns one or more variations.
 */
imageRouter.post(
	'/api/images/variation',
	imageMiddleware,
	fileUploadMiddleware({
		noSave: true,
		field: 'image',
		maxFileSize: '4mb'
	}),
	async (ctx) => {
		const { user, key } = ctx.request;
		const image = ctx.file;
		if (!image) {
			ctx.throw(400, 'An image file is required');
		}
		const { images, usage } = await createVariation({
			key,
			user,
			originalImage: image
		});

		const usageResponse = createUsageResponse(ctx, [usage]);

		ctx.body = {
			images,
			usage: usageResponse
		};
	}
);

/**
 * Endpoint for creating outpaintings.
 * Outpaintings are for filling in the area *around* an image
 *
 * It accepts a single image and a prompt to guide the outpainting
 * process.
 *
 */
imageRouter.post(
	'/api/images/outpainting',
	imageMiddleware,
	fileUploadMiddleware({
		noSave: true,
		field: 'image',
		maxFileSize: '4mb'
	}),
	async (ctx) => {
		const { body, key, user } = ctx.request;
		const { prompt } = body;
		const image = ctx.file;
		if (!image) {
			ctx.throw(400, 'An image file is required');
		}
		if (!prompt) {
			ctx.throw(400, 'Prompt is required');
		}
		// an outpainting is just an inpainting with the
		// same image as both the original and mask
		const { images, usage } = await createInpainting({
			key,
			user,
			originalImage: [image],
			imageMask: [image],
			prompt
		});

		const usageResponse = createUsageResponse(ctx, [usage]);

		ctx.body = {
			images,
			usage: usageResponse
		};
	}
);

/**
 * Endpoint for creating inpaintings
 * Inpaintings are for changing something inside an image.
 *
 * They're very good for eg, removing something from an image
 *
 * It accepts the image to change, a mask, and a prompt.
 * The transparent areas of the mask indicate where the image should
 * be edited, and the prompt should describe the full new image,
 * not just the erased area.
 *
 * @see OpenAI docs for more info: {@link https://platform.openai.com/docs/guides/images/edits-dall-e-2-only}
 */
imageRouter.post(
	'/api/images/inpainting',
	imageMiddleware,
	fileUploadMiddleware({
		noSave: true,
		fields: ['image', 'mask'],
		maxFileSize: '4mb'
	}),
	async (ctx) => {
		const { body, key, user } = ctx.request;
		const { image, mask } = ctx.files;
		const { prompt } = body;
		if (!image || !mask) {
			ctx.throw(400, 'An image and a mask are required');
		}
		if (!prompt) {
			ctx.throw(400, 'Prompt is required');
		}

		const { images, usage } = await createInpainting({
			key,
			user,
			originalImage: image,
			imageMask: mask,
			prompt
		});

		const usageResponse = createUsageResponse(ctx, [usage]);

		ctx.body = {
			images,
			usage: usageResponse
		};
	}
);

export default imageRouter;
