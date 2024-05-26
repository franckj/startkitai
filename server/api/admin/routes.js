import adminAuthRouter from './admin-auth.js';
import adminEmbeddingsRouter from './admin-embeddings.js';
import adminKeysRouter from './admin-license-keys.js';
import adminRouter from './admin.js';
import adminStatsRouter from './admin-stats.js';
import adminUsersRouter from './admin-users.js';

export function createAdminRoutes(app) {
	[
		adminRouter,
		adminAuthRouter,
		adminEmbeddingsRouter,
		adminKeysRouter,
		adminStatsRouter,
		adminUsersRouter
	].map((router) => app.use(router.routes(), router.allowedMethods({ throw: true })));
}
