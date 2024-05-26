import { Navigate, redirect } from 'react-router-dom';

import Dashboard from './dashboard.jsx';
import Embeddings from './embeddings.jsx';
import { Prompts } from './prompts.jsx';
import { Settings } from './settings.jsx';
import UserKeyModal from './components/user-key-modal.jsx';
import UserModal from './components/user-modal.jsx';
import Users from './users.jsx';

export const routes = [
	{
		path: '',
		element: <Navigate to="/admin/dashboard" replace />,
		loader: () => {
			const token = localStorage.getItem('token');
			if (!token) {
				return redirect('/admin/login');
			}
			return true;
		}
	},
	{
		path: 'dashboard',
		element: <Dashboard />,
		loader: Dashboard.loader
	},
	{
		path: 'users',
		element: <Users />,
		loader: Users.loader,
		children: [
			{
				path: ':userUuid',
				element: <UserModal />,
				loader: UserModal.loader
			},
			{
				path: ':userUuid/key/:keyUuid',
				element: <UserKeyModal />,
				loader: UserKeyModal.loader
			}
		]
	},
	{
		path: 'embeddings',
		element: <Embeddings />,
		loader: Embeddings.loader
	},
	{
		path: 'prompts',
		element: <Prompts />,
		loader: Prompts.loader
	},
	{
		path: 'settings',
		element: <Settings />,
		loader: Settings.loader
	}
];
