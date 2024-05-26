import mongoose from 'mongoose';
import { v4 } from 'uuid';

const env = process.env.NODE_ENV;

const Schema = mongoose.Schema;

class Key extends mongoose.SchemaType {
	validate = env === 'production' ? /^sk_[0-9a-fA-F]{24}$/ : /^sk_test_[0-9a-fA-F]{24}$/;

	constructor(key, options) {
		super(key, options, 'UUID');
	}

	cast(val) {
		return val;
	}
}

export function createLicenseKey() {
	if (env === 'production') {
		return `sk_${v4()}`;
	}
	return `sk_test_${v4()}`;
}

Schema.Types.Key = Key;
