/**
 * Koa middleware to put the raw body of the request on the
 * request object. Without this there's no access to the raw
 * body as the bodyParser middleware removes it after parsing
 */
export async function rawBody(ctx, next) {
	const rawData = await new Promise((resolve, reject) => {
		let d = [];
		ctx.req.on('data', (chunk) => d.push(chunk));
		ctx.req.on('end', () => resolve(d));
		ctx.req.on('error', reject);
	});
	ctx.rawBody = Buffer.concat(rawData);
	return next();
}
