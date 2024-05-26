import debug from 'debug';
import signale from 'signale';

/**
 * Creates a scoped logger.
 * We use this to create logs for each file or service that
 * have the service name as a prefix.
 *
 * eg.
 * const logger = createLogger('mongo');
 * logger.success('connected to database');
 * // prints: [mongo] › ✔  success   connected to database
 *
 * @param {String} scope - the scope of the logger
 */
export function createLogger(scope) {
	const debugLogger = debug(scope);
	let interactives = {};
	const logger = new signale.Signale({
		scope: scope,
		logLevel: 'info'
	});

	logger.interactive = (interactiveScope) => {
		if (!interactives[interactiveScope]) {
			interactives[interactiveScope] = new signale.Signale({ interactive: true, scope: scope });
		}
		return interactives[interactiveScope];
	};
	return {
		...logger,
		debug: (message, ...args) => {
			if (debugLogger.enabled) {
				signale.debug(message, ...args);
			}
		}
	};
}

export default new signale.Signale({
	logLevel: 'info'
});
