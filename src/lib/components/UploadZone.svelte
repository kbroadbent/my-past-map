<script lang="ts">
	import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '$lib/constants.js';

	let { onFileSelected, error: externalError = '' }: { onFileSelected: (file: File) => void; error?: string } = $props();

	let internalError = $state('');
	let inputEl: HTMLInputElement | undefined = $state();
	let isDragging = $state(false);

	function handleChange(e: Event) {
		internalError = '';
		const input = e.target as HTMLInputElement;
		const file = input?.files?.[0];
		if (!file) return;

		if (!file.name.endsWith('.ged')) {
			internalError = "This doesn't appear to be a valid GEDCOM file. Please select a .ged file.";
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			internalError = `File exceeds ${MAX_FILE_SIZE_MB} MB limit. Try exporting fewer generations.`;
			return;
		}

		onFileSelected(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) {
			if (!file.name.endsWith('.ged')) {
				internalError = "This doesn't appear to be a valid GEDCOM file. Please select a .ged file.";
				return;
			}
			if (file.size > MAX_FILE_SIZE_BYTES) {
				internalError = `File exceeds ${MAX_FILE_SIZE_MB} MB limit. Try exporting fewer generations.`;
				return;
			}
			internalError = '';
			onFileSelected(file);
		}
	}

	function handleClick() {
		inputEl?.click();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			inputEl?.click();
		}
	}

	let errorMessage = $derived(externalError || internalError);
</script>

<div
	class="upload-zone"
	class:dragging={isDragging}
	role="button"
	aria-label="Upload GEDCOM file"
	tabindex="0"
	onclick={handleClick}
	onkeydown={handleKeydown}
	ondragover={(e) => { e.preventDefault(); isDragging = true; }}
	ondragleave={() => isDragging = false}
	ondrop={handleDrop}
>
	<div class="upload-icon" aria-hidden="true">&#x1f4c2;</div>
	<p class="primary">Drop your GEDCOM file here</p>
	<p class="secondary">or click to browse</p>
	<p class="formats">.ged files from FamilySearch, Ancestry, MyHeritage, Gramps, etc.</p>

	<input
		bind:this={inputEl}
		type="file"
		accept=".ged"
		class="visually-hidden"
		onchange={handleChange}
		aria-hidden="true"
	/>

	{#if errorMessage}
		<p role="alert" class="error">{errorMessage}</p>
	{/if}
</div>

<style>
	.upload-zone {
		border: 2px dashed var(--color-gold);
		border-radius: 12px;
		padding: 40px;
		text-align: center;
		background: rgba(184, 134, 11, 0.04);
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s;
		max-width: 480px;
		margin: 0 auto;
	}

	.upload-zone:hover,
	.upload-zone.dragging {
		background: rgba(184, 134, 11, 0.1);
		border-color: #a07008;
	}

	.upload-zone:focus-visible {
		outline: 2px solid var(--color-gold);
		outline-offset: 2px;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
	}

	.upload-icon {
		font-size: 40px;
		margin-bottom: 12px;
	}

	.primary {
		color: var(--color-brown-dark);
		font-size: 16px;
		font-weight: 600;
		margin: 0;
	}

	.secondary {
		color: #6b5a48;
		font-size: 14px;
		margin: 8px 0 0;
	}

	.formats {
		color: #8a7a68;
		font-size: 12px;
		margin: 16px 0 0;
	}

	.error {
		color: #c75643;
		font-size: 14px;
		margin: 16px 0 0;
		font-weight: 500;
	}
</style>
