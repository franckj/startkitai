import { useCallback, useState } from 'react';

import Header from '../components/header.jsx';
import { apiRequest } from '../utils/api-request.js';

export default function ImageGen() {
	const [prompt, setPrompt] = useState('An underwater scene showing a squid playing in the waves');
	const [result, setResult] = useState({ url: null, revisedPrompt: '' });
	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState(null);

	const submit = useCallback(async () => {
		setLoading(true);
		setError(null);

		const response = await apiRequest('/api/images/create', {
			method: 'POST',
			body: {
				prompt
			}
		});
		if (response.ok) {
			const data = await response.json();
			setResult(data);
		} else if (response.status === 429) {
			setError(
				`Sorry you've run out of image requests for today. Connect with your OpenAI key if you want to make more.`
			);
		} else {
			setError('Something went wrong');
		}
		setLoading(false);
	}, [prompt]);
	return (
		<>
			<Header currentPage="Image Generation" />
			<div className="pt-[64px] px-5">
				<label className="form-control">
					<div className="label">
						<span className="label-text">Enter the prompt for an image in natural language</span>
					</div>
					<textarea
						onInput={({ currentTarget }) => setPrompt(currentTarget.value)}
						className="textarea textarea-bordered h-24"
						placeholder="An underwater scene showing a squid playing in the waves"
						defaultValue={prompt}
					></textarea>
				</label>
				<button className="btn btn-primary mt-2" onClick={submit} disabled={isLoading}>
					{isLoading ? (
						<span id="loading" className="loading loading-spinner"></span>
					) : (
						<span>Create image</span>
					)}
				</button>
				{error ? (
					<div role="alert" className="mt-3 alert alert-warning">
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
						<span>{error}</span>
					</div>
				) : null}
				<Output {...result} />
			</div>
		</>
	);
}

function Output({ images } = {}) {
	if (!images?.length) {
		return null;
	}

	const { url, revisedPrompt } = images[0];
	return (
		<div className="output">
			<img className="my-3 w-[600px] max-w-screen rounded" src={url} alt={revisedPrompt} />
			<p className="text-sm">{revisedPrompt}</p>
		</div>
	);
}
