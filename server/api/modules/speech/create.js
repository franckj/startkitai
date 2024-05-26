import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

import { getConfigFile } from '#helpers/configs.js';
import { translateAudioToEnglishText } from './transcribe.js';

const ttsSettings = getConfigFile('prompts/speech/text-to-speech.yml');

/**
 * Creates audio from the given text using OpenAI's speech synthesis.
 *
 * @param {string} text - The text to be converted to speech.
 * @param {Object} [options={}] - The options for speech synthesis.
 * @param {number} [options.speed] - The speed of the speech.
 * @param {string} [options.voice] - The voice model to be used for speech synthesis.
 * @returns {Promise<Buffer>} A promise that resolves with the audio buffer in MP3 format.
 */
export async function createAudioFromText(
	text,
	{ speed = ttsSettings.options.speed, voice = ttsSettings.options.voice, key } = {}
) {
	const openai = getOpenAIProvider(key);
	const { output, model } = await retryWithFallbacks(
		async (model) => {
			return {
				output: await openai.audio.speech.create({
					model,
					input: text,
					...ttsSettings.options,
					speed,
					voice
				}),
				model
			};
		},
		{ models: ttsSettings.models }
	);

	const audioBuffer = Buffer.from(await output.arrayBuffer());
	return {
		audioBuffer,
		responseFormat: ttsSettings.options.response_format,
		usage: {
			model,
			inputTextLength: text.length
		}
	};
}

export async function translateAudioToAudio({ audioFile, language, key }) {
	const { transcription, usage: sttUsage } = await translateAudioToEnglishText({
		audioFile,
		language,
		key
	});
	const { text } = transcription;
	const { audioBuffer, usage: ttsUsage } = await createAudioFromText(text, { key });

	return {
		audioBuffer,
		responseFormat: ttsSettings.options.response_format,
		usage: [sttUsage, ttsUsage]
	};
}
