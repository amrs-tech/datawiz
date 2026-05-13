<script>
	import { tabs } from '$lib/stores/tabs.js';
	import { Plus, X } from 'lucide-svelte';
</script>

<div class="flex items-center gap-1 px-4 py-2 overflow-x-auto" style="border-bottom: 1px solid var(--border-color);">
	{#each $tabs.tabs as tab (tab.id)}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onclick={() => tabs.setActive(tab.id)}
			onkeydown={(e) => { if (e.key === 'Enter') tabs.setActive(tab.id); }}
			role="tab"
			tabindex="0"
			aria-selected={$tabs.activeId === tab.id}
			class="group relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
				   transition-all duration-200 cursor-pointer shrink-0 select-none
				   {$tabs.activeId === tab.id ? 'glass' : 'hover:opacity-80'}"
			style="{$tabs.activeId === tab.id
				? 'color: var(--text-primary);'
				: 'color: var(--text-muted); background: transparent;'}"
		>
			<span class="truncate max-w-[120px]">{tab.name}</span>
			{#if tab.phase !== 'upload'}
				<span class="w-1.5 h-1.5 rounded-full shrink-0"
					  style="background: var(--color-accent-400);"></span>
			{/if}
			<button
				onclick={(e) => { e.stopPropagation(); tabs.closeTab(tab.id); }}
				class="opacity-0 group-hover:opacity-100 transition-opacity duration-150
					   flex items-center justify-center w-5 h-5 rounded-md cursor-pointer
					   hover:bg-red-500/20 hover:text-red-400"
				aria-label="Close tab"
			>
				<X size={12} />
			</button>
		</div>
	{/each}

	<button
		onclick={() => tabs.addTab()}
		class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0
			   transition-all duration-200 cursor-pointer hover:scale-105"
		style="color: var(--text-muted); background: transparent;"
		aria-label="New tab"
	>
		<Plus size={16} />
	</button>
</div>
