<script lang="ts">
	import { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES } from '$lib/constants.js';

	let { onFileSelected, error: externalError = '' }: { onFileSelected: (file: File) => void; error?: string } = $props();

	let internalError = $state('');
	let inputEl: HTMLInputElement | undefined = $state();

	function handleChange(e: Event) {
		internalError = '';
		const input = e.target as HTMLInputElement;
		const file = input?.files?.[0];
		if (!file) return;

		if (!file.name.endsWith('.ged')) {
			internalError = 'Please select a .ged file';
			return;
		}

		if (file.size > MAX_FILE_SIZE_BYTES) {
			internalError = `File must be under ${MAX_FILE_SIZE_MB} MB`;
			return;
		}

		onFileSelected(file);
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
	role="button"
	aria-label="Upload GEDCOM file"
	tabindex="0"
	onclick={handleClick}
	onkeydown={handleKeydown}
>
	<p class="primary">Drop your GEDCOM file here</p>
	<p class="secondary">or click to browse</p>
	<p class="hints">Supports exports from FamilySearch, Ancestry, MyHeritage, Gramps & more</p>

	<input
		bind:this={inputEl}
		type="file"
		accept=".ged"
		style="display: none"
		onchange={handleChange}
	/>

	{#if errorMessage}
		<p role="alert" class="error">{errorMessage}</p>
	{/if}
</div>
