export async function adminApiRequest(
	url,
	{ body, form = false, contentType = 'application/json', method = 'GET' } = {}
) {
	const authToken = localStorage.getItem('token');
	let headers = {
		Authorization: `Bearer ${authToken}`
	};
	if (!form) {
		headers = {
			...headers,
			'Content-Type': contentType
		};
	}

	const isJson = contentType === 'application/json';

	// eslint-disable-next-line no-undef
	const response = await fetch(`${__API_URL__}${url}`, {
		method,
		headers,
		body: !form ? JSON.stringify(body) : body
	});
	if (!response.ok) {
		if (isJson) {
			const err = await response.json();
			if (response.status === 401) {
				return { expired: true };
			}
			throw err;
		}
		throw response;
	}

	if (isJson) {
		return response.json();
	}

	return response;
}
