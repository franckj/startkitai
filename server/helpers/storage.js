import { DeleteObjectCommand, PutObjectCommand, S3 } from '@aws-sdk/client-s3';

import axios from 'axios';
import { createLogger } from '#helpers/logger.js';
import fs from 'fs/promises';
import mime from 'mime';
import path from 'path';
import { v4 } from 'uuid';

const storageUrl = process.env.STORAGE_URL;
const storageRegion = process.env.STORAGE_REGION;
const storageKey = process.env.STORAGE_KEY;
const storageSecret = process.env.STORAGE_SECRET;
const storageName = process.env.STORAGE_NAME;

const logger = createLogger('storage');

let s3Client;

export function getS3Client() {
	if (!s3Client) {
		s3Client = new S3({
			endpoint: storageUrl,
			region: storageRegion,
			credentials: {
				accessKeyId: storageKey,
				secretAccessKey: storageSecret
			}
		});
	}
	return s3Client;
}

export function isStorageEnabled() {
	return storageUrl && storageSecret;
}

/**
 * Retrieves a file from storage as a UTF-8 string given a user's UUID and the filename.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.userUuid - The UUID of the user.
 * @param {string} params.filename - The name of the file to retrieve.
 * @returns {Promise<string>} A promise that resolves to the content of the file.
 * @throws Will throw an error if the file retrieval fails.
 */
export async function getFileFromStorage({ userUuid, destinationPath, raw = false }) {
	const key = path.join(userUuid, destinationPath);
	logger.info('fetching file from storage:', key);
	try {
		const file = await getFile({ bucket: storageName, key });
		if (raw) {
			return Buffer.from(file);
		}
		return Buffer.from(file).toString('utf8');
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

/**
 * Uploads a file to storage and returns the details of the uploaded file.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.userUuid - The UUID of the user.
 * @param {Object} params.file - The file object to upload.
 * @returns {Promise<Object>} A promise that resolves to an object containing the
 * bucket name, key of the uploaded file and it's filename.
 * @throws Will throw an error if the file upload fails.
 */
export async function uploadFileToStorage({ userUuid, destinationPath, file }) {
	let key = userUuid;
	if (destinationPath) {
		key = path.join(key, destinationPath, file.originalFilename);
	} else {
		key = path.join(key, file.originalFilename);
	}

	const rawFile = await fs.readFile(file.filepath);
	const params = {
		Bucket: storageName,
		Key: key,
		Body: rawFile,
		ContentType: file.mimetype,
		ACL: 'public-read'
	};
	const command = new PutObjectCommand(params);
	try {
		logger.info('uploading file to storage:', key);
		await s3Client.send(command);
		return {
			filename: file.originalFilename,
			bucket: storageName,
			key
		};
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

export async function uploadRawFileToStorage({ userUuid, fileBuffer, mimeType, destinationPath }) {
	const ext = mime.getExtension(mimeType);
	const filename = `${v4()}.${ext}`;
	const key = path.join(userUuid, destinationPath, filename);
	const params = {
		Bucket: storageName,
		Key: key,
		Body: fileBuffer,
		ContentType: mimeType,
		ACL: 'public-read'
	};
	const command = new PutObjectCommand(params);
	try {
		logger.info('uploading file to storage:', key);
		await s3Client.send(command);
		return {
			publicUrl: `${storageUrl}/${storageName}/${key}`,
			filename: filename,
			bucket: storageName,
			key
		};
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

/**
 * Deletes files from storage given the bucket name and file key.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.bucket - The name of the bucket.
 * @param {string} params.key - The key of the file to delete.
 * @returns {Promise} A promise that resolves when the file is deleted successfully.
 * @throws Will throw an error if the file deletion fails.
 */
export async function deleteFileFromStorage({ bucket = process.env.STORAGE_NAME, key }) {
	const deleteParams = {
		Bucket: bucket,
		Key: key
	};
	try {
		const deleteCommand = new DeleteObjectCommand(deleteParams);
		logger.info('deleting file from storage:', key);
		return await s3Client.send(deleteCommand);
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

/**
 * Retrieves raw data of a file from storage given the bucket name and file key.
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.bucket - The name of the bucket.
 * @param {string} params.key - The key of the file to retrieve.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer of the raw file data.
 * @throws Will throw an error if the file retrieval fails.
 */
export async function getFile({ bucket, key }) {
	try {
		const output = await s3Client.getObject({
			Bucket: bucket,
			Key: key
		});
		const data = await output.Body.transformToByteArray();
		return data;
	} catch (err) {
		logger.error(err);
		throw err;
	}
}

/**
 * OpenAIs images are only kept on their server for
 * 1 hour, so we upload them to our long term storage
 * after tbe AI returns them
 *
 * @param {Object} response - The response object from OpenAI containing generated images.
 * @param {Object} options - Options for the upload process.
 * @param {string} options.userUuid - The UUID of the user for whom the images are being stored.
 * @returns {Promise<Array<{ revisedPrompt, url }>>} A promise that resolves to an array of objects containing the revised prompt and the public URL of the uploaded image.
 */
export function uploadResponseImages(response, { userUuid }) {
	return Promise.all(
		response.data.map(async (image) => {
			const { revised_prompt: revisedPrompt, url } = image;
			if (!isStorageEnabled()) {
				return { revisedPrompt, url };
			}
			const response = await axios.get(url, {
				responseType: 'arraybuffer'
			});
			const { publicUrl } = await uploadRawFileToStorage({
				userUuid,
				fileBuffer: response.data,
				mimeType: 'image/png',
				destinationPath: 'generated-images'
			});
			return { revisedPrompt, url: publicUrl };
		})
	);
}
