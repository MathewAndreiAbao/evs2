<script lang="ts">
    interface Props {
        status: string;
        size?: "sm" | "md";
    }

    let { status, size = "md" }: Props = $props();

    const config: Record<
        string,
        { bg: string; text: string; label: string; icon: string }
    > = {
        Compliant: {
            bg: "bg-deped-green/15",
            text: "text-deped-green",
            label: "Compliant",
            icon: "✓",
        },
        Late: {
            bg: "bg-deped-gold/15",
            text: "text-deped-gold-dark",
            label: "Late",
            icon: "⏰",
        },
        "Non-Compliant": {
            bg: "bg-deped-red/15",
            text: "text-deped-red",
            label: "Non-Compliant",
            icon: "✕",
        },
        pending: {
            bg: "bg-gray-200/50",
            text: "text-text-muted",
            label: "Pending",
            icon: "⏳",
        },
        review: {
            bg: "bg-deped-blue/15",
            text: "text-deped-blue",
            label: "Under Review",
            icon: "👁",
        },
    };

    // Normalize input to handle different casings
    const normalizedStatus = $derived(() => {
        if (!status) return "pending";
        const s = status.toLowerCase();
        if (s === "compliant" || s === "on-time") return "Compliant";
        if (s === "late") return "Late";
        if (s === "non-compliant" || s === "non compliant" || s === "missing")
            return "Non-Compliant";
        if (s === "pending") return "pending";
        if (s === "review" || s === "under review") return "review";
        return status; // Fallback
    });

    const c = $derived(config[normalizedStatus()] || config.pending);
    const sizeClass = $derived(
        size === "sm" ? "text-xs px-2.5 py-1" : "text-sm px-3.5 py-1.5",
    );
</script>

<span
    class="inline-flex items-center gap-1.5 rounded-full font-semibold {c.bg} {c.text} {sizeClass}"
>
    <span class="text-xs">{c.icon}</span>
    {c.label}
</span>
