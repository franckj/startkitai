import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import UserSearch from './user-search.jsx';
import useAuth from '../hooks/use-auth.jsx';

const titles = {
	'/admin/dashboard': 'Dashboard',
	'/admin/users': 'Users',
	'/admin/embeddings': 'Embeddings',
	'/admin/settings': 'Settings',
	'/admin/prompts': 'Prompts'
};
export default function Header() {
	const location = useLocation();
	const { authed, logout } = useAuth();
	const [theme, setTheme] = useState(localStorage.getItem('theme') || 'admin-dark');

	const onSwitch = function (e) {
		let newTheme;
		if (e.currentTarget.checked) {
			newTheme = 'admin-dark';
		} else {
			newTheme = 'light';
		}
		setTheme(newTheme);
	};

	useEffect(() => {
		document.body.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}, [theme]);

	const navigate = useNavigate();
	const handleLogout = () => {
		logout();
		navigate('/');
	};
	return (
		<header className="col-span-12 flex items-center gap-2 lg:gap-4">
			<label htmlFor="my-drawer" className="btn btn-square btn-ghost drawer-button lg:hidden">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					strokeWidth={1.5}
					stroke="currentColor"
					className="w-6 h-6"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
					/>
				</svg>
			</label>
			<div className="grow">
				<h1 className="lg:text-2xl lg:font-light">{titles[location.pathname]}</h1>
			</div>
			<div>
				<UserSearch />
			</div>
			<label className="swap swap-rotate">
				<input
					type="checkbox"
					className="theme-controller"
					value="dark"
					onChange={onSwitch}
					checked={theme === 'admin-dark'}
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
			<div className="dropdown-end dropdown z-10">
				<div tabIndex="0" className="avatar btn btn-circle btn-ghost">
					<div className="w-10 rounded-full">
						<img src="https://picsum.photos/80/80?5" />
					</div>
				</div>
				<ul
					tabIndex="0"
					className="menu dropdown-content mt-3 w-52 rounded-box bg-base-100 p-2 shadow-2xl"
				>
					<li>
						<Link to="/admin/settings">Settings</Link>
					</li>
					<li>{authed && <button onClick={handleLogout}>Logout</button>}</li>
				</ul>
			</div>
		</header>
	);
}
