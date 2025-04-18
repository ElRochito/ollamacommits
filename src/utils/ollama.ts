import http = require('http');
import type { ClientRequest, IncomingMessage } from 'http';
import type {
	ChatRequest,
	ChatResponse,
	ListResponse,
} from 'ollama';
import { KnownError } from './error.js';
import type { CommitType } from './config.js';
import { generatePrompt } from './prompt.js';

const httpPost = async (
	hostname: string,
	path: string,
	json: unknown,
	timeout: number,
) =>
	new Promise<{
		request: ClientRequest;
		response: IncomingMessage;
		data: string;
	}>((resolve, reject) => {
		const postContent = JSON.stringify(json);
		const request = http.request(
			{
				port: 11434,
				hostname,
				path,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Content-Length': Buffer.byteLength(postContent),
				},
				timeout: 50000
			},
			(response) => {
				const body: Buffer[] = [];
				response.on('data', (chunk) => body.push(chunk));
				response.on('end', () => {
					resolve({
						request,
						response,
						data: Buffer.concat(body).toString(),
					});
				});
			}
		);
		request.on('error', reject);
		request.on('timeout', () => {
			request.destroy();
			reject(
				new KnownError(
					`Time out error: request took over ${timeout}ms. Try increasing the \`timeout\` config, or checking the OpenAI API status https://status.openai.com`
				)
			);
		});

		request.write(postContent);
		request.end();
	});


const httpGet = async (
	hostname: string,
	path: string,
	timeout: number,
) =>
	new Promise<{
		response: ListResponse;
		data: string;
	}>((resolve, reject) => {
		const request = http.request(
			{
				port: 11434,
				hostname,
				path,
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
				},
				timeout: timeout
			},
			(response) => {
				const body: Buffer[] = [];
				response.on('data', (chunk) => body.push(chunk));
				response.on('end', () => {
					resolve({
						request,
						response,
						data: Buffer.concat(body).toString(),
					});
				});
			}
		);
		request.on('error', reject);
		request.on('timeout', () => {
			request.destroy();
			reject(
				new KnownError(
					`Time out error: request took over ${timeout}ms. Try increasing the \`timeout\` config, or checking the OpenAI API status https://status.openai.com`
				)
			);
		});

		request.end();
	});

export const getModels = async (
	timeout: number
) => {
	const { response, data } = await httpGet(
		'localhost',
		'/api/tags',
		timeout,
	);

	if (
		!response.statusCode ||
		response.statusCode < 200 ||
		response.statusCode > 299
	) {
		let errorMessage = `OpenAI API Error: ${response.statusCode} - ${response.statusMessage}`;

		if (data) {
			errorMessage += `\n\n${data}`;
		}

		if (response.statusCode === 500) {
			errorMessage += '\n\nCheck the API status: http://localhost:11434';
		}

		throw new KnownError(errorMessage);
	}

	return JSON.parse(data) as ListResponse;
}

const createChatCompletion = async (
	json: ChatRequest,
	timeout: number,
) => {
	const { response, data } = await httpPost(
		'localhost',
		'/api/chat',
		json,
		timeout,
	);

	if (
		!response.statusCode ||
		response.statusCode < 200 ||
		response.statusCode > 299
	) {
		let errorMessage = `OpenAI API Error: ${response.statusCode} - ${response.statusMessage}`;

		if (data) {
			errorMessage += `\n\n${data}`;
		}

		if (response.statusCode === 500) {
			errorMessage += '\n\nCheck the API status: http://localhost:11434';
		}

		throw new KnownError(errorMessage);
	}

	return JSON.parse(data) as CreateChatCompletionResponse;
};

const sanitizeMessage = (message: string) =>
	message
		.trim()
		.replace(/[\n\r]/g, '')
		.replace(/(\w)\.$/, '$1');

const deduplicateMessages = (array: string[]) => Array.from(new Set(array));

export const generateCommitMessage = async (
	model: string,
	locale: string,
	diff: string,
	maxLength: number,
	type: CommitType,
	timeout: number,
) => {
	try {
		const completion = await createChatCompletion(
			{
				model,
				messages: [
					{
						role: 'system',
						content: generatePrompt(locale, maxLength, type),
					},
					{
						role: 'user',
						content: diff,
					},
				],
				options: {
			    	temperature: 0.7
		        },
				stream: false,
			},
			timeout,
		);

		return deduplicateMessages(
			[completion]
				.filter((choice) => choice.message?.content)
				.map((choice) => sanitizeMessage(choice.message!.content as string))
		);
	} catch (error) {
		const errorAsAny = error as any;
		if (errorAsAny.code === 'ENOTFOUND') {
			throw new KnownError(
				`Error connecting to ${errorAsAny.hostname} (${errorAsAny.syscall}). Are you connected to the internet?`
			);
		}

		throw errorAsAny;
	}
};
