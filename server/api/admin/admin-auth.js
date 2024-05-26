import { authenticateAdmin } from '#database/users.js';
// a simple authentication layer based on jwt
// credentials, must match admin username and password
import jwt from 'jsonwebtoken';
import { parseLicenseKeyFromHeader } from '#api/middleware/license-key-auth.js';
import router from '@koa/router';

const secretKey = process.env.JWT_SECRET;
// set in the .env file
export const adminAuth = async (ctx, next) => {
	if (ctx.request.url === '/api/admin/login') {
		return next();
	}
	const { header } = ctx.request;

	if (!header?.authorization) {
		ctx.throw(401, 'Not authorized', { code: 'not_authorized' });
		return;
	}
	const token = parseLicenseKeyFromHeader(header.authorization);

	const decoded = await new Promise((resolve) =>
		jwt.verify(token, secretKey, async (err, decoded) => {
			if (err) {
				resolve(null);
			}
			resolve(decoded);
		})
	);
	if (decoded?.admin) {
		ctx.request.authorized = true;
		await next();
	} else {
		ctx.throw(401, 'Invalid or expired link.', {
			code: 'token_expired'
		});
	}
};

const adminLoginRouter = router();

adminLoginRouter.post('/api/admin/login', async (ctx) => {
	const { email, password } = ctx.request.body;
	const isValid = await authenticateAdmin(email, password);
	if (isValid) {
		const token = jwt.sign({ email, admin: true }, secretKey, {
			expiresIn: '7d'
		});
		ctx.body = { token };
	} else {
		ctx.throw(401, 'Email or password is incorrect', { code: 'not_authorized' });
	}
});

export default adminLoginRouter;
