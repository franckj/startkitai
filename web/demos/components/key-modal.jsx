import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

const reducer = (state, action) => {
	if (action.type === 'set-page-loaded') {
		return { ...state, pageLoaded: true };
	} else if (action.type === 'set-loading') {
		return { ...state, isLoading: true };
	} else if (action.type === 'email-submitted') {
		return { ...state, isLoading: false, emailSubmitted: true };
	} else if (action.type === 'key-submitted') {
		return { ...state, isLoading: false, keySubmitted: true };
	} else if (action.type === 'set-tab') {
		return { ...state, currentTab: action.data };
	}
	return state;
};
export default function KeyModal() {
	const signupModal = useRef(null);
	const verifiedModal = useRef(null);
	const [state, dispatch] = useReducer(reducer, {
		pageLoaded: false,
		isLoading: false,
		keySubmitted: false,
		emailSubmitted: false,
		currentTab: 'email'
	});
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();

	const location = useLocation();
	// if there is a ?token parameter in the page URL
	// then this is the result of a magic link.
	// we take the token and use it to verify the login
	useEffect(() => {
		const token = searchParams.get('token');
		const key = localStorage.getItem('licenseKey');
		if (token) {
			fetch(`${__API_URL__}/api/auth/magic/verify`, {
				method: 'POST',
				body: JSON.stringify({ token }),
				headers: { 'Content-Type': 'application/json' }
			})
				.then(async (res) => {
					// the server responds with the license key for
					// this user, this is saved and can be used for
					// subsequent requests. the user is now "logged in"
					if (res.ok) {
						const { key } = await res.json();
						localStorage.setItem('licenseKey', key);

						navigate(
							{
								pathname: location.pathname,
								search: ''
							},
							{ replace: true }
						);
						verifiedModal.current.showModal();
					} else {
						dispatch({ type: 'set-page-loaded' });
					}
				})
				.catch((err) => {
					console.error(err);
				});
		} else if (!key) {
			dispatch({ type: 'set-page-loaded' });
		}
	}, [location.pathname, navigate, searchParams]);

	useEffect(() => {
		if (state.pageLoaded) {
			let key;

			key = localStorage.getItem('licenseKey');

			if (signupModal.current && !key) {
				signupModal.current.showModal();
			}
		}
	}, [state.pageLoaded]);

	const onEmailSubmit = useCallback(
		async (e) => {
			dispatch({ type: 'set-loading' });
			e.preventDefault();

			const email = e.currentTarget?.email?.value;
			const consent = e.currentTarget?.consent?.checked;
			const redirectPath = location.pathname;

			if (!email) {
				return;
			}
			await fetch(`${__API_URL__}/api/auth/magic`, {
				method: 'POST',
				body: JSON.stringify({ email, mailingListConsent: consent, redirectPath }),
				headers: { 'Content-Type': 'application/json' }
			});
			dispatch({ type: 'email-submitted' });
		},
		[location.pathname]
	);

	const onKeySubmit = useCallback(
		async (e) => {
			dispatch({ type: 'set-loading' });
			e.preventDefault();
			const openaiKey = e.currentTarget?.key?.value;
			const email = e.currentTarget?.email?.value;
			const consent = e.currentTarget?.consent?.checked;
			const pathname = location.pathname;

			const res = await fetch(`${__API_URL__}/api/auth/key/verify`, {
				method: 'POST',
				body: JSON.stringify({ email, mailingListConsent: consent }),
				headers: { 'Content-Type': 'application/json' }
			});
			if (res.ok) {
				const { key } = await res.json();
				localStorage.setItem('licenseKey', key);
				localStorage.setItem('openaiKey', openaiKey);
				// navigate to remove the searh params
				navigate(
					{
						pathname,
						search: ''
					},
					{ replace: true }
				);
				signupModal.current.close();
				verifiedModal.current.showModal();
			} else {
				dispatch({ type: 'set-page-loaded' });
			}
			dispatch({ type: 'key-submitted' });
		},
		[location.pathname, navigate]
	);

	return (
		<>
			<dialog ref={signupModal} className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Welcome to the StartKit demos!</h3>
					<p className="py-4">
						To prevent overuse, the demos require you to either enter your email address or your
						OpenAI key.
					</p>
					<div role="tablist" className="tabs tabs-boxed">
						<a
							role="tab"
							onClick={() => dispatch({ type: 'set-tab', data: 'email' })}
							className={`tab ${state.currentTab === 'email' ? 'tab-active' : ''}`}
						>
							Email
						</a>
						<a
							role="tab"
							onClick={() => dispatch({ type: 'set-tab', data: 'openai' })}
							className={`tab ${state.currentTab === 'openai' ? 'tab-active' : ''}`}
						>
							OpenAI Key
						</a>
					</div>
					{state.currentTab === 'email' ? (
						<div className="content">
							<form onSubmit={onEmailSubmit}>
								<p className="py-4">
									{`We'll send you a magic link that will activate the demos with usage limits.`}
								</p>
								{state.emailSubmitted ? (
									<p>Check your emails for the link!</p>
								) : (
									<>
										<label className="form-control w-full max-w-xs">
											<div className="label">
												<span className="label-text">{`What's your email?`}</span>
											</div>
											<input
												name="email"
												type="text"
												required
												placeholder="james@example.com"
												className="input input-bordered w-full max-w-xs"
											/>
										</label>
										<div className="form-control mt-3">
											<label className="label cursor-pointer flex flex-row-reverse gap-2">
												<span className="label-text flex-1">
													Would you like to join our mailing list? (optional)
												</span>
												<input name="consent" type="checkbox" className="checkbox" />
											</label>
										</div>

										<button
											type="submit"
											className="btn btn-neutral mt-2"
											disabled={state.isLoading}
										>
											{state.isLoading ? (
												<span id="loading" className="loading loading-spinner"></span>
											) : (
												<span>Send magic link</span>
											)}
										</button>
									</>
								)}
							</form>
						</div>
					) : (
						<div className="content">
							<form onSubmit={onKeySubmit}>
								<p className="py-4">
									{`With your OpenAI API key you'll get unlimted access to the demos. The key is stored within your browser, not on our servers.`}
								</p>
								<label className="form-control w-full max-w-xs mb-4">
									<div className="label">
										<span className="label-text">Your OpenAI key</span>
									</div>
									<input
										required
										name="key"
										type="text"
										placeholder="sk-****************************"
										className="input input-bordered w-full max-w-xs"
									/>
								</label>
								<label className="form-control w-full max-w-xs">
									<div className="label">
										<span className="label-text">{`What's your email?`}</span>
									</div>
									<input
										required
										name="email"
										type="text"
										placeholder="james@example.com"
										className="input input-bordered w-full max-w-xs"
									/>
								</label>
								<div className="form-control mt-3">
									<label className="label cursor-pointer flex flex-row-reverse gap-2">
										<span className="label-text flex-1">
											Would you like to join our mailing list? (optional)
										</span>
										<input name="consent" type="checkbox" className="checkbox" />
									</label>
								</div>
								<button type="submit" className="btn btn-neutral mt-2" disabled={state.isLoading}>
									{state.isLoading ? (
										<span id="loading" className="loading loading-spinner"></span>
									) : (
										<span>Save key</span>
									)}
								</button>
							</form>
						</div>
					)}
				</div>
			</dialog>
			<dialog ref={verifiedModal} className="modal">
				<div className="modal-box">
					<h3 className="font-bold text-lg">Welcome to the StartKit demos!</h3>
					<p>Your email is now verified and you can try the demos 🙂</p>
					<button className="btn mt-2" onClick={() => verifiedModal.current.close()}>
						{`Let's go!`}
					</button>
				</div>
			</dialog>
		</>
	);
}
