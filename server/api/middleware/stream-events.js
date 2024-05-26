import { Readable } from 'stream';
import { createUsageResponse } from './usage-limiter.js';

/**
 * Koa middleware that enables streaming back to the client.
 *
 * This is used for chat and text endpoints that stream their
 * typing animations
 *
 * See https://startkit.ai/docs/advanced/streaming for more info
 */
export function streamEventsMiddleware(ctx, next) {
	const { header } = ctx.request;
	if (header?.accept !== 'text/event-stream') {
		return next();
	}
	// this is the most consistent way I've found to make streaming
	// work with Koa. I suggest not changing this...
	ctx.body = new Readable({ read() {} });
	const { asJson } = ctx.request.query;
	// helper function for sending data on the event-stream
	ctx.res.sendMessage = function ({ type, data = {} }) {
		ctx.res.write(`event: ${type}\n`);
		let output = typeof data === 'string' && !asJson ? data : JSON.stringify(data);
		if (asJson) {
			output = output.split('\n\n');
		} else {
			output = Buffer.from(output).toString('base64');
		}
		ctx.res.write(`data: ${output}\n\n`);
	};

	// set the event-stream headers
	ctx.req.socket.setTimeout(0);
	ctx.req.socket.setNoDelay(true);
	ctx.req.socket.setKeepAlive(true);
	ctx.set({
		'Content-Type': 'text/event-stream',
		// disable caching of this response
		'Cache-Control': 'no-cache',
		// keep the connection open
		Connection: 'keep-alive',
		// this will stop an nginx proxy server from buffering the responses,
		// which would slow it down
		'X-Accel-Buffering': 'no'
	});

	ctx.req.on('close', () => {
		// End the response when the client closes the connection
		ctx.streamClosed = true;
	});
	return next();
}

/**
 * Streams a chat response back to the client, returning usage limits
 *
 * @param {Object} ctx - The Koa context object representing the request/response.
 * @param {Object} generatorFn - A generator function* that yields metadata, content and a result
 *
 * See https://startkit.ai/docs/advanced/streaming for more info
 */
export async function streamedResponse(ctx, generatorFn) {
	if (!ctx.res.sendMessage) {
		throw new Error(
			'You must include the streamEventsMiddleware() first in order to use streamed responses'
		);
	}
	const streamResponse = await generatorFn;
	if (isIterator(streamResponse)) {
		for await (let message of streamResponse) {
			const ok = handleMessage(ctx, message);
			if (!ok) {
				break;
			}
		}
	} else {
		streamResponse.on('data', (message) => handleMessage(ctx, message));
		streamResponse.on('error', (error) => {
			throw error;
		});
	}

	ctx.status = 200;
}

function handleMessage(ctx, message) {
	if (ctx.streamClosed) {
		return false;
	}
	if (message.type === 'error') {
		// send the error to the client to handle
		ctx.res.sendMessage({ type: 'error', data: message.data });
		// and throw it in the server to handle
		return false;
	}
	if (message.type === 'metadata') {
		ctx.res.sendMessage({ type: 'metadata', data: message.data });
	}
	// then the content will be received
	else if (message.type === 'content') {
		ctx.res.sendMessage({ type: 'content', data: message.data });
	}
	// finally a bit more metadata regarding the total
	// output of the request
	else if (message.type === 'result') {
		const usageResponse = createUsageResponse(ctx, message.data.usage);
		const totalCost = usageResponse.reduce((out, item) => out + item.cost, 0);
		const models = usageResponse
			.map((item) => item.model)
			.filter(Boolean)
			.join(', ');

		ctx.res.sendMessage({
			type: 'result',
			data: { cost: totalCost, model: models, chatUuid: message.data.chatUuid }
		});
		ctx.res.sendMessage({ type: 'end' });
		ctx.res.end();
	}
	return true;
}

function isIterator(obj) {
	return obj != null && typeof obj === 'object' && typeof obj.next === 'function';
}
