import ChatHistory from './models/ChatHistory.js';
import { createUuid } from './types/UUID.js';
import { getTokenSize } from '#helpers/tokens.js';

export async function getChatHistory({ userUuid, chatUuid, withMeta = false, withTools = true }) {
	if (!chatUuid) throw new Error('history uuid is required');

	const history = await ChatHistory.findOne({ uuid: chatUuid });

	// if the history doesn't exist, return an empty array.
	// OR if the history has not been marked as sharable and the user uuid
	// isn't the owner of this history then don't return it
	const isUnsharable = !history.sharable && history.userUuid !== userUuid;
	if (!history || isUnsharable) {
		return [];
	}

	// when we send the history to OpenAI, it wont accept the timestamps and
	// other stuff we've added, so we strip them off here.
	return history.messages
		.map(({ result, metadata, timestamp, ...m }) => {
			if (withMeta) {
				return { ...m, result, metadata, timestamp };
			}
			return m;
		})
		.filter((m) => {
			if (withTools) {
				return true;
			}
			return m.role !== 'system' && m.role !== 'tool' && !m.tool_calls;
		});
}

export async function markHistorySharable({ userUuid, chatUuid, isSharable }) {
	if (!userUuid || !chatUuid) throw new Error('user uuid is required');
	await ChatHistory.updateOne(
		{ userUuid, uuid: chatUuid },
		{
			$set: {
				sharable: isSharable
			}
		}
	);
}

export async function saveChatHistory({ userUuid, chatUuid = createUuid(), newMessages = [] }) {
	if (!userUuid || !chatUuid) throw new Error('user uuid is required');
	const existing = await ChatHistory.findOne({ uuid: chatUuid });
	const isAnotherUsersChat = existing && existing.userUuid !== userUuid;
	// create a new uuid for this chat
	let uuid = isAnotherUsersChat ? createUuid() : chatUuid;

	const tokens = getTokenSize(newMessages);
	const response = await ChatHistory.updateOne(
		{ userUuid, uuid },
		{
			$push: {
				messages: { $each: newMessages.map((m) => ({ ...m, timestamp: new Date() })) }
			},
			$inc: {
				size: 1,
				tokenSize: tokens
			}
		},
		{
			upsert: true,
			new: true
		}
	);
	const { upsertedId } = response;
	const history = await ChatHistory.findById(upsertedId);
	return history;
}

export async function deleteChatHistory({ userUuid, chatUuid }) {
	if (!userUuid || !chatUuid) throw new Error('User UUID and Chat UUID are required');
	return await ChatHistory.deleteOne({ userUuid, uuid: chatUuid });
}

export async function deleteAllChatHistoryForUser({ userUuid }) {
	if (!userUuid) throw new Error('User UUID is required');
	return await ChatHistory.deleteMany({ userUuid });
}
