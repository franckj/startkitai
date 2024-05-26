import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router-dom';

export default function Home() {
	const [state, setState] = useState({});
	useEffect(() => {
		fetch('/api/startup')
			.then((res) => {
				if (res.ok) {
					return res.json();
				}
				return {};
			})
			.then((d) => {
				if (d.preferences.useAdminKeyForDemos) {
					localStorage.setItem('licenseKey', d.adminKey);
				}
				setState(d);
			});
	}, []);

	const content = useMemo(() => {
		if (!state.isFirstBoot) {
			return (
				<>
					<p className="mt-5">StartKit.AI is running!</p>
					<div className="join join-vertical mt-6 w-[240px]">
						<Link to="/demos" className="btn  btn-neutral join-item justify-between">
							Try the demos{' '}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 32 32"
								width="16"
								height="16"
								fill="none"
								stroke="currentcolor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="4"
							>
								<path d="M22 6 L30 16 22 26 M30 16 L2 16" />
							</svg>
						</Link>
						{/* start: admin */}
						<Link to="/admin/dashboard" className="btn  btn-neutral join-item justify-between">
							Go to Admin Dashboard{' '}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 32 32"
								width="16"
								height="16"
								fill="none"
								stroke="currentcolor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="4"
							>
								<path d="M22 6 L30 16 22 26 M30 16 L2 16" />
							</svg>
						</Link>
						{/* end: admin */}
					</div>
					<div className="join join-vertical mt-6 w-[240px] ">
						{state.isDev ? (
							<a href="/api" className="btn  btn-neutral join-item justify-between">
								API Reference
								<svg
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 32 32"
									width="16"
									height="16"
									fill="none"
									stroke="currentcolor"
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="4"
								>
									<path d="M22 6 L30 16 22 26 M30 16 L2 16" />
								</svg>
							</a>
						) : null}
						<Link
							to="https://startkit.ai/docs"
							className="btn  btn-neutral join-item justify-between"
						>
							Check out the docs{' '}
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 32 32"
								width="16"
								height="16"
								fill="none"
								stroke="currentcolor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="4"
							>
								<path d="M22 6 L30 16 22 26 M30 16 L2 16" />
							</svg>
						</Link>
						<Link
							to="https://t.me/+5qIsaOaHIv5iYjlk"
							className="btn btn-neutral join-item justify-between"
						>
							Get help
							<svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 32 32"
								width="16"
								height="16"
								fill="none"
								stroke="currentcolor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="4"
							>
								<path d="M22 6 L30 16 22 26 M30 16 L2 16" />
							</svg>
						</Link>
					</div>
				</>
			);
		} else {
			return <InitialBoot />;
		}
	}, [state.isFirstBoot]);

	return (
		<div className="min-h-screen bg-base-200 pt-12">
			<div className="flex flex-col items-center justify-center h-92">
				<img src="/images/logo.png" alt="logo" className="w-20" />
				<h1 className="text-xl startkit">
					<span className={'font-bold'}>Start</span>
					<span className="font-light">Kit</span>
					<span className={'font-light opacity-50'}>.AI</span>
				</h1>

				{content}
			</div>
		</div>
	);
}

function InitialBoot() {
	const [isLoading, setLoading] = useState(false);

	const submit = useCallback(async (e) => {
		setLoading(true);
		try {
			const form = e.currentTarget;
			e.preventDefault();

			await fetch('/api/startup/admin', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					email: form.email.value,
					password: form.password.value,
					preferences: {
						useAdminKeyForDemos: form['use-admin-key'].checked
					}
				})
			});
			window.location.reload();
		} catch (err) {
			alert(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	return (
		<div className="w-[450px]">
			<p className="mt-5 text-center">Welcome to StartKit.AI!</p>
			<p className="my-5 text-center">
				You just need to create an Admin user and you&apos;re all set! These will be the details
				that you use to login to the Admin Dashboard.
			</p>
			<form onSubmit={submit}>
				<label className="form-control">
					<div className="label">
						<span className="label-text">Set Admin Email</span>
					</div>
					<input
						className="input"
						type="email"
						id="email"
						name="email"
						placeholder="admin@yourapp.ai"
					/>
				</label>

				<label className="form-control">
					<div className="label">
						<span className="label-text">Create Admin Password</span>
					</div>
					<input className="input" type="password" id="password" name="password" />
				</label>

				<div className="form-control mt-4">
					<label className="label cursor-pointer">
						<span className="label-text">Use Admin License Key for Demos</span>
						<input
							type="checkbox"
							id="use-admin-key"
							name="use-admin-key"
							defaultChecked
							className="checkbox"
						/>
					</label>
					<p className="label-text p-1 opacity-65">
						Selecting this will make all the demos work automatically without limits using your set
						OpenAI key. Unselected will mean the demos require users to login with magic links or
						use their own OpenAI key.
					</p>
				</div>

				<button className="btn btn-neutral mt-5" type="submit">
					{isLoading ? (
						<span className="loading loading-spinner loading-sm"></span>
					) : (
						<span>Submit</span>
					)}
				</button>
				<p className="label-text p-1 opacity-65">
					You can change these details later from within the Admin Dashboard.
				</p>
			</form>
		</div>
	);
}
