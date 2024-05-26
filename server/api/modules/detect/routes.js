import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import fileUploadMiddleware from '#api/middleware/file-upload.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import logger from '#helpers/logger.js';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';

let c2pa;
try {
	const { createC2pa } = await import('c2pa-node');
	c2pa = createC2pa();
} catch (err) {
	logger.warn(`c2pa-node couldn't be loaded so /api/detect endpoint will not work`);
}

let AISourceTypes = [
	'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia',
	'http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia',
	'http://cv.iptc.org/newscodes/digitalsourcetype/algorithmicMedia'
];
/**
 * Detect API
 *
 * Detect if a piece of content is AI generated or not.
 *
 * Uses the ContentCredentials manifest to check to
 * see if an image was created by AI
 *
 * Note: Absence of ContentCredentials metadata doesn't
 * mean that the image was not AI generated, as the
 * metadata could be removed or never added
 *
 * See {@link https://contentcredentials.org/} for more info.
 */
const verifyAiRouter = router();

const upload = fileUploadMiddleware({ noSave: true, field: 'file' });

const detectMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 })
]);

/**
 *
 * Route to verify if images were created using AI.
 *
 * @route POST /verify/file
 *
 * @param {Object} ctx - The Koa request/response context object.
 * @param {Object} ctx.file - The uploaded file object.
 * @param {Buffer} ctx.file.buffer - The buffer containing file data.
 * @param {string} ctx.file.mimetype - The MIME type of the file.
 *
 * This route handles the POST request to verify images. It expects a file to be uploaded,
 * processes it with the c2pa library to read digital signatures, and returns verification results.
 *
 * If the file is not provided, it responds with a 400 status code indicating that a file is required.
 * If verification is successful, it returns an object with verification details.
 *
 * See {@link https://contentcredentials.org} for more details.
 *
 * If the image contains no verification data, then that does not mean it's not AI generated, as the
 * metadata could be removed or never added. So always treat a false response as inconclusive.
 */
verifyAiRouter.post('/file', detectMiddleware, upload, async (ctx) => {
	if (!c2pa) {
		ctx.throw(
			500,
			'To use the verify endpoint, make sure that the module Sharp is installed on your system - `yarn add sharp --ignore-engines`'
		);
	}
	const file = ctx.file;
	if (!file) {
		ctx.throw(400, 'A file is required');
	}

	const result = await c2pa.read({ buffer: file.buffer, mimeType: file.mimetype });
	let aiActions = [];
	if (result) {
		try {
			const { manifests, active_manifest, validation_status } = result;
			for (let urn of Object.keys(manifests)) {
				const m = manifests[urn];
				for (let { label, data } of m.assertions) {
					if (label === 'c2pa.actions') {
						for (let a of data.actions) {
							const { action, digitalSourceType } = a;
							if (AISourceTypes.includes(digitalSourceType)) {
								aiActions.push(action);
							}
						}
					}
				}
			}

			ctx.body = {
				verifiedAIGenerated: aiActions.length > 0 ? 'yes' : 'no',
				aiActions,
				result: {
					activeManifest: active_manifest,
					manifestChain: manifests,
					validationStatus: validation_status
				}
			};
		} catch (err) {
			ctx.body = { verifiedAIGenerated: 'unconfirmed', result: null, error: err.message };
		}
	} else {
		ctx.body = { verifiedAIGenerated: 'unconfirmed', result: null };
	}
});

export default verifyAiRouter;
