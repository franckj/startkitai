export const tools = [
	{
		type: 'function',
		function: {
			name: 'createImage',
			description:
				'Wrapper for DALL-E. Takes a prompt, creates and image, and returns the image URL. You can embed the URL in your response as a markdown image.',
			parameters: {
				type: 'object',
				properties: {
					prompt: {
						type: 'string',
						title: 'prompt'
					}
				},
				required: ['prompt']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'fetchUrl',
			description:
				'Accepts a URL. Will fetch the URL and return the relevant text for vector embedding. URL must include the protocol, if unknown use https://',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						title: 'URL'
					}
				},
				required: ['url']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'crawlWebsite',
			description:
				'Will crawl the first 100 pages found at a URL and insert the readible text into the vector database for later retreival by `fetchRagWebsiteContext`  URL must include the protocol, if unknown use https://',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						title: 'URL'
					},
					limit: {
						type: 'number',
						title: 'Page Limit - max is 100'
					}
				},
				required: ['url']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'fetchRagWebsiteContext',
			description:
				"Given a website URL that has already been crawled with `crawlWebsite`, fetch the snippets of context from our vector database. An empty response does not imply the infomation doesn't exist, just that there are no matches that are similar enough to the query.",
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						title: 'URL'
					},
					query: {
						type: 'string',
						title: 'Query',
						description:
							'The query to run against the vector database. If there is additional context available to you then you can rephrase the query to be better suited to querying for similarity vectors. For example if we are discussing the US Constitution and the previous chat history has been about the Bill of Rights, and the user asks "How does it affect individual liberties?", then you might rephrase that as the query: "Bill of Rights, individual liberties".'
					}
				},
				required: ['url']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'fetchSitemap',
			description:
				'Fetches the sitemap given the sitemap URL and returns a list of all the pages as a JSON array',
			parameters: {
				type: 'object',
				properties: {
					sitemapUrl: {
						type: 'string',
						title: 'Sitemap URL',
						description: 'The URL to the sitemap'
					}
				},
				required: ['sitemapUrl']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'fetchSitemapFromUrl',
			description:
				'Fetches the sitemap given a websites base URL, and returns a list of all the pages as a JSON array',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						title: 'Website URL',
						description: 'The URL of the page to get the sitemap of'
					}
				},
				required: ['url']
			}
		}
	},
	{
		type: 'function',
		function: {
			name: 'getYoutubeTranscript',
			description:
				'Given a YouTube URL (eg https://www.youtube.com/watch?v=zz2X58tVg5E), return the JSON transcript of the video with timestamps.',
			parameters: {
				type: 'object',
				properties: {
					url: {
						type: 'string',
						title: 'url'
					}
				},
				required: ['url']
			}
		}
	}
];

export const ragTools = [
	{
		type: 'function',
		function: {
			name: 'fetchRAGDocuments',
			description: `Used to fetch a list of all the document groups that you have access to. Each group of documents has a contextID that can be used to search the group using fetchRAGContext later.`
		}
	},
	{
		type: 'function',
		function: {
			name: 'fetchRAGContext',
			description: `Used to fetch snippets of context from our vector database. An empty response does not imply the infomation doesn't exist, just that there are no matches that are similar enough to the query.`,
			parameters: {
				type: 'object',
				properties: {
					query: {
						type: 'string',
						title: 'Query',
						description: `The query to run against the vector database. Don't include the name or context ID of the document in the query. If there is additional context available to you then you can rephrase the query to be better suited to querying for similarity vectors. For example if we are discussing the US Constitution and the previous chat history has been about the Bill of Rights, and the user asks "How does it affect individual liberties?", then you might rephrase that as the query: "Bill of Rights, individual liberties".`
					},
					contextIds: {
						type: 'array',
						items: {
							type: 'string'
						},
						title: 'Context IDs of the document groups to query'
					}
				},
				required: ['query']
			}
		}
	}
];
