<script lang="ts">
    import { supabase } from "$lib/utils/supabase";
    import { profile } from "$lib/utils/auth";
    import { onMount, tick } from "svelte";
    import { fly, fade } from "svelte/transition";
    import { calculateCompliance } from "$lib/utils/useDashboardData";

    let trendCanvas = $state<HTMLCanvasElement>();
    let barCanvas = $state<HTMLCanvasElement>();
    let loading = $state(true);
    let period = $state<"quarter" | "semester" | "year">("quarter");
    let ChartClass: any = null;

    let stats = $state({
        currentCompliance: 0,
        improvement: 0,
        topSchools: 0,
    });

    onMount(async () => {
        const { Chart, registerables } = await import("chart.js");
        Chart.register(...registerables);
        ChartClass = Chart;

        const { weeklyData, schoolData } = await fetchData();
        loading = false;

        await tick();
        renderCharts(weeklyData, schoolData);
    });

    async function fetchData() {
        const userProfile = $profile;
        if (!userProfile) return { weeklyData: [], schoolData: [] };

        // 1. Fetch Trend Data (Last 8 Weeks)
        const weeklyData = await getWeeklyCompliance();

        // 2. Fetch School Comparison Data
        const schoolData = await getSchoolComparison();

        // 3. Update Summary Stats
        stats.currentCompliance = weeklyData[weeklyData.length - 1] || 0;
        stats.improvement = weeklyData[0]
            ? stats.currentCompliance - weeklyData[0]
            : 0;
        stats.topSchools = schoolData.filter((s) => s.rate >= 80).length;

        return { weeklyData, schoolData };
    }

    async function getWeeklyCompliance(): Promise<number[]> {
        const { data: uploads } = await supabase
            .from("submissions")
            .select("status, compliance_status, week_number");

        const { count: loadCount } = await supabase
            .from("teaching_loads")
            .select("*", { count: "exact", head: true });

        const weeks = [1, 2, 3, 4, 5, 6, 7, 8];
        const totalLoads = loadCount || 0;

        return weeks.map((w) => {
            const weekSubs = uploads?.filter((s) => s.week_number === w) || [];
            const stats = calculateCompliance(weekSubs, totalLoads);
            return stats.rate;
        });
    }

    async function getSchoolComparison() {
        const [schoolsRes, subsRes, loadsRes] = await Promise.all([
            supabase.from("schools").select("id, name"),
            supabase
                .from("submissions")
                .select(
                    "status, compliance_status, uploader:profiles!inner(school_id)",
                ),
            supabase
                .from("teaching_loads")
                .select("id, profiles!inner(school_id)"),
        ]);

        const schools = schoolsRes.data || [];
        const submissions = subsRes.data || [];
        const loads = loadsRes.data || [];

        return schools.map((school) => {
            const schoolSubmissions = submissions.filter((s: any) => {
                const uploader = Array.isArray(s.uploader)
                    ? s.uploader[0]
                    : s.uploader;
                return uploader?.school_id === school.id;
            });

            const schoolLoadsCount = loads.filter((l: any) => {
                const p = Array.isArray(l.profiles)
                    ? l.profiles[0]
                    : l.profiles;
                return p?.school_id === school.id;
            }).length;

            const stats = calculateCompliance(
                schoolSubmissions,
                schoolLoadsCount,
            );

            return {
                name: school.name.replace(" Elementary School", " ES"),
                compliant: stats.Compliant,
                late: stats.Late,
                nonCompliant: stats.NonCompliant,
                rate: stats.rate,
            };
        });
    }

    function renderCharts(weeklyData: number[], schoolData: any[]) {
        if (!ChartClass) return;
        // Trend Line Chart
        new ChartClass(trendCanvas, {
            type: "line",
            data: {
                labels: weeklyData.map((_, i) => `Week ${i + 1}`),
                datasets: [
                    {
                        label: "Compliance Rate (%)",
                        data: weeklyData,
                        borderColor: "#0038A8",
                        backgroundColor: "rgba(0, 56, 168, 0.1)",
                        fill: true,
                        tension: 0.4,
                        pointRadius: 5,
                        pointHoverRadius: 8,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: (v: any) => v + "%" },
                    },
                },
            },
        });

        // Stacked Bar Chart
        new ChartClass(barCanvas, {
            type: "bar",
            data: {
                labels: schoolData.map((s) => s.name),
                datasets: [
                    {
                        label: "Compliant",
                        data: schoolData.map((s) => s.compliant),
                        backgroundColor: "#008751",
                    },
                    {
                        label: "Late",
                        data: schoolData.map((s) => s.late),
                        backgroundColor: "#FCD116",
                    },
                    {
                        label: "Non-compliant",
                        data: schoolData.map((s) => s.nonCompliant),
                        backgroundColor: "#CE1126",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top" },
                },
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true },
                },
            },
        });
    }
</script>

<svelte:head>
    <title>Analytics — Smart E-VISION</title>
</svelte:head>

<div in:fade={{ duration: 400 }}>
    <div class="mb-8 flex items-start justify-between">
        <div>
            <h1 class="text-2xl font-bold text-text-primary">📈 Analytics</h1>
            <p class="text-base text-text-secondary mt-1">
                Compliance trends and data visualization
            </p>
        </div>

        <select
            bind:value={period}
            class="px-4 py-3 text-sm bg-white/60 border border-gray-200 rounded-xl min-h-[48px]"
        >
            <option value="quarter">This Quarter</option>
            <option value="semester">This Semester</option>
            <option value="year">School Year</option>
        </select>
    </div>

    {#if loading}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="glass-card-static h-96 animate-pulse"></div>
            <div class="glass-card-static h-96 animate-pulse"></div>
        </div>
    {:else}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Trend Line -->
            <div
                class="glass-card-static p-6"
                in:fly={{ y: 20, duration: 600 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    📉 Compliance Trend
                </h3>
                <div class="h-72">
                    <canvas bind:this={trendCanvas}></canvas>
                </div>
            </div>

            <!-- Stacked Bar -->
            <div
                class="glass-card-static p-6"
                in:fly={{ y: 20, duration: 600, delay: 200 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    📊 School Comparison
                </h3>
                <div class="h-72">
                    <canvas bind:this={barCanvas}></canvas>
                </div>
            </div>
        </div>

        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div
                class="glass-card-static p-6 text-center"
                in:fly={{ y: 20, duration: 600, delay: 400 }}
            >
                <p class="text-4xl font-bold text-deped-blue">
                    {stats.currentCompliance}%
                </p>
                <p class="text-sm text-text-muted mt-2">
                    Current Week Compliance
                </p>
            </div>
            <div
                class="glass-card-static p-6 text-center"
                in:fly={{ y: 20, duration: 600, delay: 500 }}
            >
                <p
                    class="text-4xl font-bold {stats.improvement >= 0
                        ? 'text-deped-green'
                        : 'text-deped-red'}"
                >
                    {stats.improvement >= 0 ? "+" : ""}{stats.improvement}%
                </p>
                <p class="text-sm text-text-muted mt-2">
                    Improvement Since Week 1
                </p>
            </div>
            <div
                class="glass-card-static p-6 text-center"
                in:fly={{ y: 20, duration: 600, delay: 600 }}
            >
                <p class="text-4xl font-bold text-deped-gold-dark">
                    {stats.topSchools}
                </p>
                <p class="text-sm text-text-muted mt-2">
                    Schools Above 80% Target
                </p>
            </div>
        </div>
    {/if}
</div>
