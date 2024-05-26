import KoaRouter from '@koa/router';
import authRouter from '#api/auth/routes.js';
import connect from 'koa-connect';
import { createLogger } from '#helpers/logger.js';
import { createServer } from 'vite';
import { errorHandlingMiddleware } from '#api/middleware/error-handling.js';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { getAdminUser } from '#database/users.js';
import path from 'path';
import serve from 'koa-static';
import startupRouter from '#api/admin/startup.js';
import { streamEventsMiddleware } from '#api/middleware/stream-events.js';
import userRouter from '#api/users.js';

const logger = createLogger('routes');
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let moduleNames = ['chat', 'embeddings', 'images', 'text', 'detect', 'moderation', 'speech'];

export async function createRoutes(app) {
	app.use(errorHandlingMiddleware);
	app.use(streamEventsMiddleware);
	await serveModules(app);
	await serveOtherRoutes(app);
	logger.success(`created api routes`);
}

/**
 * You can add any more routes that you want here
 * */
async function serveOtherRoutes(app) {
	await serveStartupRoute(app);
	// start: growth
	const stripe = await import('#api/webhooks/stripe.js');
	app.use(stripe.default.routes(), stripe.default.allowedMethods({ throw: true }));
	const admin = await import('#api/admin/routes.js');
	admin.createAdminRoutes(app);
	// end: growth
	serveAPIDocs(app);
	await serveFrontend(app);
	// finally handle any 404s, this should always be the last thing loaded
	handle404s(app);
}

/**
 * Serves our AI modules from the ./modules directory
 *
 * If there are any modules that you don't want to use
 * then you can simply delete their folder from the modules
 * directory and they just wont be loaded
 */
async function serveModules(app) {
	const modulesRouter = new KoaRouter();

	const modules = await Promise.all(
		moduleNames.map(async (name) => {
			const modulePath = path.join(__dirname, 'modules', name, 'routes.js');
			if (await moduleExists(modulePath)) {
				const module = await import(modulePath);
				logger.debug(`loaded ${modulePath}`);
				return module;
			} else {
				logger.debug(`didn't load ${modulePath}`);
				return null;
			}
		})
	);

	for (let module of modules.filter(Boolean)) {
		modulesRouter.use(module.default.routes(), module.default.allowedMethods({ throw: true }));
	}

	// attach all the routes to the main app router
	app.use(modulesRouter.routes(), modulesRouter.allowedMethods({ throw: true }));
	// load the router that handles the authentication
	app.use(authRouter.routes(), authRouter.allowedMethods({ throw: true }));
	// and our basic user routes
	app.use(userRouter.routes(), userRouter.allowedMethods({ throw: true }));
}

/**
 * the first time you start the startkit.ai server
 * you'll be presented with the start screen in order
 * to set some configuration variables
 * feel free to remove this route afterwards if you like
 */
async function serveStartupRoute(app) {
	const adminUser = await getAdminUser();
	const adminExists = !!adminUser?.user?.uuid;

	const router = startupRouter(adminExists);
	app.use(router.routes(), router.allowedMethods({ throw: true }));
}

/**
 * In Development mode we serve the API reference at /api
 */
function serveAPIDocs(app) {
	if (process.env.NODE_ENV !== 'production') {
		const apiRouter = new KoaRouter();
		const docsPath = path.join(__dirname, '..', 'docs');
		apiRouter.get('/api', async (ctx) => {
			let template = await fs.readFile(`${docsPath}/index.html`, 'utf8');
			ctx.body = template;
		});
		apiRouter.get('/api/openapi.build.yaml', async (ctx) => {
			ctx.body = await fs.readFile(`${docsPath}/openapi.build.yaml`, 'utf8');
		});
		app.use(apiRouter.routes(), apiRouter.allowedMethods({ throw: true }));
	}
}

/**
 * Handle all remaining calls /api by sending a 404
 */
function handle404s(app) {
	const notFoundRouter = new KoaRouter();
	notFoundRouter.all('/api/(.*)', (ctx) => {
		ctx.throw(404, `No API route '${ctx.request.url}'`, {
			code: 'not_found'
		});
	});
	app.use(notFoundRouter.routes(), notFoundRouter.allowedMethods({ throw: true }));
}

/**
 * Hosting for the Admin Dashboard and demos
 *
 * In development we set up a Vite server programatically
 * for performing hot-reloading when files change in /web
 *
 * In production we simply serve the built code from
 * the /dist directory
 */
async function serveFrontend(app) {
	if (process.env.NODE_ENV !== 'production') {
		const clientPath = path.join(__dirname, '..', '..', 'web');
		// Create Vite server in middleware mode.
		// This serves the Demos and Admin Dashboard
		const vite = await createServer({
			server: { middlewareMode: 'html' },
			appType: 'custom',
			configFile: 'vite.config.js',
			root: clientPath
		});

		// Use Vite's connect instance as middleware
		app.use(connect(vite.middlewares));

		// serve the static assets
		const assetsPath = path.join(__dirname, '..', '..', 'web/public');
		app.use(serve(assetsPath));

		// everything else is caught by this route which renders our Vite
		// SPA react project, and returns the HTML.
		app.use(async (ctx, next) => {
			const url = ctx.req.originalUrl;
			try {
				// 1. Read index.html
				let template = await fs.readFile(`${clientPath}/index.html`, 'utf8');
				// 2. Apply Vite HTML transforms. This injects the Vite HMR client,
				//    and also applies HTML transforms from Vite plugins
				template = await vite.transformIndexHtml(url, template);
				// 3. If you're going to do any SSR, then here is where you'd do it.
				// [SSR]
				// 4. Return the modified HTML
				ctx.set('Content-Type', 'text/html');
				ctx.body = template;
			} catch (e) {
				// If an error is caught, let Vite fix the stack trace so it maps back
				// to your actual source code.
				vite.ssrFixStacktrace(e);
				next();
			}
		});
	} else {
		const assetsPath = path.join(__dirname, '..', '..', 'dist');
		const template = await fs.readFile(`${assetsPath}/index.html`, 'utf8');
		app.use(serve(assetsPath));
		app.use(async (ctx) => {
			ctx.set('Content-Type', 'text/html');
			ctx.body = template;
		});
	}
}

async function moduleExists(filePath) {
	try {
		await fs.access(filePath);
		return true;
	} catch (err) {
		if (err.code === 'ENOENT') {
			return false;
		} else {
			throw err;
		}
	}
}
