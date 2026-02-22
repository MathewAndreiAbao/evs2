<script lang="ts">
	import "../app.css";
	import Toast from "$lib/components/Toast.svelte";
	import { initAuth } from "$lib/utils/auth";
	import { initOfflineSync } from "$lib/utils/offline";
	import { onMount } from "svelte";

	let { children } = $props();

	onMount(async () => {
		// Initialize auth first
		try {
			await initAuth();
		} catch (err) {
			console.error('[v0] Failed to initialize auth:', err);
		}
		
		// Then initialize offline sync
		initOfflineSync();

		// Defer service worker registration to prevent interference with auth
		// Use a longer timeout to ensure auth is fully initialized
		setTimeout(() => {
			if ("serviceWorker" in navigator && import.meta.env.PROD) {
				try {
					navigator.serviceWorker.register("/service-worker.js").then(
						(registration) => {
							console.log("Service Worker registered:", registration);
						},
						(error) => {
							console.error("Service Worker registration failed:", error);
						}
					);
				} catch (error) {
					console.error("Service Worker registration error:", error);
				}
			}
		}, 2000);
	});
</script>

<svelte:head>
	<title>Smart E-VISION — Instructional Supervision Archiving</title>
</svelte:head>

<Toast />
{@render children()}
