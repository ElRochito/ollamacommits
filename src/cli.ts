import { cli } from 'cleye';
import { description, version } from '../package.json';
import ollamacommits from './commands/ollamacommits.js';
import configCommand from './commands/config.js';

const rawArgv = process.argv.slice(2);

cli(
	{
		name: 'ollamacommits',

		version,

		/**
		 * Since this is a wrapper around `git commit`,
		 * flags should not overlap with it
		 * https://git-scm.com/docs/git-commit
		 */
		flags: {
			model: {
				type: String,
				description: 'Model to be used',
				alias: 'm',
			},
			exclude: {
				type: [String],
				description: 'Files to exclude from AI analysis',
				alias: 'x',
			},
			all: {
				type: Boolean,
				description: 'Automatically stage changes in tracked files for the commit',
				alias: 'a',
				default: false,
			},
			type: {
				type: String,
				description: 'Type of commit message to generate',
				alias: 't',
			},
		},

		commands: [configCommand],

		help: {
			description,
		},

		ignoreArgv: (type) => type === 'unknown-flag' || type === 'argument',
	},
	(argv) => {
		ollamacommits(
			argv.flags.exclude,
			argv.flags.all,
			argv.flags.type,
			argv.flags.model,
			rawArgv
		);
	},
	rawArgv
);
