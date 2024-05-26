import { getOpenAIProvider, retryWithFallbacks } from '#ai/openai.js';
import {
	getPagesFromUrl,
	getReadableTextFromURL,
	getSitesPageListFromSitemapUrl,
	getYoutubeTranscript
} from '#helpers/crawler.js';

import { crawlAndEmbedWebsite } from '#helpers/crawl-website.js';
import { fetchEmbeddingsContextList } from '#database/embeddings.js';
import { getConfigFile } from '#helpers/configs.js';
import { queryEmbeddings } from '#api/modules/embeddings/actions.js';
import { uploadResponseImages } from '#helpers/storage.js';

export default function getFunctions({ contextIds, userUuid }) {
	return {
		createImage: async function ({ prompt, key }) {
			// check the see if the user is allowed to create
			// images or if they've run out of usage
			const keyUsage = key.isUsageDepleted('image');
			if (keyUsage.isDepleted) {
				return {
					result: `The users usage for creating images as been exceeded`,
					usage: {}
				};
			}
			const client = getOpenAIProvider(key);
			const imageSettings = getConfigFile('prompts/images.yml');
			const { models, options } = imageSettings;
			const { quality = 'standard', size = '1024x1024' } = options;

			const output = await retryWithFallbacks(
				async (model) => {
					const imageResponse = await client.images.generate({
						model,
						prompt,
						...options,
						user: userUuid
					});
					return {
						model,
						...imageResponse
					};
				},
				{
					models
				}
			);

			const images = await uploadResponseImages(output, { userUuid });

			return {
				result: images,
				usage: {
					model: output.model,
					size,
					quality
				}
			};
		},

		fetchRAGDocuments: async function () {
			const result = await fetchEmbeddingsContextList({ userUuid });

			return {
				result: result.map((r) => ({
					contextId: r.contextId,
					filenames: [...r.documentIds].slice(0, 10),
					documentCount: r.documents.length
				})),
				// TODO this does cost a very small amount so
				// we should add usage here
				usage: {}
			};
		},
		/**
		 * @async
		 * @param {Object} params
		 * @param {string} params.query - The query to perform on the vector db
		 * @param {number} params.top - How many results to get from the vector db
		 * @returns {Promise<Object>} A promise that resolves to an object containing the similar text content from the vector db (`result`) and the operation cost (`cost`).
		 */
		fetchRAGContext: async function ({ query, top = 3, contextIds: contextIdsOverride = [] }) {
			const context = contextIds.length ? contextIds : contextIdsOverride;
			if (!context.length) {
				return {
					result: `It's required to provide at least one context ID to the query`,
					usage: {}
				};
			}
			const contexts = await queryEmbeddings({
				query,
				top,
				// we use the "contextIds" variable
				// in order to only search through vectors that have
				// been provided in the chat, for example when chatting
				// with our pdf demo we only want to check a single contextId
				contextIds: context,
				// a user can access the global namespace, or their own one
				namespaces: [userUuid, 'global']
			});

			return {
				result: contexts,
				// TODO this does cost a very small amount so
				// we should add usage here
				usage: {}
			};
		},
		/**
		 * Asynchronously fetches and processes the content of a webpage to extract the most relevant text for AI analysis.
		 *
		 * @async
		 * @param {Object} params
		 * @param {string} params.url - The URL of the webpage to fetch and process.
		 * @returns {Promise<Object>} A promise that resolves to an object containing the extracted text content (`result`) and the operation cost (`cost`).
		 */
		fetchUrl: async function ({ url }) {
			const text = await getReadableTextFromURL(url);
			return {
				result: text,
				usage: {}
			};
		},

		/**
		 * Crawl a website and insert the text content into the vector db
		 * so the AI can search through it.
		 *
		 * @param {Object} params
		 * @param {string} params.url - The URL of the webpage to fetch and process.
		 * @param {number} params.limit - The limit of pages to crawl
		 * @returns a result immediately to say that the crawl has been started
		 */
		crawlWebsite: async function ({ url, limit = 200 }) {
			// set the crawl off, but return a result immediately
			crawlAndEmbedWebsite({
				user: { uuid: userUuid },
				websiteUrl: url,
				excludeUrls: [],
				limit
			});

			return {
				result: `Pages have been queued to be crawled in the background. Wait a few minutes and your queries should start to get results.`,
				usage: {}
			};
		},

		fetchRagWebsiteContext: async function ({ url, query }) {
			const contexts = await queryEmbeddings({
				query,
				top: 3,
				contextIds: [url],
				namespaces: [userUuid, 'global']
			});

			return {
				result: contexts,

				usage: {}
			};
		},
		/**
		 * Fetches a sitemap from a website, and returns the pages as a json array
		 *
		 * @async
		 * @returns {Promise<Object>} A promise that resolves to an object containing all the pages (`result`) and the operation cost (`cost`).
		 */
		fetchSitemap: async function ({ sitemapUrl }) {
			const pages = await getSitesPageListFromSitemapUrl(sitemapUrl);
			return {
				result: pages,
				usage: {}
			};
		},
		fetchSitemapFromUrl: async function ({ url }) {
			const pages = await getPagesFromUrl({ siteUrl: url });
			return {
				result: pages,
				usage: {}
			};
		},
		// Demo showing a simple integration with a node module
		getYoutubeTranscript: async function ({ url }) {
			const transcript = await getYoutubeTranscript({ url });
			return {
				result: transcript,
				usage: {}
			};
		}
	};
}
