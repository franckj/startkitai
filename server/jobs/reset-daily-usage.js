import LicenseKey from '#database/models/LicenseKey.js';
import { connectDb } from '#database/connection.js';
import { createLogger } from '#helpers/logger.js';
import { getResetUpdateQuery } from './common.js';

const logger = createLogger('daily-tasks');

/**
 * Bree task
 * Runs daily to select all license keys and reset their
 * usage values to zero
 */
async function run() {
	let mongoose;
	try {
		mongoose = await connectDb();

		logger.interactive('reset').await('reseting daily usage...');
		const update = getResetUpdateQuery('today');

		await LicenseKey.updateOne(
			{},
			{
				$set: update
			}
		);
		logger.interactive('reset').success('daily usage reset');
	} catch (err) {
		logger.error('Failed to execute job reset-daily-usage', err);
	} finally {
		await mongoose.disconnect();
	}
}

run();
