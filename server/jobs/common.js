import { getModelTypes } from '#helpers/tokens.js';

export function getResetUpdateQuery(period) {
	const typeUpdate = getModelTypes().reduce(
		(out, type) => ({
			...out,
			[`usage.${period}.${type}.requests`]: 0,
			[`usage.${period}.${type}.cost`]: 0
		}),
		{}
	);

	const update = {
		[`usage.${period}.totalRequests`]: 0,
		[`usage.${period}.totalCost`]: 0,
		[`usage.${period}.hitLimit`]: false,
		...typeUpdate
	};

	return update;
}
