import { createAudioFromText, translateAudioToAudio } from './create.js';
import usageLimiter, { createUsageResponse } from '#api/middleware/usage-limiter.js';

import { Readable } from 'stream';
import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import { createLogger } from '#helpers/logger.js';
import fileUploadMiddleware from '#api/middleware/file-upload.js';
import fs from 'fs';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import mime from 'mime';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';
import { transcribeAudio } from './transcribe.js';

const logger = createLogger('speech');

/**
 * The Speech API
 *
 * {@link http://localhost:1337/api#tag/Speech}
 */
const speechRouter = router();

const ttsMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 }),
	// start: usage-limits
	usageLimiter('tts')
	// end: usage-limits
]);

const sttMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 }),
	// start: usage-limits
	usageLimiter('stt')
	// end: usage-limits
]);

// file uploader. We don't save the audio
// that's uploaded
const audioUpload = fileUploadMiddleware({
	dir: 'audio',
	field: 'audio',
	noSave: true
});

/**
 * Route handler for converting text to speech.
 * The response streams an mp3 back to the client
 *
 * @route POST /from-text
 * @param {Object} ctx - The Koa context object.
 * @param {Object} ctx.request.body - The request body containing the text and speed.
 * @param {string} ctx.request.body.text - The text to be converted to speech.
 * @param {number} [ctx.request.body.speed] - The speed at which the text should be spoken (optional).
 */
speechRouter.post('/api/speech/from-text', ttsMiddleware, async (ctx) => {
	const { body, key } = ctx.request;
	const { text, speed } = body;
	if (!text) {
		return ctx.throw(400, 'text is required');
	}
	const { audioBuffer, responseFormat, usage } = await createAudioFromText(text, { speed, key });
	ctx.set('Content-Length', audioBuffer.length.toString());
	ctx.set('Content-Type', mime.getType(responseFormat));
	createUsageResponse(ctx, usage);
	ctx.body = audioBuffer;
});

speechRouter.post('/api/speech/translate/from-audio', sttMiddleware, audioUpload, async (ctx) => {
	const { key } = ctx.request;
	const audioFile = ctx.file;
	if (!audioFile) {
		return ctx.throw(400, 'file named "audio" is required');
	}
	const { language, prompt } = ctx.request.body;
	const { audioBuffer, responseFormat, usage } = await translateAudioToAudio({
		audioFile: audioFile.buffer,
		prompt,
		language,
		key
	});

	ctx.set('Content-Length', audioBuffer.length.toString());
	ctx.set('Content-Type', mime.getType(responseFormat));
	createUsageResponse(ctx, usage);
	ctx.body = audioBuffer;
});

speechRouter.post('/api/speech/transcribe', sttMiddleware, audioUpload, async (ctx) => {
	const { key } = ctx.request;
	const audioFile = ctx.file;
	if (!audioFile) {
		return ctx.throw(400, 'file named "audio" is required');
	}
	const { language, prompt } = ctx.request.body;
	const { transcription, usage } = await transcribeAudio({
		audioFile: audioFile,
		language,
		prompt,
		key
	});
	createUsageResponse(ctx, usage);
	ctx.body = { transcription, usage };
});

/* eslint-disable */
/**
 * Work In Progress
 *
 * This function is an attempt by Jivings to create a more "live"
 * voice chat, where we split the messages into
 * chunks and convert them to audio a chunk at a time
 */
speechRouter.post('/api/speech/chat', sttMiddleware, async (ctx) => {
	ctx.set('Content-Type', 'audio/mpeg');
	ctx.set('Transfer-Encoding', 'chunked');
	const audioFile = ctx.request.files.audio;
	const { history = [] } = ctx.request.body ?? {};
	const audioBuffer = fs.createReadStream(audioFile.filepath);
	logger.info('converting audio to text');
	const { text } = await translateAudioToEnglishText({ audioFile: audioBuffer });
	logger.info('fetching reply', text);

	ctx.body = new Readable({ read() {} });

	let chunksOfReply = [];

	const stream = await openai.chat.completions.create({
		model: 'gpt-4-turbo',
		messages: [
			{
				role: 'system',
				content:
					"You're a live speaking chatbot, the messages you receive are transcribed from live audio. Keep your replies short as they are being converted to audio. Split your reply into lines, one line for each sentence so that it can be converted to audio easily."
			},
			...history,
			{
				role: 'user',
				content: text
			}
		],
		stream: true
	});

	for await (const chunk of stream) {
		const content = chunk.choices[0]?.delta?.content || '';
		if (content.endsWith('\n')) {
			logger.info('getting audio chunk', chunksOfReply.join(''));
			createAudioFromText(chunksOfReply.join('')).then((audio) => {
				logger.info('replying with audio chunk');
				ctx.res.write(audio);
			});
			chunksOfReply = [];
		} else {
			chunksOfReply.push(content);
		}
	}
	logger.info('finished reply');
	ctx.res.end();
});
/* eslint-enable */

export default speechRouter;
