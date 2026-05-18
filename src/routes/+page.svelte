<script>
	import { tabs } from '$lib/stores/tabs.js';
	import { parseCSV } from '$lib/utils/csvParser.js';
	import Header from '$lib/components/Header.svelte';
	import TabBar from '$lib/components/TabBar.svelte';
	import UploadZone from '$lib/components/UploadZone.svelte';
	import DataViewer from '$lib/components/DataViewer.svelte';

	let loading = $state(false);
	let error = $state('');
	let parseProgress = $state({ percent: 0, rows: 0 });

	let storeVal = $derived($tabs);
	let activeTab = $derived(storeVal.tabs.find((t) => t.id === storeVal.activeId));

	async function handleFileSelected(file) {
		loading = true;
		error = '';
		parseProgress = { percent: 0, rows: 0 };
		try {
			const { headers, data, mapping } = await parseCSV(file, (progress) => {
				parseProgress = progress;
			});
			tabs.updateTab(storeVal.activeId, {
				name: file.name.replace('.csv', ''),
				file: file.name,
				headers,
				rawData: data,
				mapping,
				phase: 'viewing'
			});
		} catch (e) {
			error = e.message || 'Failed to parse CSV file';
		} finally {
			loading = false;
		}
	}

	function buildImageMap(files) {
		const map = {};
		const imageExtensions = /\.(png|jpe?g|gif|webp|bmp|svg|tiff?|ico|heic|heif)$/i;
		function addImageKey(key, url) {
			if (!key) return;
			const normalized = String(key).replace(/\\/g, '/');
			const fileName = normalized.split('/').pop();
			const base = fileName?.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
			for (const value of [normalized, fileName, base]) {
				if (!value) continue;
				map[value] = url;
				map[value.toLowerCase()] = url;
			}
		}

		for (const file of files) {
			if (!file.type?.startsWith('image/') && !imageExtensions.test(file.name)) continue;
			const url = URL.createObjectURL(file);
			addImageKey(file.name, url);
			addImageKey(file.webkitRelativePath, url);
		}
		return map;
	}

	function handleImageFolderSelected(files, folderName) {
		const imageMap = buildImageMap(files || []);
		tabs.updateTab(storeVal.activeId, {
			imageFolderName: folderName || '',
			imageMap
		});
	}

	function handleMappingChange(newMapping) {
		tabs.updateTab(storeVal.activeId, { mapping: newMapping });
	}

	function handleReset() {
		tabs.resetTab(storeVal.activeId);
		error = '';
	}

	function handleViewModeChange(mode) {
		tabs.updateTab(storeVal.activeId, { viewMode: mode });
	}
</script>

<svelte:head>
	<title>DataWiz — CSV Quiz Viewer</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
</svelte:head>

<div class="flex flex-col h-screen overflow-hidden">
	<Header />
	<TabBar />

	<main class="flex-1 overflow-hidden">
		{#if loading}
			<div class="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
				<div class="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin"
					 style="border-color: var(--color-brand-400); border-top-color: transparent;"></div>
				<p class="text-sm font-medium" style="color: var(--text-secondary);">Parsing your file... {parseProgress.percent}%</p>
				<p class="text-xs" style="color: var(--text-muted);">{parseProgress.rows} rows parsed</p>
			</div>
		{:else if error}
			<div class="flex flex-col items-center justify-center h-full gap-4 animate-fade-in">
				<div class="glass rounded-2xl px-6 py-4 max-w-sm text-center">
					<p class="text-sm font-medium text-red-400 mb-3">{error}</p>
					<button
						onclick={handleReset}
						class="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
						style="background: var(--gradient-hero); color: white;"
					>
						Try Again
					</button>
				</div>
			</div>
		{:else if activeTab?.phase === 'upload'}
			<UploadZone
				onFileSelected={handleFileSelected}
				onImageFolderSelected={handleImageFolderSelected}
			/>
		{:else if activeTab?.phase === 'viewing'}
			<DataViewer
				data={activeTab.rawData}
				headers={activeTab.headers}
				mapping={activeTab.mapping}
				imageMap={activeTab.imageMap}
				imageFolderName={activeTab.imageFolderName}
				viewMode={activeTab.viewMode}
				onViewModeChange={handleViewModeChange}
				onMappingChange={handleMappingChange}
				onReset={handleReset}
				fileName={activeTab.file}
			/>
		{/if}
	</main>
</div>
