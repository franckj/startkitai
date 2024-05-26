import { useEffect, useState } from 'react';

import Chat from '../chat/chat.jsx';
import Header from '../components/header.jsx';
import { apiRequest } from '../utils/api-request.js';

export default function ChatWithPdf() {
	const [isLoading, setLoading] = useState(false);
	const [selectedFile, setSelectedFile] = useState(null);
	// eslint-disable-next-line no-undef
	const [pdfContextId, setPdfContextId] = useState(__VITE_DEMO_PDF_CONTEXT_ID__);

	const handleFileChange = (event) => {
		if (!event.target.files.length) {
			return null;
		}
		setLoading(true);
		const file = event.target.files[0];
		const reader = new FileReader();

		reader.onload = function () {
			const arrayBuffer = reader.result;
			setSelectedFile(arrayBuffer);
			handleUpload(file).then((id) => {
				console.log('setting context id', id);
				setPdfContextId(id);
				setLoading(false);
			});
		};
		reader.onerror = function (error) {
			console.log('Error reading file:', error);
		};
		reader.readAsArrayBuffer(file);
	};

	useEffect(() => {
		if (selectedFile) {
			loadPDF(selectedFile);
		}
	}, [selectedFile]);

	useEffect(() => {
		window.pdfjsLib.GlobalWorkerOptions.workerSrc =
			'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.mjs';
		fetch('/warp.pdf')
			.then((response) => response.arrayBuffer())
			.then((arrayBuffer) => {
				loadPDF(arrayBuffer);
			});
	}, []);

	return (
		<>
			<Header currentPage="PDF Chat" />
			<div className="pt-[64px]">
				<div className="flex flex-row h-screen mt-[-64px]">
					<div className="relative pdf-container w-[700px] bg-white h-screen pt-[64px] overflow-y-scroll overflow-x-hidden">
						<form
							className="p-2 w-full border-b border-gray-300"
							method="post"
							encType="multipart/form-data"
						>
							<input
								className="file-input w-full"
								type="file"
								accept="application/pdf"
								onChange={handleFileChange}
							/>
						</form>
						{isLoading ? (
							<span className="absolute top-[50%] left-[50%] loading loading-spinner loading-lg"></span>
						) : null}
						<div
							id="pdf-viewer"
							className="p-4 flex align-center flex-col gap-2"
							style={{ backgroundColor: '#f4f4f4' }}
						></div>
					</div>

					<div className="flex-1">
						<Chat
							baseUrl={'/demos/chat-with-pdf'}
							fullWidth={true}
							initialMessage="Hi there! Ask me questions about the document over there and I'll try and answer them!"
							examples={[
								'Give me a summary of the document.',
								'What is a subspace field?',
								'ELIF the twin paradox'
							]}
							additionalContextIds={pdfContextId ? [pdfContextId] : []}
						/>
					</div>
				</div>
			</div>
		</>
	);
}

const handleUpload = async (file) => {
	const formData = new FormData();
	formData.append('file', file);
	try {
		const response = await apiRequest('/api/embeddings/file', {
			method: 'POST',
			body: formData,
			form: true
		});

		if (response.ok) {
			const { contextId } = await response.json();
			return contextId;
		} else {
			throw await response.json();
		}
	} catch (error) {
		console.error(error);
	}
};

function loadPDF(data, { canvasWidth = 600 } = {}) {
	document.querySelectorAll('.pdf-page-canvas').forEach((el) => {
		el.remove();
	});
	const viewer = document.getElementById('pdf-viewer');
	const loadingTask = window.pdfjsLib.getDocument(data);
	loadingTask.promise.then(
		function (pdf) {
			function renderPage(pageNumber, canvas) {
				pdf.getPage(pageNumber).then(function (page) {
					const viewport = page.getViewport({
						scale: canvas.width / page.getViewport({ scale: 1.0 }).width
					});
					canvas.height = viewport.height;
					page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport });
				});
			}

			for (let page = 1; page <= pdf.numPages; page++) {
				const canvas = document.createElement('canvas');
				canvas.width = canvasWidth;
				canvas.className = 'pdf-page-canvas';
				viewer.appendChild(canvas);
				renderPage(page, canvas);
			}
		},
		function (reason) {
			console.error(reason);
		}
	);
}
