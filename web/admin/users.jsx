import { Link, Outlet, redirect, useLoaderData, useLocation, useNavigate } from 'react-router-dom';
import Stat, { CostStat } from './components/stat.jsx';

import { adminApiRequest } from './utils/api-request.js';

export default function Users() {
	const { stats, users, isFiltered } = useLoaderData();
	const { data: userData, page, limit, totalCount, hasNext } = users;

	return (
		<>
			<section className="stats stats-vertical col-span-12 w-full shadow-sm xl:stats-horizontal">
				<Stat title="Total users count" value={stats.totalUsers} />
				<Stat title="Hit usage limit today" value={stats.usageExpiredToday}>
					<Link
						className="btn btn-xs w-[100px] mt-2"
						to="/admin/users?usageExpiredToday=true"
						disabled={!stats.usageExpiredToday}
					>
						Show users
					</Link>
				</Stat>
				<Stat title="Avg. cost per user today" type="currency" value={stats.avgCostToday} />
				<Stat title="Avg. cost per user month" type="currency" value={stats.avgCostMonth} />
			</section>
			{isFiltered ? (
				<div className="col-span-12">
					<div role="alert" className="alert alert-info shadow-sm">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							className="stroke-current shrink-0 w-6 h-6"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							></path>
						</svg>
						<span>
							Showing a filtered list of users.{' '}
							<Link className="link" to="/admin/users">
								Show all users
							</Link>
							.
						</span>
					</div>
				</div>
			) : null}
			<div className="card col-span-12 bg-base-100 shadow-sm overflow-hidden">
				<div className="card-body flex flex-row flex-wrap w-full gap-3">
					<div className="overflow-x-auto w-full">
						<table className="table w-full">
							<thead>
								<tr>
									<th></th>
									<th>Plan</th>
									<th>Usage today</th>
									<th>Cost today</th>
									<th></th>
								</tr>
							</thead>
							<tbody>
								{userData.map(({ uuid, usage, limits, user }) => {
									return (
										<tr key={user.email}>
											<td>
												<div className="flex items-center gap-3">
													<div>
														<span>
															{user.email}{' '}
															{user?.roles?.includes('admin') ? (
																<span className="badge badge-ghost badge-sm">admin</span>
															) : null}
														</span>
														{user?.billing?.customerId ? (
															<div className="text-sm opacity-50  flex flex-row gap-1 items-center">
																<a
																	className="link"
																	target="_"
																	href={`https://dashboard.stripe.com/search?query=${user.email}`}
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
															</div>
														) : null}
													</div>
												</div>
											</td>
											<td>
												<Plan billing={user.billing} />
											</td>
											<td>
												<UsageLimit usage={usage} limits={limits} />
											</td>
											<td>
												<CostLimit usage={usage} limits={limits} />
											</td>
											<td>
												<div className="flex gap-1 justify-end">
													<Link
														className="btn btn-outline btn-ghost btn-xs"
														to={`/admin/users/${user.uuid}${location.search}`}
													>
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
																d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z"
															/>
														</svg>
														Details
													</Link>
													<Link
														className="btn btn-outline btn-ghost btn-xs"
														to={`/admin/users/${user.uuid}/key/${uuid}${location.search}`}
													>
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
																d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
															/>
														</svg>
														License
													</Link>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
				<Pagination page={page} limit={limit} totalCount={totalCount} hasNext={hasNext} />
			</div>
			<Outlet /> {/* Renders the child routes */}
		</>
	);
}

function UsageLimit({ usage, limits }) {
	const percLimit = ((usage?.today?.totalRequests / limits?.daily?.totalRequests) * 100).toFixed(0);
	return (
		<div className="flex flex-col">
			<span className="mb-1">
				<div>
					{usage?.today?.totalRequests || '0'} <span className="text-gray-500">requests</span>
				</div>
				<div>
					{limits?.daily?.totalRequests ? <>{percLimit}%</> : '∞'}{' '}
					<span className="text-gray-500">usage</span>
				</div>
			</span>
		</div>
	);
}

function CostLimit({ usage }) {
	return (
		<div className="badge badge-sm badge-ghost">
			<CostStat value={usage.today.totalCost} />
		</div>
	);
}

function Plan({ billing }) {
	if (!billing || !billing.planActive) {
		return <span className="badge badge-ghost">Free</span>;
	}
	return <span className="badge badge-secondary">{billing.planName}</span>;
}

function Pagination({ page, limit, totalCount, hasNext }) {
	const navigate = useNavigate();
	const location = useLocation();

	const getCurrentPage = () => {
		const searchParams = new URLSearchParams(location.search);
		const page = searchParams.get('page');
		return page ? parseInt(page, 10) : 1; // Default to page 1 if not present
	};

	const goToNextPage = () => {
		const currentPage = getCurrentPage();
		const nextPage = currentPage + 1;
		const searchParams = new URLSearchParams(location.search);
		searchParams.set('page', nextPage.toString());
		navigate(`${location.pathname}?${searchParams.toString()}`);
	};

	const goToPrevPage = () => {
		const currentPage = getCurrentPage();
		const prevPage = Math.max(currentPage - 1, 1); // Ensure the previous page is not less than 1
		const searchParams = new URLSearchParams(location.search);
		searchParams.set('page', prevPage.toString());
		navigate(`${location.pathname}?${searchParams.toString()}`);
	};

	// Calculate the starting (1-based) index of the items on the current page
	const startIndex = (page - 1) * limit + 1;

	// Calculate the ending index of the items on the current page
	const endIndex = Math.min(startIndex + limit - 1, totalCount);

	return (
		<div className="flex items-center justify-between border-t border-gray-200 bg-base-100 px-4 py-3 sm:px-6">
			<div className="sm:flex sm:flex-1 sm:items-center sm:justify-between">
				<div>
					<p className="text-sm">
						{totalCount > 0 ? (
							<>
								Showing <span className="font-medium">{startIndex}</span>-
								<span className="font-medium">{endIndex}</span> of{' '}
								<span className="font-medium">{totalCount}</span> users
							</>
						) : (
							<>
								Showing <span className="font-medium">0</span> users
							</>
						)}
					</p>
				</div>
			</div>
			<div className="flex gap-2">
				<button className="btn btn-outline btn-sm" onClick={goToPrevPage} disabled={page === 1}>
					Previous
				</button>
				<button className="btn btn-outline btn-sm" onClick={goToNextPage} disabled={!hasNext}>
					Next
				</button>
			</div>
		</div>
	);
}

Users.loader = async ({ request }) => {
	const url = new URL(request.url);
	const page = url.searchParams.get('page') || 1;
	const email = url.searchParams.get('email') || '';
	const usageExpiredToday = url.searchParams.get('usageExpiredToday');

	let params = {
		page: parseInt(page, 10)
	};
	if (email) {
		params = { ...params, email };
	}
	if (usageExpiredToday) {
		params = { ...params, usageExpiredToday };
	}
	const query = new URLSearchParams(params);
	try {
		const response = await adminApiRequest(`/api/admin/users?${query.toString()}`);
		if (response.expired) {
			return redirect('/admin/login');
		}
		const isFiltered = email || usageExpiredToday;
		return { ...response, isFiltered };
	} catch (err) {
		console.error(err);
		return { data: [] };
	}
};
