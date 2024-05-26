import './types/UUID.js';
import './types/Key.js';

import { ServerApiVersion } from 'mongodb';
import { createLogger } from '#helpers/logger.js';
import mongoose from 'mongoose';

const { MONGO_URI, MONGO_TLS_KEY, MONGO_ATLAS } = process.env;
const logger = createLogger('mongo');

let mongoOptions = {
	tlsCertificateKeyFile: MONGO_TLS_KEY ?? null
};
if (MONGO_ATLAS) {
	mongoOptions = {
		...mongoOptions,
		serverApi: {
			version: ServerApiVersion.v1,
			strict: true,
			deprecationErrors: true
		}
	};
	// mongoOptions = {
	// 	...mongoOptions,
	// 	authMechanism: 'MONGODB-X509',
	// 	authSource: '$external'
	// };
}

export async function connectDb(connectionString) {
	try {
		logger.interactive('db').await('connecting to mongodb');
		const db = await mongoose.connect(connectionString || MONGO_URI, mongoOptions);
		logger.interactive('db').success('connected to database');
		return db;
	} catch (err) {
		logger.interactive('db').error('connection error', err);
		process.exit(1);
	}
}
