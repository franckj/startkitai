import signale from 'signale';

/**
 * Logging middleware
 */
export const loggerMiddleware = new signale.Signale({
	scope: 'http'
});
