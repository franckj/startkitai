import ratelimit from 'koa-ratelimit';

const defaultOptions = {
	driver: 'memory',
	duration: 60000,
	errorMessage: 'Sometimes You Just Have to Slow Down.',
	id: (ctx) => ctx.ip,
	headers: {
		remaining: 'Rate-Limit-Remaining',
		reset: 'Rate-Limit-Reset',
		total: 'Rate-Limit-Total'
	},
	disableHeader: false
};

/**
 * Basic Rate Limiter middleware
 */
export function rateLimiterMiddleware({ maxPerMinute = 25 }) {
	const db = new Map();
	return ratelimit({
		...defaultOptions,
		max: maxPerMinute,
		db
	});
}
