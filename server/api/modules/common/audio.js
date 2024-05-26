import { createLogger } from '#helpers/logger.js';
import mm from 'music-metadata';

const logger = createLogger('common-audio');
/**
 * Retrieves the duration of an audio file from a buffer.
 *
 * This function uses the `music-metadata` library to parse the audio metadata from a buffer
 * and extract the duration of the audio in seconds.
 *
 * @param {Buffer} buffer - The buffer containing audio file data.
 * @returns {Promise<number>} A promise that resolves with the duration of the audio in seconds.
 * @throws {Error} If there is an error parsing the buffer, an error is thrown.
 *
 */
export async function getAudioDurationFromBuffer(audioBuffer) {
	try {
		const metadata = await mm.parseBuffer(audioBuffer, null, { duration: true });
		const duration = metadata.format.duration; // Duration in seconds
		console.log(`The audio is ${duration} seconds long.`);
		return duration;
	} catch (err) {
		logger.warn('something went wrong getting the duration of an audio upload', err);
		return 0;
	}
}
