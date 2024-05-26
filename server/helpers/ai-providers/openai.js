import OpenAI from 'openai';
import { createLogger } from '#helpers/logger.js';
import pRetry from 'p-retry';

const logger = createLogger('openai');

const openai = new OpenAI({
	apiKey: process.env.OPENAI_KEY
});

export function getOpenAIProvider(key) {
	if (key?.openaiKey) {
		return new OpenAI({
			apiKey: key.openaiKey
		});
	}
	return openai;
}

export async function retryWithFallbacks(run, opts) {
	let currentModelIndex = 0;

	const result = await pRetry(
		() => {
			if (opts.models) {
				const model = opts.models[currentModelIndex];
				return run(model);
			}
			return run();
		},
		{
			onFailedAttempt: (error) => {
				logger.info(`openai request failed: ${error.message}`);
				logger.info(`attempting to retry`);
				const { retry, action } = getRetryAction(error.status, error.attemptNumber);
				if (!retry) {
					throw parseError(error);
				} else {
					if (action === 'next-model') {
						if (opts.models?.[currentModelIndex + 1]) {
							logger.info(
								`retrying openai request with fallback model ${opts.models?.[currentModelIndex + 1]} after previous attempt failed.`
							);
							currentModelIndex += 1;
						}
					} else {
						logger.info(`retrying openai request after attempt ${error.attemptNumber} failed.`);
					}
				}
			},
			minTimeout: 500,
			maxTimeout: 5000,
			retries: 5,
			factor: 1.5,
			...opts
		}
	);
	return result;
}

function getRetryAction(status, attemptCount) {
	const statuses = {
		400: { retry: false },
		401: { retry: false },
		403: { retry: false },
		// the model doesn't exist
		404: { retry: true, action: 'next-model' },
		// the rate limit has been exceeded so don't retry
		429: { retry: false },
		// the model is overloaded so use the next one in the list
		503: { retry: true, action: 'next-model' },
		// something has gone wrong, try again a few times then
		// use the next model in the list
		500: { retry: true, action: 'next-model', attempts: 3 }
	};
	if (!statuses[status]) {
		// there was a code error on our side, so lets
		// retry and then try the next model anyway just in case
		return { retry: true, action: 'next-model', attempts: 1 };
	}
	const { retry, action, attempts } = statuses[status];
	if (attempts && attemptCount < attempts) {
		return { retry: true };
	}
	return { retry, action, attempts };
}

function parseError(err) {
	const { status, error } = err;

	if (err instanceof OpenAI.APIError) {
		let errResponse = {
			status,
			code: error.code,
			message: error.message,
			error: err
		};
		/**
		 * (Optional): return customised error messages per type
		 */
		// if (err instanceof OpenAI.BadRequestError) {}
		// if (err instanceof OpenAI.AuthenticationError) {}
		// if (err instanceof OpenAI.PermissionDeniedError) {}
		// if (err instanceof OpenAI.NotFoundError) {}
		// if (err instanceof OpenAI.UnprocessableEntityError) {}
		// if (err instanceof OpenAI.RateLimitError) {}
		// if (err instanceof OpenAI.InternalServerError) {}
		// if (err instanceof OpenAI.APIConnectionError) {}
		return errResponse;
	}

	// if the error is not an OpenAI API error then handle it in the same way
	// but abstract the internal error message from the client
	return {
		status: 500,
		code: 'provider-error',
		message: `Something went wrong trying to request OpenAI`,
		error: err
	};
}

export default openai;
