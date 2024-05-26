import { getModelTypes, getModels } from '#helpers/tokens.js';

import mongoose from 'mongoose';
import { startOfMonth } from 'date-fns';

const Schema = mongoose.Schema;

// start: usage-limits
/*
 * Creates an Object for the stats that looks like this for every combination
 * of request and model:
 *
 * {
 * 	chat: {
 *    cost: 0,
 * 		requests: 0,
 * 		models: {
 * 			'gpt-4-turbo-preview': {
 * 				requests: 0,
 * 				cost: 0
 * 			},
 * 			'gpt-4-vision-preview': {
 * 				requests: 0,
 * 				cost: 0
 * 			},
 * 			'gpt-4': {
 * 				requests: 0,
 * 				cost: 0
 * 			}
 * 		}
 * 	},
 *	images: {
 *		cost: 0,
 * 		requests: 0,
 *		models: {
 *		  ...
 *		}
 *  },
 *  ...
 * };
 *
 * This allows us to create detailed stats for every
 * type of api call to be displayed in the admin dashboard
 */
const Usage = {
	totalRequests: {
		type: Number,
		default: 0
	},
	totalCost: {
		type: Number,
		default: 0
	},
	...getModelTypes().reduce(
		(out, type) => ({
			...out,
			[type]: {
				requests: {
					type: Number,
					default: 0
				},
				cost: {
					type: Number,
					default: 0
				},
				models: getModels(type).reduce(
					(modelsOut, model) => ({
						...modelsOut,
						[model.replace('.', '-')]: {
							requests: {
								type: Number,
								default: 0
							},
							cost: {
								type: Number,
								default: 0
							}
						}
					}),
					{}
				)
			}
		}),
		{}
	)
};
// end: usage-limits

const UsersStats = {
	// new users
	new: {
		type: Number,
		default: 0
	}
};
/**
 * The DailyStats schema
 * Stats are recorded in this for every day
 * Day periods are determined by the server time
 */
const dailyStats = new Schema({
	date: {
		type: Date,
		default: today
	},
	// start: usage-limits
	usage: Usage,
	// end: usage-limits
	users: UsersStats
});

/**
 * The MonthlyStats schema
 * Stats are recorded in this for every calendar month
 * Month periods are determined by the server time
 */
const monthlyStats = new Schema({
	date: {
		type: Date,
		default: thisMonth
	},
	// start: usage-limits
	usage: Usage,
	// end: usage-limits
	users: UsersStats
});

/**
 * AllTime stats
 */
const allTimeStats = new Schema({
	// start: usage-limits
	usage: Usage,
	// end: usage-limits
	users: UsersStats
});

export const DailyStats = mongoose.model('DailyStats', dailyStats, 'stats_daily');
export const MonthlyStats = mongoose.model('MonthlyStats', monthlyStats, 'stats_monthly');
export const AllTimeStats = mongoose.model('AllTimeStats', allTimeStats, 'stats_all_time');

// start: usage-limits
/**
 * Updates the usage statistics for daily, monthly, and all-time stats collections.
 * Increments the request counts and costs based on the query type and model.
 *
 * @param {Object} params - The parameters for updating usage stats.
 * @param {number} params.cost - The cost associated with the query.
 * @param {number} [params.queryCount=1] - The number of queries made (defaults to 1).
 * @param {string} params.queryType - The type of the query (e.g. 'chat', 'image', etc).
 * @param {string} params.model - The model on which the query was executed (e.g. gpt-4, dall-e-3, etc )
 *
 */
export const updateUsage = async function (usageUpdates) {
	let inc = {
		'usage.dailyLimitsHit': 0,
		'usage.monthlyLimitsHit': 0,
		'usage.totalRequests': 0,
		'usage.totalCost': 0
	};

	for (let update of usageUpdates) {
		const { cost, queryType, model, dailyLimitHit, monthlyLimitHit } = update;
		inc['usage.dailyLimitsHit'] += dailyLimitHit ? 1 : 0;
		inc['usage.monthlyLimitsHit'] += monthlyLimitHit ? 1 : 0;
		inc['usage.totalCost'] += cost ?? 0;
		inc['usage.totalRequests'] += 1;
		if (!inc[`usage.${queryType}.requests`]) {
			inc[`usage.${queryType}.requests`] = 0;
			inc[`usage.${queryType}.cost`] = 0;
		}
		if (!inc[`usage.${queryType}.models.${model}.requests`]) {
			inc[`usage.${queryType}.models.${model}.requests`] = 0;
			inc[`usage.${queryType}.models.${model}.cost`] = 0;
		}
		inc[`usage.${queryType}.requests`] += 1;
		inc[`usage.${queryType}.cost`] += cost ?? 0;
		inc[`usage.${queryType}.models.${model}.requests`] += 1;
		inc[`usage.${queryType}.models.${model}.cost`] += cost ?? 0;
	}

	return await incrementAll(inc);
};
// end: usage-limits

export const addUserToStats = async function (count = 1) {
	let inc = {
		'users.new': count
	};
	return await incrementAll(inc);
};

async function incrementAll(inc) {
	// update all three stats collections
	return Promise.all([
		DailyStats.updateOne(
			{
				date: today()
			},
			{
				$inc: inc
			},
			{
				upsert: true
			}
		),
		MonthlyStats.updateOne(
			{ date: thisMonth() },
			{ $inc: inc },
			{
				upsert: true
			}
		),
		AllTimeStats.updateOne(
			{},
			{ $inc: inc },
			{
				upsert: true
			}
		)
	]);
}

function today() {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	return new Date(start);
}

function thisMonth() {
	const start = startOfMonth(new Date());
	start.setHours(0, 0, 0, 0);
	return new Date(start);
}
