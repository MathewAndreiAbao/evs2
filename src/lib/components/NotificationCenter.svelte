<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { quintOut } from "svelte/easing";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { supabase } from "$lib/utils/supabase";
  import { profile } from "$lib/utils/auth";

  interface Notification {
    id: string;
    type: "late" | "compliance" | "system";
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
  }

  // State
  let notifications = $state<Notification[]>([]);
  let isOpen = $state(false);
  let dropdownRef = $state<HTMLDivElement | null>(null); // Added for click outside detection

  const unreadCount = $derived(
    notifications.filter((n: Notification) => !n.read).length,
  );

  onMount(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Polling every 60s
    return () => clearInterval(interval); // Cleanup function for interval
  });

  // Removed onDestroy as cleanup is now handled in onMount's return

  async function fetchNotifications() {
    const userProfile = $profile;
    if (!userProfile) return;

    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let query = supabase
      .from("submissions")
      .select(
        "id, file_name, status, compliance_status, created_at, user_id, profiles:user_id (full_name, school_id)",
      )
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    // Scope by role
    if (userProfile.role === "Teacher") {
      query = query.eq("user_id", userProfile.id);
    }

    const { data, error } = await query;
    if (error || !data) return;

    // Define a type for the submission data
    type SubmissionData = {
      id: string;
      file_name: string;
      status: string;
      compliance_status: string;
      created_at: string;
      user_id: string;
      profiles: { full_name: string; school_id: string } | null;
    };

    // Load read IDs from LocalStorage (with SSR safety)
    let readIds = new Set<string>();
    if (browser) {
      const storedReadIds: string[] = JSON.parse(
        localStorage.getItem("evision_read_notifications") || "[]",
      );
      readIds = new Set<string>(storedReadIds);
    }

    const lateSubs = data.filter(
      (s: SubmissionData) =>
        s.status === "Late" ||
        s.compliance_status === "late" ||
        s.status === "Non-compliant" ||
        s.compliance_status === "missing",
    );

    notifications = lateSubs.map((s: SubmissionData) => ({
      // Use SubmissionData type
      id: `notif-${s.id}`,
      type:
        s.status === "Late" || s.compliance_status === "late"
          ? "late"
          : "compliance",
      title: s.status === "Late" ? "Late Submission" : "Non-Compliant",
      message: `${s.profiles?.full_name || "Unknown"} — ${s.file_name}`, // Removed 'as any'
      timestamp: new Date(s.created_at),
      read: readIds.has(`notif-${s.id}`),
    }));
  }

  function markAsRead(id: string) {
    notifications = notifications.map((n: Notification) =>
      n.id === id ? { ...n, read: true } : n,
    );

    // Persist to LocalStorage
    if (browser) {
      const readIds: string[] = notifications
        .filter((n: Notification) => n.read)
        .map((n: Notification) => n.id);
      localStorage.setItem(
        "evision_read_notifications",
        JSON.stringify(readIds),
      );
    }
  }

  function markAllAsRead() {
    // Renamed from markAllRead
    notifications = notifications.map((n: Notification) => ({
      ...n,
      read: true,
    }));

    // Persist to LocalStorage
    if (browser) {
      const readIds: string[] = notifications.map((n: Notification) => n.id);
      localStorage.setItem(
        "evision_read_notifications",
        JSON.stringify(readIds),
      );
    }
  }

  function toggleMenu(e: MouseEvent) {
    // New function for bell button click
    e.stopPropagation(); // Prevent immediate closing by handleClickOutside
    isOpen = !isOpen;
  }

  function handleKeydown(e: KeyboardEvent) {
    // New function for keyboard accessibility
    if (e.key === "Escape") isOpen = false;
  }

  // Updated handleClickOutside to use dropdownRef
  function handleClickOutside(e: MouseEvent) {
    if (isOpen && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      isOpen = false;
    }
  }
</script>

```
<svelte:window onkeydown={handleKeydown} onclick={handleClickOutside} />

<div class="relative inline-block" bind:this={dropdownRef}>
  <!-- Bell Icon -->
  <button
    class="relative p-2.5 rounded-xl transition-all duration-300 transform active:scale-95
            {isOpen
      ? 'bg-deped-blue text-white shadow-md shadow-deped-blue/20'
      : 'glass-card hover:bg-white/60 text-text-secondary'}"
    onclick={toggleMenu}
    aria-label="Notifications"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>

    {#if unreadCount > 0}
      <span
        class="absolute top-2 right-2 flex h-4 w-4 transform translate-x-1 -translate-y-1"
      >
        <span
          class="animate-ping absolute inline-flex h-full w-full rounded-full bg-deped-red opacity-75"
        ></span>
        <span
          class="relative inline-flex rounded-full h-4 w-4 bg-deped-red text-[10px] items-center justify-center text-white font-bold"
        >
          {unreadCount}
        </span>
      </span>
    {/if}
  </button>

  <!-- Dropdown -->
  {#if isOpen}
    <div
      class="absolute right-0 mt-3 w-80 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-elevated z-50 overflow-hidden"
      in:fly={{ y: 10, duration: 300, easing: quintOut }}
      out:fade={{ duration: 200 }}
    >
      <div
        class="px-5 py-4 border-b border-gray-100 flex justify-between items-center"
      >
        <h3 class="font-bold text-text-primary">Notifications</h3>
        {#if unreadCount > 0}
          <button
            onclick={markAllAsRead}
            class="text-xs font-semibold text-deped-blue hover:underline"
          >
            Mark all as read
          </button>
        {/if}
      </div>

      {#if notifications.length === 0}
        <div class="p-8 text-center">
          <p class="text-3xl mb-2">🔔</p>
          <p class="text-sm text-text-muted font-medium">No notifications</p>
        </div>
      {:else}
        <div class="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {#each notifications as notif (notif.id)}
            <button
              class="w-full text-left px-5 py-3 hover:bg-white/60 transition-colors {notif.read
                ? 'opacity-50'
                : 'bg-deped-blue/[0.03]'}"
              onclick={() => markAsRead(notif.id)}
            >
              <div class="flex items-start gap-3">
                <span class="text-lg flex-shrink-0 mt-0.5">
                  {notif.type === "late" ? "⏰" : "⚠️"}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-text-primary">
                    {notif.title}
                  </p>
                  <p class="text-xs text-text-secondary mt-0.5 truncate">
                    {notif.message}
                  </p>
                  <p class="text-[10px] text-text-muted mt-1">
                    {notif.timestamp.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                {#if !notif.read}
                  <span
                    class="w-2 h-2 rounded-full bg-deped-blue flex-shrink-0 mt-2"
                  ></span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
