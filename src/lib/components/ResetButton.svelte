<script lang="ts">
	interface Props {
		onReset: () => void;
	}

	let { onReset }: Props = $props();
</script>

<button aria-label="Reset View" onclick={onReset}>Reset View</button>
