import { split } from 'sentence-splitter';

export function splitIntoLogicalChunks(text, chunkLength = 2000) {
	const sentences = split(text)
		.filter((node) => node.type === 'Sentence')
		.map((node) => node.raw);

	let currentChunk = '';
	let chunks = [];

	for (let i = 0; i < sentences.length; i++) {
		let sentence = sentences[i];
		// If adding the sentence exceeds the length and the current chunk isn't empty,
		// push the current chunk to the chunks array and reset currentChunk.
		if (currentChunk.length + sentence.length > chunkLength && currentChunk.length > 0) {
			chunks.push(currentChunk.trim());
			currentChunk = '';
		}
		currentChunk += sentence + ' ';
	}

	// Don't forget to add the last chunk if it exists.
	if (currentChunk.trim().length > 0) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}
