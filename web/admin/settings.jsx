import { Link, useLoaderData } from 'react-router-dom';
import { useCallback, useState } from 'react';

import { adminApiRequest } from './utils/api-request';

export function Settings() {
	const [isLoading, setLoading] = useState(false);
	const { adminUser, adminKey, adminConfig } = useLoaderData();
	const [useAdminKeyForDemos, setUseAdminKeyForDemos] = useState(
		adminConfig?.preferences?.useAdminKeyForDemos
	);
	const [email, setEmail] = useState(adminUser.email);

	const submit = useCallback(
		async (e) => {
			setLoading(true);
			try {
				const form = e.currentTarget;
				e.preventDefault();

				const res = await adminApiRequest('/api/admin/me', {
					method: 'PUT',
					body: {
						oldEmail: adminUser.email,
						newEmail: form.email.value,
						oldPassword: form['old-password'].value,
						newPassword: form['new-password'].value
					}
				});
				if (res.status === 401) {
					alert('The password was incorrect');
				} else {
					alert('Saved new Admin details');
				}
			} catch (err) {
				alert(err.message);
			} finally {
				setLoading(false);
			}
		},
		[adminUser.email]
	);

	const saveOptions = useCallback(async (e) => {
		setLoading(true);
		try {
			const form = e.currentTarget;
			e.preventDefault();

			const res = await adminApiRequest('/api/admin/preferences', {
				method: 'PUT',
				body: {
					preferences: {
						useAdminKeyForDemos: form['use-admin-key'].checked
					}
				}
			});
			if (res.ok) {
				alert('Saved options');
			}
		} catch (err) {
			alert(err.message);
		} finally {
			setLoading(false);
		}
	}, []);

	return (
		<>
			<section className="card col-span-12 bg-base-100 p-5">
				<h2 className="card-title mb-2">Admin License Key</h2>

				<label className="input input-bordered flex items-center gap-2 mt-5">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 16 16"
						fill="currentColor"
						className="w-4 h-4 opacity-70"
					>
						<path
							fillRule="evenodd"
							d="M14 6a4 4 0 0 1-4.899 3.899l-1.955 1.955a.5.5 0 0 1-.353.146H5v1.5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2.293a.5.5 0 0 1 .146-.353l3.955-3.955A4 4 0 1 1 14 6Zm-4-2a.75.75 0 0 0 0 1.5.5.5 0 0 1 .5.5.75.75 0 0 0 1.5 0 2 2 0 0 0-2-2Z"
							clipRule="evenodd"
						/>
					</svg>
					<input type="text" className="grow" value={adminKey} readOnly />
				</label>
				<p className="label-text p-1 mt-2 opacity-65">
					You can use the Admin License Key to make unlimited requests to the API. Other than this
					the Admin User acts like a normal user, the requests and associated costs are still
					recorded and can be monitored from the{' '}
					<Link className="link" to="/admin/users">
						Users
					</Link>{' '}
					screen.
				</p>
			</section>
			<section className="card col-span-12 bg-base-100 p-5">
				<h2 className="card-title mb-5">Change Admin Password</h2>
				<p className="label-text p-1 opacity-65">Change your password for the Admin Dashboard</p>
				<form id="admin-password-form" onSubmit={submit}>
					<label className="form-control">
						<div className="label">
							<span className="label-text">Admin Email</span>
						</div>
						<input
							className="input input-bordered"
							type="email"
							required
							id="email"
							name="email"
							value={email}
							onChange={({ currentTarget }) => setEmail(currentTarget.value)}
						/>
					</label>

					<label className="form-control">
						<div className="label">
							<span className="label-text">Current Admin Password</span>
						</div>
						<input
							autoComplete="current-password"
							required
							className="input input-bordered"
							type="password"
							id="old-password"
							name="old-password"
						/>
					</label>

					<label className="form-control">
						<div className="label">
							<span className="label-text">New Admin Password</span>
						</div>
						<input
							autoComplete="new-password"
							required
							className="input input-bordered"
							type="password"
							id="new-password"
							name="new-password"
						/>
					</label>

					<button className="btn btn-neutral mt-5" type="submit">
						{isLoading ? (
							<span className="loading loading-spinner loading-sm"></span>
						) : (
							<span>Update</span>
						)}
					</button>
				</form>
			</section>

			<section className="card col-span-12 bg-base-100 p-5">
				<h2 className="card-title mb-5">Options</h2>
				<form id="admin-options-form" onSubmit={saveOptions}>
					<div className="form-control">
						<label className="label cursor-pointer">
							<span className="label-text">Use Admin License Key for Demos</span>
							<input
								type="checkbox"
								id="use-admin-key"
								name="use-admin-key"
								className="checkbox"
								checked={useAdminKeyForDemos}
								onChange={({ currentTarget }) => setUseAdminKeyForDemos(currentTarget.checked)}
							/>
						</label>
						<p className="label-text p-1 opacity-65">
							Selecting this will make all the demos work automatically without limits using your
							set OpenAI key. Unselected will mean the demos require users to login with magic
							links.
						</p>
					</div>
					<button className="btn btn-neutral mt-5" type="submit">
						{isLoading ? (
							<span className="loading loading-spinner loading-sm"></span>
						) : (
							<span>Save</span>
						)}
					</button>
				</form>
			</section>
		</>
	);
}

Settings.loader = async function () {
	try {
		const { admin, key } = await adminApiRequest(`/api/admin/me`);
		const adminConfig = await adminApiRequest(`/api/admin/preferences`);
		return {
			adminUser: admin,
			adminKey: key,
			adminConfig
		};
	} catch (err) {
		console.error(err);
	}
};
