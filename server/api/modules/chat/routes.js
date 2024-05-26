import { getChatHistory, markHistorySharable } from '#database/chat-history.js';
import { isStorageEnabled, uploadRawFileToStorage } from '#helpers/storage.js';

import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import { createLogger } from '#helpers/logger.js';
import { generateChatReply } from './chat.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';
import { streamedResponse } from '#api/middleware/stream-events.js';
import usageLimiter from '#api/middleware/usage-limiter.js';

const logger = createLogger('chat');

/**
 * The Chat API - The core of all AI products!
 *
 * {@link http://localhost:1337/api#tag/Chat}
 */
const chatRouter = router();

const chatMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 }),
	// start: usage-limits
	usageLimiter('chat')
	// end: usage-limits
]);

/**
 * @route POST /api/chat
 *
 * Endpoint for initiating a chat session with options for server-sent events.
 * For more information, see {@link https://startkit.ai/docs/advanced/streaming|Streaming Responses}.
 *
 * @param {Object} ctx - The Koa request/response context object.
 * @param {Object} ctx.request.query - Contains the text to be sent to the chat and contextIds if any.
 * @param {string} ctx.request.user - User identifier.
 * @param {string} ctx.request.key - Authorization key for the session.
 * @param {string} ctx.request.query.text - The latest chat message text.
 * @param {Array.<string>} ctx.request.query.contextIds - Optional context IDs, these represent the items to be included from the embeddings database
 * @param {string} ctx.request.chatUuid - Optional UUID for referencing the chat history. If not provided then this is a new chat
 * @returns A streamed response
 */
chatRouter.post('/api/chat', chatMiddleware, async (ctx) => {
	const { user, key, body, header } = ctx.request;
	const { text, contextIds = [], chatUuid, images = [] } = body;

	if (!header?.accept || header?.accept !== 'text/event-stream') {
		ctx.throw(
			406,
			'This endpoint currently only accepts event-streams, include the header Accept: text/event-stream.',
			{
				code: 'not_acceptable'
			}
		);
	}

	if (!text && !images.length) {
		ctx.throw(400, 'Text or at least one image is required');
	}
	const imageWithUrls = await uploadImages(images, { userUuid: user.uuid });
	return streamedResponse(
		ctx,
		generateChatReply({
			text,
			images: imageWithUrls,
			stream: true,
			user,
			key,
			chatUuid,
			contextIds
		})
	);
});

/**
 * @route POST /api/chat/:uuid/history
 *
 * Get the history of a chat by it's uuid
 */
chatRouter.get('/api/chat/:uuid/history', licenseKeyAuthMiddleware, async (ctx) => {
	const { params, user } = ctx.request;
	const { uuid: chatUuid } = params;
	if (!chatUuid) {
		ctx.throw(400, 'Chat UUID is required');
	}
	const history = await getChatHistory({
		userUuid: user.uuid,
		chatUuid,
		withMeta: true,
		withTools: false
	});
	if (!history.length) {
		ctx.throw(404, 'Chat with that UUID not found');
	}
	ctx.body = history.filter((h) => h.role !== 'system' && h.role !== 'tool');
});

/**
 * @route POST /api/chat/:uuid/share
 *
 * Sets a chat as public, so it's history can be accessed by anyone
 */
chatRouter.put('/api/chat/:uuid/share', licenseKeyAuthMiddleware, async (ctx) => {
	const { params, body, user } = ctx.request;
	const { uuid: chatUuid } = params;
	const { isSharable } = body;
	if (!chatUuid) {
		ctx.throw(400, 'Chat UUID is required');
	}
	if (typeof isSharable === 'undefined') {
		ctx.throw(400, 'isSharable is required');
	}
	await markHistorySharable({ userUuid: user.uuid, chatUuid, isSharable });
	ctx.status = 201;
});

/**
 * @route /api/chat/public/:uuid/history
 */
chatRouter.get('/api/chat/public/:uuid/history', async (ctx) => {
	const { params } = ctx.request;
	const { uuid: chatUuid } = params;
	const history = await getChatHistory({
		chatUuid,
		withMeta: true,
		withTools: false
	});
	ctx.body = history;
});

async function uploadImages(images, { userUuid }) {
	if (images.length && !isStorageEnabled()) {
		logger.error(
			`If you send images to this endpoint then you'll need to enable S3 Storage. See the guide here for more info: https://startkit.ai/docs/getting-started/installation/s3`
		);
		throw new Error('Sending images is currently disabled');
	}
	return await Promise.all(
		images.map(async (image) => {
			const base64Data = image.split(';base64,').pop();
			const buffer = Buffer.from(base64Data, 'base64');
			const { publicUrl: url } = await uploadRawFileToStorage({
				userUuid,
				fileBuffer: buffer,
				mimeType: 'image/png',
				destinationPath: 'vision'
			});
			return { url, base64: base64Data };
		})
	);
}
export default chatRouter;
