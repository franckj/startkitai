import 'dotenv/config.js';

import { sync as commandExists } from 'command-exists';
import debug from 'debug';
import { fileURLToPath } from 'url';
import { getConfigFile } from '#helpers/configs.js';
import { getEmbeddingsDimension } from '#helpers/tokens.js';
import logger from '#helpers/logger.js';
import path from 'path';
import { spawn } from 'child_process';

/**
 * When you run StartKit.AI we spawn two services.
 * - The main nodejs API Server (server/index.js)
 * - The Embeddings Server (submodules/chatgpt-retrieval-plugin)
 */
const embeddingsConfig = getConfigFile('embeddings.yml');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const processes = [];
const debugLogger = debug('embeddings');

const processConfigs = [
	/**
	 * The main node process
	 */
	{
		name: 'api',
		command: process.env.NODE_ENV === 'production' ? 'npm run start:api' : `npm run dev:api`,
		stdio: 'inherit'
	},
	/**
	 * Process details for the Retrieval Plugin that we use
	 * for fetching embeddings data for RAG
	 *
	 * See {@link https://startkit.ai/docs/features/embeddings#the-retrieval-plugin|Embeddings}
	 **/
	{
		name: 'embeddings',
		command: 'poetry run start',
		cwd: path.join(__dirname, 'submodules', 'chatgpt-retrieval-plugin'),
		env: {
			DATASTORE: 'pinecone',
			EMBEDDING_DIMENSION:
				embeddingsConfig.dimension || getEmbeddingsDimension(embeddingsConfig.model),
			EMBEDDING_MODEL: embeddingsConfig.model,
			OPENAI_API_KEY: process.env.OPENAI_KEY,
			BEARER_TOKEN: process.env.EMBEDDINGS_BEARER_TOKEN,
			PINECONE_API_KEY: process.env.PINECONE_API_KEY,
			PINECONE_INDEX_HOST: process.env.PINECONE_INDEX_HOST
		},
		stdio: debugLogger.enabled ? 'inherit' : 'ignore'
	}
];

async function startProcess(config) {
	if (!process.env.PINECONE_API_KEY) {
		processConfigs.pop();
		logger.info(`Pinecone not set up, starting server without embeddings`);
	}
	if (process.env.PINECONE_API_KEY && !commandExists('poetry')) {
		processConfigs.pop();
		logger.warn(`The Pinecone embeddings server requires Python & Poetry to be installed.`);
		logger.warn(
			`Follow the guide here: https://startkit.ai/docs/getting-started/installation/pinecone#installing-python-and-poetry`
		);
	}
	const env = { ...process.env, ...config.env };

	let [command, ...args] = config.command.split(' ');
	const argsProcess = process.argv.slice(2);
	if (argsProcess.length) {
		args.push('--', argsProcess.join(' '));
	}

	const proc = spawn(command, args, {
		cwd: config.cwd,
		env: env,
		shell: true,
		stdio: config.stdio
	});

	processes.push(proc);
	logger.info(`Starting process: ${config.name}`);
}

processConfigs.forEach(startProcess);

// handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
	console.log('Received SIGINT. Exiting processes...');
	processes.forEach((proc) => {
		// send SIGINT to child processes
		proc.kill('SIGINT');
	});
	process.exit();
});
