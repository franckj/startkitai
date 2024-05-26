import { useCallback, useRef } from 'react';

import Header from './components/header.jsx';
import { Outlet } from 'react-router-dom';
import Sidebar from './sidebar.jsx';

export default function Admin() {
	const drawerRef = useRef(null);
	const onSidebarClose = useCallback(() => {
		drawerRef.current.checked = false;
	}, []);

	return (
		<div className="drawer min-h-screen bg-base-200 lg:drawer-open">
			<input id="my-drawer" type="checkbox" className="drawer-toggle" ref={drawerRef} />

			<div className="drawer-content lg:pl-72">
				<div className="grid grid-cols-12 grid-rows-[min-content] gap-y-8 p-4 lg:gap-x-12 lg:p-10">
					<Header />
					<Outlet />
				</div>
			</div>
			<aside className="drawer-side z-10">
				<Sidebar onClose={onSidebarClose} />
			</aside>
		</div>
	);
}
