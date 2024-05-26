import { useEffect, useMemo, useRef, useState } from 'react';

import { apiRequest } from '../utils/api-request';
import { createPortal } from 'react-dom';

export default function UsageModel({ children }) {
	const usageModal = useRef(null);
	const [isOpen, toggleOpen] = useState(false);

	useEffect(() => {
		if (isOpen) {
			usageModal.current.showModal();
		} else {
			usageModal.current.close();
		}
	}, [isOpen]);

	return (
		<>
			{children(() => {
				toggleOpen(true);
			})}
			{createPortal(
				<dialog ref={usageModal} className="modal">
					<div className="modal-box fixed	">
						<h3 className="font-bold text-lg">Usage</h3>
						<p>
							{`Here's what you've used so far during the demo. Usage is managed by`}{' '}
							<a className="link" href="https://startkit.ai/#pricing">
								StartKit.AI Growth
							</a>
							, which gives you configurable limits per user.
						</p>
						{isOpen ? <KeyLimits /> : null}
						<div className="flex flex-row justify-between">
							<button onClick={() => toggleOpen(false)} className="btn mt-2">
								Close
							</button>
						</div>
					</div>
				</dialog>,
				document.body
			)}
		</>
	);
}

function KeyLimits() {
	const [isLoading, setLoading] = useState(true);
	const [keyData, setKeyData] = useState(null);

	useEffect(() => {
		apiRequest('/api/users/me')
			.then(async (res) => res.json())
			.then(({ key }) => {
				setKeyData(parse(key));
				setLoading(false);
			});
	}, []);

	const content = useMemo(() => {
		if (isLoading) {
			return <span id="loading" className="loading loading-spinner"></span>;
		}
		const { limits, usage } = keyData;
		const { daily } = limits;
		const {
			totalRequests: totalDailyRequestLimit = Infinity,
			totalCost: totalDailyCostLimit = Infinity,
			chat: chatLimit = Infinity,
			image: imageLimit = Infinity,
			tts: ttsLimit = Infinity
		} = daily;
		const { today } = usage;
		const {
			totalRequests: totalQueriesToday = 0,
			totalCost: totalCostToday = 0,
			chat,
			image,
			tts
		} = today;

		const percentageQueries = (totalQueriesToday / totalDailyRequestLimit) * 100;
		const percentageCost = (totalCostToday / totalDailyCostLimit) * 100;

		let renderLimits = [];
		let percentageChat;
		let percentageImages;
		let percentageTts;
		if (chatLimit) {
			percentageChat = ((chat.requests || 0) / (chatLimit.requests || Infinity)) * 100;
			renderLimits.push({
				requests: chat.requests,
				percentage: percentageChat,
				label: 'Chat',
				limit: chatLimit.requests
			});
		}
		if (imageLimit) {
			percentageImages = ((image.requests || 0) / (imageLimit.requests || Infinity)) * 100;
			renderLimits.push({
				percentage: percentageImages,
				label: 'Image Generation',
				limit: imageLimit.requests,
				requests: image.requests
			});
		}
		if (ttsLimit) {
			percentageTts = ((tts.requests || 0) / (ttsLimit.requests || Infinity)) * 100;
			renderLimits.push({
				requests: tts.requests,
				percentage: percentageTts,
				label: 'Text-to-Speech',
				limit: ttsLimit.requests
			});
		}

		return (
			<ul>
				<li>
					<div className="flex justify-between items-end">
						<span>Total cost (USD)</span>
						<span className="text-xs">
							${totalCostToday.toFixed(4)}/${totalDailyCostLimit.toFixed(2)}
						</span>
					</div>
					<progress className="progress w-full" value={percentageCost} max="100"></progress>
				</li>
				<li>
					<div className="flex justify-between items-end">
						<span>Total requests</span>
						<span className="text-xs">
							{totalQueriesToday}/{totalDailyRequestLimit}
						</span>
					</div>
					<progress className="progress w-full" value={percentageQueries} max="100"></progress>
				</li>
				{renderLimits.map(({ label, requests, percentage, limit }) => {
					return (
						<li key={label}>
							<div className="flex justify-between items-end">
								<span>{label}</span>
								<span className="text-xs">
									{requests || 0}/{limit || Infinity}
								</span>
							</div>
							<progress className="progress w-full" value={percentage} max="100"></progress>
						</li>
					);
				})}
			</ul>
		);
	}, [isLoading, keyData]);

	return <div className="m-2 mt-4">{content}</div>;
}

function parse(data) {
	const str = JSON.stringify(data);
	return JSON.parse(str, (key, value) => {
		if (value === null) return Infinity;
		return value;
	});
}
