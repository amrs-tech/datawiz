import Papa from 'papaparse';

const QUESTION_PATTERNS = ['question', 'query', 'prompt', 'item', 'stem', 'text', 'caption', 'description', 'q'];
const CHOICES_PATTERNS = ['choices', 'options', 'alternatives', 'answers_list', 'option', 'choice'];
const ANSWER_PATTERNS = ['answer', 'correct', 'correct_answer', 'solution', 'key', 'right_answer'];
const IMAGE_PATTERNS = ['image_id', 'imageid', 'img_id', 'imgid', 'images', 'image'];

function normalizeHeaderValue(header, index) {
	const value = header == null ? '' : String(header).trim();
	return value || `Column ${index + 1}`;
}

function normalizeHeaders(headers) {
	const seen = new Map();
	return headers.map((header, index) => {
		const base = normalizeHeaderValue(header, index);
		const count = seen.get(base) || 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base}_${count + 1}`;
	});
}

function normalizeRows(rows, originalHeaders, headers) {
	return rows.map((row) => {
		const source = row && typeof row === 'object' ? row : {};
		const normalized = {};
		for (let i = 0; i < headers.length; i += 1) {
			const original = originalHeaders[i];
			const originalKey = original == null ? '' : String(original);
			const trimmedKey = originalKey.trim();
			const normalizedKey = headers[i];
			if (Object.prototype.hasOwnProperty.call(source, original)) {
				normalized[normalizedKey] = source[original];
			} else if (Object.prototype.hasOwnProperty.call(source, originalKey)) {
				normalized[normalizedKey] = source[originalKey];
			} else if (Object.prototype.hasOwnProperty.call(source, trimmedKey)) {
				normalized[normalizedKey] = source[trimmedKey];
			} else {
				normalized[normalizedKey] = '';
			}
		}
		return normalized;
	});
}

function fuzzyMatch(header, patterns) {
	const h = String(header ?? '').toLowerCase().trim().replace(/[_\-\s]+/g, '');
	return patterns.some((p) => h === p.replace(/[_\-\s]+/g, '') || h.includes(p.replace(/[_\-\s]+/g, '')));
}

export function autoDetectMapping(headers) {
	headers = normalizeHeaders(Array.isArray(headers) ? headers : []);
	const mapping = { question: '', choices: [], answer: '', extra: '', imageIds: '' };

	for (const h of headers) {
		if (!mapping.question && fuzzyMatch(h, QUESTION_PATTERNS)) mapping.question = h;
		else if (fuzzyMatch(h, CHOICES_PATTERNS)) mapping.choices.push(h);
		else if (!mapping.answer && fuzzyMatch(h, ANSWER_PATTERNS)) mapping.answer = h;
		else if (!mapping.imageIds && fuzzyMatch(h, IMAGE_PATTERNS)) mapping.imageIds = h;
	}

	const used = new Set([mapping.question, ...mapping.choices, mapping.answer, mapping.imageIds]);
	const remaining = headers.filter((h) => !used.has(h));
	if (remaining.length > 0) mapping.extra = remaining[0];

	return mapping;
}

function processResults(results) {
	const originalHeaders = results.meta.fields || [];
	const headers = normalizeHeaders(originalHeaders);
	const headersChanged = headers.some((header, index) => header !== originalHeaders[index]);
	const rows = (results.data || []).filter((row) => row && typeof row === 'object');
	const data = headersChanged ? normalizeRows(rows, originalHeaders, headers) : rows;

	if (results.errors.length > 0 && data.length === 0) {
		throw new Error(results.errors[0].message);
	}

	const mapping = autoDetectMapping(headers);
	return { headers, data, mapping };
}

function parseCSVText(text) {
	const results = Papa.parse(text, {
		header: true,
		skipEmptyLines: true,
		dynamicTyping: false
	});
	return processResults(results);
}

export function parseCSV(file, onProgress) {
	return new Promise((resolve, reject) => {
		onProgress?.({ percent: 0, rows: 0 });
		let settled = false;

		Papa.parse(file, {
			worker: true,
			header: true,
			skipEmptyLines: true,
			dynamicTyping: false,
			async complete(results) {
				try {
					let parsed = processResults(results);
					if (parsed.data.length === 0 && file?.text) {
						parsed = parseCSVText(await file.text());
					}
					settled = true;
					const { headers, data, mapping } = parsed;
					onProgress?.({ percent: 100, rows: data.length });
					resolve({ headers, data, mapping });
				} catch (err) {
					settled = true;
					reject(err instanceof Error ? err : new Error('Failed to process parsed CSV'));
				}
			},
			error(err) {
				if (settled) return;
				settled = true;
				reject(err);
			}
		});
	});
}
