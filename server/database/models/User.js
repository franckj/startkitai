import { Meta, UUID, defaultOptions } from './defaults.js';

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const userSchema = new Schema(
	{
		uuid: UUID(),
		email: {
			type: String,
			required: true,
			unique: true
		},
		// Password is currently only used for
		// the admin user to access the Admin Dashboard
		password: {},
		preferences: {
			type: Object
		},
		// It's wise to always start with User Roles as you
		// can bet for sure they will be needed later! ;)
		roles: {
			type: [String],
			default: []
		},
		// billing details (mainly denormalized Stripe properties)
		billing: {
			planName: String,
			// the plan ID that matches our plans.yml
			planId: Number,
			planActive: Boolean,
			// start: stripe
			customerId: String,
			subscriptionId: String,
			previousSubscriptionId: String,
			stripePriceId: String,
			// subscriptionStatus will be updated on subscription cancel/delete
			// webhooks from stripe
			subscriptionStatus: {
				type: String,
				enum: [
					'incomplete',
					'incomplete_expired',
					'trialing',
					'active',
					'past_due',
					'canceled',
					'unpaid',
					'paused'
				]
			},
			interval: {
				type: String,
				enum: ['month', 'year']
			},
			currency: String,
			// end: stripe
			canceledAt: Date,
			endsAt: Date,
			reactivatedAt: Date,
			deactivatedAt: Date
		},
		meta: Meta
	},
	defaultOptions
);

userSchema.virtual('licenseKey', {
	ref: 'LicenseKey',
	localField: 'uuid',
	foreignField: 'userUuid',
	justOne: true
});

const User = mongoose.model('User', userSchema, 'users');

export default User;
