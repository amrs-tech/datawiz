<script>
	import { CheckCircle, Image as ImageIcon } from 'lucide-svelte';
	import { uniqueValues } from '$lib/utils/questionUtils.js';

	let { data, mapping, imageMap = {}, onOpenImage, onSelectRow } = $props();

	let displayCols = $derived(
		uniqueValues([mapping.question, ...(mapping.choices || []), mapping.answer, mapping.imageIds, mapping.extra])
	);

	function isAnswerCol(col) {
		return col === mapping.answer;
	}

	function isChoiceCol(col) {
		return (mapping.choices || []).includes(col);
	}

	function isImageCol(col) {
		return col === mapping.imageIds;
	}

	function parseImageIds(raw) {
		if (!raw) return [];
		return String(raw)
			.split(',')
			.map((v) => v.trim())
			.filter(Boolean);
	}

	function resolveImage(id) {
		return imageMap[id] || imageMap[id?.toLowerCase?.()] || '';
	}
</script>

<div class="overflow-auto rounded-xl mx-4 my-4 glass" style="max-height: calc(100vh - 200px);">
	<table class="w-full text-sm border-collapse">
		<thead>
			<tr>
				<th class="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap"
					style="background: var(--bg-surface); color: var(--text-muted); border-bottom: 2px solid var(--border-color);">
					#
				</th>
				{#each displayCols as col}
					<th class="sticky top-0 z-10 px-4 py-3 text-left text-xs font-bold uppercase tracking-wider whitespace-nowrap"
						style="background: var(--bg-surface); color: var(--text-muted); border-bottom: 2px solid var(--border-color);">
						{#if isAnswerCol(col)}
							<span class="flex items-center gap-1">
								<CheckCircle size={12} style="color: var(--color-accent-500);" />
								{col}
							</span>
						{:else if isImageCol(col)}
							<span class="flex items-center gap-1">
								<ImageIcon size={12} style="color: var(--color-brand-400);" />
								{col}
							</span>
						{:else}
							{col}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data as row, i}
				<tr
					onclick={() => onSelectRow(i)}
					class="cursor-pointer transition-all duration-150 table-row-hover"
					style="border-bottom: 1px solid var(--border-color); {i % 2 === 0 ? '' : 'background: var(--gradient-subtle);'}"
				>
					<td class="px-4 py-3 font-mono text-xs font-bold" style="color: var(--text-muted);">
						{i + 1}
					</td>
					{#each displayCols as col}
						<td class="px-4 py-3 max-w-xs"
							style="{isAnswerCol(col)
								? 'color: var(--color-accent-500); font-weight: 600;'
								: 'color: var(--text-primary);'}">
							{#if isImageCol(col)}
								<div class="flex flex-wrap gap-1">
									{#each parseImageIds(row[col]) as id}
										{@const imgUrl = resolveImage(id)}
										<button
											onclick={(e) => {
												e.stopPropagation();
												onOpenImage?.(id, imgUrl);
											}}
											disabled={!imgUrl}
											class="px-1.5 py-0.5 rounded text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
											style="border: 1px solid var(--border-color); color: var(--color-brand-400);"
										>
											{id}
										</button>
									{/each}
								</div>
							{:else}
								<span class="line-clamp-2">{row[col] || ''}</span>
							{/if}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
