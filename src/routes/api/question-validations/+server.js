import { json } from '@sveltejs/kit';
import pg from 'pg';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const storagePath = join(process.cwd(), 'data/question-validations.json');
const { Pool } = pg;
let pool;
let schemaReady;

function hasDatabase() {
	return Boolean(process.env.DATABASE_URL);
}

function shouldUseSsl() {
	if (process.env.PGSSLMODE === 'disable') return false;
	if (process.env.PGSSLMODE === 'require') return true;
	return process.env.NODE_ENV === 'production';
}

function getPool() {
	if (!pool) {
		pool = new Pool({
			connectionString: process.env.DATABASE_URL,
			ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined
		});
	}
	return pool;
}

async function ensureSchema() {
	if (!schemaReady) {
		schemaReady = (async () => {
			await getPool().query(`
				CREATE TABLE IF NOT EXISTS question_validations (
					file_name text NOT NULL,
					question_key text NOT NULL,
					question text NOT NULL,
					status text NOT NULL CHECK (status IN ('valid', 'invalid')),
					updated_at timestamptz NOT NULL DEFAULT now(),
					PRIMARY KEY (file_name, question_key)
				)
			`);
			await getPool().query('ALTER TABLE question_validations ADD COLUMN IF NOT EXISTS invalid_reason_category text');
			await getPool().query('ALTER TABLE question_validations ADD COLUMN IF NOT EXISTS invalid_reason_detail text');
		})();
	}
	await schemaReady;
}

function toIso(value) {
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function normalizeInvalidReason(status, reason) {
	if (status !== 'invalid') return null;
	if (!reason || typeof reason !== 'object') return null;
	const category = ['Equation', 'Image', 'Other'].includes(reason.category) ? reason.category : '';
	const detail = category === 'Other' ? String(reason.detail || '').trim() : '';
	if (!category || (category === 'Other' && !detail)) return null;
	return { category, detail };
}

function isValidValidationItem(item) {
	if (!item.questionKey || !['valid', 'invalid'].includes(item.status)) return false;
	if (item.status === 'invalid' && !normalizeInvalidReason(item.status, item.invalidReason)) return false;
	return true;
}

function rowsToStore(rows) {
	const store = { files: {} };
	for (const row of rows) {
		const item = {
			question: row.question,
			status: row.status,
			updatedAt: toIso(row.updated_at)
		};
		if (row.status === 'invalid' && row.invalid_reason_category) {
			item.invalidReason = {
				category: row.invalid_reason_category,
				detail: row.invalid_reason_detail || ''
			};
		}
		store.files[row.file_name] = store.files[row.file_name] || { questions: {} };
		store.files[row.file_name].questions[row.question_key] = item;
	}
	return store;
}

async function readDbStore() {
	await ensureSchema();
	const result = await getPool().query(
		'SELECT file_name, question_key, question, status, invalid_reason_category, invalid_reason_detail, updated_at FROM question_validations ORDER BY file_name, question_key'
	);
	return rowsToStore(result.rows);
}

async function readDbFileStore(fileName) {
	await ensureSchema();
	const result = await getPool().query(
		'SELECT file_name, question_key, question, status, invalid_reason_category, invalid_reason_detail, updated_at FROM question_validations WHERE file_name = $1 ORDER BY question_key',
		[fileName]
	);
	return rowsToStore(result.rows).files[fileName] || { questions: {} };
}

async function upsertDbValidation(client, fileName, item) {
	const invalidReason = normalizeInvalidReason(item.status, item.invalidReason);
	const result = await client.query(
		`
			INSERT INTO question_validations (file_name, question_key, question, status, invalid_reason_category, invalid_reason_detail, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (file_name, question_key)
			DO UPDATE SET
				question = EXCLUDED.question,
				status = EXCLUDED.status,
				invalid_reason_category = EXCLUDED.invalid_reason_category,
				invalid_reason_detail = EXCLUDED.invalid_reason_detail,
				updated_at = EXCLUDED.updated_at
			RETURNING question, status, invalid_reason_category, invalid_reason_detail, updated_at
		`,
		[
			fileName,
			item.questionKey,
			item.question || item.questionKey,
			item.status,
			invalidReason?.category || null,
			invalidReason?.detail || null,
			item.updatedAt || new Date().toISOString()
		]
	);
	const row = result.rows[0];
	const saved = {
		question: row.question,
		status: row.status,
		updatedAt: toIso(row.updated_at)
	};
	if (row.status === 'invalid' && row.invalid_reason_category) {
		saved.invalidReason = {
			category: row.invalid_reason_category,
			detail: row.invalid_reason_detail || ''
		};
	}
	return saved;
}

async function upsertDbValidations(client, fileName, validations) {
	if (validations.length === 0) return;
	const values = [];
	const placeholders = validations.map((item, index) => {
		const invalidReason = normalizeInvalidReason(item.status, item.invalidReason);
		const offset = index * 7;
		values.push(
			fileName,
			item.questionKey,
			item.question || item.questionKey,
			item.status,
			invalidReason?.category || null,
			invalidReason?.detail || null,
			item.updatedAt || new Date().toISOString()
		);
		return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`;
	});
	await client.query(
		`
			INSERT INTO question_validations (file_name, question_key, question, status, invalid_reason_category, invalid_reason_detail, updated_at)
			VALUES ${placeholders.join(', ')}
			ON CONFLICT (file_name, question_key)
			DO UPDATE SET
				question = EXCLUDED.question,
				status = EXCLUDED.status,
				invalid_reason_category = EXCLUDED.invalid_reason_category,
				invalid_reason_detail = EXCLUDED.invalid_reason_detail,
				updated_at = EXCLUDED.updated_at
		`,
		values
	);
}

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
	if (hasDatabase()) {
		return json(await readDbStore());
	}

	const store = await readStore();
	return json(store);
}

export async function POST({ request }) {
	const { fileName, questionKey, question, status, invalidReason, validations } = await request.json();
	if (!fileName) {
		return json({ error: 'CSV filename is required' }, { status: 400 });
	}

	if (Array.isArray(validations)) {
		if (hasDatabase()) {
			await ensureSchema();
			const client = await getPool().connect();
			try {
				await client.query('BEGIN');
				for (const item of validations) {
					if (!isValidValidationItem(item)) {
						await client.query('ROLLBACK');
						return json({ error: 'Invalid validation payload' }, { status: 400 });
					}
				}
				for (let i = 0; i < validations.length; i += 500) {
					await upsertDbValidations(client, fileName, validations.slice(i, i + 500));
				}
				await client.query('COMMIT');
				return json(await readDbFileStore(fileName));
			} catch (error) {
				await client.query('ROLLBACK');
				throw error;
			} finally {
				client.release();
			}
		}

		const store = await readStore();
		store.files[fileName] = store.files[fileName] || { questions: {} };
		for (const item of validations) {
			if (!isValidValidationItem(item)) {
				return json({ error: 'Invalid validation payload' }, { status: 400 });
			}
			const saved = {
				question: item.question || item.questionKey,
				status: item.status,
				updatedAt: item.updatedAt || new Date().toISOString()
			};
			const normalizedReason = normalizeInvalidReason(item.status, item.invalidReason);
			if (normalizedReason) saved.invalidReason = normalizedReason;
			store.files[fileName].questions[item.questionKey] = saved;
		}
		await writeStore(store);
		return json(store.files[fileName]);
	}

	if (!isValidValidationItem({ questionKey, status, invalidReason })) {
		return json({ error: 'Invalid validation payload' }, { status: 400 });
	}

	if (hasDatabase()) {
		await ensureSchema();
		const client = await getPool().connect();
		try {
			return json(await upsertDbValidation(client, fileName, { questionKey, question, status, invalidReason }));
		} finally {
			client.release();
		}
	}

	const store = await readStore();
	store.files[fileName] = store.files[fileName] || { questions: {} };
	const saved = {
		question: question || questionKey,
		status,
		updatedAt: new Date().toISOString()
	};
	const normalizedReason = normalizeInvalidReason(status, invalidReason);
	if (normalizedReason) saved.invalidReason = normalizedReason;
	store.files[fileName].questions[questionKey] = saved;
	await writeStore(store);

	return json(saved);
}
