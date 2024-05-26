import { getAdminUser, getKeyAndUserFromToken } from '#database/users.js';

import { createLogger } from '#helpers/logger.js';
import { match } from 'path-to-regexp';

const logger = createLogger('license-key-auth');
const headerKey = 'Bearer';
const allowedRoutes = [];
const disableAuthentication = process.env.DISABLE_AUTH;
/**
 * The License Key Authentication layer.
 *
 * Each request to the licenseKeyAuth middleware is checked to see if it
 * is allowed to make the request.
 *
 * Returns a 401 if there is no license key provided or it is revoked or expired
 */
export default function licenseKeyAuthMiddleware(ctx, next) {
	const { url, header } = ctx.request;
	if (isAllowedRoute(url, allowedRoutes)) {
		ctx.request.authorized = true;
		return next();
	}
	if (header?.accept === 'text/event-stream') {
		// a different type of auth is required for our streaming endpoints
		return eventStreamAuth(ctx, next);
	}
	return normalRequestAuth(ctx, next);
}

/**
 * Standard authorization middleware for normal requests.
 *
 * A Bearer Token should be present on the request headers.
 * If it is not present, it is expired, or invalid then
 * we return a 401 and the request is not authorized.
 *
 * If the token looks good then we allow the request to continue
 * and add a few things to the request object for later
 */
async function normalRequestAuth(ctx, next) {
	const { header } = ctx.request;
	let token;
	let version;
	let openaiKey;

	if (header?.authorization) {
		token = parseLicenseKeyFromHeader(header.authorization);
		version = header['x-version'];
		openaiKey = header['x-openai-key'];
	}

	const response = await getTokenResponse({ token, openaiKey });

	// the request was denied because the key was
	// wrong, expired, or deleted
	if (!response.allowed) {
		ctx.throw(401, response.message, {
			code: response.code
		});
		return;
	}

	// everything looks good so we set some useful
	// values on the request object so we can use
	// them later on in the request
	setRequestAuthorized(ctx, {
		version,
		openaiKey,
		user: response.user,
		key: response.key
	});
	// perform the next bit of middleware
	return next();
}

/**
 * Authorization middleware for text/event-streams.
 *
 * We use event-streams a lot for streaming responses back to the client,
 * this is what makes the typing animations, and means we can send very fast
 * partial responses to the user. It's essentially web-sockets but simpler.
 *
 * For more information, see {@link https://startkit.ai/docs/advanced/streaming|Streaming Responses}.
 */
async function eventStreamAuth(ctx, next) {
	const { header } = ctx.request;
	let token;
	let version;
	let openaiKey;

	if (header?.authorization) {
		token = parseLicenseKeyFromHeader(header.authorization);
		version = header['x-version'];
		openaiKey = header['x-openai-key'];
	}

	const response = await getTokenResponse({ token, openaiKey });

	// the request was denied because the key was
	// wrong, expired, or deleted
	if (!response.allowed) {
		ctx.res.sendMessage({
			type: 'error',
			data: {
				code: response.code,
				message: response.message
			}
		});
		ctx.res.end();
		return;
	}
	// everything looks good so we set some useful
	// values on the request object so we can use
	// them later on in the request
	setRequestAuthorized(ctx, {
		version,
		openaiKey,
		user: response.user,
		key: response.key
	});
	// perform the next bit of middleware
	return next();
}

function setRequestAuthorized(ctx, { user, key, openaiKey, version }) {
	ctx.request.authorized = true;
	ctx.request.user = user;
	// also store the key and client-version in case we
	// need them later
	ctx.request.key = key;
	if (openaiKey) {
		ctx.request.openaiKey = openaiKey;
		ctx.request.key.openaiKey = openaiKey;
	}
	ctx.request.clientVersion = version;
}

async function getTokenResponse({ token, openaiKey }) {
	let userResponse;
	if (disableAuthentication) {
		logger.info('authentication is disabled, making request with Admin key');
		userResponse = await getAdminUser();
	} else {
		// if the request does not include a token
		if (!token) {
			return {
				allowed: false,
				code: 'token_invalid',
				message: `You haven't provided your license key.`
			};
		}

		userResponse = await getKeyAndUserFromToken(token);
	}
	const { key, user } = userResponse;
	if (!key || !user) {
		return {
			allowed: false,
			reason: 'token_invalid',
			message: 'The license key provided does not exist in our system.'
		};
	}

	// the license key has expired
	if (key.revoked || (key.expires && key.expires < Date.now())) {
		return {
			allowed: false,
			reason: 'token_expired',
			message: `The license key provided has expired or been revoked.`
		};
	}

	if (key.requiresApiKey && !openaiKey) {
		return {
			allowed: false,
			reason: 'token_invalid',
			message: `The license key provided requires an X-OPENAI-KEY header to be sent with each request.`
		};
	}

	return {
		allowed: true,
		key,
		user
	};
}

export function parseLicenseKeyFromHeader(header) {
	const parts = header.split(' ');
	if (parts.length === 2 && parts[0] === headerKey) {
		const [, token] = parts;
		return token;
	}
	return null;
}

/**
 * Check if any of the routes in allowedRoutes match
 * the given url.
 *
 * @returns true if a route matches, false otherwise
 */
function isAllowedRoute(url, allowedRoutes = []) {
	return allowedRoutes.some((route) => {
		const matchRoute = match(route);
		return matchRoute(url);
	});
}
