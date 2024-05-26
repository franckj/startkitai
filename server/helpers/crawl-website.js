import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { URL } from 'url';
import axios from 'axios';
import { createLogger } from './logger.js';
import minimatch from 'minimatch';
import { saveEmbeddings } from '#api/modules/embeddings/actions.js';

const logger = createLogger('crawler');

export async function crawlAndEmbedWebsite({
	user,
	websiteUrl,
	excludeUrls = [],
	debug = false,
	limit = 100
}) {
	try {
		logger.success('done crawling website.');
		return await crawlUrlTree(websiteUrl, {
			excludeUrls,
			userUuid: user.uuid,
			limit,
			debug
		});
	} catch (err) {
		logger.error('failed crawling website.');
		logger.error(err);
	}
}

async function crawlUrlTree(websiteUrl, { excludeUrls, userUuid, limit, debug }) {
	let tree = { url: websiteUrl, children: [] };
	let queue = [tree];
	let ids = [];
	let visited = [];
	const websiteDescription = await getWebsiteDescription(websiteUrl);
	let crawled = 0;
	while (queue.length > 0 && crawled <= limit) {
		try {
			const currentBatch = queue.splice(0, 5);
			const batchPromises = currentBatch.map(async (node) => {
				const excluded = isExcluded(excludeUrls.map(parseUrl), node.url, websiteUrl);
				const searched = hasBeenSearched(visited, node.url);
				if (!excluded && !searched) {
					logger.info(`crawling ${node.url} (${crawled}/${limit})`);
					const { urls, content, usage } = await summarizeWebpage({
						pageUrl: node.url,
						websiteUrl,
						websiteDescription,
						userUuid,
						debug
					});

					node.children = urls.map((u) => ({ url: parseUrl(u), children: [] }));

					let newUrls = 0;
					for (let child of node.children) {
						if (!visited.includes(child.url) && queue.length + crawled < limit) {
							newUrls++;
							queue.push(child);
						}
					}

					if (newUrls > 0) {
						logger.info(
							`found ${newUrls} new URLs of ${node.children.length} and added them to queue (now ${queue.length})`
						);
					}

					visited.push(node.url);

					if (content) {
						crawled += 1;
					}
					return { content, usage, url: node.url };
				}
				return null;
			});
			// Wait for all promises in the batch to resolve
			const results = await Promise.all(batchPromises);
			const embeddingIds = await saveEmbeddings({
				content: results.map((r) => r?.content).filter(Boolean),
				namespace: userUuid,
				contextId: websiteUrl,
				userUuid
			});
			ids = [...ids, ...embeddingIds];
		} catch (err) {
			logger.error(`something went wrong`);
			console.error(err);
		}
	}
	return visited;
}

export async function summarizeWebpage({ pageUrl, websiteUrl }) {
	let url = pageUrl;

	const contentOutput = await getContent(url, websiteUrl);
	if (!contentOutput) {
		return { urls: [] };
	}
	const { content, urls } = contentOutput;

	return { content, urls };
}

async function getWebsiteDescription(url) {
	let dom;
	try {
		const response = await axios.get(url, { timeout: 10000 });
		const { data: text } = response;
		dom = new JSDOM(text);
		const meta = dom.window.document.querySelector('meta[name="description"]');
		if (!meta) {
			return null;
		}
		return meta.getAttribute('content');
	} catch (err) {
		return '';
	} finally {
		if (dom) {
			dom.window.close();
		}
	}
}

async function getContent(url, baseUrl) {
	let dom;
	try {
		const { host } = new URL(url);
		const headResponse = await axios.head(url, { timeout: 10000 });
		if (!headResponse.headers['content-type'].includes('text/html')) {
			logger.warn(`URL didn't contain HTML, skipping it: ${url}`);
			return null;
		}
		const response = await axios.get(url, { timeout: 10000 });
		const { data: text } = response;
		dom = new JSDOM(text);

		const urls = [...dom.window.document.querySelectorAll('a')].reduce((out, el) => {
			let baseUri = baseUrl;
			if (!baseUri.endsWith('/')) {
				baseUri = `${baseUri}/`;
			}
			try {
				if (el.href) {
					let newUrl;
					if (el.href.startsWith('about:blank')) {
						// ignore this
						return out;
					}
					if (el.href.startsWith('//')) {
						newUrl = `https:${el.href}`;
					} else if (el.href.startsWith('/')) {
						newUrl = `https://${host}${el.href}`;
					} else {
						newUrl = new URL(el.href, baseUri).href;
					}
					if (new URL(newUrl).hash) {
						newUrl = el.href.replace(new URL(el.href).hash, '');
					}
					if (newUrl && !out.includes(newUrl)) {
						return [...out, newUrl];
					}
				}
			} catch {
				// ignore
			}
			return out;
		}, []);

		const meta = dom.window.document.querySelector('meta[name="description"]');

		const pageDescription = meta ? meta.getAttribute('content') : '';
		const reader = new Readability(dom.window.document);
		const article = reader.parse();
		// and we return just the text content for the AI to read
		const content = article?.textContent?.trim() ?? '';

		return { urls, content, pageDescription };
	} catch (err) {
		logger.warn(err.message);
		return null;
	} finally {
		if (dom) {
			dom.window.close();
		}
	}
}

function isExcluded(excludes, url, websiteUrl) {
	if (!url.startsWith(websiteUrl)) {
		return true;
	}
	return excludes.some((ex) => {
		return minimatch(url, ex) || url.startsWith(ex);
	});
}

function hasBeenSearched(visited, url) {
	let testUrl = url;
	if (url.endsWith('/')) {
		testUrl = testUrl.substring(0, testUrl.length - 1);
	}
	return visited.some((v) => v.match(new RegExp(`${testUrl}/?$`)));
}

function parseUrl(url) {
	try {
		let fullUrl = url;
		if (!url.startsWith('https://')) {
			fullUrl = `https://${url}`;
		}
		const parsed = new URL(fullUrl);
		return `${parsed.origin}${parsed.pathname}`;
	} catch (err) {
		logger.error('[crawler]: failed to parse url');
		throw err;
	}
}
