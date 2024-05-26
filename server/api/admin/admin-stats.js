import { DailyStats, MonthlyStats } from '#database/models/Stats.js';

import { adminAuth } from './admin-auth.js';
import router from '@koa/router';

const adminStatsRouter = router();

adminStatsRouter.get('/api/admin/stats/summary', adminAuth, async (ctx) => {
	// today
	ctx.status = 200;
	const dailyStats = await DailyStats.find({}).select('-_id').sort('-date').limit(1).exec();
	const monthlyStats = await MonthlyStats.find({}).select('-_id').sort('-date').limit(1).exec();

	ctx.body = {
		daily: dailyStats[0],
		monthly: monthlyStats[0]
	};
});

adminStatsRouter.get('/api/admin/stats/daily/histogram', adminAuth, async (ctx) => {
	const { limit = 14 } = ctx.request.query;
	// today
	ctx.status = 200;
	const dailyStats = await DailyStats.find({}).select('-_id').sort('-date').limit(limit).exec();
	ctx.body = dailyStats.reverse();
});

export default adminStatsRouter;
