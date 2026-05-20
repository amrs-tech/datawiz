<script>
	import katex from 'katex';
	import 'katex/dist/katex.min.css';

	let { value = '', class: className = '', style: styleValue = '', inline = true } = $props();

	function escapeHtml(text) {
		return String(text ?? '')
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#039;');
	}

	function renderLatex(source, displayMode) {
		try {
			return katex.renderToString(source, {
				displayMode,
				throwOnError: false,
				strict: false,
				trust: false
			});
		} catch {
			return escapeHtml(source);
		}
	}

	function normalizeInput(text) {
		return String(text ?? '')
			.replaceAll('\\\\(', '\\(')
			.replaceAll('\\\\)', '\\)')
			.replaceAll('\\\\[', '\\[')
			.replaceAll('\\\\]', '\\]')
			.replaceAll('\\u005c', '\\');
	}

	function looksLikeLatex(text) {
		return /\\(?:frac|sqrt|sum|int|lim|text|mathrm|mathbf|alpha|beta|gamma|delta|theta|lambda|mu|pi|sigma|omega|times|div|leq|geq|neq|approx|infty|cdot|left|right|overline|underline|hat|bar|vec|partial|nabla|begin|end)\b|[_^]\s*\{/.test(text);
	}

	function renderText(text) {
		const input = normalizeInput(text);
		if (!input) return '';
		if (!/(\$\$|\\\[|\\\]|\$|\\\(|\\\))/.test(input) && looksLikeLatex(input)) {
			return renderLatex(input.trim(), false);
		}
		const parts = [];
		const pattern = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|(?<!\\)\$(?!\s)(?:\\.|[^$\\\n])+?(?<!\\)\$)/g;
		let lastIndex = 0;
		for (const match of input.matchAll(pattern)) {
			if (match.index > lastIndex) parts.push(escapeHtml(input.slice(lastIndex, match.index)));
			const token = match[0];
			let expression = token;
			let displayMode = false;
			if (token.startsWith('$$') && token.endsWith('$$')) {
				expression = token.slice(2, -2);
				displayMode = true;
			} else if (token.startsWith('\\[') && token.endsWith('\\]')) {
				expression = token.slice(2, -2);
				displayMode = true;
			} else if (token.startsWith('\\(') && token.endsWith('\\)')) {
				expression = token.slice(2, -2);
			} else if (token.startsWith('$') && token.endsWith('$')) {
				expression = token.slice(1, -1);
			}
			parts.push(renderLatex(expression.trim(), displayMode));
			lastIndex = match.index + token.length;
		}
		if (lastIndex < input.length) parts.push(escapeHtml(input.slice(lastIndex)));
		const output = parts.join('');
		return output || escapeHtml(input);
	}

	let rendered = $derived(renderText(value));
</script>

{#if inline}
	<span class={className} style={styleValue}>{@html rendered}</span>
{:else}
	<div class={className} style={styleValue}>{@html rendered}</div>
{/if}
