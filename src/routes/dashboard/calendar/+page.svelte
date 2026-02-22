<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import { addToast } from "$lib/stores/toast";
    import { onMount } from "svelte";
    import { fly, fade } from "svelte/transition";

    interface Deadline {
        id?: string;
        week_number: number;
        deadline_date: string;
        description: string;
    }

    let schoolYear = $state("2023-2024");
    let quarter = $state(1);
    let deadlines = $state<Deadline[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let resolvedDistrictId = $state<string | null>(null);

    const isTeacher = $derived($profile?.role === "Teacher");
    const canEdit = $derived(!isTeacher);

    onMount(async () => {
        // Resolve district ID — supervisors have it directly, teachers get it through their school
        if ($profile?.district_id) {
            resolvedDistrictId = $profile.district_id;
        } else if ($profile?.school_id) {
            const { data } = await supabase
                .from("schools")
                .select("district_id")
                .eq("id", $profile.school_id)
                .single();
            resolvedDistrictId = data?.district_id || null;
        }

        if (resolvedDistrictId) {
            await loadDeadlines();
        }
        loading = false;
    });

    async function loadDeadlines() {
        if (!resolvedDistrictId) return;

        const { data, error } = await supabase
            .from("academic_calendar")
            .select("*")
            .eq("school_year", schoolYear)
            .eq("quarter", quarter)
            .eq("district_id", resolvedDistrictId)
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
                (w: any) => w.week_number === weekNum,
            );
            return {
                id: weekData?.id,
                week_number: weekNum,
                deadline_date: weekData?.deadline_date
                    ? (weekData.deadline_date as string).split("T")[0]
                    : "",
                description:
                    weekData?.description || `Week ${weekNum} Submission`,
            };
        });
    }

    async function saveWeek(weekData: any) {
        if (!canEdit || !resolvedDistrictId || !weekData.deadline_date) return;

        const payload = {
            ...(weekData.id ? { id: weekData.id } : {}),
            school_year: schoolYear,
            quarter: quarter,
            week_number: weekData.week_number,
            deadline_date: new Date(weekData.deadline_date).toISOString(),
            description: weekData.description,
            district_id: resolvedDistrictId,
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
            if (data && data[0]) {
                weekData.id = data[0].id;
            }
        }
    }

    function isPast(dateStr: string): boolean {
        if (!dateStr) return false;
        return new Date(dateStr) < new Date();
    }

    function isUpcoming(dateStr: string): boolean {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return d >= now && d <= threeDays;
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
                {#if canEdit}
                    Manage weekly submission deadlines. Changes are applied per
                    week.
                {:else}
                    Your submission deadlines for the selected quarter.
                {/if}
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
                                    class="text-xs text-text-muted mt-1 font-medium tracking-wide"
                                >
                                    {#if !canEdit && d.deadline_date}
                                        {#if isPast(d.deadline_date)}
                                            <span class="text-deped-red"
                                                >● Past</span
                                            >
                                        {:else if isUpcoming(d.deadline_date)}
                                            <span class="text-deped-gold-dark"
                                                >● Due Soon</span
                                            >
                                        {:else}
                                            <span class="text-deped-green"
                                                >● Upcoming</span
                                            >
                                        {/if}
                                    {:else}
                                        DEADLINE SETUP
                                    {/if}
                                </p>
                            </div>
                        </div>

                        {#if canEdit}
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
                                    ></path><polyline
                                        points="17 21 17 13 7 13 7 21"
                                    ></polyline><polyline points="7 3 7 8 15 8"
                                    ></polyline></svg
                                >
                            </button>
                        {/if}
                    </div>

                    <div class="space-y-4">
                        <div class="relative">
                            <label
                                class="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-deped-blue uppercase tracking-widest z-10"
                                for="date-{i}"
                            >
                                Due Date
                            </label>
                            {#if canEdit}
                                <input
                                    id="date-{i}"
                                    type="date"
                                    bind:value={d.deadline_date}
                                    class="w-full px-4 py-3.5 bg-white/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-deped-blue/20 focus:border-deped-blue outline-none text-sm font-semibold transition-all"
                                />
                            {:else}
                                <p
                                    class="w-full px-4 py-3.5 bg-white/30 border border-gray-100 rounded-2xl text-sm font-semibold text-text-primary"
                                >
                                    {d.deadline_date
                                        ? new Date(
                                              d.deadline_date + "T00:00:00",
                                          ).toLocaleDateString("en-PH", {
                                              weekday: "long",
                                              month: "long",
                                              day: "numeric",
                                              year: "numeric",
                                          })
                                        : "Not set"}
                                </p>
                            {/if}
                        </div>

                        <div class="relative">
                            <label
                                class="absolute -top-2 left-3 px-1 bg-white text-[10px] font-bold text-text-muted uppercase tracking-widest z-10"
                                for="desc-{i}"
                            >
                                Notes / Purpose
                            </label>
                            {#if canEdit}
                                <input
                                    id="desc-{i}"
                                    type="text"
                                    bind:value={d.description}
                                    placeholder="e.g. DLL Submission..."
                                    class="w-full px-4 py-3.5 bg-white/50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-deped-blue/20 focus:border-deped-blue outline-none text-sm font-medium placeholder:text-gray-300 transition-all"
                                />
                            {:else}
                                <p
                                    class="w-full px-4 py-3.5 bg-white/30 border border-gray-100 rounded-2xl text-sm font-medium text-text-secondary"
                                >
                                    {d.description || "—"}
                                </p>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        {#if canEdit}
            <div
                class="mt-12 p-8 bg-gradient-to-br from-deped-blue/5 to-transparent rounded-[2.5rem] border border-white/50 shadow-inner"
            >
                <div class="flex items-start gap-4">
                    <span class="text-2xl mt-0.5">💡</span>
                    <div>
                        <h4 class="font-bold text-deped-blue mb-1">
                            How it works
                        </h4>
                        <p class="text-sm text-text-secondary leading-relaxed">
                            Each week is saved individually by clicking the <span
                                class="inline-flex items-center justify-center w-6 h-6 rounded bg-deped-blue text-white text-[10px]"
                                >💾</span
                            >
                            button inside the card. Deadlines are set to
                            <strong>11:59 PM</strong> of the selected date. Submissions
                            after this will be marked as "Late" or "Non-compliant"
                            automatically.
                        </p>
                    </div>
                </div>
            </div>
        {:else}
            <div
                class="mt-12 p-8 bg-gradient-to-br from-deped-green/5 to-transparent rounded-[2.5rem] border border-white/50 shadow-inner"
            >
                <div class="flex items-start gap-4">
                    <span class="text-2xl mt-0.5">📌</span>
                    <div>
                        <h4 class="font-bold text-deped-green mb-1">
                            Submission Reminders
                        </h4>
                        <p class="text-sm text-text-secondary leading-relaxed">
                            Submit your documents before the deadline to be
                            marked as
                            <strong>Compliant</strong>. Submissions after the
                            deadline are marked as <strong>Late</strong> or
                            <strong>Non-compliant</strong>. Contact your
                            supervisor if you need deadline adjustments.
                        </p>
                    </div>
                </div>
            </div>
        {/if}
    {/if}
</div>

<style>
    /* Premium glass/card aesthetics */
    :global(.glass-card-static) {
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(20px);
    }
</style>
