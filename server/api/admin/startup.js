import { createAdminUser, getAdminUser } from '#database/users.js';
import { getAdminConfig, setAdminConfig } from '#database/models/Admin.js';

import router from '@koa/router';

/**
 * The startup router is only used when you
 * start StartKit.AI for the first time,
 * and enables you to set up an Admin User
 * and set some initial config options
 */
export default (adminExists) => {
	const startupRouter = router();

	// this route gives the StartKit startpage a
	// bit of info so it can show you the right
	// links. If/when you remove this page then
	// you can delete this route
	startupRouter.get('/api/startup', async (ctx) => {
		let adminConfig = await getAdminConfig();
		const { key: adminLicenceKey } = await getAdminUser();

		if (process.env.NODE_ENV !== 'production') {
			adminConfig = {
				...adminConfig,
				isDev: true
			};
		}
		if (adminConfig.preferences.useAdminKeyForDemos) {
			adminConfig = {
				...adminConfig,
				adminKey: adminLicenceKey.key
			};
		}
		ctx.body = adminConfig;
	});

	if (!adminExists) {
		/**
		 * This route sets the admin password for the first
		 * time but IS NOT INCLUDED in the router after the
		 * password is set.
		 */
		startupRouter.post('/api/startup/admin', async (ctx) => {
			const { email, password, preferences } = ctx.request.body;
			const { user, licenseKey } = await createAdminUser({ email, password });
			ctx.body = await setAdminConfig({
				adminUserUuid: user.uuid,
				adminKeyUuid: licenseKey.uuid,
				isFirstBoot: false,
				preferences
			});
		});
	}

	return startupRouter;
};
