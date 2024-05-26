import useAuth from './hooks/use-auth.jsx';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Login() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [feedback, setFeedback] = useState(null);

	const handleLogin = async (e) => {
		setFeedback(null);
		e.preventDefault();
		const form = e.currentTarget;
		const response = await fetch(`${__API_URL__}/api/admin/login`, {
			method: 'POST',
			body: JSON.stringify({ email: form.email.value, password: form.password.value }),
			headers: {
				'Content-Type': 'application/json'
			}
		});
		if (response.ok) {
			const { token } = await response.json();
			login(token).then(() => {
				navigate('/admin');
			});
		} else if (response.status === 401) {
			setFeedback({ message: 'Email or password is incorrect.', type: 'warning' });
		} else {
			setFeedback({ message: 'Something went wrong', type: 'error' });
		}
	};

	return (
		<div className="login h-screen bg-base-200 flex items-center justify-center">
			<div className="login-modal">
				<h3 className="text-center mb-1 flex items-center justify-center">
					<svg
						className="inline mr-1"
						width="16"
						height="16"
						viewBox="0 0 1024 1024"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<rect
							x="256"
							y="670.72"
							width="512"
							height="256"
							rx="128"
							className="fill-base-content"
						/>
						<circle cx="512" cy="353.28" r="256" className="fill-base-content" />
						<circle
							cx="512"
							cy="353.28"
							r="261"
							stroke="black"
							strokeOpacity="0.2"
							strokeWidth="10"
						/>
						<circle cx="512" cy="353.28" r="114.688" className="fill-base-100" />
					</svg>
					Login to StartKit.AI Admin
				</h3>
				<div className="card card-side bg-base-100 border-r-0 w-[400px]">
					<div className="card-body">
						<form onSubmit={handleLogin}>
							<label className="form-control w-full">
								<div className="label">
									<span className="label-text">Email</span>
								</div>
								<input
									name="email"
									type="text"
									placeholder="picard@enterprise.tng"
									className="input input-bordered w-full"
								/>
							</label>
							<label className="form-control w-full">
								<div className="label">
									<span className="label-text">Password</span>
								</div>
								<input
									name="password"
									type="password"
									placeholder="*********"
									className="input input-bordered w-full"
								/>
							</label>
							{feedback?.message ? (
								<div role={feedback.type} className={`alert alert-${feedback.type} mt-2`}>
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
									<span>{feedback.message}</span>
								</div>
							) : null}
							<div className="card-actions pt-5">
								<button className="btn btn-primary w-full" type="submit">
									Login
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
