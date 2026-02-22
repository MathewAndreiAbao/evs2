<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import { addToast } from "$lib/stores/toast";
    import { onMount } from "svelte";
    import { fly, fade } from "svelte/transition";

    let schoolYear = $state("2023-2024");
    let quarter = $state(1);
    let deadlines = $state<any[]>([]);
    let loading = $state(true);
    let saving = $state(false);

    onMount(async () => {
        if ($profile?.district_id) {
            await loadDeadlines();
        }
        loading = false;
    });

    async function loadDeadlines() {
        const { data, error } = await supabase
            .from("academic_calendar")
            .select("*")
            .eq("school_year", schoolYear)
            .eq("quarter", quarter)
            .order("week_number", { ascending: true });

        if (error) {
            console.error("[v0] Error loading calendar:", error);
            return;
        }

        // Always ensure we have 10 weeks
        const existingWeeks = data || [];
        deadlines = Array.from({ length: 10 }, (_, i) => {
            const weekNum = i + 1;
            const weekData = existingWeeks.find(
                (w) => w.week_number === weekNum,
            );
            return {
                id: weekData?.id,
                week_number: weekNum,
                deadline_date: weekData?.deadline_date
                    ? weekData.deadline_date.split("T")[0]
                    : "",
                description:
                    weekData?.description || `Week ${weekNum} Submission`,
            };
        });
    }

    async function saveWeek(weekData: any) {
        if (!$profile?.district_id || !weekData.deadline_date) return;

        // Find if this record already exists to use its ID
        const payload = {
            ...(weekData.id ? { id: weekData.id } : {}),
            school_year: schoolYear,
            quarter: quarter,
            week_number: weekData.week_number,
            deadline_date: new Date(weekData.deadline_date).toISOString(),
            description: weekData.description,
            district_id: $profile.district_id,
        };

        const { data, error } = await supabase
            .from("academic_calendar")
            .upsert(payload)
            .select();

        if (error) {
            console.error("[v0] Save error:", error);
            addToast(
                "error",
                `Failed to save Week ${weekData.week_number}: ${error.message}`,
            );
        } else {
            addToast("success", `Week ${weekData.week_number} updated!`);
            // Update the local state with the returned ID if it was new
            if (data && data[0]) {
                weekData.id = data[0].id;
            }
        }
    }

    $effect(() => {
        if (schoolYear || quarter) {
            loadDeadlines();
        }
    });
</script>

<svelte:head>
    <title>Academic Calendar — Smart E-VISION</title>
</svelte:head>

<div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div
        class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
    >
        <div>
            <h1
                class="text-3xl font-extrabold text-text-primary tracking-tight"
            >
                📅 Academic Calendar
            </h1>
            <p class="text-lg text-text-secondary mt-2 max-w-lg">
                Manage weekly submission deadlines. Changes are applied per
                week.
            </p>
        </div>

        <div
            class="flex items-center gap-3 p-1.5 bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm"
        >
            <select
                bind:value={schoolYear}
                class="px-4 py-2.5 bg-transparent border-none rounded-xl focus:ring-2 focus:ring-deped-blue/20 outline-none text-sm font-bold text-deped-blue"
            >
                <option value="2023-2024">SY 2023-2024</option>
                <option value="2024-2025">SY 2024-2025</option>
            </select>
            <div class="w-px h-6 bg-gray-200"></div>
            <select
                bind:value={quarter}
                class="px-4 py-2.5 bg-transparent border-none rounded-xl focus:ring-2 focus:ring-deped-blue/20 outline-none text-sm font-bold text-deped-blue"
            >
                <option value={1}>1st Quarter</option>
                <option value={2}>2nd Quarter</option>
                <option value={3}>3rd Quarter</option>
                <option value={4}>4th Quarter</option>
            </select>
        </div>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each Array(6) as _}
                <div
                    class="glass-card-static p-6 h-32 animate-pulse rounded-3xl"
                ></div>
            {/each}
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6" in:fade>
            {#each deadlines as d, i (d.week_number)}
                <div
                    class="glass-card-static p-6 rounded-[2rem] border border-white/40 shadow-elevated hover:shadow-glass transition-all duration-300 group"
                    in:fly={{ y: 20, delay: i * 50 }}
                >
                    <div class="flex items-center justify-between mb-6">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-12 h-12 rounded-2xl bg-gradient-to-br from-deped-blue to-deped-blue-dark text-white flex items-center justify-center font-black text-lg shadow-indigo-200 shadow-lg"
                            >
                                {d.week_number}
                            </div>
                            <div>
                                <h3
                                    class="font-bold text-text-primary text-lg leading-none"
                                >
                                    Week {d.week_number}
                                </h3>
                                <p
                                    class="text-xs text-text-muted mt-1 font-medium tracking-wide border-b border-transparent group-hover:border-deped-blue/20 transition-all"
                                >
                                    DEADLINE SETUP
                                </p>
                            </div>
                        </div>

                        <button
                            onclick={() => saveWeek(d)}
                            class="p-2.5 rounded-xl bg-deped-blue/5 text-deped-blue hover:bg-deped-blue hover:text-white active:scale-90 transition-all shadow-sm"
                            title="Save Week {d.week_number}"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.5"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                ><path
                                    d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
                                ></path><polyline points="17 21 17 13 7 13 7 21"
                                ></polyline><polyline points="7 3 7 8 15 8"
                                ></polyline></svg
                            >
                        </button>
                    </div>

                    <div class="space-y-4">
                        <div class="relative">
                            <label
                                class="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-deped-blue uppercase tracking-widest z-10"
                                for="date-{i}"
                            >
                                Due Date
                            </label>
                            <input
                                id="date-{i}"
                                type="date"
                                bind:value={d.deadline_date}
                                class="w-full px-4 py-3.5 bg-white/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-deped-blue/20 focus:border-deped-blue outline-none text-sm font-semibold transition-all"
                            />
                        </div>

                        <div class="relative">
                            <label
                                class="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-text-muted uppercase tracking-widest z-10"
                                for="desc-{i}"
                            >
                                Notes / Purpose
                            </label>
                            <input
                                id="desc-{i}"
                                type="text"
                                bind:value={d.description}
                                placeholder="e.g. DLL Submission..."
                                class="w-full px-4 py-3.5 bg-white/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-deped-blue/20 focus:border-deped-blue outline-none text-sm font-medium placeholder:text-gray-300 transition-all"
                            />
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        <div
            class="mt-12 p-8 bg-gradient-to-br from-deped-blue/5 to-transparent rounded-[2.5rem] border border-white/50 shadow-inner"
        >
            <div class="flex items-start gap-4">
                <span class="text-2xl mt-0.5">💡</span>
                <div>
                    <h4 class="font-bold text-deped-blue mb-1">How it works</h4>
                    <p class="text-sm text-text-secondary leading-relaxed">
                        Each week is saved individually by clicking the <span
                            class="inline-flex items-center justify-center w-6 h-6 rounded bg-deped-blue text-white text-[10px]"
                            >💾</span
                        >
                        button inside the card. Deadlines are set to
                        <strong>11:59 PM</strong> of the selected date. Submissions
                        after this will be marked as "Late" or "Non-compliant" automatically.
                    </p>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    /* Premium glass/card aesthetics */
    :global(.glass-card-static) {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(20px);
    }
</style>
