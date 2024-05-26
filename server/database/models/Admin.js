import { Meta, UUID, defaultOptions } from './defaults.js';

import { createLogger } from '#helpers/logger.js';
import mongoose from 'mongoose';

const Schema = mongoose.Schema;
const logger = createLogger('admin-db');

const adminSchema = new Schema(
	{
		adminKeyUuid: UUID({ required: false, unique: true, default: null }),
		adminUserUuid: UUID({ required: false, unique: true, default: null }),
		preferences: {
			useAdminKeyForDemos: {
				type: Boolean,
				default: false
			}
		},
		isFirstBoot: {
			type: Boolean,
			default: true
		},
		meta: Meta
	},
	defaultOptions
);
const Admin = mongoose.model('Admin', adminSchema, 'admin');

export async function getAdminConfig() {
	let config = await Admin.findOne({}).lean();
	if (!config) {
		logger.info('creating new admin configuration for first-boot');
		config = await Admin.create({});
	}
	const { isFirstBoot, preferences } = config;
	return {
		isFirstBoot,
		preferences
	};
}

export async function setAdminConfig({ adminUserUuid, adminKeyUuid, isFirstBoot, preferences }) {
	let update = {};
	if (adminUserUuid) {
		update = {
			...update,
			adminUserUuid,
			adminKeyUuid
		};
	}
	if (typeof isFirstBoot !== 'undefined') {
		update = {
			...update,
			isFirstBoot
		};
	}
	if (preferences) {
		update = {
			...update,
			preferences
		};
	}
	return await Admin.findOneAndUpdate(
		{},
		{
			$set: update
		},
		{ new: true }
	);
}

export default Admin;
