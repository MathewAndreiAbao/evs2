<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import ComplianceHeatmap from "$lib/components/ComplianceHeatmap.svelte";
    import ComplianceTrendChart from "$lib/components/ComplianceTrendChart.svelte";
    import DrillDownModal from "$lib/components/DrillDownModal.svelte";
    import { onMount } from "svelte";
    import { fly, fade } from "svelte/transition";
    import {
        calculateCompliance,
        groupSubmissionsByWeek,
        getComplianceClass,
        getComplianceBgClass,
        getTrendDirection,
        getTrendIcon,
        formatComplianceRate,
        getWeekNumber,
    } from "$lib/utils/useDashboardData";

    // Data
    let teachers = $state<any[]>([]);
    let allSubmissions = $state<any[]>([]);
    let loading = $state(true);

    // KPI state
    let kpi = $state({
        totalTeachers: 0,
        overallRate: 0,
        lateCount: 0,
        atRiskCount: 0,
        previousRate: 0,
    });

    // Heatmap data
    let heatmapRows = $state<string[]>([]);
    let heatmapWeeks = $state<{ week: number; label: string }[]>([]);
    let heatmapCells = $state<any[]>([]);

    // Trend chart data
    let trendLabels = $state<string[]>([]);
    let trendDatasets = $state<any[]>([]);

    // Table controls
    let sortField = $state<string>("rate");
    let sortDir = $state<"asc" | "desc">("asc");
    let searchQuery = $state("");

    // Drill-down modal
    let showModal = $state(false);
    let selectedTeacher = $state<any>(null);
    let selectedSubmissions = $state<any[]>([]);

    // Alert teachers (≥2 late submissions)
    let alertTeachers = $derived(() => {
        return teachers.filter((t) => {
            const subs = allSubmissions.filter((s) => s.user_id === t.id);
            const late = subs.filter(
                (s) => s.compliance_status === "Late" || s.status === "Late",
            ).length;
            return late >= 2;
        });
    });

    onMount(async () => {
        await loadSchoolData();
        loading = false;
    });

    async function loadSchoolData() {
        const userProfile = $profile;
        if (!userProfile?.school_id) return;

        // Batch fetch: teachers + all submissions + all teaching loads + academic calendar
        const [teachersRes, subsRes, loadsRes, calendarRes] = await Promise.all(
            [
                supabase
                    .from("profiles")
                    .select("id, full_name, role, district_id")
                    .eq("school_id", userProfile.school_id)
                    .eq("role", "Teacher")
                    .order("full_name"),
                supabase
                    .from("submissions")
                    .select(
                        "id, user_id, file_name, doc_type, status, compliance_status, created_at, week_number, teaching_loads(subject, grade_level)",
                    )
                    .eq("profiles.school_id", userProfile.school_id)
                    .order("created_at", { ascending: false }),
                supabase
                    .from("teaching_loads")
                    .select("id, user_id")
                    .eq("profiles.school_id", userProfile.school_id),
                supabase
                    .from("academic_calendar")
                    .select("*")
                    .eq("school_year", "2023-2024")
                    .order("week_number", { ascending: true }),
            ],
        );

        teachers = teachersRes.data || [];
        const schoolLoads = loadsRes.data || [];
        const districtId = teachers[0]?.district_id || userProfile.district_id;

        let calendar = calendarRes.data || [];
        if (districtId) {
            calendar = calendar.filter((c) => c.district_id === districtId);
        }

        // Attach load count to each teacher
        teachers = teachers.map((t) => ({
            ...t,
            loadCount: schoolLoads.filter((l) => l.user_id === t.id).length,
        }));

        allSubmissions = subsRes.data || [];
        const teacherIds = new Set(teachers.map((t) => t.id));
        allSubmissions = allSubmissions.filter((s) =>
            teacherIds.has(s.user_id),
        );

        // Calculate KPIs
        const totalSchoolLoads = teachers.reduce(
            (sum, t) => sum + (t.loadCount || 0),
            0,
        );

        const currentWk = getWeekNumber();
        const currentCal = calendar.find((c) => c.week_number === currentWk);

        const overallStats = calculateCompliance(
            allSubmissions,
            totalSchoolLoads,
            currentCal?.deadline_date,
        );
        kpi.totalTeachers = teachers.length;
        kpi.overallRate = overallStats.rate;
        kpi.lateCount = overallStats.Late;

        // At-risk: teachers with <70% compliance
        kpi.atRiskCount = teachers.filter((t) => {
            const subs = allSubmissions.filter((s) => s.user_id === t.id);
            const stats = calculateCompliance(
                subs,
                t.loadCount,
                currentCal?.deadline_date,
            );
            return stats.rate < 70 && subs.length > 0;
        }).length;

        // Previous week rate for trend
        const prevCal = calendar.find((c) => c.week_number === currentWk - 1);
        const prevWeekSubs = allSubmissions.filter((s) => {
            const wn = s.week_number || getWeekNumber(new Date(s.created_at));
            return wn === currentWk - 1;
        });
        kpi.previousRate = calculateCompliance(
            prevWeekSubs,
            totalSchoolLoads,
            prevCal?.deadline_date,
        ).rate;

        // Build heatmap
        buildHeatmap(calendar);

        // Build trend chart
        const weeklyData = groupSubmissionsByWeek(
            allSubmissions,
            totalSchoolLoads,
            8,
            calendar,
        );
        trendLabels = weeklyData.map((w) => w.label);
        trendDatasets = [
            {
                label: "School Compliance",
                data: weeklyData.map((w) => w.rate),
                color: "#0038A8",
            },
            {
                label: "80% Target",
                data: weeklyData.map(() => 80),
                color: "#CE1126",
                dashed: true,
            },
        ];
    }

    function buildHeatmap(calendar: any[] = []) {
        const currentWeek = getWeekNumber();
        const weekCount = 8;
        const weeks = [];

        if (calendar.length > 0) {
            const recentCal = [...calendar]
                .sort((a, b) => b.week_number - a.week_number)
                .slice(0, weekCount)
                .reverse();
            for (const cal of recentCal) {
                weeks.push({
                    week: cal.week_number,
                    label: `W${cal.week_number}`,
                    deadline: cal.deadline_date,
                });
            }
        } else {
            for (let i = weekCount - 1; i >= 0; i--) {
                const wk = currentWeek - i;
                if (wk >= 1)
                    weeks.push({ week: wk, label: `W${wk}`, deadline: null });
            }
        }

        heatmapWeeks = weeks;
        heatmapRows = teachers.map((t) => t.full_name);

        const cells: any[] = [];
        for (const t of teachers) {
            const teacherSubs = allSubmissions.filter(
                (s) => s.user_id === t.id,
            );
            for (const w of weeks) {
                const weekSubs = teacherSubs.filter(
                    (s) => s.week_number === w.week,
                );
                const stats = calculateCompliance(
                    weekSubs,
                    t.loadCount,
                    w.deadline,
                );
                cells.push({
                    row: t.full_name,
                    week: w.week,
                    weekLabel: w.label,
                    rate: stats.rate,
                    count: weekSubs.length,
                    tooltip: `${t.full_name} — ${w.label}: ${stats.rate}% (${stats.Compliant} compliant, ${stats.Late} late, ${stats.NonCompliant} non-compliant)`,
                });
            }
        }
        heatmapCells = cells;
    }

    // Teacher table with sorting + search
    const sortedTeachers = $derived(() => {
        let result = teachers.map((t) => {
            const subs = allSubmissions.filter((s) => s.user_id === t.id);
            const stats = calculateCompliance(subs, t.loadCount);
            return { ...t, ...stats };
        });

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((t) =>
                t.full_name.toLowerCase().includes(q),
            );
        }

        result.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
            return sortDir === "asc"
                ? String(aVal).localeCompare(String(bVal))
                : String(bVal).localeCompare(String(aVal));
        });

        return result;
    });

    function toggleSort(field: string) {
        if (sortField === field) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
            sortField = field;
            sortDir = field === "full_name" ? "asc" : "desc";
        }
    }

    function openDrillDown(teacher: any) {
        selectedTeacher = teacher;
        selectedSubmissions = allSubmissions
            .filter((s) => s.user_id === teacher.id)
            .slice(0, 20);
        showModal = true;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<svelte:head>
    <title>School Monitoring — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">
            🏫 School Compliance Monitor
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Track teacher submissions and compliance rates
        </p>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {#each Array(4) as _}
                <div class="glass-card-static p-6 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                    <div class="h-8 bg-gray-200 rounded w-16"></div>
                </div>
            {/each}
        </div>
    {:else}
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div in:fly={{ y: 20, duration: 400 }}>
                <StatCard
                    icon="👩‍🏫"
                    value={kpi.totalTeachers}
                    label="Teachers"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <div class="glass-card-static p-5">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-xl">✅</span>
                        <span
                            class="text-xs font-semibold {getComplianceClass(
                                kpi.overallRate,
                            )}"
                        >
                            {#if kpi.previousRate > 0}
                                {@const dir = getTrendDirection(
                                    kpi.overallRate,
                                    kpi.previousRate,
                                )}
                                {getTrendIcon(dir)}
                                {Math.abs(kpi.overallRate - kpi.previousRate)}%
                            {/if}
                        </span>
                    </div>
                    <p class="text-2xl font-bold text-text-primary">
                        {kpi.overallRate}%
                    </p>
                    <p class="text-xs text-text-muted mt-1">Compliance Rate</p>
                </div>
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="⏰"
                    value={kpi.lateCount}
                    label="Late Submissions"
                    color="from-deped-gold to-deped-gold-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="⚠️"
                    value={kpi.atRiskCount}
                    label="At-Risk Teachers"
                    color="from-deped-red to-red-700"
                />
            </div>
        </div>

        <!-- Alerts -->
        {#if alertTeachers().length > 0}
            <div
                class="glass-card-static p-5 mb-8 border-l-4 border-deped-gold"
                in:fade={{ duration: 500, delay: 400 }}
            >
                <h3 class="text-sm font-bold text-deped-gold-dark mb-2">
                    ⚠️ Attention: {alertTeachers().length} teacher{alertTeachers()
                        .length > 1
                        ? "s"
                        : ""} with ≥2 late submissions
                </h3>
                <div class="flex flex-wrap gap-2">
                    {#each alertTeachers() as teacher}
                        <button
                            class="px-3 py-1.5 text-xs font-semibold bg-deped-gold/10 text-deped-gold-dark rounded-lg hover:bg-deped-gold/20 transition-colors"
                            onclick={() => openDrillDown(teacher)}
                        >
                            {teacher.full_name}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Heatmap + Trend Chart -->
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div
                class="glass-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 500 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    🔥 Compliance Heatmap
                </h3>
                <ComplianceHeatmap
                    rows={heatmapRows}
                    weeks={heatmapWeeks}
                    cells={heatmapCells}
                    onCellClick={(row, week) => {
                        const teacher = teachers.find(
                            (t) => t.full_name === row,
                        );
                        if (teacher) openDrillDown(teacher);
                    }}
                />
            </div>

            <div
                class="glass-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 600 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    📈 School vs Target
                </h3>
                {#if trendLabels.length > 0}
                    <ComplianceTrendChart
                        labels={trendLabels}
                        datasets={trendDatasets}
                        height={260}
                    />
                {:else}
                    <div
                        class="flex items-center justify-center h-[260px] text-text-muted"
                    >
                        <p>No trend data available yet</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Teacher Table -->
        <div
            class="glass-card-static overflow-hidden"
            in:fade={{ duration: 500, delay: 700 }}
        >
            <div
                class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3"
            >
                <h3 class="text-lg font-bold text-text-primary">
                    👩‍🏫 Teacher Compliance
                </h3>
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search teacher..."
                    class="px-4 py-2 text-sm bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-deped-blue/30 focus:border-deped-blue outline-none w-56"
                />
            </div>

            {#if sortedTeachers().length === 0}
                <div class="p-10 text-center">
                    <p class="text-3xl mb-3">📭</p>
                    <p class="text-text-muted font-medium">No teachers found</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-100">
                                <th
                                    class="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                                >
                                    <button
                                        class="hover:text-text-primary"
                                        onclick={() => toggleSort("full_name")}
                                    >
                                        Teacher {sortField === "full_name"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >
                                    <button
                                        class="hover:text-text-primary"
                                        onclick={() => toggleSort("total")}
                                    >
                                        Total {sortField === "total"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                    >Compliant</th
                                >
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                    >Late</th
                                >
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                    >Non-compliant</th
                                >
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >
                                    <button
                                        class="hover:text-text-primary"
                                        onclick={() => toggleSort("rate")}
                                    >
                                        Rate {sortField === "rate"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase"
                                    >Action</th
                                >
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            {#each sortedTeachers() as teacher}
                                <tr
                                    class="hover:bg-white/40 transition-colors cursor-pointer"
                                    onclick={() => openDrillDown(teacher)}
                                >
                                    <td
                                        class="px-6 py-3 font-medium text-text-primary"
                                        >{teacher.full_name}</td
                                    >
                                    <td
                                        class="px-4 py-3 text-center text-text-secondary"
                                        >{teacher.total}</td
                                    >
                                    <td
                                        class="px-4 py-3 text-center text-deped-green font-semibold"
                                        >{teacher.Compliant}</td
                                    >
                                    <td
                                        class="px-4 py-3 text-center text-deped-gold-dark font-semibold"
                                        >{teacher.Late}</td
                                    >
                                    <td
                                        class="px-4 py-3 text-center text-deped-red font-semibold"
                                        >{teacher.NonCompliant}</td
                                    >
                                    <td class="px-4 py-3 text-center">
                                        <span
                                            class="inline-block px-2.5 py-1 rounded-full text-xs font-bold {getComplianceBgClass(
                                                teacher.rate,
                                            )} {getComplianceClass(
                                                teacher.rate,
                                            )}"
                                        >
                                            {teacher.rate}%
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-right">
                                        <button
                                            class="text-deped-blue hover:text-deped-blue-dark text-xs font-semibold"
                                        >
                                            View →
                                        </button>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>
    {/if}
</div>

<!-- Drill-Down Modal -->
<DrillDownModal
    isOpen={showModal}
    title={selectedTeacher
        ? `📋 ${selectedTeacher.full_name}'s Submissions`
        : "Teacher Details"}
    onClose={() => {
        showModal = false;
        selectedTeacher = null;
    }}
>
    {#if selectedTeacher}
        {@const stats = calculateCompliance(selectedSubmissions)}
        <div class="grid grid-cols-3 gap-3 mb-4">
            <div class="text-center p-3 rounded-xl bg-deped-green/10">
                <p class="text-lg font-bold text-deped-green">
                    {stats.Compliant}
                </p>
                <p class="text-xs text-text-muted">Compliant</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-deped-gold/10">
                <p class="text-lg font-bold text-deped-gold-dark">
                    {stats.Late}
                </p>
                <p class="text-xs text-text-muted">Late</p>
            </div>
            <div class="text-center p-3 rounded-xl bg-deped-red/10">
                <p class="text-lg font-bold text-deped-red">
                    {stats.NonCompliant}
                </p>
                <p class="text-xs text-text-muted">Non-compliant</p>
            </div>
        </div>

        {#if selectedSubmissions.length === 0}
            <p class="text-center text-text-muted py-6">No submissions found</p>
        {:else}
            <div class="divide-y divide-gray-100">
                {#each selectedSubmissions as sub}
                    {@const tl = Array.isArray(sub.teaching_loads)
                        ? sub.teaching_loads[0]
                        : sub.teaching_loads}
                    <div class="flex items-center justify-between py-3">
                        <div class="min-w-0">
                            <p
                                class="text-sm font-medium text-text-primary truncate"
                            >
                                {sub.file_name}
                            </p>
                            <p class="text-xs text-text-muted">
                                {sub.doc_type}
                                {#if tl}
                                    · {tl.subject} - Gr. {tl.grade_level}{/if}
                            </p>
                        </div>
                        <div class="flex items-center gap-3 flex-shrink-0">
                            <StatusBadge
                                status={sub.compliance_status ||
                                    (sub.status === "Compliant"
                                        ? "compliant"
                                        : sub.status === "Late"
                                          ? "late"
                                          : "non-compliant")}
                                size="sm"
                            />
                            <span class="text-xs text-text-muted"
                                >{formatDate(sub.created_at)}</span
                            >
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {/if}
</DrillDownModal>
