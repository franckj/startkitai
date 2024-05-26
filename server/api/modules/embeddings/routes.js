import { embedFilesByUrls, saveEmbeddingsFile } from './actions.js';
import { getFileFromStorage, isStorageEnabled } from '#helpers/storage.js';

import { Readable } from 'stream';
import { combineMiddleware } from '#api/middleware/combine-middleware.js';
import { crawlAndEmbedWebsite } from '#helpers/crawl-website.js';
import { createLogger } from '#helpers/logger.js';
import fileUploadMiddleware from '#api/middleware/file-upload.js';
import { getReadableTextFromHtml } from '#helpers/crawler.js';
import licenseKeyAuthMiddleware from '#api/middleware/license-key-auth.js';
import path from 'path';
import { rateLimiterMiddleware } from '#api/middleware/rate-limiter.js';
import router from '@koa/router';
import { v1 } from 'uuid';

const logger = createLogger('embeddings');

const embeddingsMiddleware = combineMiddleware([
	licenseKeyAuthMiddleware,
	rateLimiterMiddleware({ maxPerMinute: 60 })
]);

const supportedFiles = ['.pdf', '.txt', '.docx', '.csv', '.html'];
/**
 * The Embeddings API - Your AIs memory
 *
 * {@link http://localhost:1337/api#tag/Embeddings}
 */
const uploadRouter = router();

// middleware for uploading files to embed
const upload = fileUploadMiddleware({
	dir: 'embeddings',
	field: 'file',
	overrideKey: (user, file) => {
		let fileName = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
		fileName = `${v1()}_${fileName}`;
		file.contextId = fileName;
		file.filename = fileName;
		return `${user.uuid}/embeddings/${fileName}`;
	}
});

uploadRouter.post(
	'/api/embeddings/raw',
	embeddingsMiddleware,
	fileUploadMiddleware({
		field: 'file',
		noSave: true
	}),
	async (ctx) => {
		const { user } = ctx.request;
		const { file } = ctx;
		if (!file) {
			ctx.throw(400, 'File is required');
		}
		if (!validFileType(file, supportedFiles)) {
			ctx.throw(400, 'File type not supported, please upload a .pdf, .txt, .docx, or .csv file');
		}

		const filename = await embedFileData({
			file,
			userUuid: user.uuid
		});

		logger.info('file uploaded successfully');
		ctx.body = {
			message: 'File uploaded successfully!',
			contextId: filename
		};
	}
);

uploadRouter.post('/api/embeddings/website', embeddingsMiddleware, async (ctx) => {
	const { user, body } = ctx.request;
	const { url } = body;
	const output = await crawlAndEmbedWebsite({
		user,
		websiteUrl: url,
		excludeUrls: [],
		debug: true,
		limit: 2
	});
	ctx.body = {
		contextIds: output
	};
});

/**
 * @route POST /api/embeddings/file
 *
 * request for file uploads. It uses the uploaded file and embeds it
 * If the file is successfully uploaded and processed, it responds with a success message and a context ID.
 * If no file is provided in the request, it responds with an HTTP 400 error.
 */
uploadRouter.post('/api/embeddings/file', embeddingsMiddleware, upload, async (ctx) => {
	const { user } = ctx.request;
	const { file } = ctx;
	if (!file) {
		ctx.throw(400, 'File is required');
	}
	if (!validFileType(file, supportedFiles)) {
		ctx.throw(400, 'File type not supported, please upload a .pdf, .txt, .docx, or .csv file');
	}
	if (!isStorageEnabled()) {
		ctx.throw(500, `S3 Storage is required to upload files, you'll need to set this up first.`);
	}

	const filename = await embedFileUpload({
		file,
		userUuid: user.uuid
	});
	logger.info('file uploaded successfully');
	ctx.body = {
		message: 'File uploaded successfully!',
		contextId: filename
	};
	return;
});

/**
 * @route POST /api/embeddings/csv
 *
 * Work in progress
 */
uploadRouter.post('/api/embeddings/csv', embeddingsMiddleware, upload, async (ctx) => {
	const { user } = ctx.request;
	const { file } = ctx;

	if (!file) {
		ctx.throw(400, 'File is required');
	}
	if (!validFileType(file, ['.csv'])) {
		ctx.throw(400, 'File type not supported, please upload a .csv file');
	}
	if (!isStorageEnabled()) {
		ctx.throw(500, `S3 Storage is required to upload csv files, you'll need to set this up first.`);
	}

	await getFileFromStorage({
		userUuid: user.uuid,
		filename: file.originalname,
		raw: true
	});
	// todo
});

/**
 * @route POST /api/embeddings/urls
 *
 * Upload files that are accessible at the giving URLs
 */
uploadRouter.post('/api/embeddings/urls', embeddingsMiddleware, async (ctx) => {
	const { body } = ctx.request;
	const { userUuid, urls, contextId, namespace } = body;
	ctx.body = new Readable({ read() {} });

	if (!userUuid) {
		ctx.throw(400, 'User UUID is required');
	}
	if (!Array.isArray(urls) || !urls.length) {
		ctx.throw(400, 'urls is required');
	}

	let done = 0;
	for await (let documentId of embedFilesByUrls({ userUuid, urls, contextId, namespace })) {
		done += 1;
		ctx.res.write(JSON.stringify({ percentage: done / urls.length, documentId }));
	}

	ctx.res.end();
});

/**
 * Asynchronously uploads a file to an embedding storage and registers it for later retrieval.
 * This function retrieves the file from storage, saves it with specific metadata, and returns
 * a context id for later access for RAG.
 *
 * @param {Object} params - The parameters for file embedding.
 * @param {Object} params.file - The file object containing information about the file.
 * @param {string} params.file.filename - The name of the file in the storage.
 * @param {string} params.userUuid - The UUID of the user associated with this file.
 * @returns {Promise<string>} A promise that resolves to the context ID used for future access.
 */
async function embedFileUpload({ file, userUuid }) {
	const fileData = await getFileFromStorage({
		userUuid: userUuid,
		destinationPath: `embeddings/${file.filename}`,
		raw: true
	});
	let embeddingsFile;

	// extract relevant text before embedding the file
	// (optional) if there are any other ways you want to extract text
	// from things then you can add them here by mimetype
	if (file.mimetype === 'text/html') {
		// for example, we get the most relevant text from html
		// files so that we don't need to embed all <html> tags
		// which would be costly and not very helpful
		const text = getReadableTextFromHtml(fileData.toString('utf8'));
		const buffer = Buffer.from(text, 'utf8');
		embeddingsFile = {
			buffer,
			filename: file.originalname,
			contentType: 'text/plain',
			size: buffer.length
		};
		const contextId = file.filename;
		await saveEmbeddingsFile({
			file: embeddingsFile,
			namespace: userUuid,
			userUuid,
			contextId
		});
		return contextId;
	} else {
		embeddingsFile = {
			buffer: fileData,
			filename: file.originalname,
			contentType: file.mimetype,
			size: fileData.length
		};
		const contextId = file.filename;
		await saveEmbeddingsFile({
			file: embeddingsFile,
			namespace: userUuid,
			userUuid,
			contextId
		});
		return contextId;
	}
}

async function embedFileData({ file, userUuid }) {
	await saveEmbeddingsFile({
		userUuid,
		admin: false,
		store: false,
		file,
		namespace: 'global',
		contextId: file.originalname
	});
	return file.originalname;
}

function validFileType(file, validExtensions = []) {
	const ext = path.extname(file.filename || file.originalname).toLowerCase();
	return validExtensions.includes(ext);
}
export default uploadRouter;
