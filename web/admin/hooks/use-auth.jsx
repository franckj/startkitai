import { createContext, useContext, useEffect, useState } from 'react';

const authContext = createContext();

function useAuth() {
	const [authToken, setAuthToken] = useState(false);

	useEffect(() => {
		const token = localStorage.getItem('token');
		if (token) {
			setAuthToken(token);
		}
	}, []);

	return {
		authed: !!authToken,
		authToken,
		login(token) {
			return new Promise((res) => {
				setAuthToken(token);
				localStorage.setItem('token', token);
				res();
			});
		},
		logout() {
			return new Promise((res) => {
				setAuthToken(null);
				localStorage.removeItem('token');
				res();
			});
		}
	};
}

export function AuthProvider({ children }) {
	const auth = useAuth();

	return <authContext.Provider value={auth}>{children}</authContext.Provider>;
}

export default function AuthConsumer() {
	return useContext(authContext);
}
