/**
 * Combine multiple middlewares into one
 *
 * eg:
 * const chatMiddleware = combineMiddleware([
 *   licenseKeyAuthMiddleware,
 *  rateLimiterMiddleware({ maxPerMinute: 60 }),
 *  // start: usage-limits
 *  usageLimiter('chat')
 *   // end: usage-limits
 * ]);
 * @returns combined middewalre
 */
export const combineMiddleware = (middlewareArray) => {
	return async (ctx, next) => {
		const composed = middlewareArray.reduceRight((next, middleware) => {
			return () => middleware(ctx, next);
		}, next);

		return await composed();
	};
};
