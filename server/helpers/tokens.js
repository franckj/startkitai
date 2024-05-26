import { decode, encode } from 'gpt-3-encoder';

import sizeOf from 'image-size';

const vision = {
	tileSize: 512,
	baseTokens: 85,
	tokensPerTile: 170
};

let models = {
	'gpt-4o': {
		type: 'chat',
		context: 128000,
		// gpt-4o always has 4096
		// tokens to use in it's response
		fixedMaxResponseTokens: 4096,
		cost: {
			input: 0.005,
			output: 0.015
		}
	},
	// chat models
	'gpt-4-turbo': {
		type: 'chat',
		context: 128000,
		// gpt-4-turbo always has 4096
		// tokens to use in it's response
		fixedMaxResponseTokens: 4096,
		cost: {
			input: 0.01,
			output: 0.03
		}
	},
	'gpt-4': {
		type: 'chat',
		context: 8192,
		cost: {
			input: 0.03,
			output: 0.06
		}
	},
	'gpt-4-32k': {
		type: 'chat',
		context: 32768,
		cost: {
			input: 0.06,
			output: 0.12
		}
	},
	'gpt-3.5-turbo': {
		type: 'chat',
		context: 4096,
		cost: {
			input: 0.0005,
			output: 0.0015
		}
	},
	// embedding models
	'text-embedding-3-large': {
		type: 'embeddings',
		dimensions: 3072,
		cost: { input: 0.00013 }
	},
	'text-embedding-3-small': {
		type: 'embeddings',
		dimensions: 1536,
		cost: { input: 0.00002 }
	},
	'text-embedding-ada-002': {
		type: 'embeddings',
		dimensions: 1536,
		cost: {
			input: 0.0001,
			output: 0
		}
	},
	// moderation
	'text-moderation-latest': {
		type: 'moderation',
		context: 32768,
		cost: {}
	},
	'text-moderation-stable': {
		type: 'moderation',
		context: 32768,
		cost: {}
	},

	// image models
	'dall-e-3': {
		type: 'image',
		cost: {
			'1024x1024': {
				standard: 0.04,
				hd: 0.08
			},
			'1024×1792': {
				standard: 0.08,
				hd: 0.12
			}
		}
	},
	'dall-e-2': {
		type: 'image',
		cost: {
			'1024x1024': {
				standard: 0.02
			},
			'512×512': {
				standard: 0.018
			},
			'256×256': {
				standard: 0.016
			}
		}
	},
	// speech models
	'tts-1': {
		type: 'tts',
		cost: {
			perCharInput: 0.00015
		}
	},
	'tts-1-hd': {
		type: 'tts',
		cost: {
			perCharInput: 0.0003
		}
	},
	'whisper-1': {
		type: 'stt',
		cost: {
			perMinuteInput: 0.006
		}
	}
};

let fineTuneCosts = {
	'gpt-3.5-turbo': {
		training: 0.008,
		input: 0.003,
		output: 0.006
	}
};

export function getModelType(model) {
	if (!models[model]) {
		throw new Error(`Model ${model} doesn't exist in the provided list of models.`);
	}
	const { type } = models[model];
	return type;
}

export function getModelTypes() {
	return Object.keys(models).map((m) => models[m].type);
}

export function getModels(type) {
	if (!type) {
		return Object.keys(models);
	}
	return Object.keys(models).filter((m) => models[m].type === type);
}

export function getEmbeddingsDimension(model) {
	return models[model].dimension;
}

/**
 * Estimates the cost of a request based on the model used and the number of input/output tokens.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.model - The model identifier (e.g., "gpt-3.5-turbo").
 * @param {Object} params.tokens - The object containing token counts.
 * @param {number} params.tokens.input - The number of input tokens.
 * @param {number} params.tokens.output - The number of output tokens.
 * @returns {number} The estimated cost of the request.
 *
 * @example
 * // Estimate cost for a gpt-4 model with 500 input tokens and 150 output tokens
 * const cost = estimateCost({
 *   model: 'gpt-4',
 *   { promptTokens, completionTokens }
 * });
 */
export function estimateCost(model, usageData) {
	if (!models[model]) {
		throw new Error(`Model ${model} doesn't exist in the provided list of models.`);
	}
	const { type } = models[model];
	switch (type) {
		case 'chat':
			return estimateChatCost(model, usageData);
		case 'image':
			return estimateImageCost(model, usageData);
		case 'moderation':
			throw new Error('Not yet implemented');
		case 'tts':
			return estimateTextToSpeechModel(model, usageData);

		case 'stt':
			return estimateSpeechToTextModel(model, usageData);
	}
}

function estimateChatCost(model, { promptTokens, completionTokens }) {
	let costPerK = models[model].cost;
	const input = (promptTokens / 1000) * costPerK.input;
	const output = (completionTokens / 1000) * costPerK.output;
	return input + output;
}

function estimateImageCost(model, { size, quality = 'standard' }) {
	const costs = models[model].cost;
	return costs[size][quality];
}

function estimateTextToSpeechModel(model, { inputTextLength }) {
	const costs = models[model].cost;
	return costs.perCharInput * inputTextLength;
}

function estimateSpeechToTextModel(model, { audioFileDurationSeconds }) {
	const costs = models[model].cost;
	const minutes = Math.round(audioFileDurationSeconds) / 60;
	return costs.perMinuteInput * minutes;
}
/**
 * Estimates the training cost based on the total number of tokens used.
 *
 * @param {Object} params - The parameters object.
 * @param {number} params.totalTokens - The total number of tokens used for training.
 * @returns {number} The estimated cost of training.
 *
 * @example
 * // Estimate training cost for 10000 tokens
 * const trainingCost = estimateTrainingCost({ totalTokens: 10000 });
 */
export function estimateTrainingCost({ totalTokens }) {
	const costPerK = fineTuneCosts['gpt-3.5-turbo'].training;
	return (totalTokens / 1000) * costPerK;
}

/**
 * Calculates the total size in tokens for an array of prompts,
 * such as the prompt used when querying the OpenAI chat endpoint.
 *
 * Useful when you're building a complex prompt and what to know
 * what to set the max_tokens value to on the response
 *
 * @param {Object[{ type, content }]} prompts - Array of prompt objects.
 * @returns {number} Total token size of the prompts.
 *
 * @example
 * const tokenSize = getTokenSize([
 *   {
 *    type: 'system',
 *    content: 'You are an AI Chat bot'
 *   }, {
 *    type: 'user',
 *    content: 'Hey there, tell me a bedtime story'
 *   }
 * ]);
 */
export function getTokenSize(prompts, { images = [] } = {}) {
	let textTokenSize = prompts.reduce((out, p) => {
		if (Array.isArray(p.content)) {
			const tokenSize = p.content.reduce(
				(o, c) => (o += c.type === 'text' ? getTokenSizeFromString(c.text) : 0),
				0
			);
			return out + tokenSize;
		}

		return out + getTokenSizeFromString(p.content ?? '');
	}, 0);

	const imageTokenSize = images.reduce((out, { base64 }) => {
		const buffer = Buffer.from(base64, 'base64');
		const uintArray = new Uint8Array(buffer);
		const { width, height } = sizeOf(uintArray);
		const tiles = Math.ceil(width / vision.tileSize) + Math.ceil(height / vision.tileSize);
		return out + vision.tokensPerTile * tiles;
	}, vision.baseTokens);

	return textTokenSize + imageTokenSize;
}

export function getMaxTokensRemaining(promptTokens, model) {
	if (!models[model]) {
		throw new Error(`Model ${model} doesn't exist in the provided list of models.`);
	}
	const { context, fixedMaxResponseTokens } = models[model];
	if (fixedMaxResponseTokens) {
		return fixedMaxResponseTokens;
	}
	return Math.max(0, context - promptTokens);
}

/**
 * Calculates the token size of a given string.
 *
 * @param {string} str - The string to calculate token size for.
 * @returns {number} The token size of the string.
 *
 * @example
 * // Calculate token size for a string
 * const size = getTokenSizeFromString('Hello world');
 */
export function getTokenSizeFromString(str) {
	return encode(str).length;
}

/**
 * Truncates a string to a specified maximum token length.
 *
 * Useful for if you have a large context to add to a prompt
 * and want to keep it under a certain number of tokens.
 *
 * @param {string} str - The string to be truncated.
 * @param {number} maxTokenLength - The maximum number of tokens allowed.
 * @returns {string} The truncated string.
 *
 * @example
 * // Truncate string to a maximum of 10 tokens
 * const truncated = truncateStringToMaxTokenLength('Very long sample text...', 10);
 */
export function truncateStringToMaxTokenLength(str, maxTokenLength) {
	const tokens = encode(str).slice(0, maxTokenLength);
	return decode(tokens);
}

export function truncateChatForModel(messages, model) {
	if (!models[model]) {
		throw new Error(`Model ${model} doesn't exist in the provided list of models.`);
	}
	const { context: maxTokenLength } = models[model];
	let tokenSize = 0;
	const cutOffIndex =
		messages.length -
		messages
			.slice()
			.reverse()
			.findIndex((item) => {
				tokenSize += getTokenSize([item]);
				const isExceeded = tokenSize > maxTokenLength;
				return isExceeded;
			});

	// If maxTokenLength isn't exceeded, return the original array
	if (cutOffIndex === messages.length + 1) return messages;
	// Truncate the array from the oldeest items up to the cutOffIndex
	let output = messages.slice(cutOffIndex);
	// if the first message is a tool response then we have to also
	// truncate it. Otherwise openai will throw an error as tool
	// responses don't make sense without the tool call message
	if (output[0].role === 'tool') {
		output = output.slice(1);
	}
	// if the last item exceeded the token length then we
	// need to truncate it
	else if (cutOffIndex === 0) {
		return output.map((message) => ({
			...message,
			content: truncateContentToMaxTokenLength(message.content, maxTokenLength)
		}));
	}
	return output;
}

function truncateContentToMaxTokenLength(content, maxTokenLength) {
	if (Array.isArray(content)) {
		return content.map((c) =>
			c.type === 'text' ? { ...c, text: truncateStringToMaxTokenLength(c.text, maxTokenLength) } : c
		);
	}
	return truncateStringToMaxTokenLength(content);
}
