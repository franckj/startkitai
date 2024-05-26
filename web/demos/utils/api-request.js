export async function apiRequest(
	url,
	{ body, stream = false, form = false, contentType = 'application/json', method = 'GET' } = {}
) {
	const licenseKey = localStorage.getItem('licenseKey');
	const openAiKey = localStorage.getItem('openaiKey');

	let headers = {
		Authorization: `Bearer ${licenseKey}`
	};
	if (!form) {
		headers = {
			...headers,
			'Content-Type': contentType
		};
	}
	if (openAiKey) {
		headers = {
			...headers,
			'x-openai-key': openAiKey
		};
	}
	if (stream) {
		headers = {
			...headers,
			accept: 'text/event-stream'
		};
	}
	// eslint-disable-next-line no-undef
	const response = await fetch(`${__API_URL__}${url}`, {
		method,
		headers,
		body: !form ? JSON.stringify(body) : body
	});
	if (!response.ok) {
		if (contentType === 'application/json' && !stream) {
			const error = await response.json();
			alert(`Error calling ${url}\n\n${error.message}`);
			throw error;
		}
	}
	return response;
}
