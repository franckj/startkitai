import { isStorageEnabled, uploadRawFileToStorage } from '#helpers/storage.js';

import FormData from 'form-data';
import { appendToEmbeddingsRecord } from '#database/embeddings.js';
import axios from 'axios';
import { createLogger } from '#helpers/logger.js';
import { fetchDocumentFromUrl } from '#helpers/crawler.js';
import { v4 } from 'uuid';

const logger = createLogger('embeddings');
const embeddingsUrl = process.env.EMBEDDINGS_URL;
const embeddingsKey = process.env.EMBEDDINGS_BEARER_TOKEN;

export async function queryEmbeddings({
	contextIds,
	documentIds = [],
	query,
	namespaces = [],
	top = 3
}) {
	if (!namespaces.length) {
		throw new Error('Namespace is required for all embeddings queries');
	}

	let queries = [];
	for (let contextId of contextIds) {
		let q = {
			query,
			top_k: top,
			filter: {
				source_id: contextId
			}
		};
		if (documentIds.length) {
			for (let documentId of documentIds) {
				queries.push({ ...q, filter: { ...q.filter, document_id: documentId } });
			}
		} else {
			queries.push(q);
		}
	}

	logger.info(`querying embeddings with ${queries.length} queries`);
	try {
		const [namespaceResponse, globalResponse] = await Promise.all(
			namespaces.map((namespace) => {
				const ns = normalizeNamespace(namespace);
				return axios.post(
					`${embeddingsUrl}/query`,
					{
						namespace: ns,
						queries
					},
					{
						headers: {
							Authorization: `Bearer ${embeddingsKey}`,
							'content-type': 'application/json'
						}
					}
				);
			})
		);

		const results = [namespaceResponse, globalResponse].filter(Boolean).reduce((out, response) => {
			const results = response.data.results.reduce((o, r) => [...o, ...r.results], []);
			return [...out, ...results];
		}, []);

		return results ?? [];
	} catch (err) {
		logger.error('Something went wrong fetching embeddings', err.message);
		return [];
	}
}

export async function queryAllEmbeddings({ query, namespace }) {
	logger.info(`querying embeddings`);

	if (!namespace) {
		throw new Error('Namespace is required for all embeddings queries');
	}
	const ns = normalizeNamespace(namespace);

	try {
		const response = await axios.post(
			`${embeddingsUrl}/query`,
			{
				namespace: ns,
				queries: [
					{
						query,
						top_k: 1
					}
				]
			},
			{
				headers: {
					Authorization: `Bearer ${embeddingsKey}`,
					'content-type': 'application/json'
				}
			}
		);
		const { results } = response.data.results[0];

		return results[0] ? results[0].text : '';
	} catch (err) {
		logger.error('Something went wrong fetching embeddings', err.message);
		return '';
	}
}

export async function* embedFilesByUrls({ urls, admin = false, userUuid, namespace, contextId }) {
	let filenames = [];

	// embed batches of 10
	for (let i = 0; i < urls.length; i += 10) {
		const urlBatch = urls.slice(i, i + 10);
		logger.info(`embedding ${i} - ${i + 10} urls`);
		let promises = [];
		for (let url of urlBatch) {
			// fetch the item at the URL
			const file = await fetchDocumentFromUrl(url);
			const p = saveEmbeddingsFile({
				file,
				admin,
				userUuid,
				namespace,
				contextId
			});

			promises.push(p);
		}
		for (const promise of promises) {
			const { filename: documentId } = await promise;
			filenames.push(documentId);
			yield documentId;
		}
	}

	return filenames;
}

export async function saveEmbeddings({ content, namespace, contextId, userUuid, admin }) {
	logger.info(`Embedding ${content.length}`);
	if (!namespace) {
		throw new Error('Namespace is required for all embeddings queries');
	}
	const ns = normalizeNamespace(namespace);
	const documentId = normalizeFilename(v4());
	let documents = [];
	const metadata = {
		document_id: documentId,
		author: admin ? 'admin' : normalizeNamespace(userUuid),
		source_id: contextId,
		source: 'chat',
		created_at: new Date()
	};
	if (Array.isArray(content)) {
		documents = content.map((c) => ({
			text: c,
			metadata
		}));
	} else {
		documents = [
			{
				text: content,
				metadata
			}
		];
	}

	try {
		const response = await axios.post(
			`${embeddingsUrl}/upsert`,
			{
				namespace: ns,
				documents
			},
			{
				headers: {
					Authorization: `Bearer ${embeddingsKey}`,
					'content-type': 'application/json'
				}
			}
		);
		const { ids } = response.data;
		await appendToEmbeddingsRecord({
			userUuid,
			namespace: ns,
			contextId,
			newEmbeddingIds: ids,
			newDocumentIds: [documentId]
		});
		return ids;
	} catch (err) {
		logger.error('Something went wrong saving embeddings', err.message);
		throw new Error('Failed to save embeddings');
	}
}

export async function saveEmbeddingsFile({
	userUuid,
	admin = false,
	store = true,
	file,
	namespace,
	contextId
}) {
	logger.info(`saving file to embeddings`);
	if (!namespace) {
		throw new Error('Namespace is required for all embeddings queries');
	}
	const documentId = normalizeFilename(file.filename || file.originalname);
	let document = {
		filename: documentId,
		contentType: file.contentType,
		size: file.buffer.length
	};
	// store the document in our file storage
	if (store && isStorageEnabled()) {
		const { key } = await uploadRawFileToStorage({
			userUuid: admin ? 'admin' : userUuid,
			fileBuffer: file.buffer,
			mimeType: file.contentType,
			destinationPath: `embeddings-files`
		});
		document.storageKey = key;
	}
	const ns = normalizeNamespace(namespace);
	const formData = new FormData();

	formData.append('file', file.buffer, {
		filename: documentId,
		content_type: file.contentType
	});
	formData.append(
		'metadata',
		JSON.stringify({
			document_id: documentId,
			author: admin ? 'admin' : normalizeNamespace(userUuid),
			source_id: contextId,
			source: 'file',
			created_at: new Date()
		})
	);
	formData.append('namespace', ns);
	try {
		const response = await axios.post(`${embeddingsUrl}/upsert-file`, formData, {
			headers: {
				Authorization: `Bearer ${embeddingsKey}`,
				'content-type': 'multipart/form-data',
				...formData.getHeaders()
			}
		});
		const { ids } = response.data;
		await appendToEmbeddingsRecord({
			userUuid,
			admin,
			contextId,
			namespace: ns,
			newEmbeddingIds: ids,
			newDocumentIds: [documentId],
			newDocuments: [document]
		});

		return { ids, filename: documentId };
	} catch (err) {
		logger.error('Something went wrong saving embeddings file', err.message);
		throw new Error('Failed to save embeddings');
	}
}

export async function deleteEmbeddingsByIds(embeddingIds, namespace) {
	logger.info(`deleting ${embeddingIds.length} embeds `);
	try {
		if (!embeddingIds.length) {
			return true;
		}
		if (!namespace) {
			throw new Error('Namespace is required for all embeddings queries');
		}

		const ns = normalizeNamespace(namespace);

		const response = await axios.delete(`${embeddingsUrl}/delete`, {
			data: {
				namespace: ns,
				ids: embeddingIds
			},
			headers: {
				Authorization: `Bearer ${embeddingsKey}`,
				'content-type': 'application/json'
			}
		});

		return response.status === 200;
	} catch (err) {
		logger.error('Something went wrong deleting embeddings', err.message);
		throw new Error('Failed to delete embeddings by ids');
	}
}

export async function deleteAllEmbeddingsInNamespace(namespace) {
	if (!namespace) {
		throw new Error('Namespace is required for all embeddings queries');
	}

	const ns = normalizeNamespace(namespace);
	logger.info(`deleting all embeddings for ns ${ns}`);
	try {
		const response = await axios.delete(`${embeddingsUrl}/delete`, {
			data: {
				namespace: ns,
				delete_all: true
			},
			headers: {
				Authorization: `Bearer ${embeddingsKey}`,
				'content-type': 'application/json'
			}
		});

		logger.info(`deleted all embeddings for ns ${response.status}`);
		return response.status === 200;
	} catch (err) {
		logger.error('Something went wrong deleting all embeddings');
		throw new Error('Failed to delete all embeddings for user');
	}
}

export async function getStats(namespace = '') {
	const ns = normalizeNamespace(namespace);
	logger.info(`getting ${ns ? ns : 'index'} stats `);
	try {
		const response = await axios.get(`${embeddingsUrl}/stats`, {
			headers: {
				Authorization: `Bearer ${embeddingsKey}`,
				'content-type': 'application/json'
			}
		});
		const { index_fullness, total_vector_count, dimension } = response.data;
		return {
			indexFullness: index_fullness,
			totalVectorCount: total_vector_count,
			dimension
		};
	} catch (err) {
		logger.debug(err);
		throw new Error('Failed to get stats');
	}
}

function normalizeNamespace(ns) {
	return ns.toString().toLowerCase().replace(/-/g, '');
}

function normalizeFilename(str) {
	/* eslint-disable no-control-regex */
	return str.replace(/[^\x00-\x7F]/g, '');
}
