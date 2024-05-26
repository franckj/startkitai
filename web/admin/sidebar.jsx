import { Link, useLocation } from 'react-router-dom';

export default function Sidebar({ onClose }) {
	const location = useLocation();
	const currentPath = location.pathname;

	return (
		<>
			<label htmlFor="my-drawer" className="drawer-overlay"></label>
			<nav className="flex min-h-screen w-72 flex-col gap-2 overflow-y-auto bg-base-100 px-6 py-10 lg:fixed">
				<div className="mx-4 flex items-center gap-2 font-black">YourApp.ai Admin</div>
				<ul className="menu">
					<li>
						<Link
							to="/admin/dashboard"
							onClick={onClose}
							className={currentPath === '/admin/dashboard' ? 'active' : ''}
						>
							<svg
								className="h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
								data-slot="icon"
							>
								<path
									fillRule="evenodd"
									d="M9.293 2.293a1 1 0 0 1 1.414 0l7 7A1 1 0 0 1 17 11h-1v6a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6H3a1 1 0 0 1-.707-1.707l7-7Z"
									clipRule="evenodd"
								/>
							</svg>
							Dashboard
						</Link>
					</li>
					<li>
						<Link
							to="/admin/users"
							onClick={onClose}
							className={currentPath === '/admin/users' ? 'active' : ''}
						>
							<svg
								className="h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
								data-slot="icon"
							>
								<path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
							</svg>
							Users
						</Link>
					</li>
					<li>
						<Link
							to="/admin/embeddings"
							onClick={onClose}
							className={currentPath === '/admin/embeddings' ? 'active' : ''}
						>
							<svg
								data-src="https://unpkg.com/heroicons/20/solid/squares-2x2.svg"
								className="h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
								data-slot="icon"
								data-id="svg-loader_1"
							>
								<path
									fillRule="evenodd"
									d="M4.25 2A2.25 2.25 0 0 0 2 4.25v2.5A2.25 2.25 0 0 0 4.25 9h2.5A2.25 2.25 0 0 0 9 6.75v-2.5A2.25 2.25 0 0 0 6.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 2 13.25v2.5A2.25 2.25 0 0 0 4.25 18h2.5A2.25 2.25 0 0 0 9 15.75v-2.5A2.25 2.25 0 0 0 6.75 11h-2.5Zm9-9A2.25 2.25 0 0 0 11 4.25v2.5A2.25 2.25 0 0 0 13.25 9h2.5A2.25 2.25 0 0 0 18 6.75v-2.5A2.25 2.25 0 0 0 15.75 2h-2.5Zm0 9A2.25 2.25 0 0 0 11 13.25v2.5A2.25 2.25 0 0 0 13.25 18h2.5A2.25 2.25 0 0 0 18 15.75v-2.5A2.25 2.25 0 0 0 15.75 11h-2.5Z"
									clipRule="evenodd"
								></path>
							</svg>
							Embeddings
						</Link>
					</li>
					<li>
						<Link to="/admin/prompts" onClick={onClose}>
							<svg
								data-src="https://unpkg.com/heroicons/20/solid/document-text.svg"
								className="h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
								aria-hidden="true"
								data-slot="icon"
								data-id="svg-loader_15"
							>
								<path
									fillRule="evenodd"
									d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
									clipRule="evenodd"
								></path>
							</svg>
							Prompts
						</Link>
					</li>
					<li>
						<details>
							<summary>
								<svg
									data-src="https://unpkg.com/heroicons/20/solid/adjustments-vertical.svg"
									className="h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
									aria-hidden="true"
									data-slot="icon"
									data-id="svg-loader_17"
								>
									<path d="M17 2.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM17 15.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5ZM3.75 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75ZM4.5 2.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5ZM10 11a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5A.75.75 0 0 1 10 11ZM10.75 2.75a.75.75 0 0 0-1.5 0v1.5a.75.75 0 0 0 1.5 0v-1.5ZM10 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3.75 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM16.25 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"></path>
								</svg>
								Settings
							</summary>
							<ul>
								<li>
									<Link to="/admin/settings" onClick={onClose}>
										Admin Settings
									</Link>
								</li>
								<li>
									<a>StartKit.AI</a>
									<ul>
										<li>
											<a target="_blank" href="https://startkit.ai/docs" rel="noreferrer">
												Documentation
											</a>
										</li>
										<li>
											<a target="_blank" href="mailto:hi@startkit.ai" rel="noreferrer">
												Email us
											</a>
										</li>
										<li>
											<a target="_blank" href="https://t.me/+5qIsaOaHIv5iYjlk" rel="noreferrer">
												Join our Telegram support channel
											</a>
										</li>
										<li>
											<a
												target="_blank"
												href="https://github.com/orgs/StartKit-AI/discussions"
												rel="noreferrer"
											>
												Add your feedback, idea, or bug report
											</a>
										</li>
									</ul>
								</li>
							</ul>
						</details>
					</li>
				</ul>
			</nav>
		</>
	);
}
