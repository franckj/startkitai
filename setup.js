import { createAdminUser, getAdminUser } from './server/db/users.js';

import { connectDb } from './server/db/connection.js';
import { createLogger } from './server/helpers/logger.js';
import { promises as fs } from 'fs';
import inquirer from 'inquirer';
import { randomBytes } from 'crypto';
import { setAdminConfig } from './server/db/models/Admin.js';
import { spawn } from 'child_process';

const logger = createLogger();

const envPath = '.env';
const envExamplePath = '.env.example';

async function generateSecret() {
	return randomBytes(32).toString('hex');
}

async function run() {
	let output = await setupAdminUser();

	await createEnvFile(output);

	logger.log();

	let answers = await inquirer.prompt([
		{
			type: 'list',
			name: 'start',
			message: 'Run StartKit.AI now? (Or you can do this later by running `yarn dev`)',
			choices: ['yes', 'no']
		}
	]);
	if (answers.start === 'yes') {
		spawn('node', ['./index.js'], {
			shell: true,
			stdio: 'inherit'
		});
	}
}

async function createEnvFile(answers) {
	try {
		await fs.writeFile(envPath, '', { flag: 'wx' });
		const lines = await fs.readFile(envExamplePath, 'utf-8');
		const linesArray = lines.split('\n');

		for (let line of linesArray) {
			if (line.startsWith('#') || line.trim() === '') {
				await fs.appendFile(envPath, line + '\n');
			} else {
				let [key, value] = line.split('=');
				switch (key) {
					case 'EMBEDDINGS_BEARER_TOKEN':
						value = await generateSecret();
						break;
					case 'JWT_SECRET':
						value = await generateSecret();
						break;
					default: {
						let setVal = answers.find((a) => a.key === key)?.value;
						if (setVal) {
							value = setVal;
						}
						break;
					}
				}

				await fs.appendFile(envPath, `${key}=${value}\n`);
			}
		}
		logger.log();
		await sleep();
		logger.success('.env file has been successfully created.');
		await sleep();
		logger.success('Setup complete!');
	} catch (error) {
		console.error('Failed to create .env file:', error);
	}
}

let nums = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣'];

async function setupAdminUser() {
	let output = [];
	let answers;
	let mongoose;
	logger.log();
	logger.log('🤖 Welcome to StartKit.AI! This wizard will walk you though the setup process:');

	/**
	 * MongoDB
	 */
	logger.log();
	logger.log(
		`${nums.shift()} Let's setup your database. You can find more info here: https://startkit.ai/docs/getting-started/installation/database`
	);

	answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'mongoUri',
			message: 'Enter your MongoDB connection string (required):'
		}
	]);

	if (answers.mongoUri) {
		logger.interactive('db').await('connecting to database');
		mongoose = await connectDb(answers.mongoUri);
		await sleep();
		logger.interactive('db').success('connected to database');
		output.push({ key: 'MONGO_URI', value: answers.mongoUri });
	}

	/**
	 * S3 Storage
	 */
	await sleep();
	logger.log();
	logger.log(
		`${nums.shift()} Let's setup S3 storage. You can find more info here: https://startkit.ai/docs/getting-started/installation/s3`
	);

	answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'storageName',
			message: 'Enter storage name (optional):'
		},
		{
			type: 'input',
			name: 'storageRegion',
			message: 'Enter storage region (optional):'
		},
		{
			type: 'input',
			name: 'storageUrl',
			message: 'Enter storage URL (optional):'
		},
		{
			type: 'input',
			name: 'storageKey',
			message: 'Enter storage key (optional):'
		},
		{
			type: 'input',
			name: 'storageSecret',
			message: 'Enter storage secret (optional):'
		}
	]);

	if (answers.storageSecret) {
		logger.interactive('s3').await('saving s3 details');
		output.push({ key: 'STORAGE_NAME', value: answers.storageName });
		output.push({ key: 'STORAGE_REGION', value: answers.storageRegion });
		output.push({ key: 'STORAGE_URL', value: answers.storageUrl });
		output.push({ key: 'STORAGE_KEY', value: answers.storageKey });
		output.push({ key: 'STORAGE_SECRET', value: answers.storageSecret });
		await sleep();
		logger.interactive('pc').success('saved s3 details');
	}

	/**
	 * Pinecone
	 */
	logger.log();
	logger.log(
		`${nums.shift()} Let's connect to Pinecone. More info here: https://startkit.ai/docs/getting-started/installation/pinecone'`
	);

	answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'pineconeApiKey',
			message: 'Enter your Pinecone API key (optional):'
		},
		{
			type: 'input',
			name: 'pineconeIndexHost',
			message: 'Enter your Pinecone Index Host (optional):'
		}
	]);

	if (answers.pineconeApiKey) {
		logger.interactive('pc').await('saving Pinecone details');
		output.push({ key: 'PINECONE_API_KEY', value: answers.pineconeApiKey });
		output.push({ key: 'PINECONE_INDEX_HOST', value: answers.pineconeIndexHost });
		await sleep();
		logger.interactive('pc').success('saved Pinecone details');
	}

	/**
	 * OpenAI
	 */
	await sleep();
	logger.log();
	logger.log(
		`${nums.shift()} OpenAI time (required)! More info here: https://startkit.ai/docs/getting-started/installation/openai'`
	);

	answers = await inquirer.prompt([
		{
			type: 'input',
			name: 'openAiKey',
			message: 'Enter your OpenAI API key (required):'
		}
	]);
	if (answers.openAiKey) {
		logger.interactive('pc').await('saving OpenAI key');
		output.push({ key: 'OPENAI_KEY', value: answers.openAiKey });
		await sleep();
		logger.interactive('pc').success('saved OpenAI key');
	}
	await sleep();

	/**
	 * Admin user
	 */
	let admin = await getAdminUser();
	logger.log();
	if (!admin.user) {
		logger.log(
			`${nums.shift()} Setup an Admin User. This will be used for signing into the Admin Dashboard, or when making your own requests to the API.`
		);
	} else {
		answers = await inquirer.prompt([
			{
				type: 'list',
				name: 'confirm',
				message: `${nums.shift()} There's already an admin user, do you want to update it?`,
				choices: ['update existing admin user', 'leave the admin user the same']
			}
		]);
	}
	if (!answers.confirm || answers.confirm?.toLowerCase() === 'update existing admin user') {
		answers = await inquirer.prompt([
			{
				type: 'input',
				name: 'email',
				message: 'Enter admin email:',
				validate: (input) => {
					if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(input)) {
						return true;
					} else {
						return 'Please enter a valid email address.';
					}
				}
			},
			{
				type: 'password',
				name: 'password',
				message: 'Enter admin password:',
				mask: '*',
				validate: (input) => {
					if (input.length < 6) {
						return 'Password must be at least 6 characters.';
					} else {
						return true;
					}
				}
			}
		]);
		if (answers.email) {
			logger.interactive('user').await(`${admin.user ? 'updating' : 'creating'} admin user`);
			const { user, licenseKey } = await createAdminUser({
				email: answers.email,
				password: answers.password
			});
			admin = {
				user,
				key: licenseKey
			};
			await sleep();
			logger.interactive('user').success(`admin user ${admin.user ? 'updated' : 'created'}`);
		}
	}

	/**
	 * App type
	 */
	await sleep();
	logger.log();

	answers = await inquirer.prompt([
		{
			type: 'list',
			name: 'type',
			message: `${nums.shift()} What kind of app are you going to create? (You can change this later)`,
			choices: [
				'(Users) I will have users who sign in and access the API',
				'(Admin) I want to make secure requests to the API myself',
				'(Open) I want anyone to be able to make requests to the API for free'
			]
		}
	]);

	let useAdminKeyForDemos = false;
	await sleep();
	if (answers.type.startsWith('(Admin)')) {
		logger.success(
			`Okay you'll be able to make requests to the API with the Admin license key: ${admin.key.key}. This will be used in the demo pages automatically.`
		);
		useAdminKeyForDemos = true;
	} else if (answers.type.startsWith('(Users)')) {
		logger.success(`Okay when you create users they'll be each given their own license key`);
	} else {
		logger.success(`Okay, the API will be completely open.`);
		output.push({ key: 'DISABLE_AUTH', value: '1' });
	}

	logger.log();
	await sleep();
	if (admin.user) {
		logger.interactive('config').await(`Updating configuration`);
		await setAdminConfig({
			adminUserUuid: admin.user.uuid,
			adminKeyUuid: admin.key.uuid,
			isFirstBoot: false,
			preferences: {
				useAdminKeyForDemos: useAdminKeyForDemos
			}
		});
		logger.interactive('config').success(`Updated configuration`);
	}
	await sleep();

	mongoose.disconnect();
	return output;
}

run();

async function sleep() {
	return await new Promise((resolve) => setTimeout(resolve, 1000));
}
