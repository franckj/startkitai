import { getCategories, isTextHarmful } from './harmful.js';
import usageLimiter, { createUsageResponse } from '#api/middleware/usage-limiter.js';

import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import { getSentiment } from './sentiment.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import { redactText } from './redactor.js';
import router from '@koa/router';

/**
 * The Moderation API
 *
 * {@link http://localhost:1337/api#tag/Moderation}
 */
const moderationRouter = router();

const moderationMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 }),
	// start: usage-limits
	usageLimiter('moderation')
	// end: usage-limits
]);

moderationRouter.get('/api/moderation/harmful/categories', async (ctx) => {
	ctx.body = getCategories();
});

moderationRouter.post('/api/moderation/harmful', moderationMiddleware, async (ctx) => {
	const { body, key, user } = ctx.request;
	const { text } = body;
	if (!text) {
		ctx.throw(400, 'Text is required');
	}
	ctx.body = await isTextHarmful({ text, user, key });
});

moderationRouter.post('/api/moderation/sentiment', moderationMiddleware, async (ctx) => {
	const { body, key, user } = ctx.request;
	const { text } = body;
	if (!text) {
		ctx.throw(400, 'Text is required');
	}
	const { result: sentiment, usage } = await getSentiment({ text, user, key });
	const usageResponse = createUsageResponse(ctx, usage);
	ctx.body = {
		...sentiment,
		usage: usageResponse
	};
});

moderationRouter.post('/api/moderation/redact', moderationMiddleware, async (ctx) => {
	const { body, key, user } = ctx.request;
	const { text } = body;
	if (!text) {
		ctx.throw(400, 'Text is required');
	}
	const { result: sentiment, usage } = await redactText({ text, user, key });
	const usageResponse = createUsageResponse(ctx, usage);
	ctx.body = {
		...sentiment,
		usage: usageResponse
	};
});

export default moderationRouter;
