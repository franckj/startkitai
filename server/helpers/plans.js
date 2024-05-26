import { getConfigFile } from './configs.js';
import { getModelTypes } from './tokens.js';

const planSettings = getConfigFile('plans.yml');

export function getDefaultPlanId() {
	return planSettings.default_plan_id;
}

export function getPlanById(id) {
	return planSettings.plans.find((plan) => plan.id === id);
}

export function getPlanByStripePriceId(stripePriceId) {
	return planSettings.plans.find((plan) => plan.stripe_price_id === stripePriceId);
}

// start: usage-limits
export function getPlanLimits(planId) {
	const { limits } = getPlanById(planId);
	return Object.keys(limits).reduce((output, limitPeriod) => {
		const limit = limits[limitPeriod];
		return {
			...output,
			[limitPeriod]: {
				totalRequests: limit.total_requests ?? Infinity,
				totalCost: limit.total_cost ?? Infinity,
				...getModelTypes().reduce(
					(out, type) => ({
						...out,
						[type]: {
							requests: limit[`${type}_requests`] ?? Infinity,
							cost: limit[`${type}_cost`] ?? Infinity
						}
					}),
					{}
				)
			}
		};
	}, {});
}
// end: usage-limits
