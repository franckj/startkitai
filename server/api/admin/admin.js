import { getAdminConfig, setAdminConfig } from '#database/models/Admin.js';
import { getAdminUser, updateAdminUser } from '#database/users.js';

import { adminAuth } from './admin-auth.js';
import router from '@koa/router';

const admin = router();

admin.get('/api/admin', async (ctx) => {
	ctx.body = 'ok';
});

admin.get('/api/admin/me', adminAuth, async (ctx) => {
	const { user, key: licenceKey } = await getAdminUser();
	ctx.body = {
		admin: user,
		key: licenceKey.key
	};
});

admin.put('/api/admin/me', adminAuth, async (ctx) => {
	const { oldPassword, newPassword, oldEmail, newEmail } = ctx.request.body;
	const isValid = await updateAdminUser({ oldEmail, newEmail, oldPassword, newPassword });

	if (!isValid) {
		ctx.throw(401, 'Not authorized', { code: 'not_authorized' });
	} else {
		ctx.status = 201;
	}
	ctx.body = isValid;
});

admin.get('/api/admin/preferences', adminAuth, async (ctx) => {
	let config = await getAdminConfig();
	ctx.body = config;
});

admin.put('/api/admin/preferences', adminAuth, async (ctx) => {
	const { preferences } = ctx.request.body;
	ctx.status = 201;
	ctx.body = await setAdminConfig({ preferences });
});

export default admin;
