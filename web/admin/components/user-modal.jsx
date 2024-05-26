import { redirect, useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef } from 'react';

import { XMarkIcon } from './icons';
import { adminApiRequest } from '../utils/api-request';
import formatDate from '../utils/format-date';

export default function UserModal() {
	const navigate = useNavigate();
	const location = useLocation();
	const userModal = useRef(null);

	useEffect(() => {
		userModal.current.showModal();
	}, []);

	const closeModal = () => {
		navigate(`/admin/users${location.search}`);
	};

	return (
		<dialog ref={userModal} id="user-modal" className="modal">
			<div className="modal-box fixed w-11/12 max-w-3xl">
				<Content onClose={closeModal} />

				<form method="dialog">
					<div className="flex justify-end mt-2">
						<button className="btn" onClick={closeModal}>
							Close
						</button>
					</div>
				</form>
			</div>
		</dialog>
	);
}

function Content({ onClose }) {
	const { data: user, error } = useLoaderData();

	const onClickDelete = useCallback(async () => {
		if (confirm(`Are you sure you want to DELETE this user?`)) {
			await adminApiRequest(`/api/admin/users/${user.uuid}`, {
				method: 'DELETE'
			});
			onClose();
		}
	}, [onClose, user]);

	if (error) {
		return (
			<>
				<p>Something went wrong fetching this user:</p>
				<pre className="bg-gray-800 text-red-400 p-2 mt-2 rounded font-mono whitespace-pre-wrap">
					{JSON.stringify(error, null, 2)}
				</pre>
			</>
		);
	}

	if (!user) {
		return <p>Loading...</p>;
	}

	return (
		<>
			<div className="flex items-center justify-between mb-2">
				<h1 className="font-bold text-lg">{user?.email}</h1>
				<button className="btn btn-ghost btn-sm" onClick={onClose}>
					<XMarkIcon />
				</button>
			</div>

			<div className="flex gap-2 flex-col mt-2">
				<div className="section border-b border-b-[1px] border-gray-400 pt-2 pb-2">
					<h4 className="text-gray-500 mb-1">Created at</h4>
					<p>{formatDate(user.meta.createdAt)}</p>
				</div>

				<div className="section border-b border-b-[1px] border-gray-400 pt-2 pb-2">
					<h4 className="text-gray-500 mb-1">License key</h4>
					<pre className="font-mono">{user.licenseKey.key}</pre>
				</div>

				<div className="section border-b border-b-[1px] border-gray-400 pt-2 pb-2">
					<h4 className="text-gray-500 mb-1">Plan</h4>
					<Plan billing={user.billing} />
				</div>

				<div className="section border-b border-b-[1px] border-gray-400 pt-2 pb-2">
					<h4 className="text-gray-500 mb-1">Preferences</h4>
					<p>
						<span className="font-bold">Mailing list consent: </span>
						{user?.preferences?.mailingListConsent ? (
							<span className="badge badge-success">Yes</span>
						) : (
							<span className="badge badge-error">No</span>
						)}
					</p>
				</div>

				<div className="section border-b border-b-[1px] border-gray-400 pt-2 pb-2">
					<h4 className="text-gray-500 mb-1">Actions</h4>
					<button className="btn btn-sm btn-error" onClick={onClickDelete}>
						<XMarkIcon className="w-4 h-4" />
						<span>Delete user</span>
					</button>
				</div>
			</div>
		</>
	);
}

function Plan({ billing = {} }) {
	const {
		planActive,
		planName,
		customerId,
		subscriptionId,
		interval,
		canceledAt,
		endsAt,
		deactivatedAt,
		previousSubscriptionId
	} = billing || {};

	return (
		<ul className="list-none p-0 t-0 flex flex-col gap-1">
			<li>
				<span className="font-bold">Plan: </span>
				{planName ? <span>{planName}</span> : <span>Free</span>}
			</li>
			{planActive ? (
				<>
					<li>
						<span className="font-bold">Customer ID: </span>
						<pre className="font-mono inline">{customerId}</pre>
						<span className="ml-2 text-sm opacity-50 inline-flex flex-row gap-1 items-center">
							<a
								className="link"
								target="_"
								href={`https://dashboard.stripe.com/customer/${customerId}`}
							>
								Open in Stripe
							</a>
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
									d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
								/>
							</svg>
						</span>
					</li>
					<li>
						<span className="font-bold">Subscription ID: </span>
						<pre className="font-mono inline">{subscriptionId}</pre>
						<span className="ml-2 text-sm opacity-50 inline-flex flex-row gap-1 items-center">
							<a
								className="link"
								target="_"
								href={`https://dashboard.stripe.com/subscriptions/${subscriptionId}`}
							>
								Open in Stripe
							</a>
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
									d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
								/>
							</svg>
						</span>
					</li>
					<li>
						<span className="font-bold">Interval: </span>
						<span>{interval}</span>
					</li>
				</>
			) : null}

			{canceledAt ? (
				<>
					<li>
						<span className="font-bold">Status: </span>
						<span className="badge badge-warning">Canceled</span>
					</li>
					<li>
						<span className="font-bold">Ends at: </span>
						<span>{formatDate(endsAt)}</span>
					</li>
				</>
			) : null}
			{deactivatedAt ? (
				<>
					<li>
						<span className="font-bold">Status: </span>
						<span className="badge badge-error">Deactivated</span>
					</li>
					<li>
						<span className="font-bold">Ended at: </span>
						<span>{formatDate(deactivatedAt)}</span>
					</li>
					<li>
						<span className="font-bold">Previous subscription ID: </span>
						<span>{previousSubscriptionId}</span>
						<span className="ml-2 text-sm opacity-50 inline-flex flex-row gap-1 items-center">
							<a
								className="link"
								target="_"
								href={`https://dashboard.stripe.com/subscriptions/${previousSubscriptionId}`}
							>
								Open in Stripe
							</a>
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
									d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
								/>
							</svg>
						</span>
					</li>
				</>
			) : null}
		</ul>
	);
}

UserModal.loader = async ({ params }) => {
	const { userUuid } = params;
	try {
		const response = await adminApiRequest(`/api/admin/users/${userUuid}`);
		if (response.expired) {
			return redirect('/admin/login');
		}
		return { data: response };
	} catch (err) {
		return { error: err };
	}
};
