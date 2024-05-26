import { useCallback, useEffect, useRef, useState } from 'react';

import Header from '../components/header.jsx';
import { apiRequest } from '../utils/api-request.js';

export default function PhotoTranslate() {
	const [prompt, setPrompt] = useState('Get all of the text from the photo');
	const [result, setResult] = useState(null);
	const [isLoading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const videoRef = useRef(null);
	const canvasRef = useRef(null);
	const [streamStarted, setStreamStarted] = useState(false);
	const [photoTaken, setPhotoTaken] = useState(false);

	useEffect(() => {
		try {
			navigator.mediaDevices.getUserMedia({ video: true }).then((videoStream) => {
				if (videoRef.current) {
					videoRef.current.srcObject = videoStream;
					setStreamStarted(true);
				}
			});
		} catch (err) {
			console.error(`Error accessing the camera: ${err}`);
		}
	}, []);

	const submit = useCallback(
		async (image) => {
			setLoading(true);
			setError(null);
			const formData = new FormData();
			formData.append('image', image, 'photo.png'); // The file will be accessible in the backend under the key 'image'
			formData.append('prompt', prompt);
			const response = await apiRequest('/api/images/detect', {
				method: 'POST',
				body: formData,
				form: true
			});
			if (response.ok) {
				const data = await response.json();
				setResult(data.result);
			} else if (response.status === 429) {
				setError(
					`Sorry you've run out of image requests for today. Connect with your OpenAI key if you want to make more.`
				);
			}
			setLoading(false);
		},
		[prompt]
	);

	const takePhoto = useCallback(() => {
		setPhotoTaken(true);
		const context = canvasRef.current.getContext('2d');
		context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
		// You can now convert the canvas content to a data URL or blob if needed.
		canvasRef.current.toBlob((blob) => submit(blob));
	}, [submit]);

	const clear = useCallback(() => {
		const context = canvasRef.current.getContext('2d');
		context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
		setPhotoTaken(false);
	}, []);

	useEffect(() => {
		const handleSpacebar = (event) => {
			if (event.code === 'Space') {
				if (photoTaken) {
					clear();
				} else {
					// Call your function here
					takePhoto();
				}
			}
		};

		window.addEventListener('keydown', handleSpacebar);

		// Clean up the event listener
		return () => {
			window.removeEventListener('keydown', handleSpacebar);
		};
	}, [clear, photoTaken, takePhoto]);

	return (
		<>
			<Header currentPage="Photo translate" />
			<div className="pt-[64px] px-5">
				<label className="form-control">
					<div className="label">
						<span className="label-text">
							Are there special details about your image you want the AI to know about?
						</span>
					</div>
					<textarea
						onInput={({ currentTarget }) => setPrompt(currentTarget.value)}
						className="textarea textarea-bordered h-24"
						placeholder="..."
						defaultValue={prompt}
					></textarea>
				</label>
				<div className="relative h-[480px] my-4 max-w-100vw">
					<video
						className="absolute"
						ref={videoRef}
						id="video"
						width="640"
						height="480"
						autoPlay
					></video>
					<canvas
						className="absolute"
						ref={canvasRef}
						id="canvas"
						width="640"
						height="480"
					></canvas>
				</div>
				{result ? <div className="my-4 max-w-[640px]">{result}</div> : null}
				<div className="m-4 flex flex-row gap-2">
					<button className="btn" onClick={takePhoto} disabled={!streamStarted}>
						{isLoading ? (
							<span id="loading" className="loading loading-spinner"></span>
						) : (
							<span>Detect and translate</span>
						)}
					</button>
					<button className="btn" onClick={clear}>
						Clear
					</button>
				</div>
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
			</div>
		</>
	);
}
