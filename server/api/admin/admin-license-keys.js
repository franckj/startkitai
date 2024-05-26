import LicenseKey from '#database/models/LicenseKey.js';
import User from '#database/models/User.js';
import { adminAuth } from './admin-auth.js';
import { createLicenseKey } from '#database/types/Key.js';
import { getPlanLimits } from '#helpers/plans.js';
import router from '@koa/router';

const adminKeysRouter = router();

adminKeysRouter.get('/api/admin/keys/:uuid', adminAuth, async (ctx) => {
	const { uuid } = ctx.request.params;
	let key = await LicenseKey.findOne({ uuid });
	const user = await User.findOne(
		{
			uuid: key.userUuid
		},
		{
			uuid: 1,
			email: 1
		}
	);
	ctx.body = { ...key.toJSON(), email: user.email };
});

adminKeysRouter.put('/api/admin/keys/:uuid/roll', adminAuth, async (ctx) => {
	const { uuid } = ctx.request.params;
	ctx.body = await LicenseKey.findOneAndUpdate(
		{ uuid },
		{ $set: { key: createLicenseKey(), lastRolled: Date.now() } },
		{ new: true }
	).lean();
});

adminKeysRouter.put('/api/admin/keys/:uuid/limits', adminAuth, async (ctx) => {
	const { uuid } = ctx.request.params;
	// can provide either a plan id or a full limits body
	// that matches the limits parsed from plans.yml
	let { planId, limits } = ctx.request.body;
	if (planId) {
		limits = getPlanLimits(planId);
	}

	ctx.body = await LicenseKey.findOneAndUpdate(
		{ uuid },
		{ $set: { limits } },
		{ new: true }
	).lean();
});

adminKeysRouter.put('/api/admin/keys/:uuid/revoke', adminAuth, async (ctx) => {
	const { uuid } = ctx.request.params;
	const revokedKey = await LicenseKey.findOneAndUpdate(
		{
			uuid
		},
		{
			$set: { revoked: true }
		},
		{ new: true }
	);
	ctx.body = revokedKey.toJSON();
});

adminKeysRouter.put('/api/admin/keys/:uuid/grant', adminAuth, async (ctx) => {
	const { uuid } = ctx.request.params;
	const revokedKey = await LicenseKey.findOneAndUpdate(
		{
			uuid
		},
		{
			$set: { revoked: false }
		},
		{ new: true }
	);
	ctx.body = revokedKey.toJSON();
});

export default adminKeysRouter;
