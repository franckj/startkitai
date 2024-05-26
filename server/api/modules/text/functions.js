import logger from '#helpers/logger.js';
import { queryEmbeddings } from '#api/modules/embeddings/actions.js';

export default function createTextFunctions({
	// userUuid,
	contextId,
	documents,
	namespaces = ['global']
}) {
	return {
		countOccurrences: async () => {},
		getDocumentSnippet: async ({ query, documentIds, top = 1 }) => {
			let searchDocuments = documentIds;
			if (!documentIds) {
				searchDocuments = documents.map((doc) => doc.filename);
			}
			let output = {};
			// for (let id of searchDocuments) {
			const contexts = await queryEmbeddings({
				contextIds: [contextId],
				documentIds: searchDocuments,
				content: query,
				namespaces,
				top
			});

			let totalMatches = 0;
			for (let context of contexts) {
				const { id: documentId, text, score } = context;
				if (score > 0.2) {
					totalMatches += 1;
					if (!output[documentId]) {
						output[documentId] = [{ text, score }];
					} else {
						output[documentId].push({ text, score });
					}
				}
			}

			const documentMatchesCount = Object.keys(output).length;
			const documentMatches = Object.keys(output).map((documentId) => ({
				documentId,
				matches: output[documentId]
			}));

			logger.info(
				`found ${documentMatchesCount} that match the query and ${totalMatches} total matches within those documents`
			);

			return {
				result: {
					documentMatchesCount,
					documentMatches
				},
				usage: {}
			};
		},
		// more document analysis functions can go here.
		getFullDocuments: async () => {
			return {
				result: '',
				usage: {}
			};
		}
	};
}
