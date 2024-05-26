import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';

import { getConfigFile } from '#helpers/configs.js';
import { toFile } from 'openai';

const sstSettings = getConfigFile('prompts/speech/speech-to-text.yml');

export async function transcribeAudio({ audioFile, language }) {
	const { transcription, usage } = await translateAudioToEnglishText({ audioFile, language });
	return { transcription, usage };
}

export async function translateAudioToEnglishText({
	audioFile,
	language,
	prompt = sstSettings.prompt,
	key
}) {
	const openai = getOpenAIProvider(key);
	const file = await toFile(audioFile.buffer, audioFile.originalname, {
		type: audioFile.mimetype
	});
	const { output, model } = await retryWithFallbacks(
		async (model) => {
			return {
				output: await openai.audio.translations.create({
					file,
					language,
					model: 'whisper-1',
					...sstSettings.options,
					prompt: prompt ?? ''
				}),
				model
			};
		},
		{
			models: sstSettings.models
		}
	);
	const { duration } = output;
	return {
		transcription: output,
		usage: {
			model,
			audioFileDurationSeconds: Math.round(duration) // usage is rounded to nearest seconds
		}
	};
}
