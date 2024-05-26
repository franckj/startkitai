/**
 * A promise waterfall is a sequence where you have a bunch of asynchronous actions that need to be performed
 * one after the other, each waiting for the previous one to complete before starting.
 *
 * Imagine a line of dominoes falling one by one; that's how a promise waterfall behaves, but with promises.
 * Each promise is like a domino that needs the one before it to fall (resolve) before it can start (be executed).
 *
 * This function allows you to chain together AI API calls so that each function passes it's output
 * onto the next function in the chain.
 *
 * This is useful when you have a complex prompt and you need to break it down into smaller parts to
 * make it easier for the AI to understand.
 *
 * For example:
 * 	1) Translate the text to English
 * 		2) Summarize the translation
 * 			3) Explain how the summary might cause confusion to non-native English speakers
 *
 * The implementation for this example would look like this:
 *
 * const emitter = new EventEmitter
 * waterfall(emitter, [
 * 	 () => {
 * 	   return translateText();
 *   },
 * 	 (translation) => {
 * 	   return summarizeTranslation(translation);
 *   },
 * 	 (translation, summary) => {
 * 	   return explainTranslationSummary(translation, summary);
 *   }
 * ]);
 *
 * The EventEmitter will emit `metadata` type events when each step of the waterfall is started
 * and finished, and will stream the response `content` from the AI endpoint (if your waterfall
 * functions return a stream), in the normal way we stream responses.
 * See {@link https://startkit.ai/docs/advanced/streaming|Streaming Responses}
 *
 * emitter.on('data', ({ type, data }) => {
 *   if (type === 'metadata' && data.event === 'step-started' ) {
 * 	   console.log(`Step ${data.step} started`);
 *   }
 *   else if (type === 'metadata' && data.event === 'step-complete' ) {
 * 	   console.log(`Step ${data.step} complete`);
 *   }
 *   else if (type === 'content) {
 *     console.log(`Content: ${data.content}`)
 *   }
 * });
 *
 * @param {EventEmitter} emitter - Will emit the data above during the waterfall
 * @param {*} fns - The functions to execute as part of the waterfall
 * @returns A promise that resolves to an array containing the outputs of each function in the waterfall
 */
export async function waterfall(emitter, fns) {
	let outputs = [];
	let step = 1;

	for (const fn of fns) {
		let currentOutput = '';
		const result = await fn.apply(this, outputs);
		let stream = result.stream || result;
		if (isIterator(stream)) {
			emitter.emit(`data`, {
				type: 'metadata',
				data: { event: `step-started`, step: result.step ?? step, meta: result.meta ?? {} }
			});
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || '';
				if (content) {
					currentOutput += content;
					emitter.emit(`data`, {
						type: 'content',
						data: { step: result.step ?? step, content, meta: result.meta ?? {} }
					});
				}
			}
			outputs.push(currentOutput);
			emitter.emit(`data`, {
				type: 'metadata',
				data: { event: `step-complete`, step: result.step ?? step, meta: result.meta ?? {} }
			});
		} else {
			outputs.push(result);
		}

		step += 1;
	}
	return outputs;
}

/**
 * Parallel promises are like a bunch of friends running different errands at the same time.
 * They all start and finish their tasks independently and don't wait for each other.
 * Once everyone is done, they meet up and share what they've accomplished.
 *
 * In the promises world, this allows you to kick off several asynchronous operations
 * simultaneously, and they all process in the background without affecting each other.
 *
 * This function allows you to specify multiple AI functions to run at the same time
 * and stream them all to a common EventEmitter.
 *
 * This can be combined with the waterfall function.
 *
 * This is useful when you have several prompts and you want to aggregate their responses
 * into a single output. For example, summarizing 10 websites individually and using the
 * outputs to analyze what the websites have in common.
 *
 * const emitter = new EventEmitter();
 * const webpages = ['https://example.com/page-1', 'https://example.com/page-2', 'https://example.com/page-3']
 * const summaries = await parallel(
 *   emitter,
 *   webpages.map(page => summarizePage(page)})
 * );
 *
 * Or combined with waterfall:
 *
 * const emitter = new EventEmitter();
 * const webpages = ['https://example.com/page-1', 'https://example.com/page-2', 'https://example.com/page-3']
 * waterfall(emitter, [
 * 	  () => parallel(
 *     emitter,
 *     webpages.map(page => summarizePage(page)})
 *   ),
 *   (summaries) => explainSummaries(summaries)
 * ]
 *
 * @param {EventEmitter} emitter - Will emit the data from each promise
 * @param {*} fns - The functions to execute
 * @returns A promise that resolves to an array containing the outputs of each function
 */
export async function parallel(emitter, fns) {
	return Promise.all(
		fns.map(async (fn, step) => {
			const result = typeof fn === 'function' ? await fn() : await fn;
			let stream = result.stream || result;
			let output = '';

			if (isIterator(stream)) {
				for await (const chunk of stream) {
					const content = chunk.choices[0]?.delta?.content || '';
					if (content) {
						output += content;
						emitter.emit(`data`, {
							type: 'content',
							data: {
								content,
								step: result.step ?? step,
								meta: result.meta ?? {}
							}
						});
					}
				}
				emitter.emit(`data`, {
					type: 'metadata',
					data: {
						event: `step-complete`,
						step: result.step ?? step,
						meta: result.meta ?? {}
					}
				});
			} else {
				output = stream;
			}
			return output;
		})
	);
}

function isIterator(obj) {
	return (
		(obj != null && typeof obj === 'object' && typeof obj.next === 'function') ||
		typeof obj.iterator !== 'undefined'
	);
}
