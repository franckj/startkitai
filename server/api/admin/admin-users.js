import { AllTimeStats, DailyStats, MonthlyStats } from '#database/models/Stats.js';
import { deleteFileFromStorage, isStorageEnabled } from '#helpers/storage.js';

import LicenseKey from '#database/models/LicenseKey.js';
import User from '#database/models/User.js';
import { adminAuth } from './admin-auth.js';
import { deleteAllChatHistoryForUser } from '#database/chat-history.js';
import { deleteAllEmbeddingsForUser } from '#database/embeddings.js';
import { deleteSubscription } from '#helpers/payments.js';
import router from '@koa/router';

const adminUsersRouter = router();

const USER_FIELDS = '-_id email uuid roles meta preferences billing';

/**
 * GET endpoint for retrieving the top 50 users based on daily license key usage.
 *
 * @route {GET} /admin/users
 * Responds with an array of users and their usage data.
 */
adminUsersRouter.get('/api/admin/users', adminAuth, async (ctx) => {
	const { email, usageExpiredToday } = ctx.query;
	const page = parseInt(ctx.query.page ?? 0, 10);
	const limit = parseInt(ctx.query.limit ?? 50, 10);
	const skip = (page - 1) * limit;

	let keys = [];
	let totalCount;

	if (email) {
		const query = { email };
		const { licenseKey, ...user } = await User.findOne(query)
			.select(USER_FIELDS)
			.populate({
				path: 'licenseKey',
				select: '-_id -meta'
			})
			.lean();
		keys = [{ ...licenseKey, user }];
		totalCount = 1;
	} else {
		let query = {};
		if (typeof usageExpiredToday !== 'undefined') {
			query = { 'usage.today.hitLimit': usageExpiredToday === 'true' ? true : false };
		}
		keys = await LicenseKey.find(query)
			.sort({ 'usage.today.totalRequests': -1 })
			.skip(skip)
			.limit(limit)
			.populate({
				path: 'user',
				select: USER_FIELDS
			});

		totalCount = await LicenseKey.countDocuments(query);
	}

	/**
	 * Get the summary stats for the users dashboard
	 * - Total users count
	 * - Hit usage limit today
	 * - Avg. cost per user today
	 * - Avg. cost per user month
	 */
	const [dailyStats, monthlyStats, allTimeStats] = await Promise.all([
		DailyStats.find({}).select('-_id').sort('-date').limit(1).exec(),
		MonthlyStats.find({}).select('-_id').sort('-date').limit(1).exec(),
		AllTimeStats.find({}).select('-_id').limit(1).exec()
	]);

	const totalUsers = allTimeStats[0]?.users?.new ?? 0;
	const stats = {
		totalUsers,
		usageExpiredToday: allTimeStats[0]?.users?.usageExpired ?? 0,
		avgCostToday: totalUsers ? (dailyStats[0]?.usage?.totalCost ?? 0) / totalUsers : 0,
		avgCostMonth: totalUsers ? (monthlyStats[0]?.usage?.totalCost ?? 0) / totalUsers : 0
	};

	const hasNext = page * limit < totalCount;
	ctx.status = 200;
	ctx.body = {
		stats,
		users: {
			page,
			limit,
			totalCount,
			data: keys?.filter((key) => key.user) ?? [],
			hasNext
		}
	};
});

adminUsersRouter.get('/api/admin/users/:uuid', adminAuth, async (ctx) => {
	const { params } = ctx.request;
	const { uuid } = params;
	const user = await User.findOne({ uuid })
		.select('-_id')
		.populate({
			path: 'licenseKey',
			select: '-_id key'
		})
		.lean();
	ctx.body = user;
});

adminUsersRouter.delete('/api/admin/users/:uuid', adminAuth, async (ctx) => {
	const { params } = ctx.request;
	const { uuid } = params;
	/**
	 * Delete the user and their...
	 * - chat history
	 * - embeddings
	 * - license key
	 * - Delete any uploaded images
	 * - Cancel any Stripe subscription
	 */
	const user = await User.findOne({ uuid });
	if (!user) {
		ctx.throw(404, 'User not found');
	}

	if (user?.billing?.subscriptionId) {
		await deleteSubscription(user.billing.subscriptionId);
	}
	// delete all user data
	await deleteAllChatHistoryForUser({ userUuid: uuid });
	await deleteAllEmbeddingsForUser({ userUuid: uuid });
	await LicenseKey.deleteOne({ userUuid: uuid });

	if (isStorageEnabled()) {
		// delete uploaded files
		await deleteFileFromStorage({ key: uuid });
	}

	// finally delete the user
	await User.deleteOne({ uuid });
	ctx.status = 201;
});

adminUsersRouter.post('/api/admin/users', adminAuth, async (ctx) => {
	const { body } = ctx.request;
	const { email } = body;

	const user = await User.create({
		email
	});
	const newUser = await User.findById(user._id).select('uuid email meta -_id').lean();
	let key = await LicenseKey.create({ userUuid: newUser.uuid });
	ctx.body = {
		...newUser,
		key: key._doc.key
	};
});

export default adminUsersRouter;
