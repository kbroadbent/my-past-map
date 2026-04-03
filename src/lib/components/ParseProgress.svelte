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

<style>
	.parse-progress {
		text-align: center;
		max-width: 400px;
		margin: 32px auto;
		padding: 0 20px;
	}

	.message {
		color: var(--color-brown-dark);
		font-size: 15px;
		margin: 0 0 12px;
		font-weight: 500;
	}

	.track {
		height: 6px;
		background: rgba(0, 0, 0, 0.08);
		border-radius: 3px;
		overflow: hidden;
	}

	.bar {
		height: 100%;
		background: var(--color-gold);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.percent {
		color: #6b5a48;
		font-size: 13px;
		margin: 8px 0 0;
	}
</style>
