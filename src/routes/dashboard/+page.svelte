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
        getComplianceColor,
        getComplianceClass,
        getComplianceBgClass,
        getTrendDirection,
        getTrendIcon,
        formatComplianceRate,
        getWeekNumber,
    } from "$lib/utils/useDashboardData";

    // Teacher-specific state
    let submissions = $state<any[]>([]);
    let weeklyData = $state<any[]>([]);
    let complianceStats = $state({
        Compliant: 0,
        Late: 0,
        NonCompliant: 0,
        totalUploaded: 0,
        expected: 0,
        rate: 0,
    });
    let teachingLoadsCount = $state(0);

    // Supervisor state
    let stats = $state({
        totalUploads: 0,
        compliantRate: 0,
        pendingQueue: 0,
        totalTeachers: 0,
        lateCount: 0,
        nonCompliantCount: 0,
    });
    let recentActivity = $state<
        { file_name: string; status: string; created_at: string }[]
    >([]);
    let loading = $state(true);
    let channel: any;

    // Teacher table controls
    let sortField = $state<string>("created_at");
    let sortDir = $state<"asc" | "desc">("desc");
    let filterStatus = $state("all");

    onMount(async () => {
        await loadDashboard();
        setupRealtime();
        loading = false;
    });

    onDestroy(() => {
        if (channel) supabase.removeChannel(channel);
    });

    function setupRealtime() {
        channel = supabase
            .channel("dashboard-changes")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "submissions" },
                () => {
                    loadDashboard();
                },
            )
            .subscribe();
    }

    async function loadDashboard() {
        const userProfile = $profile;
        if (!userProfile) return;
        const role = userProfile.role;

        if (role === "Teacher") {
            await loadTeacherDashboard(userProfile);
        } else {
            await loadSupervisorDashboard(userProfile, role);
        }
    }

    async function loadTeacherDashboard(userProfile: any) {
        // Batch: fetch all submissions + teaching loads count + academic calendar in parallel
        const [subsResult, loadsResult, calendarResult] = await Promise.all([
            supabase
                .from("submissions")
                .select(
                    "id, file_name, doc_type, status, compliance_status, created_at, week_number, teaching_loads(subject, grade_level)",
                )
                .eq("user_id", userProfile.id)
                .order("created_at", { ascending: false })
                .limit(50),
            supabase
                .from("teaching_loads")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userProfile.id)
                .eq("is_active", true),
            supabase
                .from("academic_calendar")
                .select("*")
                .eq("district_id", userProfile.district_id)
                .eq("school_year", "2023-2024") // Active SY
                .order("week_number", { ascending: true }),
        ]);

        submissions = subsResult.data || [];
        teachingLoadsCount = loadsResult.count || 0;
        const calendar = calendarResult.data || [];

        // Calculate compliance stats
        // We find the current week's deadline if it exists
        const currentWk = getWeekNumber();
        const currentCal = calendar.find((c) => c.week_number === currentWk);
        complianceStats = calculateCompliance(
            submissions,
            teachingLoadsCount,
            currentCal?.deadline_date,
        );

        // Weekly breakdown for chart + widget
        weeklyData = groupSubmissionsByWeek(
            submissions,
            teachingLoadsCount,
            8,
            calendar,
        );

        // Recent activity for the bottom section
        recentActivity = (subsResult.data || []).slice(0, 5);
        stats.totalUploads = (subsResult.data || []).length;
        stats.compliantRate = complianceStats.rate;
    }

    async function loadSupervisorDashboard(userProfile: any, role: string) {
        let query = supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "Teacher");
        let subQuery = supabase
            .from("submissions")
            .select("*, uploader:profiles!inner(school_id, district_id)", {
                count: "exact",
                head: true,
            });

        if (role === "School Head" || role === "Master Teacher") {
            if (userProfile.school_id) {
                query = query.eq("school_id", userProfile.school_id);
                subQuery = subQuery.eq(
                    "profiles.school_id",
                    userProfile.school_id,
                );
            }
        } else if (role === "District Supervisor") {
            if (userProfile.district_id) {
                query = query.eq("district_id", userProfile.district_id);
                subQuery = subQuery.eq(
                    "profiles.district_id",
                    userProfile.district_id,
                );
            }
        }

        const { count: teachers } = await query;
        stats.totalTeachers = teachers || 0;

        const { count: total } = await subQuery;
        stats.totalUploads = total || 0;

        const { count: late } = await subQuery.eq("status", "Late");
        stats.lateCount = late || 0;

        const { count: nonCompliant } = await subQuery.eq(
            "status",
            "Non-compliant",
        );
        stats.nonCompliantCount = nonCompliant || 0;

        const { data: recent } = await supabase
            .from("submissions")
            .select(
                "file_name, status, created_at, uploader:profiles!inner(school_id, district_id)",
            )
            .order("created_at", { ascending: false })
            .limit(5);
        recentActivity = recent || [];
    }

    // Teacher table: filtered & sorted submissions
    const displaySubmissions = $derived(() => {
        let result = [...submissions];
        if (filterStatus !== "all") {
            result = result.filter((s) => {
                let cs = s.compliance_status || s.status || "Non-Compliant";
                // Normalize for filtering
                if (
                    cs.toLowerCase() === "on-time" ||
                    cs.toLowerCase() === "compliant"
                )
                    cs = "Compliant";
                else if (cs.toLowerCase() === "late") cs = "Late";
                else if (
                    cs.toLowerCase() === "missing" ||
                    cs.toLowerCase() === "non-compliant"
                )
                    cs = "Non-Compliant";

                return cs === filterStatus;
            });
        }
        result.sort((a, b) => {
            const aVal = a[sortField];
            const bVal = b[sortField];
            if (sortDir === "asc") return aVal > bVal ? 1 : -1;
            return aVal < bVal ? 1 : -1;
        });
        return result.slice(0, 20);
    });

    function toggleSort(field: string) {
        if (sortField === field) sortDir = sortDir === "asc" ? "desc" : "asc";
        else {
            sortField = field;
            sortDir = "desc";
        }
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function getStatusBadgeType(
        s: any,
    ): "compliant" | "late" | "non-compliant" | "pending" | "review" {
        const cs =
            s.compliance_status ||
            (s.status === "Compliant"
                ? "compliant"
                : s.status === "Late"
                  ? "late"
                  : "non-compliant");
        if (cs === "compliant") return "compliant";
        if (cs === "late") return "late";
        return "non-compliant";
    }
</script>

<svelte:head>
    <title>Dashboard — Smart E-VISION</title>
</svelte:head>

<div>
    <!-- Header -->
    <div class="mb-8">
        <h1
            class="text-2xl font-bold text-text-primary flex items-center gap-2"
        >
            {$profile?.role === "Teacher"
                ? "📊 My Dashboard"
                : "🌐 Supervision Dashboard"}
            <span class="text-[10px] opacity-20 font-mono font-normal"
                >MAIN_DASHBOARD_V2</span
            >
        </h1>
        <p class="text-base text-text-secondary mt-1">
            Welcome back, <span class="font-semibold"
                >{$profile?.full_name || "User"}</span
            >
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
    {:else if $profile?.role === "Teacher"}
        <!-- ========== TEACHER DASHBOARD ========== -->

        <!-- Stats Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div in:fly={{ y: 20, duration: 400, delay: 0 }}>
                <StatCard
                    icon="📤"
                    value={stats.totalUploads}
                    label="Total Uploads"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="✅"
                    value="{complianceStats.rate}%"
                    label="Compliance Rate"
                    color="from-deped-green to-deped-green-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="⏰"
                    value={complianceStats.Late}
                    label="Late Submissions"
                    color="from-deped-gold to-deped-gold-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="❌"
                    value={complianceStats.NonCompliant}
                    label="Non-compliant"
                    color="from-deped-red to-red-700"
                />
            </div>
        </div>

        <!-- Weekly Compliance Widget + Trend Chart -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <!-- Weekly Badges -->
            <div
                class="glass-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 400 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    📅 Weekly Compliance
                </h3>
                <div class="grid grid-cols-4 gap-2">
                    {#each weeklyData as w}
                        <div
                            class="text-center p-2 rounded-xl {getComplianceBgClass(
                                w.rate,
                            )} transition-all hover:scale-105"
                        >
                            <p class="text-xs text-text-muted font-semibold">
                                {w.label}
                            </p>
                            <p
                                class="text-lg font-bold {getComplianceClass(
                                    w.rate,
                                )}"
                            >
                                {w.rate}%
                            </p>
                            <p class="text-xs text-text-muted">
                                {w.Compliant + w.Late + w.NonCompliant} docs
                            </p>
                        </div>
                    {/each}
                </div>
                {#if weeklyData.length === 0}
                    <p class="text-center text-text-muted py-4">
                        No weekly data yet
                    </p>
                {/if}
            </div>

            <!-- Trend Chart -->
            <div
                class="glass-card-static p-6"
                in:fly={{ y: 20, duration: 500, delay: 500 }}
            >
                <h3 class="text-lg font-bold text-text-primary mb-4">
                    📈 Performance Trend
                </h3>
                {#if weeklyData.length > 0}
                    <ComplianceTrendChart
                        labels={weeklyData.map((w) => w.label)}
                        datasets={[
                            {
                                label: "My Compliance",
                                data: weeklyData.map((w) => w.rate),
                                color: "#0038A8",
                            },
                        ]}
                        height={200}
                    />
                {:else}
                    <div
                        class="flex items-center justify-center h-[200px] text-text-muted"
                    >
                        <p>Upload documents to see your trend</p>
                    </div>
                {/if}
            </div>
        </div>

        <!-- Submission History Table -->
        <div
            class="glass-card-static overflow-hidden mb-8"
            in:fade={{ duration: 500, delay: 600 }}
        >
            <div
                class="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3"
            >
                <h3 class="text-lg font-bold text-text-primary">
                    📋 Submission History
                </h3>
                <select
                    bind:value={filterStatus}
                    class="px-3 py-2 text-sm bg-white/60 border border-gray-200 rounded-xl min-h-[40px]"
                >
                    <option value="all">All Status</option>
                    <option value="Compliant">Compliant</option>
                    <option value="Late">Late</option>
                    <option value="Non-Compliant">Non-compliant</option>
                </select>
            </div>
            {#if displaySubmissions().length === 0}
                <div class="p-10 text-center">
                    <p class="text-3xl mb-3">📭</p>
                    <p class="text-text-muted font-medium">
                        No submissions found
                    </p>
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
                                        onclick={() => toggleSort("file_name")}
                                    >
                                        Document {sortField === "file_name"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase"
                                    >Type</th
                                >
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                    >Teaching Load</th
                                >
                                <th
                                    class="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase"
                                >
                                    <button
                                        class="hover:text-text-primary"
                                        onclick={() => toggleSort("status")}
                                    >
                                        Status {sortField === "status"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                                <th
                                    class="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase"
                                >
                                    <button
                                        class="hover:text-text-primary"
                                        onclick={() => toggleSort("created_at")}
                                    >
                                        Date {sortField === "created_at"
                                            ? sortDir === "asc"
                                                ? "↑"
                                                : "↓"
                                            : ""}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            {#each displaySubmissions() as sub}
                                {@const tl = Array.isArray(sub.teaching_loads)
                                    ? sub.teaching_loads[0]
                                    : sub.teaching_loads}
                                <tr class="hover:bg-white/40 transition-colors">
                                    <td
                                        class="px-6 py-3 font-medium text-text-primary truncate max-w-[200px]"
                                        title={sub.file_name}
                                    >
                                        📄 {sub.file_name}
                                    </td>
                                    <td class="px-4 py-3 text-text-secondary"
                                        >{sub.doc_type}</td
                                    >
                                    <td
                                        class="px-4 py-3 text-center text-text-secondary text-xs"
                                    >
                                        {tl
                                            ? `${tl.subject} - Gr. ${tl.grade_level}`
                                            : "—"}
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        <StatusBadge
                                            status={getStatusBadgeType(sub)}
                                            size="sm"
                                        />
                                    </td>
                                    <td
                                        class="px-4 py-3 text-right text-text-muted text-xs"
                                        >{formatDate(sub.created_at)}</td
                                    >
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </div>

        <!-- Quick Actions -->
        <div class="mb-8" in:fade={{ duration: 600, delay: 700 }}>
            <h2 class="text-xl font-bold text-text-primary mb-4">
                ⚡ Quick Actions
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <a
                    href="/dashboard/upload"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">📤</span>
                    <div>
                        <p class="font-semibold text-text-primary">
                            Upload Document
                        </p>
                        <p class="text-sm text-text-muted">
                            Submit your DLL, ISP, or ISR
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/archive"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">🗄️</span>
                    <div>
                        <p class="font-semibold text-text-primary">
                            View Archive
                        </p>
                        <p class="text-sm text-text-muted">
                            Browse your submitted documents
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/load"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">📚</span>
                    <div>
                        <p class="font-semibold text-text-primary">
                            Teaching Load
                        </p>
                        <p class="text-sm text-text-muted">
                            Manage subjects & grade levels
                        </p>
                    </div>
                </a>
            </div>
        </div>
    {:else}
        <!-- ========== SUPERVISOR DASHBOARD ========== -->

        <!-- Stats Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div in:fly={{ y: 20, duration: 400, delay: 0 }}>
                <StatCard
                    icon="👩‍🏫"
                    value={stats.totalTeachers}
                    label="Total Teachers"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 100 }}>
                <StatCard
                    icon="📤"
                    value={stats.totalUploads}
                    label="Total Submissions"
                    color="from-deped-green to-deped-green-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 200 }}>
                <StatCard
                    icon="⏰"
                    value={stats.lateCount}
                    label="Late Submissions"
                    color="from-deped-gold to-deped-gold-dark"
                />
            </div>
            <div in:fly={{ y: 20, duration: 400, delay: 300 }}>
                <StatCard
                    icon="❌"
                    value={stats.nonCompliantCount}
                    label="Non-compliant"
                    color="from-deped-red to-red-700"
                />
            </div>
        </div>

        <!-- Quick Actions -->
        <div class="mb-10" in:fade={{ duration: 600, delay: 400 }}>
            <h2 class="text-xl font-bold text-text-primary mb-4">
                ⚡ Quick Actions
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <a
                    href="/dashboard/monitoring/{$profile?.role ===
                    'District Supervisor'
                        ? 'district'
                        : 'school'}"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">📊</span>
                    <div>
                        <p class="font-semibold text-text-primary">
                            Compliance Monitor
                        </p>
                        <p class="text-sm text-text-muted">
                            View submission status
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/archive"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">🗄️</span>
                    <div>
                        <p class="font-semibold text-text-primary">
                            Document Archive
                        </p>
                        <p class="text-sm text-text-muted">
                            Browse all archived records
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/analytics"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">📈</span>
                    <div>
                        <p class="font-semibold text-text-primary">Analytics</p>
                        <p class="text-sm text-text-muted">
                            View charts and trends
                        </p>
                    </div>
                </a>
                <a
                    href="/dashboard/calendar"
                    class="glass-card p-5 flex items-center gap-4 no-underline"
                >
                    <span class="text-2xl">📅</span>
                    <div>
                        <p class="font-semibold text-text-primary">
                            Academic Calendar
                        </p>
                        <p class="text-sm text-text-muted">
                            Manage weekly deadlines
                        </p>
                    </div>
                </a>
            </div>
        </div>

        <!-- Recent Activity -->
        <div in:fade={{ duration: 600, delay: 600 }}>
            <h2 class="text-xl font-bold text-text-primary mb-4">
                🕐 Recent Activity
            </h2>
            <div class="glass-card-static overflow-hidden">
                {#if recentActivity.length === 0}
                    <div class="p-10 text-center">
                        <p class="text-3xl mb-3">📭</p>
                        <p class="text-text-muted font-medium">
                            No recent activity yet
                        </p>
                    </div>
                {:else}
                    <div class="divide-y divide-gray-100">
                        {#each recentActivity as item, i}
                            <div
                                class="flex items-center justify-between px-6 py-4 hover:bg-white/40 transition-colors"
                                in:fly={{
                                    x: -20,
                                    duration: 400,
                                    delay: 700 + i * 50,
                                }}
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <span class="text-xl flex-shrink-0">📄</span
                                    >
                                    <span
                                        class="text-sm font-medium text-text-primary truncate"
                                        >{item.file_name}</span
                                    >
                                </div>
                                <div
                                    class="flex items-center gap-4 flex-shrink-0"
                                >
                                    <StatusBadge
                                        status={item.status === "Compliant"
                                            ? "compliant"
                                            : item.status === "Late"
                                              ? "late"
                                              : "non-compliant"}
                                        size="sm"
                                    />
                                    <span class="text-xs text-text-muted"
                                        >{formatDate(item.created_at)}</span
                                    >
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    {/if}
</div>
