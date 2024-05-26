import { useCallback, useState } from 'react';

import Header from '../components/header.jsx';
import ImageUpload from './image-upload.jsx';
import { apiRequest } from '../utils/api-request.js';

const prompt = [
	`The image you are provided with is going to be used to create a profile image for social media.`,
	`It should be a photo of a person and it's your job to describe the photo in a way that the description can be used by DALL.E to create the output profile image along with some other info provided by the user.`,
	`Only describe the person in the photo, not the background, and only output the prompt for DALLE`,
	`Include the following in your output prompt:`,
	`- The outfit`,
	`- The ethnicity of the person`,
	`- The hairstyle`,
	`- Eye color`,
	`- The gender if possible`,
	`- The orientation of the person, eg "facing the camera"`,
	`If there's no person in the photo then describe a prompt for a random Star Trek character instead`
];

export default function PFPMaker() {
	const [hasUploaded, setHasUploaded] = useState(false);
	const [imageDescription, setImageDescription] = useState('');
	const [output, setOutput] = useState('');
	const [error, setError] = useState(null);
	const [userPrompt, setUserPrompt] = useState('Make me look like a cartoon member of Starfleet!');

	const createPFP = useCallback(
		async (prompt) => {
			const response = await apiRequest('/api/images/create', {
				method: 'POST',
				body: {
					prompt: `Photo Description: ${prompt}
User Instructions: ${userPrompt}`
				}
			});
			if (response.ok) {
				const data = await response.json();
				setOutput(data);
			} else if (response.status === 429) {
				setError(
					`Sorry you've run out of image requests for today. Connect with your OpenAI key if you want to make more.`
				);
			} else {
				setError('Something went wrong');
			}
		},
		[userPrompt]
	);

	const onSubmit = useCallback(
		async (file) => {
			setImageDescription('');
			setOutput('');
			setHasUploaded(true);
			const formData = new FormData();
			formData.append('image', file);
			formData.append('prompt', prompt);
			try {
				const response = await apiRequest('/api/images/detect', {
					method: 'POST',
					body: formData,
					form: true
				});

				if (response.ok) {
					const { result } = await response.json();
					setImageDescription(result);

					createPFP(result);
				} else if (response.status === 429) {
					setHasUploaded(false);
					setError(
						`Sorry you've run out of image requests for today. Connect with your OpenAI key if you want to make more.`
					);
				} else {
					setHasUploaded(false);
					setError('Something went wrong');
				}
			} catch (error) {
				console.error('Error:', error);
			}
		},
		[createPFP]
	);

	return (
		<>
			<Header currentPage="Profile Picture Maker" />

			<div className="pt-[64px] px-5">
				<h2 className="mt-5 mb-5 text-lg text-center">
					Create a custom profile picture from your photo!
				</h2>
				<div className="max-w-[620px] mx-auto">
					<label className="form-control">
						<div className="label">
							<span className="label-text">Are there special instructions?</span>
						</div>
						<textarea
							onInput={({ currentTarget }) => setUserPrompt(currentTarget.value)}
							className="textarea textarea-bordered h-24"
							placeholder="..."
							defaultValue={userPrompt}
						></textarea>
					</label>
				</div>
				<ImageUpload onSubmit={onSubmit} />
			</div>

			{error ? (
				<div role="alert" className="max-w-[450px] mx-auto mt-3 alert alert-warning">
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

			{hasUploaded ? (
				<div className="mt-6 flex flex-row px-6 relative md:h-[400px] justify-center items-center gap-5 flex-wrap">
					<div className="md:w-[50%] flex flex-col justify-center">
						<h3 className="font-bold">AI description of photo</h3>
						{imageDescription ? (
							<p>{imageDescription}</p>
						) : (
							<div className="flex flex-col gap-4 mt-2">
								<div className="skeleton h-6 w-full"></div>
								<div className="skeleton h-6 w-full"></div>
							</div>
						)}
						<h3 className="font-bold mt-4">AI revised prompt</h3>
						{output.images?.[0].revisedPrompt ? (
							<p>{output.images?.[0].revisedPrompt}</p>
						) : (
							<div className="mt-2 flex flex-col gap-2">
								<div className="skeleton h-6 w-full"></div>
								<div className="skeleton h-6 w-full"></div>
							</div>
						)}
					</div>
					<div className="h-full inline-block">
						{output.images?.[0].url ? (
							<img src={output.images?.[0].url} className="max-h-full rounded-lg" height="400" />
						) : (
							<div className="skeleton h-[400px] w-[400px]"></div>
						)}
					</div>
				</div>
			) : null}
		</>
	);
}
