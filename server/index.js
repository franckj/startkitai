import 'dotenv/config.js';

import { default as Bree } from 'bree';
import Cabin from 'cabin';
import Graceful from '@ladjs/graceful';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { connectDb } from '#database/connection.js';
import cors from '@koa/cors';
import { createLogger } from '#helpers/logger.js';
import { createRoutes } from '#api/index.js';
import { loggerMiddleware } from '#api/middleware/logger.js';
import open from 'open';
import path from 'path';
import requestId from 'koa-better-request-id';
import requestReceived from 'request-received';
import responseTime from 'koa-better-response-time';

const logger = createLogger('server');
const args = process.argv.slice(2);

const { API_PORT, API_HOST } = process.env;

/**
 * Koa is a neat barebones web server, here we enable all the
 * plugins that we'll need for every request
 */
const app = new Koa();

// used by the logger to add request timestamps to logs
app.use(requestReceived);
// adds `X-Response-Time` header to responses
app.use(responseTime());
// adds or re-uses `X-Request-Id` header
app.use(requestId());
// use the cabin middleware (adds request-based logging and helpers)
if (process.env.LOG_HTTP) {
	app.use(
		new Cabin({
			logger: loggerMiddleware
		}).middleware
	);
}

app.use(cors({ exposeHeaders: ['x-usage-cost', 'x-response-time'] }));

app.use((ctx, next) => {
	// start: stripe
	// Stripe webhooks require the raw body for verification
	// so skip the body parsing and this endpoint will parse the raw body
	if (ctx.path === '/api/webhooks/stripe') {
		return next();
	}
	// end: stripe
	return bodyParser({ enableTypes: ['json', 'text', 'form'], jsonLimit: '50mb' })(ctx, next);
});

const bree = new Bree({
	root: path.resolve('server/jobs')
});

export async function start() {
	const [mongoose] = await Promise.all([connectDb(), bree.start(), createRoutes(app)]);

	const webserver = app.listen(API_PORT, API_HOST);

	logger.success(`started job scheduler`);
	logger.success(`started server on http://${API_HOST}:${API_PORT}`);
	// gracefully shut everything down if
	// the node app restarts
	const graceful = new Graceful({
		servers: [webserver],
		mongooses: [mongoose],
		brees: [bree],
		logger,
		timeoutMs: 5000
	});
	graceful.listen();

	if (args.includes('--open')) {
		open(`http://${API_HOST}:${API_PORT}`);
	}
}

start();
