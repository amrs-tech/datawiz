<script>
	import { Hash, MessageSquare, ListChecks, CheckCircle, Tag, Image as ImageIcon, XCircle } from 'lucide-svelte';
	import { gatherChoices, getQuestionKey } from '$lib/utils/questionUtils.js';

	let { data, mapping, imageMap = {}, validationState = {}, onOpenImage, onSelectRow, onSetValidation } = $props();

	function isCorrectChoice(choice, answer) {
		if (!answer) return false;
		const c = String(choice).toLowerCase().trim();
		const a = String(answer).toLowerCase().trim();
		return c === a || a.includes(c) || c.includes(a);
	}

	function parseImageIds(row) {
		if (!mapping.imageIds) return [];
		const raw = row[mapping.imageIds];
		if (!raw) return [];
		return String(raw)
			.split(',')
			.map((v) => v.trim())
			.filter(Boolean);
	}

	function resolveImage(id) {
		const normalized = String(id || '').trim().replace(/\\/g, '/');
		const fileName = normalized.split('/').pop();
		const base = fileName?.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
		for (const key of [normalized, normalized.toLowerCase(), fileName, fileName?.toLowerCase(), base, base?.toLowerCase()]) {
			if (key && imageMap[key]) return imageMap[key];
		}
		return '';
	}
</script>

<div class="grid gap-4 p-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 overflow-y-auto" style="max-height: calc(100vh - 200px);">
	{#each data as row, i}
		{@const question = row[mapping.question] || ''}
		{@const answer = row[mapping.answer] || ''}
		{@const extra = mapping.extra ? row[mapping.extra] : ''}
		{@const choices = gatherChoices(row, mapping)}
		{@const imageIds = parseImageIds(row)}
		{@const questionKey = getQuestionKey(row, mapping)}
		{@const validation = validationState[questionKey]?.status || ''}

		<div
			onclick={() => onSelectRow(i)}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') onSelectRow(i);
			}}
			role="button"
			tabindex="0"
			class="glass rounded-2xl p-5 text-left cursor-pointer
				   transition-all duration-200 hover:scale-[1.01] hover:shadow-lg
				   animate-fade-in group"
			style="animation-delay: {Math.min(i * 30, 300)}ms;"
		>
			<div class="flex items-start justify-between mb-3">
				<span class="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
					  style="background: var(--gradient-hero); color: white;">
					<Hash size={10} />
					{i + 1}
				</span>
				{#if extra}
					<span class="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
						  style="background: var(--gradient-subtle); color: var(--color-brand-400); border: 1px solid var(--border-color);">
						<Tag size={10} />
						{extra}
					</span>
				{/if}
			</div>

			<div class="flex items-start gap-2 mb-4">
				<MessageSquare size={14} class="shrink-0 mt-0.5" style="color: var(--color-brand-400);" />
				<p class="text-sm font-medium leading-relaxed line-clamp-3" style="color: var(--text-primary);">
					{question || (imageIds.length > 0 ? 'Image question' : '')}
				</p>
			</div>

			{#if imageIds.some((id) => resolveImage(id))}
				<div class="grid grid-cols-2 gap-2 mb-3">
					{#each imageIds as id}
						{@const imgUrl = resolveImage(id)}
						{#if imgUrl}
							<button
								onclick={(e) => {
									e.stopPropagation();
									onOpenImage?.(id, imgUrl);
								}}
								class="overflow-hidden rounded-xl cursor-pointer"
								style="border: 1px solid var(--border-color); background: var(--bg-card);"
							>
								<img src={imgUrl} alt={id} class="w-full h-28 object-contain" loading="lazy" />
							</button>
						{/if}
					{/each}
				</div>
			{/if}

			{#if choices.length > 0}
				<div class="flex flex-wrap gap-1.5 mb-3">
					{#each choices as choice}
						<span
							class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium
								   transition-colors duration-200"
							style="{isCorrectChoice(choice, answer)
								? 'background: rgba(16, 185, 129, 0.15); color: var(--color-accent-500); border: 1px solid rgba(16, 185, 129, 0.3);'
								: 'background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-color);'}"
						>
							{#if isCorrectChoice(choice, answer)}
								<CheckCircle size={10} />
							{/if}
							{choice}
						</span>
					{/each}
				</div>
			{/if}

			{#if imageIds.length > 0}
				<div class="flex flex-wrap items-center gap-1.5 mb-3">
					<ImageIcon size={11} style="color: var(--color-brand-400);" />
					{#each imageIds as id}
						{@const imgUrl = resolveImage(id)}
						<button
							onclick={(e) => {
								e.stopPropagation();
								onOpenImage?.(id, imgUrl);
							}}
							disabled={!imgUrl}
							class="px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer
								   disabled:opacity-40 disabled:cursor-not-allowed"
							style="background: var(--bg-card); color: var(--color-brand-400); border: 1px solid var(--border-color);"
						>
							{id}
						</button>
					{/each}
				</div>
			{/if}

			<div class="flex items-center gap-1.5 pt-3" style="border-top: 1px solid var(--border-color);">
				<ListChecks size={12} style="color: var(--color-accent-500);" />
				<span class="text-xs font-semibold" style="color: var(--color-accent-500);">
					{answer}
				</span>
			</div>

			<div class="grid grid-cols-2 gap-2 mt-3">
				<button
					onclick={(e) => {
						e.stopPropagation();
						onSetValidation?.(row, 'valid');
					}}
					class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
					style="{validation === 'valid'
						? 'background: rgba(16, 185, 129, 0.16); color: var(--color-accent-500); border: 1px solid rgba(16, 185, 129, 0.35);'
						: 'background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-color);'}"
				>
					<CheckCircle size={13} />
					Valid
				</button>
				<button
					onclick={(e) => {
						e.stopPropagation();
						onSetValidation?.(row, 'invalid');
					}}
					class="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 hover:scale-[1.02]"
					style="{validation === 'invalid'
						? 'background: rgba(239, 68, 68, 0.14); color: rgb(248, 113, 113); border: 1px solid rgba(239, 68, 68, 0.35);'
						: 'background: var(--bg-surface); color: var(--text-secondary); border: 1px solid var(--border-color);'}"
				>
					<XCircle size={13} />
					Invalid
				</button>
			</div>
		</div>
	{/each}
</div>
