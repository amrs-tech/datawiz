<script>
	import { theme } from '$lib/stores/theme.js';
	import { Sun, Moon } from 'lucide-svelte';
</script>

<button
	onclick={() => theme.toggle()}
	class="relative flex items-center justify-center w-10 h-10 rounded-xl glass cursor-pointer
		   transition-all duration-300 hover:scale-105 active:scale-95"
	aria-label="Toggle theme"
>
	{#if $theme === 'dark'}
		<Sun size={18} class="text-amber-400 transition-transform duration-300" />
	{:else}
		<Moon size={18} style="color: var(--color-brand-500);" class="transition-transform duration-300" />
	{/if}
</button>
