import { embedFilesByUrls, getStats, saveEmbeddingsFile } from '#api/modules/embeddings/actions.js';

import { Readable } from 'stream';
import { adminAuth } from './admin-auth.js';
import fileUploadMiddleware from '#api/middleware/file-upload.js';
import router from '@koa/router';
import { v1 } from 'uuid';

const adminEmbeddingsRouter = router();

const upload = fileUploadMiddleware({
	dir: 'embeddings',
	field: 'file',
	noSave: true,
	overrideKey: (user, file) => {
		let fileName = file.originalname.toLowerCase().replace(/[^a-z0-9.]/g, '-');
		fileName = `${v1()}_${fileName}`;
		file.contextId = fileName;
		file.filename = fileName;
		return `admin/embeddings/${fileName}`;
	}
});

adminEmbeddingsRouter.get('/api/admin/embeddings', adminAuth, async (ctx) => {
	try {
		ctx.body = await getStats();
	} catch (err) {
		ctx.throw(
			400,
			'Failed to get stats from the vector database, is the retrieval plugin running?'
		);
	}
});

adminEmbeddingsRouter.post('/api/admin/embeddings/file', adminAuth, upload, async (ctx) => {
	const { namespace, contextId } = ctx.request.body;
	if (ctx.file) {
		// embed the file
		const { filename } = await saveEmbeddingsFile({
			file: ctx.file,
			namespace,
			admin: true,
			contextId
		});

		ctx.body = {
			message: 'File uploaded successfully!',
			fileInfo: ctx.file,
			contextId: filename
		};
	} else {
		ctx.throw(400, 'Please upload a PDF file.');
	}
});

adminEmbeddingsRouter.post('/api/admin/embeddings/urls', adminAuth, async (ctx) => {
	const { body } = ctx.request;
	const { urls, contextId, namespace } = body;
	ctx.body = new Readable({ read() {} });

	let done = 0;
	for await (let documentId of embedFilesByUrls({ admin: true, urls, contextId, namespace })) {
		done += 1;
		ctx.res.write(JSON.stringify({ percentage: done / urls.length, documentId }));
	}
	// const documentIds = await embedFilesByUrls({ userUuid, urls, contextId, namespace });
	ctx.res.end();
});

export default adminEmbeddingsRouter;
