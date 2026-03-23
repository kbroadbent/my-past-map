<script lang="ts">
	let { percent, message }: { percent: number; message: string } = $props();
</script>

<div class="parse-progress" role="status" aria-live="polite">
	<p class="message">{message}</p>
	<div class="track">
		<div class="bar" style="width: {percent}%"></div>
	</div>
	<p class="percent">{Math.round(percent)}%</p>
</div>
