import { Link, matchPath, useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';

import UsageModal from './usage-modal.jsx';
import { apiRequest } from '../utils/api-request.js';

export default function Header() {
	const location = useLocation();
	const navigate = useNavigate();
	const [theme, setTheme] = useState(localStorage.getItem('theme') ?? 'admin-dark');
	const [copied, setCopied] = useState(false);

	const onSwitch = useCallback(function (e) {
		let theme;
		if (e.currentTarget.checked) {
			theme = 'admin-dark';
		} else {
			theme = 'light';
		}
		setTheme(theme);
		localStorage.setItem('theme', theme);
	}, []);

	useEffect(() => {
		document.body.setAttribute('data-theme', theme);
	}, [theme]);

	const clearData = () => {
		localStorage.clear();
		window.location.href = '/demos';
	};

	const bread = location.pathname.split('/');
	const isChatPath = matchPath('/demos/:shared?/chat/:uuid', location.pathname);
	const isChatPdfPath = matchPath('/demos/:shared?/chat-with-pdf/:uuid', location.pathname);

	const onNewChat = useCallback(() => {
		if (isChatPath) {
			navigate('/demos/chat');
		} else if (isChatPdfPath) {
			navigate('/demos/chat-with-pdf');
		}
		window.location.reload();
	}, [isChatPath, isChatPdfPath, navigate]);

	const onShareClick = useCallback(async () => {
		await apiRequest(`/api/chat/${(isChatPath || isChatPdfPath).params.uuid}/share`, {
			method: 'PUT',
			body: { isSharable: true }
		});
		let location;
		if (isChatPath) {
			location = window.location.href.replace('/demos/chat', '/demos/shared/chat');
		} else if (isChatPdfPath) {
			location = window.location.href.replace(
				'/demos/chat-with-pdf',
				'/demos/shared/chat-with-pdf'
			);
		}
		navigator.clipboard.writeText(location);
		setCopied(true);
		setTimeout(() => setCopied(false), 3000);
	}, [isChatPath, isChatPdfPath]);

	return (
		<>
			<div className="navbar fixed top-0 bg-neutral z-10 text-neutral-content">
				<div className="flex-1">
					<Link to="https://startkit.ai" className="btn btn-ghost text-xl">
						StartKit.AI
					</Link>
					<div className="text-sm breadcrumbs ml-[10px]">
						<ul className="capitalize">
							<li key={bread[1]}>
								<Link to={`/${bread[1]}`}>{bread[1]}</Link>
							</li>
							{bread[2] ? (
								<li key={bread[2]}>
									<Link to={`/${bread[1]}/${bread[2]}`}>{bread[2]}</Link>
								</li>
							) : null}
						</ul>
					</div>
				</div>
				<div className="flex-none flex justify-center gap-2">
					{isChatPath || isChatPdfPath ? (
						<>
							<button className="btn btn-sm" onClick={onNewChat}>
								New chat
							</button>
							{isChatPath ? (
								<div
									className={`tooltip tooltip-bottom tooltip-info ${copied ? 'tooltip-open' : ''}`}
									data-tip={copied ? 'Copied URL' : 'Click to copy sharable URL'}
								>
									<button className="btn btn-sm" onClick={onShareClick}>
										Share this chat{' '}
										<svg
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											strokeWidth="2"
											stroke="currentColor"
											className="w-4 h-4"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
											/>
										</svg>
									</button>
								</div>
							) : null}
						</>
					) : null}
					<a href="https://startkit.ai" target="_blank" className="btn btn-sm" rel="noreferrer">
						Built with StartKit.AI
					</a>
					<label className="swap swap-rotate">
						<input
							type="checkbox"
							className="theme-controller"
							value="admin-dark"
							checked={theme === 'admin-dark'}
							onChange={onSwitch}
						/>
						<svg
							width="20px"
							height="20px"
							className="swap-on fill-current"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
						>
							<path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
						</svg>
						<svg
							width="20px"
							height="20px"
							className="swap-off fill-current"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
						>
							<path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
						</svg>
					</label>
					<div className="dropdown dropdown-end">
						<button className="btn btn-square btn-ghost">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								className="inline-block w-5 h-5 stroke-current"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth="2"
									d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
								></path>
							</svg>
						</button>
						<ul
							tabIndex="0"
							className="dropdown-content z-[9] bg-neutral menu p-2 shadow-lg rounded-box w-52 "
						>
							{/* start: usage */}
							<li>
								<UsageModal>
									{(onOpen) => (
										<a className="" onClick={onOpen}>
											Show usage
										</a>
									)}
								</UsageModal>
							</li>
							{/* end: usage */}
							<li>
								<a onClick={clearData}>Clear data</a>
							</li>
						</ul>
					</div>
				</div>
			</div>
		</>
	);
}
