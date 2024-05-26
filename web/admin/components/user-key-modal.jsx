import { CheckIcon, RefreshIcon, XMarkIcon } from './icons.jsx';
import { redirect, useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';

import { adminApiRequest } from '../utils/api-request.js';

export default function UserKeyModal() {
	const navigate = useNavigate();
	const location = useLocation();
	const userKeyModal = useRef(null);

	useEffect(() => {
		userKeyModal.current.showModal();
	}, []);

	const closeModal = () => {
		navigate(`/admin/users${location.search}`);
	};

	const reloadModal = () => {
		navigate(location.pathname, { replace: true });
	};

	return (
		<dialog ref={userKeyModal} id="user-key-modal" className="modal">
			<div className="modal-box fixed w-11/12 max-w-5xl">
				<Content onReload={reloadModal} onClose={closeModal} />

				<form method="dialog">
					<div className="flex justify-end mt-3 pt-2 gap-2 border-t border-t-gray-500">
						<button className="btn" onClick={closeModal}>
							Close
						</button>
					</div>
				</form>
			</div>
		</dialog>
	);
}

function Content({ onReload, onClose }) {
	const { data: licenseKey, error } = useLoaderData();

	console.log(licenseKey);

	const onClickRefresh = useCallback(
		async (period) => {
			if (confirm(`Are you sure you want to refresh ${period.toUpperCase()} limits?`)) {
				await adminApiRequest(`/api/admin/keys/${licenseKey.uuid}/refresh`, {
					method: 'PUT',
					body: { period }
				});
				onReload();
			}
		},
		[licenseKey, onReload]
	);

	const onClickRoll = useCallback(async () => {
		if (confirm('Are you sure you want to ROLL this key?')) {
			await adminApiRequest(`/api/admin/keys/${licenseKey.uuid}/roll`, {
				method: 'PUT'
			});
			onReload();
		}
	}, [licenseKey, onReload]);

	const onClickRevoke = useCallback(async () => {
		if (confirm('Are you sure you want to REVOKE this key?')) {
			await adminApiRequest(`/api/admin/keys/${licenseKey.uuid}/revoke`, {
				method: 'PUT'
			});
			onReload();
		}
	}, [licenseKey, onReload]);

	const onClickGrant = useCallback(async () => {
		if (confirm('Are you sure you want to GRANT this key?')) {
			await adminApiRequest(`/api/admin/keys/${licenseKey.uuid}/grant`, {
				method: 'PUT'
			});
			onReload();
		}
	}, [licenseKey, onReload]);

	const onClickSave = useCallback(
		async (data) => {
			await adminApiRequest(`/api/admin/keys/${licenseKey.uuid}/limits`, {
				method: 'PUT',
				body: { limits: data }
			});
			onReload();
		},
		[licenseKey, onReload]
	);

	if (error) {
		return (
			<>
				<p>Something went wrong fetching this license key:</p>
				<pre className="bg-gray-800 text-red-400 p-2 mt-2 rounded font-mono whitespace-pre-wrap">
					{JSON.stringify(error, null, 2)}
				</pre>
			</>
		);
	}

	if (!licenseKey) {
		return <p>Loading...</p>;
	}

	return (
		<>
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-1 mb-2">
					<h1 className="font-bold text-lg">License Key</h1>
					{licenseKey.revoked ? <span className="badge badge-error">revoked</span> : null}
				</div>
				<button className="btn btn-ghost btn-sm" onClick={onClose}>
					<XMarkIcon />
				</button>
			</div>

			<div className="section mb-6">
				<div className="flex justify-between flex-wrap">
					<div>
						<code className="font-mono text-sm pb-1">{licenseKey.key}</code>
					</div>
					<div className="flex gap-1">
						<button className="btn btn-xs btn-neutral" onClick={onClickRoll}>
							<RefreshIcon className="w-4 h-4" />
							<span>Roll this key</span>
						</button>
						{licenseKey.revoked ? (
							<button className="btn btn-xs btn-success" onClick={onClickGrant}>
								<CheckIcon className="w-4 h-4" />
								<span>Grant this key</span>
							</button>
						) : (
							<button className="btn btn-xs btn-error" onClick={onClickRevoke}>
								<XMarkIcon className="w-4 h-4" />
								<span>Revoke this key</span>
							</button>
						)}
					</div>
				</div>
			</div>

			<div className="section mb-6">
				<h3 className="font-bold text-lg mb-2">Usage</h3>
				<Limits limits={licenseKey.limits} usage={licenseKey.usage} />
				<div className="flex gap-2 justify-end flex-wrap">
					<button className="btn btn-xs btn-neutral" onClick={() => onClickRefresh('daily')}>
						<RefreshIcon className="w-4 h-4" />
						<span>Refresh Daily Limits</span>
					</button>
					<button className="btn btn-xs btn-neutral" onClick={() => onClickRefresh('monthly')}>
						<RefreshIcon className="w-4 h-4" />
						<span>Refresh Monthly Limits</span>
					</button>
				</div>
			</div>

			<EditLimits limits={licenseKey.limits} onSave={onClickSave} />
		</>
	);
}

function Limits({ limits, usage }) {
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
		<div className="m-2 mt-4">
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
		</div>
	);
}

function EditLimits({ limits, onSave }) {
	const [data, setData] = useState(limits);
	const [tab, setTab] = useState('daily');

	if (typeof limits?.daily?.totalRequests === 'undefined') {
		return <p>User has no limits data, probably an admin.</p>;
	}

	const handleChange = (period, category, field, value) => {
		const newData = { ...data };
		let newVal = value === '' ? Infinity : parseInt(value);

		// isNaN(parseInt(e.target.value)) ? 0 : parseInt(e.target.value)
		if (category) {
			newData[period][category][field] = newVal;
		} else {
			newData[period][field] = newVal;
		}
		setData(newData);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		onSave(data);
	};
	return (
		<form onSubmit={handleSubmit}>
			<div role="tablist" className="tabs tabs-boxed">
				<a
					role="tab"
					onClick={() => setTab('daily')}
					className={`tab ${tab === 'daily' ? 'tab-active' : ''}`}
				>
					Daily
				</a>
				<a
					role="tab"
					onClick={() => setTab('monthly')}
					className={`tab ${tab === 'monthly' ? 'tab-active' : ''}`}
				>
					Monthly
				</a>
			</div>

			{tab === 'daily' ? (
				<div role="tabpanel" className="p-6">
					<Fields period="daily" data={data.daily} onChange={handleChange} />
				</div>
			) : null}

			{tab === 'monthly' ? (
				<div role="tabpanel" className="p-6">
					<Fields period="monthly" data={data.monthly} onChange={handleChange} />
				</div>
			) : null}

			<button type="submit" className="btn btn-sm btn-primary flex ml-auto">
				Save Changes
			</button>
		</form>
	);
}

function getVal(val) {
	if (!val || val === Infinity) return '';
	return val;
}
function Fields({ period, data, onChange }) {
	return Object.entries(data).map(([key, value]) => {
		if (key === 'hitLimit') {
			return null;
		}
		if (typeof value === 'object') {
			return (
				<div key={key} className="mb-4">
					<h3 className="text-gray-400 text-sm">{key}</h3>
					{Object.entries(value).map(([field, val]) => (
						<label className="input input-bordered input-sm flex items-center gap-2" key={field}>
							<span className="opacity-70">{field}:</span>
							<input
								type="number"
								value={getVal(val)}
								onChange={(e) => onChange(period, key, field, e.currentTarget.value)}
								className="grow"
							/>
						</label>
					))}
				</div>
			);
		} else {
			return (
				<div key={key} className="mb-4">
					<h3 className="text-gray-400 text-sm">{key}</h3>
					<label className="input input-bordered input-sm flex items-center gap-2" key={key}>
						<span className="opacity-70">{key}:</span>
						<input
							type="number"
							value={getVal(value)}
							onChange={(e) => onChange(period, null, key, e.currentTarget.value)}
							className="grow"
						/>
					</label>
				</div>
			);
		}
	});
}

UserKeyModal.loader = async ({ params }) => {
	const { keyUuid } = params;
	try {
		const response = await adminApiRequest(`/api/admin/keys/${keyUuid}`);
		if (response.expired) {
			return redirect('/admin/login');
		}
		return { data: response };
	} catch (err) {
		return { error: err };
	}
};
