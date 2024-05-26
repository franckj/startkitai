import Embeddings from './models/Embeddings.js';

export async function fetchEmbeddingsContextList({ userUuid }) {
	const query = { $or: [{ userUuid }, { namespace: 'global' }] };
	return await Embeddings.find(query);
}

export async function appendToEmbeddingsRecord({
	userUuid,
	namespace,
	admin = false,
	contextId,
	newDocumentIds,
	newEmbeddingIds,
	newDocuments
}) {
	let query = { contextId };
	if (admin) {
		query = { ...query, admin: true, namespace };
	} else {
		query = { ...query, userUuid, namespace };
	}
	return await Embeddings.updateOne(
		query,
		{
			$addToSet: {
				documentIds: newDocumentIds,
				embeddingIds: newEmbeddingIds,
				documents: newDocuments
			}
		},
		{ upsert: true }
	);
}

export async function deleteAllEmbeddingsForUser({ userUuid }) {
	if (!userUuid) throw new Error('User UUID is required');
	return await Embeddings.deleteMany({ userUuid });
}
