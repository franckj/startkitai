import { createLogger } from '#helpers/logger.js';

const logger = createLogger('daily-tasks');

/**
 * Bree task
 */
async function run() {
	// do something!
	logger.info('daily task run successfully');
}

run();
