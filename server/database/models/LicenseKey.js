import { Meta, UUID, defaultOptions } from './defaults.js';
import { estimateCost, getModelType, getModelTypes } from '#helpers/tokens.js';

import { createLicenseKey } from '#database/types/Key.js';
import mongoose from 'mongoose';
import { updateUsage as updateGlobalUsage } from './Stats.js';

const Schema = mongoose.Schema;

// start: usage-limits

export function createLimits({ defaultValue } = {}) {
	const LimitsPerModel = getModelTypes().reduce(
		(out, type) => ({
			...out,
			[type]: {
				requests: {
					type: Number,
					default: defaultValue
				},
				cost: {
					type: Number,
					default: defaultValue
				}
			}
		}),
		{}
	);

	return {
		totalRequests: {
			type: Number,
			default: defaultValue
		},
		totalCost: {
			type: Number,
			default: defaultValue
		},
		hitLimit: {
			type: Boolean,
			default: false
		},
		...LimitsPerModel
	};
}
const Limits = createLimits();
const Usage = createLimits({ defaultValue: 0 });
// end: usage-limits

const licenseKeySchema = new Schema(
	{
		uuid: UUID(),
		key: {
			type: Schema.Types.Key,
			required: true,
			default: createLicenseKey,
			index: true
		},
		userUuid: {
			type: Schema.Types.UUID,
			ref: 'User',
			get: function (value) {
				return value.toString();
			}
		},
		revoked: {
			type: Boolean,
			default: false
		},
		expires: {
			type: Date,
			default: null
		},
		lastRolled: {
			type: Date,
			default: Date.now
		},
		// start: usage-limits
		usage: {
			allTime: Usage,
			today: {
				...Usage,
				hitLimit: {
					type: Boolean,
					default: false
				}
			},
			thisMonth: {
				...Usage,
				hitLimit: {
					type: Boolean,
					default: false
				}
			}
		},
		limits: {
			daily: Limits,
			monthly: Limits
		},
		// end: usage-limits
		requiresApiKey: {
			type: Boolean
		},
		meta: Meta
	},
	defaultOptions
);

licenseKeySchema.virtual('user', {
	ref: 'User',
	localField: 'userUuid',
	foreignField: 'uuid',
	justOne: true
});

// start: usage-limits

licenseKeySchema.methods.isUsageDepleted = function isUsageDepleted(type) {
	let dailyUsageDepleted = false;
	let monthlyUsageDepleted = false;
	let typeDailyUsageDepleted = false;
	let typeMonthlyUsageDepleted = false;
	let dailyUsageRemaining = Infinity;
	let monthlyUsageRemaining = Infinity;

	if (typeof this.limits.daily.totalRequests !== 'undefined') {
		dailyUsageDepleted = (this.usage?.today?.totalRequests ?? 0) >= this.limits.daily.totalRequests;
		dailyUsageRemaining = this.limits.daily.totalRequests - this.usage?.today?.totalRequests;
	}
	if (typeof this.limits.monthly.totalRequests !== 'undefined') {
		monthlyUsageDepleted =
			(this.usage?.thisMonth?.totalRequests ?? 0) >= this.limits.monthly.totalRequests;
		monthlyUsageRemaining =
			this.limits.monthly.totalRequests - this.usage?.thisMonth?.totalRequests;
	}
	// if a type is provided and the key has a limit for that type
	if (type && typeof this.limits.daily[type] !== 'undefined') {
		typeDailyUsageDepleted =
			(this.usage?.today?.[type]?.requests ?? 0) >= this.limits.daily[type].requests;
	}
	if (type && typeof this.limits.monthly[type] !== 'undefined') {
		typeMonthlyUsageDepleted =
			(this.usage?.thisMonth?.[type]?.requests ?? 0) >= this.limits.monthly[type].requests;
	}

	return {
		isDepleted:
			dailyUsageDepleted ||
			monthlyUsageDepleted ||
			typeDailyUsageDepleted ||
			typeMonthlyUsageDepleted,
		dailyUsageDepleted,
		monthlyUsageDepleted,
		dailyUsageRemaining,
		monthlyUsageRemaining,
		typeDailyUsageDepleted,
		typeMonthlyUsageDepleted
	};
};

licenseKeySchema.methods.updateUsage = async function updateUsage(usage = []) {
	let usageUpdates = [];
	let totalCost = 0;

	for (let item of usage) {
		let { model, cost, ...usageData } = item;
		// some tools wont use a model, we can ignore those
		if (!model) continue;
		if (typeof cost === 'undefined') {
			cost = estimateCost(model, usageData);
		}
		totalCost += cost;
		const modelType = getModelType(model);

		this.usage.allTime.totalCost += cost;
		this.usage.allTime.totalRequests += 1;

		this.usage.allTime[modelType].requests += 1;
		this.usage.allTime[modelType].cost += cost;

		this.usage.today.totalRequests += 1;
		this.usage.today.totalCost += cost;

		this.usage.today[modelType].requests += 1;
		this.usage.today[modelType].cost += cost;

		this.usage.thisMonth.totalRequests += 1;
		this.usage.thisMonth.totalCost += cost;

		this.usage.thisMonth[modelType].requests += 1;
		this.usage.thisMonth[modelType].cost += cost;
		// mark as modified so the model will save
		this.markModified('usage');
		let globalUsageUpdate = { type: 'request', cost, queryType: modelType, model };
		// check if the increments have caused the users'
		// usage to be depleted
		const {
			dailyUsageDepleted,
			monthlyUsageDepleted,
			typeDailyUsageDepleted,
			typeMonthlyUsageDepleted
		} = this.isUsageDepleted(modelType);

		if ((typeDailyUsageDepleted || dailyUsageDepleted) && !this.usage.today.hitLimit) {
			this.usage.today.hitLimit = true;
			globalUsageUpdate.dailyLimitHit = true;
		}
		if ((typeMonthlyUsageDepleted || monthlyUsageDepleted) && !this.usage.thisMonth.hitLimit) {
			this.usage.thisMonth.hitLimit = true;
			globalUsageUpdate.monthlyLimitHit = true;
		}

		usageUpdates.push(globalUsageUpdate);
	}

	updateGlobalUsage(usageUpdates);

	this.markModified('usage');
	// save the document before we check if usage is depleted
	await this.save();

	const {
		isDepleted,
		dailyUsageRemaining,
		monthlyUsageRemaining,
		dailyUsageDepleted,
		monthlyUsageDepleted
	} = this.isUsageDepleted();

	// set an extra property to make it easier for
	// us to search for users who have hit their daily
	// or monthly limit
	let doSave = false;
	if (dailyUsageDepleted && !this.usage.today.hitLimit) {
		this.usage.today.hitLimit = true;
		doSave = true;
	}
	if (monthlyUsageDepleted && !this.usage.thisMonth.hitLimit) {
		this.usage.thisMonth.hitLimit = true;
		doSave = true;
	}
	if (doSave) {
		await this.save();
	}

	return {
		dailyUsageRemaining,
		monthlyUsageRemaining,
		isDepleted,
		cost: totalCost
	};
};
// end: usage-limits

const LicenseKey = mongoose.model('LicenseKey', licenseKeySchema, 'license_keys');

export default LicenseKey;
