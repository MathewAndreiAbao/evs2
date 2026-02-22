<script lang="ts">
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    onMount(() => {
        goto("/dashboard");
    });
</script>

<div class="min-h-screen gradient-mesh flex items-center justify-center">
    <div class="text-center animate-fade-in">
        <div
            class="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-deped-blue to-deped-blue-dark flex items-center justify-center text-white text-3xl font-bold shadow-elevated mb-4 animate-pulse-glow"
        >
            E
        </div>
        <p class="text-lg text-text-secondary font-medium">
            Redirecting to Smart E-VISION...
        </p>
    </div>
</div>
