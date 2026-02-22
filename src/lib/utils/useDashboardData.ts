/**
 * Dashboard Data Utilities
 * Shared compliance calculation helpers for all 4 dashboards.
 */

const ACADEMIC_YEAR_START = new Date('2025-08-01');

export interface ComplianceStats {
  Compliant: number;
  Late: number;
  NonCompliant: number;
  totalUploaded: number;
  expected: number;
  rate: number; // 0-100
}

export interface WeeklyData {
  week: number;
  label: string;
  Compliant: number;
  Late: number;
  NonCompliant: number;
  rate: number;
  docs: number;
}

export function calculateCompliance(
  submissions: { status?: string; compliance_status?: string; created_at?: string }[],
  teachingLoadsCount: number = 0,
  deadlineDate?: string | Date
): ComplianceStats {
  // Expected is based on teaching loads if provided, otherwise count of unique submissions
  const expected = teachingLoadsCount > 0 ? teachingLoadsCount : (submissions.length || 0);

  let compliantCount = 0;
  let lateCount = 0;

  if (submissions && submissions.length > 0) {
    for (const s of submissions) {
      const cs = s.compliance_status?.toLowerCase() || mapStatusToCompliance(s.status);
      if (cs === 'compliant' || cs === 'on-time') compliantCount++;
      else if (cs === 'late') lateCount++;
    }
  }

  const uploadedCount = compliantCount + lateCount;
  let nonCompliantCount = 0;

  // If deadline passed OR no deadline provided, missing records are non-compliant
  const now = new Date();
  const deadline = deadlineDate ? new Date(deadlineDate) : null;

  if (!deadline || now > deadline) {
    nonCompliantCount = Math.max(0, expected - uploadedCount);
  } else {
    // If deadline is in the future, we still count missing as "Non-Compliant" for passed-week charts
    // but maybe the UI handles "current" week differently? 
    // Spec says: "If a chart is rendering data for a week that has passed and no submission exists, it must explicitly count that as Non-Compliant"
    // For the CURRENT week, if it's not yet non-compliant technically, we still follow the 3-pole.
    nonCompliantCount = Math.max(0, expected - uploadedCount);
  }

  // Compliance Rate is Compliant / Expected
  const rate = expected > 0 ? Math.round((compliantCount / expected) * 100) : 0;

  return {
    Compliant: compliantCount,
    Late: lateCount,
    NonCompliant: nonCompliantCount,
    totalUploaded: uploadedCount,
    expected,
    rate
  };
}

/** Fallback: derive compliance from status column if compliance_status is absent */
function mapStatusToCompliance(status?: string): string {
  if (status === 'Compliant') return 'compliant';
  if (status === 'Late') return 'late';
  return 'non-compliant';
}

export function getWeekNumber(date: Date = new Date()): number {
  const diff = date.getTime() - ACADEMIC_YEAR_START.getTime();
  const week = Math.ceil(diff / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, week);
}

export function getComplianceColor(rate: number): string {
  if (rate >= 80) return '#008751'; // green
  if (rate >= 50) return '#FCD116'; // yellow
  return '#CE1126'; // red
}

export function getComplianceClass(rate: number): string {
  if (rate >= 80) return 'text-deped-green';
  if (rate >= 50) return 'text-deped-gold-dark';
  return 'text-deped-red';
}

export function getComplianceBgClass(rate: number): string {
  if (rate >= 80) return 'bg-deped-green/15';
  if (rate >= 50) return 'bg-deped-gold/15';
  return 'bg-deped-red/15';
}

export function getTrendDirection(current: number, previous: number): 'up' | 'down' | 'stable' {
  const diff = current - previous;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'stable';
}

export function getTrendIcon(dir: 'up' | 'down' | 'stable'): string {
  if (dir === 'up') return '↑';
  if (dir === 'down') return '↓';
  return '→';
}

export function groupSubmissionsByWeek(
  submissions: { created_at: string; status?: string; compliance_status?: string; week_number?: number }[],
  teachingLoadsCount: number = 0,
  weekCount = 8,
  calendarDeadlines: any[] = []
): WeeklyData[] {
  const currentWeek = getWeekNumber();
  const weeks: WeeklyData[] = [];

  // If calendar deadlines are provided, use those as the "weeks"
  if (calendarDeadlines.length > 0) {
    // Sort by week number descending
    const sorted = [...calendarDeadlines].sort((a, b) => b.week_number - a.week_number).slice(0, weekCount);
    for (const cal of sorted) {
      const weekSubs = submissions.filter(s => s.week_number === cal.week_number);
      const stats = calculateCompliance(weekSubs, teachingLoadsCount, cal.deadline_date);
      weeks.push({
        week: cal.week_number,
        label: `W${cal.week_number}`,
        Compliant: stats.Compliant,
        Late: stats.Late,
        NonCompliant: stats.NonCompliant,
        rate: stats.rate,
        docs: weekSubs.length
      });
    }
    return weeks.reverse(); // Back to ascending for the chart
  }

  // Fallback to old behavior if no calendar provided
  for (let i = weekCount - 1; i >= 0; i--) {
    const wk = currentWeek - i;
    if (wk < 1) continue;
    const weekSubs = submissions.filter(s => {
      if (s.week_number) return s.week_number === wk;
      return getWeekNumber(new Date(s.created_at)) === wk;
    });
    const stats = calculateCompliance(weekSubs, teachingLoadsCount);
    weeks.push({
      week: wk,
      label: `W${wk}`,
      Compliant: stats.Compliant,
      Late: stats.Late,
      NonCompliant: stats.NonCompliant,
      rate: stats.rate,
      docs: weekSubs.length
    });
  }

  return weeks;
}

export function formatComplianceRate(rate: number): string {
  return `${Math.round(rate)}%`;
}
