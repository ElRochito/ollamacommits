import { execa } from 'execa';
import { black, dim, green, red, bgCyan } from 'kolorist';
import {
	intro,
	outro,
	spinner,
	select,
	confirm,
	isCancel,
} from '@clack/prompts';
import {
	assertGitRepo,
	getStagedDiff,
	getDetectedMessage,
} from '../utils/git.js';
import { getConfig } from '../utils/config.js';
import { generateCommitMessage, getModels } from '../utils/ollama.js';
import { KnownError, handleCliError } from '../utils/error.js';

export default async (
	excludeFiles: string[],
	stageAll: boolean,
	commitType: string | undefined,
	model: string | undefined,
	rawArgv: string[]
) =>
	(async () => {
		intro(bgCyan(black(' ollamacommits ')));
		await assertGitRepo();

		const detectingFiles = spinner();

		if (stageAll) {
			// This should be equivalent behavior to `git commit --all`
			await execa('git', ['add', '--update']);
		}

		detectingFiles.start('Detecting staged files');
		const staged = await getStagedDiff(excludeFiles);

		if (!staged) {
			detectingFiles.stop('Detecting staged files');
			throw new KnownError(
				'No staged changes found. Stage your changes manually, or automatically stage all changes with the `--all` flag.'
			);
		}

		detectingFiles.stop(
			`${getDetectedMessage(staged.files)}:\n${staged.files
				.map((file) => `     ${file}`)
				.join('\n')}`
		);

		const { env } = process;
		const config = await getConfig({
			type: commitType?.toString(),
			model: model?.toString(),
		});


		let selectedModel = config.model;

		if (!config.model) {
			const models = await getModels(config.timeout)
			const model = await select({
				message: `Pick an Ollama model to use: ${dim('(Ctrl+c to exit)')}`,
				options: models.models.map((value) => ({ label: value.model, value: value.name })),
			});

			if (isCancel(model)) {
				outro('Cancelled');
				return;
			}
			selectedModel = model;
		}

		const s = spinner();
		s.start('The AI is analyzing your changes');
		let messages: string[];
		try {
			messages = await generateCommitMessage(
				selectedModel,
				config.locale,
				staged.diff,
				config['max-length'],
				config.type,
				config.timeout,
			);
		} finally {
			s.stop('Changes analyzed');
		}

		if (messages.length === 0) {
			throw new KnownError('No commit messages were generated. Try again.');
		}

		let message: string;
		if (messages.length === 1) {
			[message] = messages;
			const confirmed = await confirm({
				message: `Use this commit message?\n\n   ${message}\n`,
			});

			if (!confirmed || isCancel(confirmed)) {
				outro('Commit cancelled');
				return;
			}
		} else {
			const selected = await select({
				message: `Pick a commit message to use: ${dim('(Ctrl+c to exit)')}`,
				options: messages.map((value) => ({ label: value, value })),
			});

			if (isCancel(selected)) {
				outro('Commit cancelled');
				return;
			}

			message = selected as string;
		}

		await execa('git', ['commit', '-m', message, ...rawArgv]);

		outro(`${green('✔')} Successfully committed!`);
	})().catch((error) => {
		outro(`${red('✖')} ${error.message}`);
		handleCliError(error);
		process.exit(1);
	});
