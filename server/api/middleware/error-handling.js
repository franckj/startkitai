import { createLogger } from '#helpers/logger.js';
const logger = createLogger('errors');

/**
 * Koa middleware for handling errors in the application. It captures any thrown errors,
 * processes them using the `parseError` function, logs the error, and sends a standardized
 * error response to the client.
 * @param {Object} ctx - The Koa context object.
 * @param {Function} next - The next middleware function in the Koa stack.
 */
export async function errorHandlingMiddleware(ctx, next) {
	try {
		await next();
	} catch (err) {
		const { status, code, message } = parseError(err);
		if (ctx.res.sendMessage) {
			ctx.res.sendMessage({
				type: 'error',
				data: {
					message: err.message
				}
			});
			ctx.res.end();
			logError({ code, message }, err, ctx);
			return;
		}
		ctx.status = status;
		ctx.body = {
			code,
			message
			// ... you can add more error details here if needed
		};

		// (optional) emit the error if you want to log it using an external logger
		// ctx.app.emit('error', err, ctx);
		logError({ code, message }, err, ctx);
	}
}

/**
 * If an error is thrown without specifying the code
 * then we use these generic codes for the corresponding status code
 *
 * Mapping of standard HTTP status codes to error code strings.
 * @type {Object.<number, string>}
 */
const FALLBACK_ERROR_CODES = {
	400: 'bad_request',
	401: 'not_authorized',
	403: 'forbidden',
	404: 'not_found',
	429: 'rate_limit_exceeded',
	500: 'internal_server_error'
};

function getFallbackErrorCode(status) {
	if (FALLBACK_ERROR_CODES[status]) {
		return FALLBACK_ERROR_CODES[status];
	}
	if (status >= 400 && status < 500) {
		return 'bad_request';
	}
	if (status >= 500 && status < 600) {
		return 'internal_server_error';
	}
	return 'unknown_error';
}

/**
 * If an error is thrown without a message
 * then we use this fallback message
 * (optional) customise this to whatever you want
 */
const FALLBACK_ERROR_MESSAGE = 'An error occurred.';

/**
 * Parses an error object to standardize the structure of the error response.
 * @param {Error} err - The error object to parse.
 * @returns {{status: number, code: string, message: string}} An object containing the parsed error details.
 */
function parseError(err) {
	const status = err.statusCode || err.status || 500;
	const code = err.code || getFallbackErrorCode(status);
	const message = err.message || FALLBACK_ERROR_MESSAGE;
	return {
		status,
		code,
		message
	};
}

/**
 * Logs an error to the console or a logging service, including its stack trace,
 * any nested error objects, and associated code and message.
 * @param {Object} errorInfo - An object containing error details with code and message.
 * @param {Error} err - The error object to log.
 */
function logError({ code, message }, err, ctx) {
	let errorDetails = {
		code,
		message
	};

	if (err.stack) {
		errorDetails.stack = err.stack;
	}

	if (err.error && typeof err.error === 'object') {
		errorDetails.innerError = {
			message: err.error.message,
			stack: err.error.stack
		};
	}

	if (process.env.DEBUG || process.env.NODE_ENV !== 'production') {
		logger.error(`${ctx.request.method} ${ctx.request.url}: ${message}\n\n`, err.error || err);
	} else {
		logger.error(`${ctx.request.method} ${ctx.request.url}: ${message}`);
	}

	// Optionally, extend this function to handle different logging mechanisms
	// such as sending the error details to an external logging service.
}
