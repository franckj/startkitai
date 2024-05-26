import { addUserToMailingList, sendMagicLink } from '#helpers/emails.js';

import LicenseKey from '#database/models/LicenseKey.js';
import User from '#database/models/User.js';
import { createLogger } from '#helpers/logger.js';
import { createUserWithKey } from '#database/users.js';
import jwt from 'jsonwebtoken';
import router from '@koa/router';

const logger = createLogger('auth');

const authRouter = router();

const secretKey = process.env.JWT_SECRET;
const magicLinkRedirect = process.env.MAGIC_LINK_REDIRECT;
const FREE_PLAN_ID = 1;
const UNLIMITED_PLAN_ID = 3;

// create a signup magic link
authRouter.post('/api/auth/magic', async (ctx) => {
	const { body } = ctx.request;
	const { email, mailingListConsent, redirectPath } = body;

	const token = jwt.sign({ email, planId: FREE_PLAN_ID, mailingListConsent }, secretKey, {
		expiresIn: '1h'
	});
	const magicLink = `${magicLinkRedirect}${redirectPath}?token=${token}`;
	// send email
	await sendMagicLink({ link: magicLink, email });
	ctx.status = 202;
});

// verify a login
authRouter.post('/api/auth/magic/verify', async (ctx) => {
	logger.interactive('verify').await('verifying magic link...');
	const { body } = ctx.request;
	const { token } = body;

	const result = await new Promise((resolve) => {
		// verify the jwt token
		jwt.verify(token, secretKey, async (err, decoded) => {
			try {
				if (err) {
					logger.interactive('verify').warn('invalid or expired magic link');
					ctx.throw(401, 'Invalid or expired magic link.', {
						code: 'token_expired'
					});
				}

				// fetch the user
				let user = await User.findOne({ email: decoded.email }).select('-_id').lean();
				if (!user) {
					logger.interactive('verify').success('verified magic link for new user');
					// the token was valid and no user exists
					// so now we can create the user
					const { user, key } = await createUserWithKey({
						email: decoded.email,
						planId: decoded.planId,
						mailingListConsent: decoded.mailingListConsent
					});
					// if the user consented then add them to the
					// mailing list
					if (decoded.mailingListConsent) {
						addUserToMailingList({ email: decoded.email });
					}
					resolve({ ...user, key });
					ctx.status = 201;
				} else {
					logger.interactive('verify').success('verified magic link for existing user');
					// the token was valid and the user already exists
					// so now we can log them in
					ctx.status = 200;
					const licenseKey = await LicenseKey.findOne({ userUuid: user.uuid });
					resolve({
						...user,
						key: licenseKey._doc.key
					});
				}
			} catch (err) {
				logger.interactive('verify').error('failed to verify magic link', err.message);
				ctx.throw(500, `Failed to verify magic link`, {
					error: err
				});
			}
		});
	});
	ctx.body = result;
});

// utitity for verifying an openai key
authRouter.post('/api/auth/key/verify', async (ctx) => {
	const { email, mailingListConsent } = ctx.request.body;
	let user = await User.findOne({ email }).select('-_id').lean();
	if (!user) {
		logger.success('verified openai key for new user');
		// no user exists
		// so now we can create the user
		const { user, key } = await createUserWithKey({
			email,
			planId: UNLIMITED_PLAN_ID,
			mailingListConsent: mailingListConsent,
			requiresApiKey: true
		});
		// if the user consented then add them to the
		// mailing list
		if (mailingListConsent) {
			addUserToMailingList({ email });
		}
		ctx.body = { ...user, key };
		ctx.status = 201;
	} else {
		logger.success('verified openai key for existing user');
		// the user already exists
		// so now we can log them in
		ctx.status = 200;
		const licenseKey = await LicenseKey.findOne({ userUuid: user.uuid });
		ctx.body = {
			...user,
			key: licenseKey._doc.key
		};
	}
});

export default authRouter;
