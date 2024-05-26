import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';

/**
 * Users API
 *
 * StartKit.AI starts with a very basic user model that
 * you can extend to fit into your own app.
 */
const userRouter = router();

const userMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 })
]);

userRouter.get('/api/users/me', userMiddleware, (ctx) => {
	const { user, key } = ctx.request;
	ctx.body = {
		...user,
		key
	};
});

export default userRouter;
