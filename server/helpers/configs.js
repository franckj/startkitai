import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import yaml from 'js-yaml';

/**
 * Converts our yaml config files to JSON
 */
export function getConfigFile(fileName) {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);
	const fileContents = fs.readFileSync(`${__dirname}/../../config/${fileName}`, 'utf8');
	const chatOptions = yaml.load(fileContents);
	return chatOptions;
}
