export const tools = [
	// {
	// 	type: 'function',
	// 	function: {
	// 		name: 'getFullDocuments',
	// 		description:
	// 			'Call this to retreive the full contents of one or more documents. Required for tasks such as converting document data to JSON or general text extraction.',
	// 		parameters: {
	// 			type: 'object',
	// 			properties: {
	// 				documentIds: {
	// 					type: 'array',
	// 					items: {
	// 						type: 'string'
	// 					},
	// 					title: 'Document Ids'
	// 				}
	// 			},
	// 			required: ['documentIds']
	// 		}
	// 	}
	// },
	{
		type: 'function',
		function: {
			name: 'getDocumentSnippet',
			description:
				'Call this to make a call to the vector database to retreive a matching document snippet. Useful for finding matching keywords and context within the set of documents. If you get no matches, then try again with a lower scoreThreshold value.',
			parameters: {
				type: 'object',
				properties: {
					// documentIds: {
					// 	type: 'array',
					// 	title: 'Document Ids',
					// 	items: {
					// 		type: 'string'
					// 	}
					// },
					top: {
						type: 'number',
						title: 'Top number of results to return',
						description:
							'Default=1. Max=5. Will return the top n number of matches for the query. Useful if you want to only find the most relevant data, or only want to know if the query is mentioned at least once.'
						// 'Default=0.5. Max=1. Only matches above the score threshold will be returned. If no matches are returned then consider decreasing this number and retry.'
					},
					query: {
						type: 'string',
						title: 'Query',
						description:
							'Query string to be used to search the embeddings database. Phrase the query to make matches more likely.'
					}
				},
				required: ['query']
			}
		}
	}
];
