<script>
	import { X, RotateCcw, Check } from 'lucide-svelte';
	import { autoDetectMapping } from '$lib/utils/csvParser.js';

	let { headers, mapping, onMappingChange, onClose } = $props();

	let question = $state('');
	let choices = $state([]);
	let answer = $state('');
	let extra = $state('');
	let imageIds = $state('');

	$effect(() => {
		question = mapping.question || '';
		choices = [...(mapping.choices || [])];
		answer = mapping.answer || '';
		extra = mapping.extra || '';
		imageIds = mapping.imageIds || '';
	});

	function usedSingles() {
		return new Set([question, answer, extra, imageIds, ...choices].filter(Boolean));
	}

	function availableForSingle(current) {
		const used = usedSingles();
		return headers.filter((h) => !used.has(h) || h === current);
	}

	function toggleChoice(col) {
		if (choices.includes(col)) {
			choices = choices.filter((c) => c !== col);
		} else {
			choices = [...choices, col];
		}
	}

	function availableChoices() {
		const reserved = new Set([question, answer, extra, imageIds].filter(Boolean));
		return headers.filter((h) => !reserved.has(h));
	}

	function handleAutoDetect() {
		const detected = autoDetectMapping(headers);
		question = detected.question;
		choices = [...detected.choices];
		answer = detected.answer;
		extra = detected.extra;
		imageIds = detected.imageIds || '';
	}

	function handleApply() {
		onMappingChange({ question, choices: [...choices], answer, extra, imageIds });
		onClose();
	}

	let isValid = $derived(question && answer);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-[90] flex items-end sm:items-center justify-center animate-fade-in"
	 onclick={onClose}
	 onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
	 role="dialog"
	 aria-modal="true"
	 tabindex="-1">
	<div class="absolute inset-0" style="background: rgba(0,0,0,0.35); backdrop-filter: blur(4px);"></div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl glass animate-slide-in mx-4"
		 onclick={(e) => e.stopPropagation()}
		 onkeydown={(e) => e.stopPropagation()}>

		<div class="sticky top-0 z-10 flex items-center justify-between px-6 py-4 rounded-t-2xl"
			 style="background: var(--bg-card); border-bottom: 1px solid var(--border-color);">
			<div>
				<h3 class="text-lg font-bold" style="color: var(--text-primary);">
					Column <span class="gradient-text">Mapping</span>
				</h3>
				<p class="text-xs mt-0.5" style="color: var(--text-muted);">
					Assign columns to roles. Changes apply instantly.
				</p>
			</div>
			<div class="flex items-center gap-2">
				<button
					onclick={handleAutoDetect}
					class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
						   cursor-pointer transition-all duration-200 hover:scale-105"
					style="background: var(--gradient-subtle); color: var(--color-brand-400); border: 1px solid var(--border-color);"
				>
					<RotateCcw size={11} />
					Auto
				</button>
				<button
					onclick={onClose}
					class="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer
						   transition-all duration-200 hover:scale-105"
					style="color: var(--text-muted); border: 1px solid var(--border-color);"
					aria-label="Close"
				>
					<X size={14} />
				</button>
			</div>
		</div>

		<div class="px-6 py-5 space-y-5">
			<div>
				<span class="text-xs font-bold uppercase tracking-wider mb-2 block" style="color: var(--text-muted);">
					Question <span class="text-red-400">*</span>
				</span>
				<select
					bind:value={question}
					class="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none
						   cursor-pointer appearance-none"
					style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);"
				>
					<option value="">-- Select column --</option>
					{#each availableForSingle(question) as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>

			<div>
				<span class="text-xs font-bold uppercase tracking-wider mb-2 block" style="color: var(--text-muted);">
					Answer <span class="text-red-400">*</span>
				</span>
				<select
					bind:value={answer}
					class="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none
						   cursor-pointer appearance-none"
					style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);"
				>
					<option value="">-- Select column --</option>
					{#each availableForSingle(answer) as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>

			<div>
				<span class="text-xs font-bold uppercase tracking-wider mb-2 block" style="color: var(--text-muted);">
					Choices columns <span class="text-xs font-normal" style="color: var(--text-muted);">(select multiple)</span>
				</span>
				<div class="flex flex-wrap gap-2">
					{#each availableChoices() as col}
						<button
							onclick={() => toggleChoice(col)}
							class="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer
								   transition-all duration-200 hover:scale-105"
							style="{choices.includes(col)
								? 'background: rgba(124, 58, 237, 0.15); color: var(--color-brand-400); border: 1px solid rgba(124, 58, 237, 0.3);'
								: 'background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-color);'}"
						>
							{#if choices.includes(col)}
								<span class="inline-flex items-center gap-1"><Check size={10} />{col}</span>
							{:else}
								{col}
							{/if}
						</button>
					{/each}
				</div>
				{#if choices.length === 0}
					<p class="text-xs mt-2" style="color: var(--text-muted);">
						No choices columns selected. Click column chips above to add.
					</p>
				{/if}
			</div>

			<div>
				<span class="text-xs font-bold uppercase tracking-wider mb-2 block" style="color: var(--text-muted);">
					Image IDs column
				</span>
				<select
					bind:value={imageIds}
					class="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none
						   cursor-pointer appearance-none"
					style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);"
				>
					<option value="">-- None --</option>
					{#each availableForSingle(imageIds) as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>

			<div>
				<span class="text-xs font-bold uppercase tracking-wider mb-2 block" style="color: var(--text-muted);">
					Extra info column
				</span>
				<select
					bind:value={extra}
					class="w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none
						   cursor-pointer appearance-none"
					style="background: var(--bg-surface); color: var(--text-primary); border: 1px solid var(--border-color);"
				>
					<option value="">-- None --</option>
					{#each availableForSingle(extra) as h}
						<option value={h}>{h}</option>
					{/each}
				</select>
			</div>
		</div>

		<div class="sticky bottom-0 px-6 py-4 rounded-b-2xl"
			 style="background: var(--bg-card); border-top: 1px solid var(--border-color);">
			<button
				onclick={handleApply}
				disabled={!isValid}
				class="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl
					   text-sm font-semibold text-white cursor-pointer
					   transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
					   disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
				style="background: var(--gradient-hero);"
			>
				<Check size={16} />
				Apply Mapping
			</button>
		</div>
	</div>
</div>
