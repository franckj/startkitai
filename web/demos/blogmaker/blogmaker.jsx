import { useCallback, useEffect, useReducer, useState } from 'react';

import Header from '../components/header.jsx';
import Markdown from 'react-markdown';
import { getStreamedResponse } from '../utils/stream-request.js';

const labels = [
	'Researching sources...',
	'Creating post outline...',
	'Writing final post...',
	'All done!'
];
const reducer = (state, action) => {
	switch (action.type) {
		case 'set-summaries': {
			return { ...state, summaries: action.data };
		}
		case 'update-summary': {
			const { meta, content } = action.data;
			return {
				...state,
				summaries: state.summaries.map((s) => {
					return meta.source === s.source ? { ...s, content: (s.content += content) } : s;
				})
			};
		}
		case 'update-outline': {
			const { content } = action.data;
			return {
				...state,
				outline: state.outline + content
			};
		}
		case 'update-output': {
			const { content } = action.data;
			return {
				...state,
				output: state.output + content
			};
		}
		case 'set-step-completed': {
			return {
				...state,
				stepsCompleted: action.data,
				currentStep: action.data + 1,
				currentStepLabel: labels[action.data]
			};
		}
		case 'set-step': {
			return { ...state, currentStep: action.data };
		}
		case 'set-loading': {
			return { ...state, loading: action.data, currentStepLabel: action.data ? labels[0] : '' };
		}
		case 'set-error': {
			return { ...state, error: action.data };
		}
		default: {
			return state;
		}
	}
};

export default function BlogMaker() {
	const [summaryTabActive, setSummaryTabActive] = useState(0);

	const [sources, setSources] = useState(`https://www.nature.com/articles/s41599-022-01300-7
https://www.sciencedirect.com/science/article/pii/S266432942300002X
https://en.wikipedia.org/wiki/The_Measure_of_a_Man_(Star_Trek:_The_Next_Generation)
https://www.equalityhumanrights.com/human-rights/human-rights-act/article-2-right-life
https://screenrant.com/star-trek-tng-data-every-starship-command/
`);

	const [state, dispatch] = useReducer(reducer, {
		summaries: [sources],
		loading: false,
		currentStep: 1,
		stepsCompleted: 0,
		outline: '',
		output: '',
		currentStepLabel: ''
	});
	const [userPrompt, setUserPrompt] = useState(
		`I want to create a blog post about the moral, ethical, and societal implications of artificial intelligence and synthetic life, both within the "Star Trek" universe and in our own reality.`
	);

	useEffect(() => {
		dispatch({
			type: 'set-summaries',
			data: [...new Set(sources.split('\n').filter(Boolean))].map((s) => ({
				source: s,
				content: ''
			}))
		});
	}, [sources]);

	const submit = useCallback(async () => {
		dispatch({ type: 'set-loading', data: true });
		let sourcesComplete = 0;
		const sourcesList = sources.split('\n').filter(Boolean);
		const res = getStreamedResponse('/api/text/create', {
			sources: sourcesList,
			prompt: userPrompt
		});
		res.on('content', (content) => {
			const parsed = JSON.parse(content);
			if (parsed.step === 1) {
				dispatch({ type: 'update-summary', data: parsed });
			}
			if (parsed.step === 2) {
				dispatch({ type: 'update-outline', data: parsed });
			}
			if (parsed.step === 3) {
				dispatch({ type: 'update-output', data: parsed });
			}
		});
		res.on('metadata', (metadata) => {
			if (metadata.event === 'step-complete') {
				// on step 1 we need to wait for all the sources to be finished
				if (metadata.step === 1 && ++sourcesComplete >= sourcesList.length) {
					dispatch({ type: 'set-step-completed', data: 1 });
				} else if (metadata.step > 1) {
					dispatch({ type: 'set-step-completed', data: metadata.step });
				}
			}
		});
		res.on('result', () => {
			dispatch({ type: 'set-loading', data: false });
		});
		res.on('error', (error) => {
			dispatch({ type: 'set-error', data: error.message });
		});
	}, [sources, userPrompt]);

	return (
		<>
			<Header currentPage="Profile Picture Maker" />

			<div className="pt-[64px] px-5 flex flex-row justify-between gap-10 flex-wrap h-screen">
				<div className="left flex-1">
					<h2 className="mt-5 mb-5 text-lg">Lets make a blog post!</h2>

					<div className="max-w-[620px]">
						<label className="form-control">
							<div className="label">
								<span className="label-text">
									Give a brief summary of the post you want to create.
								</span>
							</div>
							<textarea
								onInput={({ currentTarget }) => setUserPrompt(currentTarget.value)}
								className="textarea textarea-bordered h-34"
								placeholder="..."
								defaultValue={userPrompt}
							></textarea>
						</label>
						<label className="form-control mt-4">
							<div className="label">
								<span className="label-text">
									Provide a set of webpages for the AI to use as inspiration and background info
								</span>
							</div>
							<textarea
								className="textarea textarea-bordered h-72"
								placeholder="https://example.com/example-blogpost"
								onChange={(e) => setSources(e.currentTarget.value)}
							>
								{sources}
							</textarea>
							<div className="label">
								<span className="label-text-alt"></span>
								<span className="label-text-alt">Max 10</span>
							</div>
						</label>

						<div className="flex flex-row gap-2">
							<button onClick={submit} className={`btn`}>
								{state.loading ? (
									<span className="loading loading-spinner loading-sm"></span>
								) : (
									<span>Create blog post</span>
								)}
							</button>
						</div>
						<p className="mt-2">{state.estimatedCost}</p>
						<p className="mt-2">{state.currentStepLabel}</p>
					</div>
					{state.error ? (
						<div role="alert" className="max-w-[620px] mx-auto mt-3 alert alert-warning">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="stroke-current shrink-0 h-6 w-6"
								fill="none"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
							<span>{state.error}</span>
						</div>
					) : null}
				</div>
				<div className="right flex-1 py-5 mt-4 flex-grow flex flex-col">
					<p className="text-center mb-4 text-sm opacity-75">
						The AI will go through three stages to create your blog post.
					</p>
					<ul className="steps w-full">
						<li
							onClick={() => dispatch({ type: 'set-step', data: 1 })}
							data-content={state.stepsCompleted >= 1 ? '✓' : '1'}
							className={`step ${state.currentStep >= 1 ? 'step-primary' : ''} cursor-pointer`}
						>
							Research
						</li>
						<li
							onClick={() => dispatch({ type: 'set-step', data: 2 })}
							data-content={state.stepsCompleted >= 2 ? '✓' : '2'}
							className={`step ${state.currentStep >= 2 ? 'step-primary' : ''} cursor-pointer`}
						>
							Outline
						</li>
						<li
							onClick={() => dispatch({ type: 'set-step', data: 3 })}
							data-content={state.stepsCompleted >= 3 ? '✓' : '3'}
							className={`step ${state.currentStep >= 3 ? 'step-primary' : ''} cursor-pointer`}
						>
							Final post
						</li>
					</ul>

					<div className={`pt-5 ${state.currentStep === 1 ? '' : 'hidden'} flex-1 flex flex-col`}>
						<p className="text-center text-sm mb-4 opacity-75">
							{`This section will be used to record the AIs research into your provided sources.`}
						</p>
						<div role="tablist" className="tabs tabs-boxed">
							{state.summaries.map((summary, i) => {
								return (
									<a
										key={summary.source}
										onClick={() => setSummaryTabActive(i)}
										role="tab"
										className={`tab ${summaryTabActive === i ? 'tab-active' : ''}`}
									>
										{`Source ${i + 1}`}
									</a>
								);
							})}
						</div>
						{state.summaries.map((summary, i) => {
							return (
								<div
									key={summary.source}
									className={`${summaryTabActive === i ? '' : 'hidden'} mt-2 px-2 py-5 overflow-y-scroll flex-1`}
								>
									<div className="py-2 px-0 prose-sm">
										<Markdown className="md ">{summary.content}</Markdown>
									</div>
								</div>
							);
						})}
					</div>

					<div
						className={`pt-5 ${state.currentStep === 2 ? '' : 'hidden'} prose prose-sm w-full mx-auto flex-1 `}
					>
						<p className="text-center text-sm !mb-10 opacity-75">
							{`Now the AI will create an outline for your blog post based on your summary and the completed research.`}
						</p>
						<Markdown className="md overflow-y-scroll">{state.outline}</Markdown>
					</div>
					<div
						className={`pt-5 ${state.currentStep >= 3 ? '' : 'hidden'} prose prose-sm w-full mx-auto flex-1`}
					>
						<p className="text-center text-sm !mb-10 opacity-75">
							{`Using all the research and the outline, the AI will now create your blog post.`}
						</p>
						<Markdown className="md overflow-y-scroll">{state.output}</Markdown>
					</div>
				</div>
			</div>
		</>
	);
}
