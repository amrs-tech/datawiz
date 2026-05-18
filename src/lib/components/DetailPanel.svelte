<script>
	import { X, Hash, MessageSquare, ListChecks, CheckCircle, Tag, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-svelte';
	import { gatherChoices } from '$lib/utils/questionUtils.js';

	let { data, mapping, imageMap = {}, selectedIndex, onOpenImage, onClose, onNavigate } = $props();

	let row = $derived(data[selectedIndex] || {});
	let question = $derived(row[mapping.question] || '');
	let answer = $derived(row[mapping.answer] || '');
	let extra = $derived(mapping.extra ? row[mapping.extra] : '');

	function isCorrectChoice(choice, ans) {
		if (!ans) return false;
		const c = String(choice).toLowerCase().trim();
		const a = String(ans).toLowerCase().trim();
		return c === a || a.includes(c) || c.includes(a);
	}

	let choices = $derived(gatherChoices(row, mapping));

	function parseImageIds(r) {
		if (!mapping.imageIds) return [];
		const raw = r[mapping.imageIds];
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

	let imageIds = $derived(parseImageIds(row));

	function handleKeydown(e) {
		if (e.key === 'Escape') onClose();
		if (e.key === 'ArrowLeft' && selectedIndex > 0) onNavigate(selectedIndex - 1);
		if (e.key === 'ArrowRight' && selectedIndex < data.length - 1) onNavigate(selectedIndex + 1);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-[100] flex items-center justify-end animate-fade-in"
	 onclick={onClose}
	 onkeydown={(e) => { if (e.key === 'Escape') onClose(); }}
	 role="dialog"
	 aria-modal="true"
	 tabindex="-1">
	<div class="absolute inset-0" style="background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);"></div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="relative w-full max-w-lg h-full overflow-y-auto animate-slide-in"
		 style="background: var(--bg-surface);"
		 onclick={(e) => e.stopPropagation()}
		 onkeydown={(e) => e.stopPropagation()}>

		<div class="sticky top-0 z-10 flex items-center justify-between px-6 py-4"
			 style="background: var(--bg-surface); border-bottom: 1px solid var(--border-color);">
			<div class="flex items-center gap-3">
				<span class="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
					  style="background: var(--gradient-hero); color: white;">
					<Hash size={10} />
					{selectedIndex + 1} / {data.length}
				</span>
				{#if extra}
					<span class="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
						  style="background: var(--gradient-subtle); color: var(--color-brand-400); border: 1px solid var(--border-color);">
						<Tag size={10} />
						{mapping.extra}
					</span>
				{/if}
			</div>
			<button
				onclick={onClose}
				class="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer
					   transition-all duration-200 hover:scale-105"
				style="color: var(--text-muted); border: 1px solid var(--border-color);"
				aria-label="Close panel"
			>
				<X size={16} />
			</button>
		</div>

		<div class="px-6 py-6 space-y-6">
			{#if extra}
				<div class="glass rounded-xl px-4 py-3">
					<p class="text-xs font-semibold uppercase tracking-wider mb-1" style="color: var(--text-muted);">
						{mapping.extra}
					</p>
					<p class="text-sm font-medium" style="color: var(--color-brand-400);">
						{extra}
					</p>
				</div>
			{/if}

			{#if imageIds.length > 0}
				<div class="glass rounded-xl px-4 py-3">
					<div class="flex items-center gap-2 mb-2">
						<ImageIcon size={14} style="color: var(--color-brand-400);" />
						<span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">
							Images
						</span>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each imageIds as id}
							{@const imgUrl = resolveImage(id)}
							<button
								onclick={() => onOpenImage?.(id, imgUrl)}
								disabled={!imgUrl}
								class="px-2.5 py-1 rounded-md text-xs font-medium cursor-pointer
									   disabled:opacity-40 disabled:cursor-not-allowed"
								style="background: var(--bg-card); color: var(--color-brand-400); border: 1px solid var(--border-color);"
							>
								{id}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<div>
				<div class="flex items-center gap-2 mb-3">
					<MessageSquare size={16} style="color: var(--color-brand-400);" />
					<span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">
						Question
					</span>
				</div>
				<p class="text-base leading-relaxed" style="color: var(--text-primary);">
					{question || (imageIds.length > 0 ? 'Image question' : '')}
				</p>
			</div>

			{#if imageIds.some((id) => resolveImage(id))}
				<div class="grid grid-cols-1 gap-3">
					{#each imageIds as id}
						{@const imgUrl = resolveImage(id)}
						{#if imgUrl}
							<button
								onclick={() => onOpenImage?.(id, imgUrl)}
								class="overflow-hidden rounded-xl cursor-pointer"
								style="border: 1px solid var(--border-color); background: var(--bg-card);"
							>
								<img src={imgUrl} alt={id} class="w-full max-h-80 object-contain" loading="lazy" />
							</button>
						{/if}
					{/each}
				</div>
			{/if}

			{#if choices.length > 0}
				<div>
					<div class="flex items-center gap-2 mb-3">
						<ListChecks size={16} style="color: var(--text-secondary);" />
						<span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">
							Choices
						</span>
					</div>
					<div class="space-y-2">
						{#each choices as choice, ci}
							{@const correct = isCorrectChoice(choice, answer)}
							<div class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
								 style="{correct
									? 'background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3);'
									: 'background: var(--bg-card); border: 1px solid var(--border-color);'}">
								<span class="flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0"
									  style="{correct
										? 'background: var(--color-accent-500); color: white;'
										: 'background: var(--gradient-subtle); color: var(--text-muted); border: 1px solid var(--border-color);'}">
									{#if correct}
										<CheckCircle size={14} />
									{:else}
										{String.fromCharCode(65 + ci)}
									{/if}
								</span>
								<span class="text-sm" style="color: {correct ? 'var(--color-accent-500)' : 'var(--text-primary)'}; font-weight: {correct ? '600' : '400'};">
									{choice}
								</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<div class="glass rounded-xl px-4 py-3">
				<div class="flex items-center gap-2 mb-1">
					<CheckCircle size={14} style="color: var(--color-accent-500);" />
					<span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">
						Correct Answer
					</span>
				</div>
				<p class="text-base font-semibold" style="color: var(--color-accent-500);">
					{answer}
				</p>
			</div>
		</div>

		<div class="sticky bottom-0 flex items-center justify-between px-6 py-4"
			 style="background: var(--bg-surface); border-top: 1px solid var(--border-color);">
			<button
				onclick={() => onNavigate(selectedIndex - 1)}
				disabled={selectedIndex <= 0}
				class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
					   cursor-pointer transition-all duration-200 hover:scale-105
					   disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
				style="color: var(--text-secondary); border: 1px solid var(--border-color);"
			>
				<ChevronLeft size={14} />
				Previous
			</button>
			<button
				onclick={() => onNavigate(selectedIndex + 1)}
				disabled={selectedIndex >= data.length - 1}
				class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium
					   cursor-pointer transition-all duration-200 hover:scale-105
					   disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
				style="background: var(--gradient-hero); color: white;"
			>
				Next
				<ChevronRight size={14} />
			</button>
		</div>
	</div>
</div>
