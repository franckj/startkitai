import LicenseKey from '#database/models/LicenseKey.js';
import { connectDb } from '#database/connection.js';
import { createLogger } from '#helpers/logger.js';
import { getResetUpdateQuery } from './common.js';

const logger = createLogger('monthly-usage');

/**
 * Bree task
 * Runs daily to select all license keys and reset their
 * usage values to zero
 */
async function run() {
	let mongoose;
	try {
		mongoose = await connectDb();
		logger.interactive('reset-monthly').await('reseting monthly usage...');
		await LicenseKey.updateMany({}, { $set: getResetUpdateQuery('thisMonth') });
		logger.interactive('reset-monthly').success('monthly usage reset');
	} catch (err) {
		logger.error('Failed to execute job reset-monthly-usage', err);
	} finally {
		await mongoose.disconnect();
	}
}

run();
