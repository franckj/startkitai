import 'prismjs/themes/prism-tomorrow.css';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import ChatMessage from './chat-message.jsx';
import { MathJaxContext } from 'better-react-mathjax';
import { apiRequest } from '../utils/api-request.js';
import { getStreamedResponse } from '../utils/stream-request.js';

function reducer(state, action) {
	switch (action.type) {
		case 'set-waiting': {
			return { ...state, waiting: action.data };
		}
		case 'set-history': {
			return {
				...state,
				chatUuid: action.data.uuid,
				messages: action.data.messages
			};
		}
		case 'set-history-uuid': {
			return {
				...state,
				chatUuid: action.data
			};
		}
		case 'add-user-message': {
			let message = { role: 'user' };
			if (state.pastedImageFile) {
				message = {
					...message,
					content: [
						{ type: 'text', text: action.data.content },
						{ type: 'image_url', image_url: { url: URL.createObjectURL(state.pastedImageFile) } }
					]
				};
			} else {
				message = { ...message, content: action.data.content };
			}
			return {
				...state,
				waiting: true,
				pastedImageFile: null,
				messages: [...state.messages, message]
			};
		}
		case 'add-system-message': {
			return {
				...state,
				waiting: false,
				messages: [...state.messages, { role: 'system', ...action.data }]
			};
		}
		case 'update-assistant-message': {
			let { messages } = state;
			let liveMessage = messages[messages.length - 1];
			if (liveMessage.role !== 'assistant') {
				liveMessage = { role: 'assistant', content: '' };
			} else {
				messages = state.messages.slice(0, -1);
			}

			if (action.data.append) {
				liveMessage = { ...liveMessage, content: liveMessage.content + action.data.content };
			} else {
				liveMessage = { ...liveMessage, ...action.data };
			}

			return {
				...state,
				waiting: false,
				messages: [...messages, liveMessage]
			};
		}

		case 'set-pasted-image': {
			return {
				...state,
				pastedImageFile: action.data
			};
		}

		default:
			return state;
	}
}

export default function Chat({
	initialMessage,
	examples = [],
	fullWidth = false,
	fullHeight = false,
	additionalContextIds = [],
	docAnalysisMode = false,
	readOnlyMode = false
}) {
	const { uuid: chatUuid } = useParams();
	const navigate = useNavigate();
	const location = useLocation();
	const [state, dispatch] = useReducer(reducer, {
		waiting: false,
		chatUuid,
		messages: [],
		pastedImage: null
	});

	const scrollContainer = useRef(null);
	const throttleTimeout = useRef(null);

	const scrollToBottom = useCallback(() => {
		if (throttleTimeout.current === null && scrollContainer.current) {
			scrollContainer.current.scrollTo({
				top: scrollContainer.current.scrollHeight,
				behavior: 'smooth'
			});
			throttleTimeout.current = setTimeout(() => {
				throttleTimeout.current = null;
			}, 500);
		}
	}, []);

	useEffect(() => {
		if (state.chatUuid && chatUuid !== state.chatUuid && !readOnlyMode) {
			navigate(`./${state.chatUuid}`);
		}
	}, [navigate, readOnlyMode, state.chatUuid]);

	useEffect(() => {
		// only run on page load
		if (state.messages.length === 0) {
			// if history uuid has changed, fetch the history
			if (chatUuid) {
				const url = readOnlyMode
					? `/api/chat/public/${chatUuid}/history`
					: `/api/chat/${chatUuid}/history`;

				apiRequest(url)
					.then((res) => res.json())
					.then((history) =>
						dispatch({
							type: 'set-history',
							data: {
								messages: [
									{
										role: 'assistant',
										content: initialMessage,
										examples
									},
									...history
								],
								chatUuid
							}
						})
					);
			} else {
				const messages = initialMessage
					? [
							{
								role: 'assistant',
								content: initialMessage,
								examples
							}
						]
					: [];
				dispatch({
					type: 'set-history',
					data: { messages }
				});
			}
		}
	}, [chatUuid, examples, initialMessage, readOnlyMode, state.messages]);

	const generateResponse = useCallback(
		async (value) => {
			let images = [];
			if (state.pastedImageFile) {
				images.push(await imageToBase64(state.pastedImageFile));
			}
			let params = { chatUuid, text: value };
			if (images.length) {
				params = { ...params, images };
			}
			if (additionalContextIds.length) {
				params = { ...params, contextIds: additionalContextIds };
			}
			if (docAnalysisMode) {
				params = { ...params, docAnalysisMode };
			}
			const res = getStreamedResponse('/api/chat', params);
			res.on('content', (content) =>
				dispatch({ type: 'update-assistant-message', data: { content, append: true } })
			);
			res.on('metadata', (metadata) =>
				dispatch({ type: 'update-assistant-message', data: { metadata } })
			);
			res.on('result', (result) => {
				const { chatUuid, ...rest } = result;
				if (chatUuid) {
					dispatch({ type: 'set-history-uuid', data: chatUuid });
				}
				dispatch({ type: 'update-assistant-message', data: { result: rest } });
			});
			res.on('error', (error) => {
				dispatch({ type: 'add-system-message', data: { content: error.message } });
			});
		},
		[state.pastedImageFile, chatUuid, additionalContextIds, docAnalysisMode]
	);

	const addMessage = useCallback(
		async (value) => {
			if (readOnlyMode) {
				return;
			}
			dispatch({ type: 'add-user-message', data: { content: value } });
			generateResponse(value);
		},
		[generateResponse, readOnlyMode]
	);

	const onRegenerateClick = useCallback(() => {}, []);

	const handlePaste = useCallback(async (event) => {
		const items = event.clipboardData?.items;
		if (items) {
			for (const item of items) {
				if (item.type.indexOf('image') === 0) {
					const blob = item.getAsFile();
					dispatch({ type: 'set-pasted-image', data: blob });
					break;
				}
			}
		}
	}, []);

	const onKeyDown = useCallback(
		async function (e) {
			if (state.waiting) {
				return false;
			}
			if (e.key === 'Enter') {
				const value = e.currentTarget.value.trim();
				e.currentTarget.value = '';
				addMessage(value);
			}
		},
		[state.waiting, addMessage]
	);

	const submit = useCallback(() => {
		const $el = document.querySelector('#user-input');
		const value = $el.value;
		$el.value = '';
		addMessage(value);
	}, [addMessage]);

	useEffect(() => {
		scrollToBottom();
	}, [state.messages]);

	const copyChat = useCallback(() => {
		const path = location.pathname.replace('/shared/', '/');
		navigate(`${path}?copy=true`);
	}, []);

	return (
		<MathJaxContext>
			<div
				className="relative chat h-screen pb-[76px]"
				style={{ display: fullWidth ? 'block' : 'grid' }}
			>
				<div
					ref={scrollContainer}
					id="output"
					className={`p-10 base-300 overflow-y-scroll w-full h-full ${!fullHeight && 'pt-[100px]'}`}
				>
					{state.messages.map((message, i) => (
						<ChatMessage
							key={i}
							{...message}
							onExampleClick={addMessage}
							onRegenerateClick={onRegenerateClick}
						/>
					))}
				</div>
				<div className="absolute bottom-0 w-full p-4 footer bg-base-100 border-t border-gray-500">
					{readOnlyMode ? (
						<div className="w-full flex items-center justify-between">
							<div className="flex items-center gap-2">
								<img className="h-8" src="/images/logo.png" />
								<p className="text-lg">
									Self-host your own AI ChatBot with{' '}
									<a className="link" href="https://startkit.ai">
										StartKit.AI
									</a>
								</p>
							</div>
							<button className="btn" onClick={copyChat}>
								Continue this chat for free{' '}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 32 32"
									width={16}
									height={16}
									fill="none"
									stroke="currentcolor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="4"
								>
									<path d="M22 6 L30 16 22 26 M30 16 L2 16" />
								</svg>
							</button>
						</div>
					) : (
						<div className="flex flex-row gap-2 w-full">
							{state.pastedImageFile && (
								<img
									src={URL.createObjectURL(state.pastedImageFile)}
									className="w-[42px] h-[42px] rounded-md"
									alt="GPT will identify the contents of this image and use it as context for it's reply"
								/>
							)}
							<input
								onPaste={handlePaste}
								autoFocus
								onKeyDown={onKeyDown}
								id="user-input"
								type="text"
								className="w-full rounded p-3 focus:outline-none flex-1"
								placeholder="Message chat..."
							/>
							{state.waiting ? (
								<span className="absolute right-[25px] bottom-[22px] loading loading-spinner"></span>
							) : (
								<kbd
									className="kbd cursor-pointer absolute right-[25px] bottom-[22px]"
									onClick={submit}
									id="submit"
								>
									enter
								</kbd>
							)}
						</div>
					)}
				</div>
			</div>
		</MathJaxContext>
	);
}

function imageToBase64(blob) {
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onloadend = async () => {
			const base64data = reader.result;
			resolve(base64data);
		};
		reader.readAsDataURL(blob);
	});
}
