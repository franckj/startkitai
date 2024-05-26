import Header from './components/header.jsx';
import KeyModal from './components/key-modal.jsx';
import { Outlet } from 'react-router-dom';

const Demos = () => {
	return (
		<>
			<KeyModal />
			<Header />
			<Outlet />
		</>
	);
};

export default Demos;
