import { Meta, UUID, defaultOptions } from './defaults.js';

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const chatHistorySchema = new Schema(
	{
		uuid: UUID(),
		userUuid: UUID({ default: null }),
		size: {
			type: Number,
			default: 0
		},
		tokenSize: {
			type: Number,
			default: 0
		},
		messages: {
			type: [Object],
			default: []
		},
		sharable: {
			type: Boolean,
			default: false
		},
		meta: Meta
	},
	defaultOptions
);

const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema, 'chat_history');

export default ChatHistory;
