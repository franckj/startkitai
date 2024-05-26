import { Meta, UUID, defaultOptions } from './defaults.js';

import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const EmbeddedDocument = new Schema({
	filename: String,
	contentType: String,
	size: Number,
	storageKey: String
});

const embeddingsSchema = new Schema(
	{
		uuid: UUID(),
		userUuid: UUID({ default: null }),
		description: {
			type: String
		},
		contextId: {
			type: String,
			required: true,
			index: true
		},
		namespace: { type: String, required: true },
		documentIds: {
			type: [String]
		},
		embeddingIds: {
			type: [String]
		},
		documents: {
			type: [EmbeddedDocument]
		},
		admin: { type: Boolean, default: false },
		meta: Meta
	},
	defaultOptions
);

const Embeddings = mongoose.model('Embeddings', embeddingsSchema);

export default Embeddings;
