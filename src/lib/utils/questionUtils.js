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

export function gatherChoices(row, mapping) {
	const cols = mapping?.choices || [];
	const items = [];
	for (const col of cols) {
		const raw = row?.[col];
		if (!raw) continue;
		const str = String(raw).trim();
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

export function uniqueValues(values) {
	const seen = new Set();
	return values.filter((value) => {
		if (!value || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
}
