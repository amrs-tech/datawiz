export function normalizeText(value) {
	return value == null ? '' : String(value).trim();
}

export function getQuestionText(row, mapping) {
	return normalizeText(row?.[mapping?.question]);
}

export function getQuestionKey(row, mapping) {
	const question = getQuestionText(row, mapping);
	if (question) return question;
	return JSON.stringify(row || {});
}

function isMetadataJsonValue(value) {
	const str = String(value ?? '').trim();
	if (!str.startsWith('{')) return false;
	try {
		const parsed = JSON.parse(str);
		if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return false;
		return Object.values(parsed).some(
			(item) =>
				item &&
				typeof item === 'object' &&
				('score' in item || 'reason' in item || 'rationale' in item || 'explanation' in item)
		);
	} catch {
		return /"?(score|reason|rationale|explanation)"?\s*:/.test(str);
	}
}

export function gatherChoices(row, mapping) {
	const cols = mapping?.choices || [];
	const items = [];
	for (const col of cols) {
		const raw = row?.[col];
		if (!raw) continue;
		const str = String(raw).trim();
		if (isMetadataJsonValue(str)) continue;
		if (str.startsWith('[')) {
			try {
				items.push(...JSON.parse(str.replace(/'/g, '"')));
				continue;
			} catch {
			}
		}
		const separators = [' | ', ' || ', '; ', ', ', '\n'];
		let split = false;
		for (const sep of separators) {
			if (str.includes(sep)) {
				items.push(...str.split(sep).map((s) => s.trim()).filter(Boolean));
				split = true;
				break;
			}
		}
		if (!split && str) items.push(str);
	}

	const seen = new Set();
	return items
		.map((item) => normalizeText(item))
		.filter(Boolean)
		.filter((item) => {
			const key = item.toLowerCase();
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
}

function normalizeComparable(value) {
	return normalizeText(value).toLowerCase().replace(/\s+/g, ' ');
}

function answerTokens(answer) {
	return normalizeText(answer)
		.replace(/\band\b/gi, ',')
		.split(/[;,|/]+/)
		.map((token) => normalizeComparable(token))
		.filter(Boolean);
}

export function isCorrectChoice(choice, answer, index = -1, choices = []) {
	const choiceKey = normalizeComparable(choice);
	const answerKey = normalizeComparable(answer);
	if (!choiceKey || !answerKey) return false;

	const choiceKeys = choices.map((item) => normalizeComparable(item)).filter(Boolean);
	if (choiceKeys.includes(answerKey)) return choiceKey === answerKey;
	if (choiceKey === answerKey) return true;

	const labels = [];
	if (index >= 0) {
		labels.push(String.fromCharCode(97 + index));
		labels.push(String(index + 1));
	}

	const tokens = answerTokens(answer);
	return labels.some((label) => tokens.includes(label)) || tokens.includes(choiceKey);
}

export function uniqueValues(values) {
	const seen = new Set();
	return values.filter((value) => {
		if (!value || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
}
