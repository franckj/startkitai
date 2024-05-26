import { redirect, useLoaderData } from 'react-router-dom';

import Stat from './components/stat.jsx';
import { adminApiRequest } from './utils/api-request.js';

export default function Dashboard() {
	const { stats = {}, histogram = [] } = useLoaderData();
	return (
		<>
			{!stats.daily && !stats.monthly ? (
				<section className="col-span-12 bg-base-100 shadow-sm">
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
							You haven&apos;t got any data yet! Try some of the demos out and the usage data will
							show up here.
						</span>
					</div>
				</section>
			) : null}
			<section className="stats stats-vertical col-span-12 w-full shadow-sm xl:stats-horizontal">
				<Stat title="Total requests today" value={stats?.daily?.usage?.totalRequests ?? 0} />
				<Stat
					title="Total spend today (USD)"
					type="currency"
					value={stats?.daily?.usage?.totalCost ?? 0}
				/>
				<Stat title="Total requests month" value={stats?.monthly?.usage?.totalRequests ?? 0} />
				<Stat
					title="Total spend month (USD)"
					type="currency"
					value={stats?.monthly?.usage?.totalCost ?? 0}
				/>
			</section>
			<Pie data={stats} />
			<Histogram data={histogram} />
			<section className="stats stats-vertical col-span-12 w-full shadow-sm xl:stats-horizontal">
				<Stat title="New users today" value={stats?.daily?.users?.new ?? 0} />
				<Stat title="New users month" value={stats?.monthly?.users?.new ?? 0} />
			</section>
		</>
	);
}

const PIE_COLORS = ['#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];
function Pie({ data }) {
	return (
		<section className="card col-span-12 bg-base-100 shadow-sm xl:col-span-6">
			<div className="card-body">
				<h2 className="card-title">
					Request Types <span className="text-sm opacity-50">in the last 30 days</span>
				</h2>

				<PieData monthly={data.monthly} />
			</div>
		</section>
	);
}

function PieData({ monthly }) {
	if (!monthly) {
		return null;
	}
	const { usage } = monthly;

	let pieData = [];
	let pieColors = [];
	let i = 0;
	for (let type of Object.keys(usage)) {
		const { models } = usage[type];
		if (models) {
			for (let model of Object.keys(models)) {
				const { requests, cost } = models[model];
				if (requests > 0) {
					const hex = PIE_COLORS[i % PIE_COLORS.length];
					pieColors.push(hex);
					pieData.push({ type, model, requests, cost, color: hex });
					i += 1;
				}
			}
		}
	}

	const values = pieData.map((d) => d.requests);
	return (
		<div className="flex items-center gap-10">
			<div className="grow">
				{pieData.map((d) => {
					return (
						<div key={`${d.type}-${d.model}`} className="flex items-center gap-2">
							<span className={`badge badge-xs`} style={{ backgroundColor: d.color }}></span>
							<span className="capitalize">
								{d.requests} {d.type}
							</span>{' '}
							({d.model})
						</div>
					);
				})}
			</div>
			<tc-pie
				class={`h-32 w-32 shrink-0`}
				style={pieColors.reduce(
					(out, color, i) => ({
						...out,
						[`--shape-color-${i + 1}`]: color
					}),
					{}
				)}
				values={`[${values.join(',')}]`}
				shape-size="30"
				shape-gap="6"
			></tc-pie>
		</div>
	);
}

function Histogram({ data }) {
	const { count, values } = data.reduce(
		(total, d) => {
			return {
				count: d.usage.totalRequests + total.count,
				values: [...total.values, d.usage.totalRequests]
			};
		},
		{
			count: 0,
			values: [0]
		}
	);

	return (
		<section className="card col-span-12 bg-base-100 shadow-sm xl:col-span-6">
			<div className="card-body pb-0">
				<h2 className="card-title">
					{count} requests <span className="text-sm opacity-50">in the last 30 days</span>
				</h2>
			</div>
			<tc-line
				class="chart h-full w-full rounded-box [--area-opacity:.2] [--shape-color:#19D6BF]"
				values={`[${values.join(',')}]`}
				min="0"
			></tc-line>
		</section>
	);
}

Dashboard.loader = async () => {
	try {
		const [stats, histogram] = await Promise.all([
			adminApiRequest('/api/admin/stats/summary'),
			adminApiRequest('/api/admin/stats/daily/histogram')
		]);
		if (stats.expired) {
			return redirect('/admin/login');
		}
		return { stats, histogram };
	} catch (err) {
		console.error(err);
		return { stats: {}, histogram: [] };
	}
};
