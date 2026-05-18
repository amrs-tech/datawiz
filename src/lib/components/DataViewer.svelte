<script>
	import { LayoutGrid, Table, RotateCcw, RefreshCw, Download, FileSpreadsheet, Search, Settings2, Image as ImageIcon, X } from 'lucide-svelte';
	import CardView from './CardView.svelte';
	import TableView from './TableView.svelte';
	import DetailPanel from './DetailPanel.svelte';
	import ColumnMapper from './ColumnMapper.svelte';
	import { getQuestionKey, getQuestionText } from '$lib/utils/questionUtils.js';

	let { data, headers, mapping, imageMap = {}, imageFolderName = '', viewMode, onViewModeChange, onMappingChange, onReset, fileName } = $props();

	let selectedIndex = $state(-1);
	let searchQuery = $state('');
	let showMapper = $state(false);
	let previewImage = $state({ id: '', url: '' });
	let rowsPerPage = $state(100);
	let currentPage = $state(1);
	let validationState = $state({});
	const pageSizeOptions = [50, 100, 250, 500];

	let safeData = $derived(Array.isArray(data) ? data.filter((row) => row && typeof row === 'object') : []);
	let safeHeaders = $derived(Array.isArray(headers) ? headers : []);
	let safeMapping = $derived(mapping || { question: '', choices: [], answer: '', extra: '', imageIds: '' });

	let filteredData = $derived(
		searchQuery.trim()
			? safeData.filter((row) => {
					const q = searchQuery.toLowerCase();
					return Object.values(row).some((v) => String(v).toLowerCase().includes(q));
				})
			: safeData
	);

	let totalPages = $derived(Math.max(1, Math.ceil(filteredData.length / rowsPerPage)));
	let pageStart = $derived((currentPage - 1) * rowsPerPage);
	let pageEnd = $derived(pageStart + rowsPerPage);
	let pagedData = $derived(filteredData.slice(pageStart, pageEnd));

	$effect(() => {
		searchQuery;
		currentPage = 1;
	});

	$effect(() => {
		if (currentPage > totalPages) currentPage = totalPages;
	});

	$effect(() => {
		safeData;
		safeMapping;
		fileName;
		loadValidationState();
	});

	function handleSelectRow(i) {
		const globalFilteredIndex = pageStart + i;
		const actualIndex = searchQuery.trim()
			? safeData.indexOf(filteredData[globalFilteredIndex])
			: globalFilteredIndex;
		selectedIndex = actualIndex;
	}

	function handleCloseDetail() {
		selectedIndex = -1;
	}

	function handleNavigate(i) {
		if (i >= 0 && i < safeData.length) {
			selectedIndex = i;
		}
	}

	function handleOpenImage(id, url) {
		if (!url) return;
		previewImage = { id, url };
	}

	function handleCloseImage() {
		previewImage = { id: '', url: '' };
	}

	async function loadValidationState() {
		if (!fileName) return;
		try {
			const response = await fetch('/api/question-validations');
			if (!response.ok) {
				applyDefaultValidationState({});
				return;
			}
			const store = await response.json();
			applyDefaultValidationState(store.files?.[fileName]?.questions || {});
		} catch {
			applyDefaultValidationState({});
		}
	}

	function buildDefaultValidationState(savedQuestions) {
		const now = new Date().toISOString();
		const next = { ...savedQuestions };
		const missing = [];
		for (const row of safeData || []) {
			const questionKey = getQuestionKey(row, safeMapping);
			if (!next[questionKey]) {
				const question = getQuestionText(row, safeMapping);
				const item = {
					question: question || questionKey,
					status: 'valid',
					updatedAt: now
				};
				next[questionKey] = item;
				missing.push({ questionKey, ...item });
			}
		}
		return { next, missing };
	}

	function applyDefaultValidationState(savedQuestions) {
		const { next, missing } = buildDefaultValidationState(savedQuestions);
		validationState = next;
		if (missing.length > 0) persistDefaultValidations(missing);
	}

	async function persistDefaultValidations(validations) {
		if (!fileName) return;
		try {
			const response = await fetch('/api/question-validations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileName, validations })
			});
			if (!response.ok) return;
			const fileStore = await response.json();
			validationState = fileStore.questions || validationState;
		} catch {
		}
	}

	async function handleDownloadValidationJson() {
		if (!fileName) return;
		const response = await fetch('/api/question-validations');
		if (!response.ok) return;
		const store = await response.json();
		const fileStore = {
			files: {
				[fileName]: store.files?.[fileName] || { questions: {} }
			}
		};
		const blob = new Blob([`${JSON.stringify(fileStore, null, 2)}\n`], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${fileName.replace(/\.csv$/i, '')}-validations.json`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	async function handleSetValidation(row, status) {
		const questionKey = getQuestionKey(row, safeMapping);
		const question = getQuestionText(row, safeMapping);
		const previous = validationState;
		validationState = {
			...validationState,
			[questionKey]: {
				question: question || questionKey,
				status,
				updatedAt: new Date().toISOString()
			}
		};

		try {
			const response = await fetch('/api/question-validations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ fileName, questionKey, question, status })
			});
			if (!response.ok) {
				validationState = previous;
				return;
			}
			const saved = await response.json();
			validationState = {
				...validationState,
				[questionKey]: saved
			};
		} catch {
			validationState = previous;
		}
	}
</script>

<div class="flex flex-col h-full animate-fade-in">
	<div class="flex flex-wrap items-center gap-3 px-4 py-3"
		 style="border-bottom: 1px solid var(--border-color);">

		<div class="flex items-center gap-2 mr-auto">
			<FileSpreadsheet size={14} style="color: var(--color-brand-400);" />
			<span class="text-sm font-medium" style="color: var(--text-secondary);">
				{fileName}
			</span>
			<span class="text-xs px-2 py-0.5 rounded-full font-mono"
				  style="background: var(--gradient-subtle); color: var(--text-muted); border: 1px solid var(--border-color);">
				{safeData.length} rows
			</span>
			{#if imageFolderName}
				<span class="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1"
					style="background: var(--bg-card); color: var(--color-brand-400); border: 1px solid var(--border-color);">
					<ImageIcon size={11} />
					{imageFolderName}
				</span>
			{/if}
		</div>

		<div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
			 style="background: var(--bg-card); border: 1px solid var(--border-color);">
			<Search size={13} style="color: var(--text-muted);" />
			<input
				bind:value={searchQuery}
				type="text"
				placeholder="Search..."
				class="bg-transparent outline-none text-sm w-36"
				style="color: var(--text-primary);"
			/>
		</div>

		<button
			onclick={loadValidationState}
			class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
				   cursor-pointer transition-all duration-200 hover:scale-105"
			style="background: var(--bg-card); color: var(--color-brand-400); border: 1px solid var(--border-color);"
			title="Sync validation changes"
			aria-label="Sync validation changes"
		>
			<RefreshCw size={13} />
			Sync
		</button>

		<button
			onclick={handleDownloadValidationJson}
			class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
				   cursor-pointer transition-all duration-200 hover:scale-105"
			style="background: var(--bg-card); color: var(--color-brand-400); border: 1px solid var(--border-color);"
			title="Download validation JSON"
			aria-label="Download validation JSON"
		>
			<Download size={13} />
			JSON
		</button>

		<button
			onclick={() => { showMapper = true; }}
			class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
				   cursor-pointer transition-all duration-200 hover:scale-105"
			style="background: var(--gradient-subtle); color: var(--color-brand-400); border: 1px solid var(--border-color);"
		>
			<Settings2 size={13} />
			Columns
		</button>

		<div class="flex items-center rounded-xl overflow-hidden"
			 style="border: 1px solid var(--border-color);">
			<button
				onclick={() => onViewModeChange('card')}
				class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold
					   cursor-pointer transition-all duration-200"
				style="{viewMode === 'card'
					? 'background: var(--gradient-hero); color: white;'
					: 'background: transparent; color: var(--text-muted);'}"
			>
				<LayoutGrid size={13} />
				Cards
			</button>
			<button
				onclick={() => onViewModeChange('table')}
				class="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold
					   cursor-pointer transition-all duration-200"
				style="{viewMode === 'table'
					? 'background: var(--gradient-hero); color: white;'
					: 'background: transparent; color: var(--text-muted);'}"
			>
				<Table size={13} />
				Table
			</button>
		</div>

		<button
			onclick={onReset}
			class="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium
				   cursor-pointer transition-all duration-200 hover:scale-105"
			style="color: var(--text-muted); border: 1px solid var(--border-color);"
		>
			<RotateCcw size={12} />
			Reset
		</button>
	</div>

	<div class="flex-1 overflow-hidden">
		{#if filteredData.length === 0}
			<div class="flex flex-col items-center justify-center h-64 gap-2">
				<Search size={32} style="color: var(--text-muted);" />
				<p class="text-sm" style="color: var(--text-muted);">No results found</p>
			</div>
		{:else if viewMode === 'card'}
			<CardView
				data={filteredData}
				mapping={safeMapping}
				{imageMap}
				{validationState}
				onOpenImage={handleOpenImage}
				onSelectRow={handleSelectRow}
				onSetValidation={handleSetValidation}
			/>
		{:else}
			<TableView data={filteredData} headers={safeHeaders} mapping={safeMapping} onOpenImage={handleOpenImage} onSelectRow={handleSelectRow} />
		{/if}
	</div>

	{#if filteredData.length > 0}
		<div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
			 style="border-top: 1px solid var(--border-color);">
			<div class="text-xs" style="color: var(--text-muted);">
				Showing {pageStart + 1}-{Math.min(pageEnd, filteredData.length)} of {filteredData.length} rows
			</div>

			<div class="flex items-center gap-2">
				<span class="text-xs" style="color: var(--text-muted);">Rows:</span>
				<select
					bind:value={rowsPerPage}
					class="px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
					style="background: var(--bg-card); color: var(--text-primary); border: 1px solid var(--border-color);"
				>
					{#each pageSizeOptions as size}
						<option value={size}>{size}</option>
					{/each}
				</select>

				<button
					onclick={() => currentPage = Math.max(1, currentPage - 1)}
					disabled={currentPage <= 1}
					class="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer
						   disabled:opacity-40 disabled:cursor-not-allowed"
					style="border: 1px solid var(--border-color); color: var(--text-secondary);"
				>
					Prev
				</button>

				<span class="text-xs px-2" style="color: var(--text-muted);">{currentPage} / {totalPages}</span>

				<button
					onclick={() => currentPage = Math.min(totalPages, currentPage + 1)}
					disabled={currentPage >= totalPages}
					class="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer
						   disabled:opacity-40 disabled:cursor-not-allowed"
					style="border: 1px solid var(--border-color); color: var(--text-secondary);"
				>
					Next
				</button>
			</div>
		</div>
	{/if}

	{#if selectedIndex >= 0 && selectedIndex < safeData.length}
		<DetailPanel
			data={safeData}
			mapping={safeMapping}
			{imageMap}
			{selectedIndex}
			onOpenImage={handleOpenImage}
			onClose={handleCloseDetail}
			onNavigate={handleNavigate}
		/>
	{/if}

	{#if previewImage.url}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 z-[120] flex items-center justify-center p-4"
			onclick={handleCloseImage}
			onkeydown={(e) => { if (e.key === 'Escape') handleCloseImage(); }}
			role="dialog"
			aria-modal="true"
			tabindex="-1">
			<div class="absolute inset-0" style="background: rgba(0,0,0,0.7); backdrop-filter: blur(2px);"></div>
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="relative max-w-4xl w-full max-h-[88vh] glass rounded-2xl p-3"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => e.stopPropagation()}>
				<div class="flex items-center justify-between mb-2 px-2">
					<p class="text-sm font-medium" style="color: var(--text-secondary);">{previewImage.id}</p>
					<button
						onclick={handleCloseImage}
						class="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
						style="border: 1px solid var(--border-color); color: var(--text-muted);"
						aria-label="Close image preview"
					>
						<X size={14} />
					</button>
				</div>
				<img src={previewImage.url} alt={previewImage.id} class="w-full h-auto max-h-[78vh] object-contain rounded-xl" />
			</div>
		</div>
	{/if}

	{#if showMapper}
		<ColumnMapper
			headers={safeHeaders}
			mapping={safeMapping}
			{onMappingChange}
			onClose={() => { showMapper = false; }}
		/>
	{/if}
</div>
