<script>
	import ThemeToggle from './ThemeToggle.svelte';
	import { Database } from 'lucide-svelte';
</script>

<header class="flex items-center justify-between px-6 py-3 glass sticky top-0 z-50"
		style="border-top: none; border-left: none; border-right: none;">
	<div class="flex items-center gap-3">
		<div class="flex items-center justify-center w-9 h-9 rounded-lg"
			 style="background: var(--gradient-hero);">
			<Database size={18} class="text-white" />
		</div>
		<h1 class="text-xl font-bold tracking-tight">
			<span class="gradient-text">DataWiz</span>
		</h1>
	</div>
	<ThemeToggle />
</header>
