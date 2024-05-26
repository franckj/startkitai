import { redirect, useLoaderData } from 'react-router-dom';
import { useCallback, useState } from 'react';

import Stat from './components/stat.jsx';
import { adminApiRequest } from './utils/api-request.js';

export default function Embeddings() {
	const [ns, setNs] = useState('global');
	const [contextId, setContextId] = useState('');
	const data = useLoaderData();
	const [tab, setTab] = useState('files');
	const [percentage, setPercentage] = useState(0);
	const [isLoading, setLoading] = useState(false);
	const [description, setDescription] = useState('');

	const saveEmbeddings = useCallback(
		async (e) => {
			e.preventDefault();
			setLoading(true);
			if (tab === 'files') {
				const file = e.currentTarget['embeddings-upload'].files?.[0];
				if (!file) {
					alert('Please select a file to embed');
					return;
				}

				const formData = new FormData();
				formData.append('file', file);
				formData.append('namespace', ns);
				formData.append('contextId', contextId);
				const output = await adminApiRequest('/api/admin/embeddings/file', {
					method: 'POST',
					body: formData,
					form: true
				});
				alert(
					`Successfully embedded your file. You can use the ContextID ${output.contextId} to query it.`
				);
				setPercentage(100);
				e.form.reset();
			} else if (tab === 'url-list') {
				const urlsStr = e.currentTarget['url-list'].value;
				if (!urlsStr) {
					alert('A list of URLs is required');
					return;
				}
				const urls = urlsStr.split('\n');

				const response = await adminApiRequest('/api/admin/embeddings/urls', {
					method: 'POST',
					body: {
						urls,
						contextId,
						namespace: ns
					}
				});
				const reader = response.body.getReader();
				let isDone = false;
				while (!isDone) {
					const { value, done } = await reader.read();
					if (done) {
						isDone = true;
						break;
					}
					try {
						const text = new TextDecoder('utf-8').decode(value);
						const json = JSON.parse(text);
						setPercentage(json.percentage);
					} catch (err) {
						console.warn(err);
					}
				}
				setPercentage(1);
			} else if (tab === 'csv') {
				const csvFile = e.currentTarget['csv-upload'].files?.[0];
				if (!csvFile) {
					alert('A csv file is required');
					return;
				}
				const formData = new FormData();
				formData.append('file', csvFile);
				formData.append('namespace', ns);
				formData.append('contextId', contextId);
				formData.append('description', description);
				const output = await adminApiRequest('/api/admin/embeddings/csv', {
					method: 'POST',
					body: formData,
					form: true
				});

				setPercentage(100);
				alert(
					`Successfully embedded your files. You can use the ContextID ${output.contextId} to query them.`
				);
			}
			setLoading(false);
		},
		[contextId, description, ns, tab]
	);
	return (
		<>
			{data.error ? (
				<div role="alert" className="alert alert-error col-span-12">
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
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{data.error}</span>
				</div>
			) : null}
			<section className="stats stats-vertical col-span-12 w-full shadow-sm xl:stats-horizontal">
				<Stat title="Storage usage" value={(data.indexFullness || 0).toFixed(2)} type="perc" />
				{/* <Stat title="New users month" value={0} /> */}
				<Stat title="Total vector count" value={data.totalVectorCount || 0} />
			</section>
			<section className="card col-span-12 bg-base-100 p-5">
				<h2 className="card-title">Upload file to embeddings</h2>
				<p>
					The main use for this is to upload files to the &quot;global&quot; namespace. This is
					queried for all users and so is useful for augmenting chat queries for everyone.
				</p>
				<p>
					The global namespace is queried in the Chat With PDF demo, as it contains the default pdf
					that is there when the demo is opened.
				</p>
				<p>
					Enter a User ID if you only want a single user to be able to query for these embeddings.
				</p>
				<div role="tablist" className="tabs mt-6 tabs-bordered w-[50%]">
					<a
						role="tab"
						className={tab === 'files' ? 'tab tab-active' : 'tab'}
						onClick={() => setTab('files')}
					>
						Document upload
					</a>
					<a
						role="tab"
						className={tab === 'url-list' ? 'tab tab-active' : 'tab'}
						onClick={() => setTab('url-list')}
					>
						External URLs
					</a>
					<a
						role="tab"
						className={tab === 'csv' ? 'tab tab-active' : 'tab'}
						onClick={() => setTab('csv')}
					>
						CSV upload
					</a>
				</div>
				<form className="card-body" onSubmit={saveEmbeddings}>
					<div className={`tab-content ${tab === 'files' ? 'block' : 'hidden'}`}>
						<div className="form-control">
							<label className="label">
								<span className="label-text">Document to embed (.pdf, .txt, .md, .docx)</span>
							</label>
							<input type="file" name="embeddings-upload" className="input p-0 outline-none" />
						</div>
					</div>
					<div className={`tab-content ${tab === 'url-list' ? 'block' : 'hidden'}`}>
						<label className="form-control">
							<div className="label">
								<span className="label-text">Links to documents</span>
							</div>
							<textarea
								name="url-list"
								className="textarea textarea-bordered h-24"
								placeholder="https://example.com"
							></textarea>
							<div className="label">
								<span className="label-text-alt">Put one URL per line (max 1000)</span>
							</div>
						</label>
					</div>
					<div className={`tab-content ${tab === 'csv' ? 'block' : 'hidden'}`}>
						<div className="form-control">
							<label className="label">
								<span className="label-text">CSV of comma seperated URLs to documents</span>
							</label>
							<input type="file" name="csv-upload" className="input p-0 outline-none" />
						</div>
					</div>
					<hr />
					<div className="form-control">
						<label className="label">
							<span className="label-text">
								Namespace. User ID, or &quot;global&quot; if you want all users to have access
							</span>
						</label>
						<input
							type="text"
							className="input input-bordered font-mono"
							required
							name="embeddings-namespace"
							onInput={(e) => setNs(e.currentTarget.value)}
							value={ns}
						/>
					</div>
					<div className="form-control">
						<label className="label">
							<span className="label-text">
								Give the document(s) a Context ID so they can be referenced later
							</span>
						</label>
						<input
							type="text"
							className="input input-bordered font-mono"
							required
							name="context-id"
							onInput={(e) => setContextId(e.currentTarget.value)}
							value={contextId}
							placeholder="start-trek-s02"
						/>
					</div>
					<div className="form-control">
						<label className="label">
							<span className="label-text">
								It can be useful to give the collection of documents a description so the AI
								understands what it&apos;s looking at.
							</span>
						</label>
						<input
							type="text"
							className="input input-bordered font-mono"
							name="context-id"
							onInput={(e) => setDescription(e.currentTarget.value)}
							value={description}
							placeholder="Short description, eg. 'Each document is a script of an episode of Start Trek TNG season two'"
						/>
					</div>
					<div className="form-control">
						<div className="flex flex-col items-end justify-center py-4">
							<button type="submit" className="btn btn-primary grow">
								{isLoading ? (
									<span className="loading loading-spinner loading-lg"></span>
								) : (
									<span>Save embeddings</span>
								)}
							</button>
							<p className="mt-4 text-sm">Percentage uploaded: {(percentage * 100).toFixed(1)}%</p>
						</div>
					</div>
				</form>
			</section>
		</>
	);
}

Embeddings.loader = async () => {
	try {
		const response = await adminApiRequest('/api/admin/embeddings');
		if (response.expired) {
			return redirect('/admin/login');
		}
		return response;
	} catch (err) {
		console.error(err);
		return { error: err.message };
	}
};
