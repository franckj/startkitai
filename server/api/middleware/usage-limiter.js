// # usage only #

import { createLogger } from '#helpers/logger.js';
import { estimateCost } from '#helpers/tokens.js';
const logger = createLogger('usage');
// start: usage-limits
/**
 * Each request that uses this middleware will be
 * checked against the users usage limit.
 *
 * After the request is complete the request will be
 * logged against the users usage limit and recorded
 * in the stats database
 */
export default function usageLimiter(type) {
	return async function (ctx, next) {
		const { key, authorized } = ctx.request;

		if (!authorized) {
			ctx.throw(401, `You are not allowed to access this resource.`, {
				code: 'not_authorized'
			});
			return;
		}

		const { isDepleted } = key.isUsageDepleted(type);
		// check if usage is depleted
		if (isDepleted) {
			logger.info(`${ctx.request.url}: usage is depleted for key - ${key.uuid}.`);
			ctx.throw(429, `You have exceeded your usage for this token.`, {
				code: 'usage_exceeded'
			});
			return;
		}

		logger.info(`${ctx.request.url}: making request against key - ${key.uuid}.`);
		// perform the request
		await next();
		// record the usage of the request
		const { usage } = ctx.request;
		if (usage) {
			const { dailyUsageRemaining, cost } = await key.updateUsage(usage);
			logger.info(`${ctx.request.url}: request cost $${cost}.`);

			logger.info(`${ctx.request.url}: user has ${dailyUsageRemaining} requests remaining today.`);
		}
	};
}
// end: usage-limits

/**
 * Constructs a usage response object with token counts and estimated cost, and assigns it to the Koa context.
 *
 * @param {Object} ctx - The Koa request context.
 * @param {Object} usageDetails - The details of usage including tokens and model.
 * @param {number} usageDetails.promptTokens - The number of tokens used in the prompt.
 * @param {number} usageDetails.completionTokens - The number of tokens generated in the completion.
 * @param {number} usageDetails.totalTokens - The total number of tokens used.
 * @param {string} usageDetails.model - The model identifier used for the operation.
 * @returns {Object} The constructed usage response object.
 */
export function createUsageResponse(ctx, actions = []) {
	let usageDetails = actions;
	// convert to array if not one
	if (!Array.isArray(usageDetails)) {
		usageDetails = [usageDetails];
	}
	try {
		let totalRequestCost = 0;
		let response = usageDetails.map((action) => {
			const { model, ...usageData } = action;
			if (!model) {
				// this wasn't an AI action
				return { ...action, cost: 0 };
			}
			const cost = estimateCost(model, usageData);
			totalRequestCost += cost;
			return { ...action, cost };
		});

		ctx.set('x-usage-cost', totalRequestCost);
		ctx.request.usage = response;
		return response;
	} catch (err) {
		logger.warn('failed to calculate usage', err);
		return [];
	}
}
