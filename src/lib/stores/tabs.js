import { writable, get } from 'svelte/store';

let nextId = 1;

function createTab(name = 'New Tab') {
	return {
		id: nextId++,
		name,
		phase: 'upload',
		file: null,
		rawData: [],
		headers: [],
		mapping: { question: '', choices: [], answer: '', extra: '', imageIds: '' },
		imageFolderName: '',
		imageMap: {},
		viewMode: 'card',
		scrollPos: 0
	};
}

function createTabsStore() {
	const initial = [createTab('Tab 1')];
	const { subscribe, set, update } = writable({ tabs: initial, activeId: initial[0].id });

	return {
		subscribe,
		addTab() {
			update((state) => {
				const tab = createTab(`Tab ${nextId}`);
				return { tabs: [...state.tabs, tab], activeId: tab.id };
			});
		},
		closeTab(id) {
			update((state) => {
				if (state.tabs.length === 1) {
					const tab = createTab('Tab 1');
					return { tabs: [tab], activeId: tab.id };
				}
				const idx = state.tabs.findIndex((t) => t.id === id);
				const newTabs = state.tabs.filter((t) => t.id !== id);
				let newActiveId = state.activeId;
				if (state.activeId === id) {
					newActiveId = newTabs[Math.min(idx, newTabs.length - 1)].id;
				}
				return { tabs: newTabs, activeId: newActiveId };
			});
		},
		setActive(id) {
			update((state) => ({ ...state, activeId: id }));
		},
		updateTab(id, changes) {
			update((state) => ({
				...state,
				tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...changes } : t))
			}));
		},
		resetTab(id) {
			update((state) => ({
				...state,
				tabs: state.tabs.map((t) =>
					t.id === id
						? {
								...t,
								phase: 'upload',
								file: null,
								rawData: [],
								headers: [],
								mapping: { question: '', choices: [], answer: '', extra: '', imageIds: '' },
								imageFolderName: '',
								imageMap: {},
								viewMode: 'card',
								scrollPos: 0
							}
						: t
				)
			}));
		},
		getActive() {
			const state = get({ subscribe });
			return state.tabs.find((t) => t.id === state.activeId);
		}
	};
}

export const tabs = createTabsStore();
