import { apiRequest } from './api-request.js';
import mitt from 'mitt';

export function getStreamedResponse(url, args) {
	const emitter = mitt();
	apiRequest(url, {
		method: 'POST',
		body: args,
		stream: true
	}).then(async (response) => {
		for await (let message of parseMessages(response)) {
			const { event, data } = message;
			switch (event) {
				case 'content':
					emitter.emit('content', decode(data));
					break;
				case 'metadata':
				case 'result':
				case 'error':
					emitter.emit(event, JSON.parse(decode(data)));
					break;
				case 'end':
					emitter.emit('end');
					break;
				default:
					console.warn('received unknown event');
			}
		}
	});
	return emitter;
}

function decode(base64) {
	const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
	return new TextDecoder('utf-8').decode(bytes);
}

async function* parseMessages(response) {
	const reader = response.body.getReader();
	const decoder = new TextDecoder('utf-8');
	let isDone = false;
	do {
		const { value, done } = await reader.read();
		if (done) {
			isDone = true;
			break;
		}
		const message = decoder.decode(value);

		const messages = message.split('\n\n').filter(Boolean);
		for (let message of messages) {
			const [eventLine, dataLine] = message.split('\n');
			const [, event] = eventLine.split(': ');
			const [, data] = dataLine.split(': ');
			yield { event, data };
		}
	} while (!isDone);
}
