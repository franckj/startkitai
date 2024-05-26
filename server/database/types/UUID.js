import MUUID from 'uuid-mongodb';
import mongoose from 'mongoose';

const mUUID = MUUID.mode('relaxed');

const Schema = mongoose.Schema;

/**
 * We use our own UUID type as it's a bit more
 * flexible than the built in mongo _id
 */
class UUID extends mongoose.SchemaType {
	constructor(key, options) {
		super(key, options, 'UUID');
	}

	cast(val) {
		try {
			if (val) {
				return mUUID.from(val);
			}
			return mUUID.v4();
		} catch (err) {
			throw new Error('UUID: ' + val + ' is not a valid UUID string or buffer.');
		}
	}
}

export function createUuid() {
	return mUUID.v4();
}

Schema.Types.UUID = UUID;
