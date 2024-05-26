import { Schema } from 'mongoose';
import { createUuid } from '#database/types/UUID.js';

export const defaultOptions = {
	toJSON: {
		virtuals: true,
		transform: (_doc, ret) => {
			delete ret._id;
			delete ret.id;
			delete ret.__v;
			ret.uuid = ret.uuid?.toString() ?? null;
		}
	},
	toObject: {
		virtuals: true,
		transform: (_doc, ret) => {
			delete ret._id;
			delete ret.id;
			delete ret.__v;
			ret.uuid = ret.uuid?.toString() ?? null;
		}
	},
	timestamps: {
		createdAt: 'meta.createdAt',
		updatedAt: 'meta.lastUpdatedAt'
	}
};

export const Meta = {
	createdAt: {
		type: Date,
		// Automatically set to current date on creation
		default: Date.now
	},
	lastUpdatedAt: {
		type: Date,
		default: null
	},
	lastLoginAt: {
		type: Date,
		default: Date.now
	}
};

export const UUID = (opts = { required: true, unique: true }) => ({
	type: Schema.Types.UUID,
	default: createUuid,
	get: function (value) {
		return value.toString();
	},
	...opts
});
