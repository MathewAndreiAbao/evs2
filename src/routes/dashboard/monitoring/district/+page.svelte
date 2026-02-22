<script lang="ts">
    import { profile } from "$lib/utils/auth";
    import { supabase } from "$lib/utils/supabase";
    import StatCard from "$lib/components/StatCard.svelte";
    import StatusBadge from "$lib/components/StatusBadge.svelte";
    import ComplianceTrendChart from "$lib/components/ComplianceTrendChart.svelte";
    import { onMount, onDestroy } from "svelte";
    import { fly, fade } from "svelte/transition";
    import {
        calculateCompliance,
        groupSubmissionsByWeek,
        getComplianceClass,
        getComplianceBgClass,
        getTrendDirection,
        getTrendIcon,
        getWeekNumber,
    } from "$lib/utils/useDashboardData";

    interface KPI {
        totalSchools: number;
        overallRate: number;
        lateCount: number;
        atRiskCount: number;
        previousRate: number;
    }

    // Data
    let schools = $state<any[]>([]);
    let districtSubmissions = $state<any[]>([]);
    let loading = $state(true);

    // KPI state
    let kpi = $state<KPI>({
        totalSchools: 0,
        overallRate: 0,
        lateCount: 0,
        atRiskCount: 0,
        previousRate: 0,
    });

    // Trend chart data
    let trendLabels = $state<string[]>([]);
    let trendDatasets = $state<any[]>([]);

    // Table controls
    let sortField = $state<string>("rate");
    let sortDir = $state<"asc" | "desc">("desc");

    let realtimeChannel: ReturnType<typeof supabase.channel> | null = null;

    onMount(async () => {
        await loadDistrictData();
        loading = false;

        // Subscribe to real-time submission changes
        realtimeChannel = supabase
            .channel("district-submissions")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                () => {
                    loadDistrictData();
                },
            )
            .subscribe();
    });

    onDestroy(() => {
        if (realtimeChannel) {
            supabase.removeChannel(realtimeChannel);
        }
    });

    async function loadDistrictData() {
        const userProfile = $profile;
        if (!userProfile?.district_id) return;

        // Fetch schools, submissions, teaching loads AND academic calendar in parallel
        const [schoolsRes, subsRes, loadsRes, calendarRes] = await Promise.all([
            supabase
                .from("schools")
                .select("id, name")
                .eq("district_id", userProfile.district_id)
                .order("name"),
            supabase
                .from("submissions")
                .select(
                    `
                    id, 
                    user_id, 
                    status, 
                    compliance_status, 
                    created_at, 
                    week_number,
                    profiles!inner(school_id)
                `,
                )
                .eq("profiles.district_id", userProfile.district_id),
            supabase
                .from("teaching_loads")
                .select("id, user_id, profiles!inner(school_id)")
                .eq("profiles.district_id", userProfile.district_id),
            supabase
                .from("academic_calendar")
                .select("*")
                .eq("district_id", userProfile.district_id)
                .eq("school_year", "2023-2024")
                .order("week_number", { ascending: true }),
        ]);

        schools = schoolsRes.data || [];
        districtSubmissions = subsRes.data || [];
        const districtLoads = loadsRes.data || [];
        const calendar = calendarRes.data || [];

        // Calculate Overall District KPIs
        const totalDistrictLoads = districtLoads.length;
        const currentWk = getWeekNumber();
        const currentCal = calendar.find(
            (c: any) => c.week_number === currentWk,
        );

        const overallStats = calculateCompliance(
            districtSubmissions,
            totalDistrictLoads,
            currentCal?.deadline_date,
        );

        kpi.totalSchools = schools.length;
        kpi.overallRate = overallStats.rate;
        kpi.lateCount = overallStats.Late;

        // Process school data for the table
        schools = schools.map((school: any) => {
            const schoolSubs = districtSubmissions.filter(
                (s: any) => s.profiles?.school_id === school.id,
            );
            const schoolLoads = districtLoads.filter(
                (l: any) => l.profiles?.school_id === school.id,
            ).length;
            // For school-level stats, we use the same district deadline
            const stats = calculateCompliance(
                schoolSubs,
                schoolLoads,
                currentCal?.deadline_date,
            );
            return {
                ...school,
                ...stats,
                total: schoolSubs.length, // Ensure total is attached for the table
            };
        });

        // At-risk schools: < 75% compliance
        kpi.atRiskCount = schools.filter((s: any) => s.rate < 75).length;

        // Previous week rate
        const prevCal = calendar.find(
            (c: any) => c.week_number === currentWk - 1,
        );
        const prevWeekSubs = districtSubmissions.filter((s: any) => {
            const wn = s.week_number || getWeekNumber(new Date(s.created_at));
            return wn === currentWk - 1;
        });
        kpi.previousRate = calculateCompliance(
            prevWeekSubs,
            totalDistrictLoads,
            prevCal?.deadline_date,
        ).rate;

        // Build trend chart
        const weeklyData = groupSubmissionsByWeek(
            districtSubmissions,
            totalDistrictLoads,
            8,
            calendar,
        );
        trendLabels = weeklyData.map((w: any) => w.label);
        trendDatasets = [
            {
                label: "District Compliance",
                data: weeklyData.map((w: any) => w.rate),
                color: "#0038A8",
            },
            {
                label: "85% Target",
                data: weeklyData.map(() => 85),
                color: "#CE1126",
                dashed: true,
            },
        ];
    }

    const sortedSchools = $derived(() => {
        let result = [...schools];
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
            sortDir = "desc";
        }
    }
</script>

<svelte:head>
    <title>District Monitoring — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8">
        <h1 class="text-2xl font-bold text-text-primary">
            🌐 District Compliance Monitor
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Overview of school submissions and compliance across the district
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
                <StatCard icon="🏫" value={kpi.totalSchools} label="Schools" />
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
                    <p class="text-xs text-text-muted mt-1">
                        District Compliance
                    </p>
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
                    label="At-Risk Schools"
                    color="from-deped-red to-red-700"
                />
            </div>
        </div>

        <!-- Trend Chart -->
        <div class="mb-8" in:fly={{ y: 20, duration: 500, delay: 400 }}>
            <div class="glass-card-static p-6">
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    📈 District Performance Trend
                </h3>
                {#if trendLabels.length > 0}
                    <div class="h-72">
                        <ComplianceTrendChart
                            labels={trendLabels}
                            datasets={trendDatasets}
                            height={280}
                        />
                    </div>
                {:else}
                    <div
                        class="flex items-center justify-center h-72 text-text-muted"
                    >
                        <p>No district data available yet</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Schools Table -->
        <div
            class="glass-card-static overflow-hidden"
            in:fade={{ duration: 500, delay: 500 }}
        >
            <div class="px-6 py-4 border-b border-gray-100">
                <h3 class="text-lg font-bold text-text-primary">
                    📊 School Compliance Breakdown
                </h3>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="border-b border-gray-100">
                            <th
                                class="px-6 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                            >
                                <button
                                    class="hover:text-text-primary"
                                    onclick={() => toggleSort("name")}
                                >
                                    School {sortField === "name"
                                        ? sortDir === "asc"
                                            ? "↑"
                                            : "↓"
                                        : ""}
                                </button>
                            </th>
                            <th
                                class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >Submissions</th
                            >
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
                                >Status</th
                            >
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each sortedSchools() as school}
                            <tr class="hover:bg-white/40 transition-colors">
                                <td
                                    class="px-6 py-4 font-medium text-text-primary"
                                    >{school.name}</td
                                >
                                <td
                                    class="px-4 py-4 text-center text-text-secondary"
                                    >{school.total}</td
                                >
                                <td
                                    class="px-4 py-4 text-center text-deped-green font-semibold"
                                    >{school.Compliant}</td
                                >
                                <td
                                    class="px-4 py-4 text-center text-deped-gold-dark font-semibold"
                                    >{school.Late}</td
                                >
                                <td class="px-4 py-4 text-center">
                                    <span
                                        class="inline-block px-2.5 py-1 rounded-full text-xs font-bold {getComplianceBgClass(
                                            school.rate,
                                        )} {getComplianceClass(school.rate)}"
                                    >
                                        {school.rate}%
                                    </span>
                                </td>
                                <td class="px-4 py-4 text-right">
                                    <StatusBadge
                                        status={school.rate >= 85
                                            ? "compliant"
                                            : school.rate >= 70
                                              ? "late"
                                              : "non-compliant"}
                                        size="sm"
                                    />
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    {/if}
</div>
