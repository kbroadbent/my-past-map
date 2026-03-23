<script>
	import '../app.css';
</script>

<a class="skip-link" href="#main-content">Skip to main content</a>

<slot />

<style>
	.skip-link {
		position: absolute;
		top: -40px;
		left: 0;
		background: var(--color-gold);
		color: var(--color-brown-dark);
		padding: 8px 16px;
		z-index: 100;
		text-decoration: none;
	}

	.skip-link:focus {
		top: 0;
	}
</style>
