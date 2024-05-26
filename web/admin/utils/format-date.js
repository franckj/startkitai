export default (dateString) => {
	if (!dateString) return '';
	return new window.Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	}).format(new Date(dateString));
};
