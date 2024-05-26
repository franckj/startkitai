import { createBrowserRouter, redirect } from 'react-router-dom';

import Admin from './admin/index.jsx';
import { AuthProvider } from './admin/hooks/use-auth.jsx';
import Demos from './demos/index.jsx';
import Home from './home.jsx';
import Login from './admin/login.jsx';
import { Outlet } from 'react-router-dom';
import SharedChat from './demos/chat/shared-chat.jsx';
import { routes as adminRoutes } from './admin/routes.jsx';
import { routes as demoRoutes } from './demos/routes.jsx';

export const router = createBrowserRouter([
	{
		path: '/',
		element: <Home />
	},
	{
		path: '/demos',
		element: <Demos />,
		children: demoRoutes
	},
	{
		path: '/demos/shared/chat/:uuid',
		element: <SharedChat />
	},
	// start: admin
	{
		path: '/admin',
		element: (
			<AuthProvider>
				<Outlet />
			</AuthProvider>
		),
		children: [
			{
				path: 'login',
				element: <Login />
			},
			{
				path: '',
				element: <Admin />,
				loader: () => {
					const token = localStorage.getItem('token');
					if (!token) {
						return redirect('/admin/login');
					}
					return true;
				},
				children: adminRoutes
			}
		]
	}
	// end: admin
]);
