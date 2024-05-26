import { deleteFileFromStorage, getS3Client, isStorageEnabled } from '#helpers/storage.js';

import bytes from 'bytes';
import { getKeyAndUserFromToken } from '#database/users.js';
import multer from '@koa/multer';
import multerS3 from 'multer-s3';
import { parseLicenseKeyFromHeader } from './license-key-auth.js';
import path from 'path';

const bucket = process.env.STORAGE_NAME;

/**
 * We store all files that are uploaded to an S3-like bucket
 * This makes it super simple to pass the data to the AI
 *
 * @param {Object} options
 * @param {string} options.field - The name of the form field to process.
 * @param {string} [options.dir] - The directory path where the file will be stored in S3 (within the users' directory)
 * @param {function} [options.overrideKey] - A function to generate a custom key for the uploaded file.
 * @param {boolean} [options.deleteAfterRequest=false] - Whether to delete the file from S3 after the request is finished. This is useful if you are just uploading an image to pass to vision and don't need it afterwards.
 * @returns {Function} Koa middleware function for handling the file upload.
 */
export default function fileUploadMiddleware({
	field,
	fields,
	dir,
	noSave = false,
	overrideKey,
	deleteAfterRequest = false,
	maxFileSize = '40mb'
} = {}) {
	let storage;
	if (noSave || !isStorageEnabled()) {
		storage = multer.memoryStorage();
	} else {
		storage = multerS3({
			s3: getS3Client(),
			limits: {
				fileSize: bytes(maxFileSize)
			},
			bucket,
			acl: 'public-read', // Adjust the ACL according to your needs
			key: async function (req, file, cb) {
				try {
					const token = parseLicenseKeyFromHeader(req.headers.authorization);
					const { user } = await getKeyAndUserFromToken(token);
					let key = path.join(user.uuid, file.originalname);
					if (overrideKey) {
						key = overrideKey(user, file, dir, req);
					} else if (dir) {
						key = path.join(user.uuid, dir, file.originalname);
					}
					cb(null, key);
				} catch (err) {
					cb(err);
				}
			}
		});
	}

	const uploadMiddleware = multer({ storage });
	let upload;
	if (fields) {
		upload = uploadMiddleware.fields(fields.map((name) => ({ name })));
	} else {
		upload = uploadMiddleware.single(field);
	}

	return async (ctx, next) => {
		await upload(ctx, async () => {
			await next();
			let files = [];
			if (deleteAfterRequest && ctx.file) {
				files = [ctx.file];
			} else if (deleteAfterRequest && ctx.files) {
				files = ctx.files;
			}
			for (let file of files) {
				// delete the image
				const { key } = file;
				deleteFileFromStorage({ bucket, key });
			}
		});
	};
}
