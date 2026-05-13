<script>
	import { Upload, FileSpreadsheet, Image as ImageIcon, FolderOpen } from 'lucide-svelte';

	let { onFileSelected, onImageFolderSelected } = $props();
	let dragging = $state(false);
	let fileInput;
	let folderInput;
	let folderName = $state('');

	function handleDrop(e) {
		e.preventDefault();
		dragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file && file.name.endsWith('.csv')) {
			onFileSelected(file);
		}
	}

	function handleDragOver(e) {
		e.preventDefault();
		dragging = true;
	}

	function handleDragLeave() {
		dragging = false;
	}

	function handleFileInput(e) {
		const file = e.target.files?.[0];
		if (file) {
			onFileSelected(file);
		}
	}

	function handleFolderInput(e) {
		const files = Array.from(e.target.files || []);
		if (files.length > 0) {
			const first = files[0].webkitRelativePath || files[0].name;
			folderName = first.includes('/') ? first.split('/')[0] : 'Selected folder';
			onImageFolderSelected?.(files, folderName);
		}
	}
</script>

<div class="flex flex-col items-center justify-center min-h-[60vh] px-6 animate-fade-in">
	<div class="text-center mb-10">
		<h2 class="text-3xl font-bold mb-3" style="color: var(--text-primary);">
			Upload your <span class="gradient-text">CSV Data</span>
		</h2>
		<p class="text-base" style="color: var(--text-secondary);">
			Drag & drop a CSV file or click to browse. We'll auto-detect your columns.
		</p>
		<p class="text-xs mt-2" style="color: var(--text-muted);">
			Optional: choose an image folder if your CSV uses `IMAGE_ID` references.
		</p>
	</div>

	<div class="w-full max-w-lg mb-4">
		<button
			onclick={() => folderInput.click()}
			class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
				   cursor-pointer transition-all duration-200 hover:scale-[1.01]"
			style="background: var(--bg-card); color: var(--text-secondary); border: 1px solid var(--border-color);"
		>
			<FolderOpen size={14} />
			Select Image Folder (Optional)
		</button>
		{#if folderName}
			<p class="mt-2 text-xs flex items-center gap-1.5" style="color: var(--color-brand-400);">
				<ImageIcon size={12} />
				{folderName}
			</p>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative w-full max-w-lg rounded-2xl p-10 text-center cursor-pointer
			   transition-all duration-300 gradient-border
			   {dragging ? 'scale-[1.02]' : 'hover:scale-[1.01]'}"
		style="background: var(--gradient-subtle); border: 2px dashed var(--border-color);
			   {dragging ? 'border-color: var(--color-brand-400); animation: pulse-glow 1.5s ease-in-out infinite;' : ''}"
		ondrop={handleDrop}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		onclick={() => fileInput.click()}
		onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); }}
		role="button"
		tabindex="0"
	>
		<div class="flex flex-col items-center gap-4">
			<div class="flex items-center justify-center w-16 h-16 rounded-2xl transition-transform duration-300
						{dragging ? 'scale-110' : ''}"
				 style="background: var(--gradient-hero);">
				{#if dragging}
					<FileSpreadsheet size={28} class="text-white" />
				{:else}
					<Upload size={28} class="text-white" />
				{/if}
			</div>

			<div>
				<p class="text-lg font-semibold mb-1" style="color: var(--text-primary);">
					{dragging ? 'Drop it here!' : 'Drop CSV file here'}
				</p>
				<p class="text-sm" style="color: var(--text-muted);">
					or click to browse from your computer
				</p>
			</div>

			<div class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
				 style="background: var(--bg-card); color: var(--text-secondary);">
				<FileSpreadsheet size={14} />
				<span>Supports .csv files</span>
			</div>
		</div>
	</div>

	<input
		bind:this={fileInput}
		type="file"
		accept=".csv"
		class="hidden"
		onchange={handleFileInput}
	/>

	<input
		bind:this={folderInput}
		type="file"
		multiple
		webkitdirectory
		directory
		class="hidden"
		onchange={handleFolderInput}
	/>
</div>
