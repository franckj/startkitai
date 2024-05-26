import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import Sitemapper from 'sitemapper';
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import contentDisposition from 'content-disposition';
import { createLogger } from './logger.js';
import https from 'https';
import mime from 'mime';
import path from 'path';
import robotsParser from 'robots-parser';
import url from 'url';
import { v4 } from 'uuid';

const logger = createLogger('crawler');

const agent = new https.Agent({
	// WARNING: This bypasses SSL certificate validation.
	rejectUnauthorized: false
});

export async function getReadableTextFromURL(url) {
	logger.info(`crawling readable text from ${url}`);
	try {
		const { data } = await axios.get(url, { httpsAgent: agent });
		return getReadableTextFromHtml(data, url);
	} catch (err) {
		logger.warn(
			`Failed to fetch a webpage - ${url}: ${err.message}. This is non-critical, the AI will just carry on`
		);
		return '';
	}
}

export function getReadableTextFromHtml(html, url) {
	let dom;
	try {
		dom = new JSDOM(html, { url });
		// readability gets the most relevant content from the
		// webpage that was fetched, ignoring all the chaff
		const reader = new Readability(dom.window.document);
		const article = reader.parse();
		// and we return just the text content for the AI to read
		return article?.textContent?.trim() ?? '';
	} catch (error) {
		logger.warn(
			`Error parsing content. ${error.statusCode} This is non-critical, the AI will just carry on`
		);
		return '';
	} finally {
		// Clean up resources allocated by JSDOM
		if (dom) {
			dom.window.close();
		}
	}
}

export async function getSitesPageListFromSitemapUrl(sitemapUrl) {
	const site = new Sitemapper({
		url: sitemapUrl,
		timeout: 15000
	});
	try {
		const { sites } = await site.fetch();
		return sites;
	} catch (err) {
		logger.error(err);
		return `Something went wrong: ${err.message}`;
	}
}

export async function getPagesFromUrl({ siteUrl }) {
	const robotsUrl = `${siteUrl}/robots.txt`;
	const { data: robotsContent } = await axios.get(robotsUrl);
	const robots = robotsParser(robotsUrl, robotsContent);
	const sitemaps = robots.getSitemaps();
	return await getSitesPageListFromSitemapUrl(sitemaps[0]);
}

export async function getYoutubeTranscript({ url }) {
	try {
		const transcript = await YoutubeTranscript.fetchTranscript(url);
		return transcript;
	} catch (err) {
		if (err.message.includes('Transcript is disabled on this video')) {
			return 'Transcript is disabled on this video.';
		}

		logger.error(err);
		return `Something went wrong: ${err.message}`;
	}
}

export async function fetchDocumentFromUrl(url) {
	logger.info(`fetching document from url ${url}`);
	const response = await axios.get(url, { responseType: 'arraybuffer', httpsAgent: agent });
	const disposition = response.headers['content-disposition'];
	let filename = '';
	let mimeType = response.headers['content-type'];
	const ext = mime.getExtension(mimeType);
	if (disposition) {
		const parsed = contentDisposition.parse(disposition);
		filename = parsed.parameters.filename;
	} else {
		filename = `${getFilenameFromUrl(url) ?? v4()}.${ext}`;
	}

	return {
		buffer: response.data,
		filename,
		contentType: mimeType,
		size: response.data.length
	};
}

export function getFilenameFromUrl(fileUrl) {
	try {
		const parsedUrl = new url.URL(fileUrl);
		const pathname = parsedUrl.pathname;
		const filenameWithExtension = path.basename(pathname);
		const filename = path.parse(filenameWithExtension).name;
		return filename;
	} catch (err) {
		logger.warn(err);
		return null;
	}
}
