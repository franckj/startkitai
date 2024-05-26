import { generateTextReply, queryOnAllDocuments } from './documents.js';
/**
 * Text analysis on large numbers of documents
 */
import usageLimiter, { createUsageResponse } from '#api/middleware/usage-limiter.js';

import { Readable } from 'stream';
import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import { createLogger } from '#helpers/logger.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';
import { streamedResponse } from '#api/middleware/stream-events.js';

/**
 * Text API - for creating longer form content than chat
 */
const textRouter = router();
const logger = createLogger('text');

const textMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 }),
	// start: usage-limits
	usageLimiter('chat')
	// end: usage-limits
]);

textRouter.post('/api/text/create', textMiddleware, async (ctx) => {
	const { user, key, body } = ctx.request;
	let { sources, prompt } = body;
	sources = sources.filter(Boolean);
	logger.info(`creating long-form text content from ${sources.length} sources`);
	await streamedResponse(
		ctx,
		generateTextReply({
			prompt,
			stream: true,
			user,
			key,
			sources
		})
	);
});

textRouter.post('/api/text/query-documents', textMiddleware, async (ctx) => {
	const { user, key, body } = ctx.request;
	const { contextIds, history, text } = body;
	const contextId = contextIds[0];
	ctx.body = new Readable({ read() {} });
	logger.info(`querying on ${contextId} documents`);

	for await (let message of queryOnAllDocuments({ contextId, user, key, history, query: text })) {
		if (message.type === 'metadata') {
			ctx.res.write(`meta: ${JSON.stringify(message.data)}\n`);
		}
		// then the content will be received
		else if (message.type === 'content') {
			ctx.res.write(message.data);
		}
		// finally a bit more metadata regarding the total
		// output of the request
		else if (message.type === 'result') {
			const usageResponse = createUsageResponse(ctx, message.data);
			const totalCost = usageResponse.reduce((out, item) => out + item.cost, 0);
			const models = usageResponse.map((item) => item.model).join(', ');
			ctx.res.write(`\n\nresult: ${JSON.stringify({ cost: totalCost, model: models })}\n`);
		}
	}
	ctx.res.end();
});

export default textRouter;
