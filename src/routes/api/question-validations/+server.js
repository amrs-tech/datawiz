import { json } from '@sveltejs/kit';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const storagePath = join(process.cwd(), 'data/question-validations.json');

async function readStore() {
	try {
		const content = await readFile(storagePath, 'utf8');
		return normalizeStore(JSON.parse(content || '{"files":{}}'));
	} catch (error) {
		if (error.code !== 'ENOENT') throw error;
		return { files: {} };
	}
}

function normalizeStore(store) {
	if (store.files) return store;
	if (store.questions) {
		return {
			files: {
				__legacy__: {
					questions: store.questions
				}
			}
		};
	}
	return { files: {} };
}

async function writeStore(store) {
	await mkdir(dirname(storagePath), { recursive: true });
	await writeFile(storagePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
}

export async function GET() {
	const store = await readStore();
	return json(store);
}

export async function POST({ request }) {
	const { fileName, questionKey, question, status, validations } = await request.json();
	if (!fileName) {
		return json({ error: 'CSV filename is required' }, { status: 400 });
	}

	if (Array.isArray(validations)) {
		const store = await readStore();
		store.files[fileName] = store.files[fileName] || { questions: {} };
		for (const item of validations) {
			if (!item.questionKey || !['valid', 'invalid'].includes(item.status)) {
				return json({ error: 'Invalid validation payload' }, { status: 400 });
			}
			store.files[fileName].questions[item.questionKey] = {
				question: item.question || item.questionKey,
				status: item.status,
				updatedAt: item.updatedAt || new Date().toISOString()
			};
		}
		await writeStore(store);
		return json(store.files[fileName]);
	}

	if (!questionKey || !['valid', 'invalid'].includes(status)) {
		return json({ error: 'Invalid validation payload' }, { status: 400 });
	}

	const store = await readStore();
	store.files[fileName] = store.files[fileName] || { questions: {} };
	store.files[fileName].questions[questionKey] = {
		question: question || questionKey,
		status,
		updatedAt: new Date().toISOString()
	};
	await writeStore(store);

	return json(store.files[fileName].questions[questionKey]);
}
