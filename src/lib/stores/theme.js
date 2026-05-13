import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createThemeStore() {
	const stored = browser ? localStorage.getItem('datawiz-theme') : null;
	const initial = stored || (browser && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
	const { subscribe, set, update } = writable(initial);

	if (browser) {
		applyTheme(initial);
	}

	function applyTheme(theme) {
		if (!browser) return;
		document.documentElement.classList.toggle('dark', theme === 'dark');
		localStorage.setItem('datawiz-theme', theme);
	}

	return {
		subscribe,
		toggle() {
			update((current) => {
				const next = current === 'dark' ? 'light' : 'dark';
				applyTheme(next);
				return next;
			});
		},
		set(value) {
			applyTheme(value);
			set(value);
		}
	};
}

export const theme = createThemeStore();
