import { useCallback, useEffect, useState } from 'react';

import Markdown from 'react-markdown';
import { MathJax } from 'better-react-mathjax';
import Prism from 'prismjs';
import { apiRequest } from '../utils/api-request.js';

export default function ChatMessage({
	role,
	content,
	metadata = {},
	examples = [],
	result = {},
	onExampleClick = () => {}
	// onRegenerateClick = () => {}
}) {
	const [isLoadingSpeech, setLoadingSpeech] = useState(false);
	const [totalCost, setTotalCost] = useState(result?.cost ?? 0);

	useEffect(() => {
		if (result?.cost) {
			setTotalCost(result.cost);
		}
	}, [result]);
	const readAloud = useCallback(async () => {
		setLoadingSpeech(true);
		try {
			const response = await apiRequest('/api/speech/from-text', {
				body: { text: content, speed: 1.1 },
				method: 'POST'
			});
			const requestCost = +response.headers.get('x-usage-cost');
			setTotalCost(requestCost + totalCost);
			const blob = await response.blob();
			const audioUrl = URL.createObjectURL(blob);
			const audio = new Audio(audioUrl);
			audio.type = 'audio/mpeg';
			audio.play();
		} catch (err) {
			console.error(err);
		} finally {
			setLoadingSpeech(false);
		}
	}, [content, totalCost]);

	useEffect(() => {
		if (content) {
			Prism.highlightAll();
		}
	}, [content]);

	const { tools = [] } = metadata;

	return (
		<div
			data-chat-role={role}
			className={`relative chat chat-${role === 'user' ? 'end text-right' : 'start'}`}
		>
			{tools.map((tool) => (
				<Tool key={tool.name} {...tool} />
			))}
			<div
				className={`chat-bubble max-w-none sm:max-w-[50vw] ${role === 'user' ? '' : 'min-w-[220px]'} prose prose-sm`}
			>
				<Content content={content} />

				{examples.length ? (
					<>
						<p className="mt-2">Or try one of these examples:</p>
						<ul className="list-decimal pl-5 pt-2">
							{examples.map((example) => (
								<li key={example}>
									<a href="#" className="link" onClick={() => onExampleClick(example)}>
										{example}
									</a>
								</li>
							))}
						</ul>
					</>
				) : null}
				{result.model ? (
					<div className="absolute px-3 opacity-50 w-full left-0 bottom-[-35px] flex flex-row justify-between sm:max-w-[50vw]">
						<div className="flex flex-col">
							<span className="display-block text-xs">
								Query cost: $<span className="cost">{totalCost.toFixed(4)}</span>
							</span>
							<span className="display-block text-xs">
								Model: <span className="model">{result.model}</span>
							</span>
						</div>
						<div className="actions flex flex-row gap-1 mt-1">
							<a title="Read aloud" href="#" onClick={readAloud}>
								{isLoadingSpeech ? (
									<span className="loading loading-spinner loading-xs"></span>
								) : (
									<svg
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
										strokeWidth={1.5}
										stroke="currentColor"
										className="w-4 h-4"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"
										/>
									</svg>
								)}
							</a>
							{/* <a title="Regenerate response" href="#" onClick={onRegenerateClick}>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								strokeWidth={1.5}
								stroke="currentColor"
								className="w-4 h-4"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
								/>
							</svg>
						</a> */}
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
}

function Tool({ name, args, usage = {} } = {}) {
	let label = `${name}: ${args}`;
	let icon;
	if (name === 'getYoutubeTranscript') {
		label = `Watched YouTube video: ${JSON.parse(args).url}`;
		icon = (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				strokeWidth={1.5}
				stroke="currentColor"
				className="w-4 h-4"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
				/>
			</svg>
		);
	}
	if (name === 'fetchUrl') {
		label = `Fetched URL: ${JSON.parse(args).url}`;
	} else if (name === 'createImage') {
		label = `Generated image with DALL-E (${usage.size}, ${usage.quality} quality)`;
	} else if (name === 'fetchRAGContext') {
		label = `Queried context for "${JSON.parse(args).query}"`;
	} else if (name === 'fetchSitemapFromUrl') {
		label = `Fetching sitemap "${JSON.parse(args).url}"`;
	} else if (name === 'crawlWebsite') {
		label = `Crawled website: ${JSON.parse(args).url}`;
	} else if (name === 'fetchRagWebsiteContext') {
		label = `Queried website content for "${JSON.parse(args).query}"`;
	} else if (name === 'fetchRAGDocuments') {
		label = `Fetched document list`;
	}
	if (usage.cost) {
		label = `${label} (cost $${usage.cost.toFixed(4)})`;
	}
	return (
		<div className="text-xs meta-tool flex flex-row align-center max-w-none sm:max-w-[50vw] truncate">
			<span className="inline-block mr-1">{icon ? icon : null}</span>
			<span>{label}</span>
		</div>
	);
}

function Content({ content }) {
	if (Array.isArray(content)) {
		return content.map((c, i) => {
			if (c.type === 'text') {
				return (
					<MathJax key={i}>
						<Markdown className="md">{c.text}</Markdown>
					</MathJax>
				);
			}
			if (c.type === 'image_url') {
				return <img key={i} src={c.image_url.url} className="my-2 rounded-md" />;
			}
		});
	}

	return (
		<MathJax>
			<Markdown className="md">{content}</Markdown>
		</MathJax>
	);
}
