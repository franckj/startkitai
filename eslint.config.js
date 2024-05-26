import babelParser from '@babel/eslint-parser';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
	js.configs.recommended,
	eslintPluginPrettierRecommended,
	{
		files: ['**/*.{js,mjs,cjs,ts,tsx}'],
		plugins: { 'unused-imports': unusedImports },
		languageOptions: {
			ecmaVersion: 14,
			sourceType: 'module',
			globals: {
				...globals.node
			}
		},
		rules: {
			'no-unused-vars': 'warn',
			'unused-imports/no-unused-imports': 2
		},
		ignores: ['build/*', 'config/*', 'dist/*', 'submodules/*'],
		settings: {
			'import/resolver': {
				alias: {
					map: [
						['#ai', './server/helpers/ai-providers'],
						['#api', './server/api'],
						['#database', './server/database'],
						['#helpers', './server/helpers'],
						['#jobs', './server/jobs'],
						['#root', './server']
					],
					extensions: ['.js', '.jsx', '.json'],
					debug: true
				}
			}
		}
	},
	{
		name: 'React linter',
		files: ['web/**/*.{js,jsx}'],
		plugins: { react, 'unused-imports': unusedImports },
		languageOptions: {
			parser: babelParser,
			ecmaVersion: 14,
			parserOptions: {
				ecmaFeatures: {
					jsx: true
				}
			},
			globals: {
				...globals.browser,
				__API_URL__: 'readonly'
			}
		},
		rules: {
			...reactRecommended.rules,
			'react/react-in-jsx-scope': 0,
			'unused-imports/no-unused-imports': 2,
			'react/prop-types': 0,
			'react/no-unescaped-entities': 1
		}
	}
];
