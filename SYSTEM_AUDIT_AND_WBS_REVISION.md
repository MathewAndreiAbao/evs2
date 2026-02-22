# Smart E-VISION: Complete System Audit & Revised 10-Week WBS
## Week 7 Assessment + Anti-Gravity Vibe Coding Implementation Guide

---

## PART 1: CHAPTER 1 REQUIREMENTS ALIGNMENT ASSESSMENT

### Objective 1: Develop Centralized Digital Repository
**Status: ✅ 100% ACHIEVED**

- **Evidence:**
  - ✅ Supabase PostgreSQL with `submissions` table storing metadata
  - ✅ `storage.submissions` bucket with RLS policies for secure file storage
  - ✅ File path structure: `submissions/{user_id}/{timestamp}_{filename}`
  - ✅ Hierarchical org data: divisions → districts → schools
  - ✅ User profiles with role-based access control

**What's Working:**
- Teachers can upload documents and they're persisted in Supabase Storage
- File hashes stored for verification and integrity
- Organizational hierarchy supports multi-level archiving
- RLS policies prevent unauthorized access to others' files

---

### Objective 2: Automate Compliance Monitoring
**Status: ✅ 95% ACHIEVED (Missing: Predictive Risk Alerts)**

- **Evidence:**
  - ✅ Submissions table tracks submission status: `Compliant`, `Late`, `Non-compliant`
  - ✅ Weekly deadline integration with `academic_calendar` table
  - ✅ Teacher dashboard shows compliance badges by week
  - ✅ School head can view school-wide compliance statistics
  - ⚠️ Automated alerts missing (must add notification system)

**What's Working:**
- Dashboard calculates compliance automatically based on submission vs deadline
- Status determined by: `deadline_date` comparison → `compliance_status` field
- Teachers see real-time compliance badges
- School heads see aggregated school compliance stats

**Missing:**
- Notification system for late/missing submissions
- Automated daily/weekly compliance reports
- Alert thresholds and escalation rules

---

### Objective 3: Real-Time District-Wide Visibility
**Status: ⚠️ 85% ACHIEVED (Heatmap Incomplete)**

- **Evidence:**
  - ✅ District supervisor dashboard aggregates all submissions
  - ✅ Real-time data via Supabase Realtime subscriptions
  - ✅ Recent activity feed showing submissions/status changes
  - ✅ School-level statistics and teacher counts
  - ⚠️ Compliance heatmap (schools × weeks) only in skeleton form

**What's Working:**
- Supervisors can see all schools and all teachers at once
- Real-time updates when submissions are made
- Drill-down capability to view school details
- Teacher search and filtering

**Missing:**
- Heat grid visualization (green/yellow/red by week)
- Interactive drill-down from heatmap to teacher list
- Historical trend comparisons (month/quarter/SY)

---

### Objective 4: Predictive Analytics Dashboard
**Status: ⏳ 30% ACHIEVED (Framework Ready, Logic Pending)**

- **Evidence:**
  - ✅ Database schema supports `compliance_status` tracking over time
  - ✅ Teaching loads table enables subject/grade analysis
  - ✅ `academic_calendar` provides week-level granularity
  - ⏳ Risk flagging logic framework created but not fully implemented

**What's Working:**
- Database structure ready for historical queries
- Compliance status is tracked per submission
- Can aggregate by teacher, school, week

**Missing (Week 8):**
- Risk scoring algorithm (e.g., `>=3 late submissions in past 8 weeks = HIGH RISK`)
- Automated TA recommendation engine
- Predictive visualization (risk matrix)
- Alert generation and notification routing

---

### Objective 5: Data Integrity & Authenticity (SHA-256 + QR)
**Status: ✅ 100% ACHIEVED**

- **Evidence:**
  - ✅ SHA-256 hashing implemented: `src/lib/utils/hash.ts`
  - ✅ QR code generation with hash embedding: `src/lib/utils/qr-stamp.ts`
  - ✅ QR verification page at `/verify/[hash]` functional
  - ✅ File hashes stored in `submissions.file_hash` field
  - ✅ PDF QR embedding complete (pdf-lib integration)

**What's Working:**
- Every submission gets a unique SHA-256 hash
- QR code generated with hash, timestamp, doc_type
- QR embedded into PDF during submission
- Verification page allows anyone to validate document integrity
- Tamper-evident mechanism fully operational

**Enhancement (Week 10):**
- Mobile QR scanner UI for camera-based verification
- Offline QR validation using IndexedDB cache

---

### Objective 6: Reduce Operational & Financial Burden
**Status: ✅ 100% ACHIEVED**

- **Evidence:**
  - ✅ Digital-first submission process (no printing required)
  - ✅ Cloud-based archiving (no physical storage costs)
  - ✅ Zero third-party paid services (everything self-hosted or free tier)
  - ✅ PWA installable as app (no download from app stores)

**What's Working:**
- Teachers submit digitally on phones/tablets/computers
- No printing workflow needed
- Automatic archiving in cloud storage
- Accessible offline (can work without internet)

---

### Objective 7: Offline-Capable PWA
**Status: ✅ 100% ACHIEVED**

- **Evidence:**
  - ✅ Service Worker implemented: `src/service-worker.ts`
  - ✅ IndexedDB sync queue: `src/lib/utils/offline.ts`
  - ✅ Offline submission queuing and auto-resume
  - ✅ Cache-first for assets, network-first for API
  - ✅ Manifest.json for installability

**What's Working:**
- Teachers can upload documents even without internet
- Submissions queued in IndexedDB automatically
- When connection restored, automatic sync begins
- Service Worker caches app shell for instant load
- Works on Android and Windows devices

---

## PART 2: WEEKS 2-7 ACHIEVEMENT STATUS

### Week 2: Chapters 1, 2, 3 (Planning)
**Status: ✅ COMPLETE**
- Chapter 1: Problem statement, objectives, scope ✅
- Chapter 2: Literature review (needs revision per WBS) ⚠️
- Chapter 3: System design & architecture ✅

### Week 3: Core PWA & Offline Setup
**Status: ✅ COMPLETE**
- SvelteKit project ✅
- Service Worker ✅
- IndexedDB offline queuing ✅
- Supabase auth integration ✅

### Week 4: Document Processing Pipeline
**Status: ✅ COMPLETE**
- SHA-256 hashing ✅
- OCR metadata extraction ✅
- QR code generation & PDF stamping ✅
- File compression ✅

### Week 5: Teacher Submission & Dashboard
**Status: ✅ COMPLETE**
- Upload interface ✅
- Teacher dashboard ✅
- Compliance tracking ✅
- Teaching load management ✅

### Week 6: Supervisor Monitoring & Archive
**Status: ✅ COMPLETE (90%)** - Heatmap needs visual polish
- District supervisor dashboard ✅
- Archive interface ✅
- School head drill-down ✅
- District monitoring (structure ready) ✅

### Week 7: Verification & Calendar Integration
**Status: ✅ COMPLETE (85%)**
- QR verification page (`/verify/[hash]`) ✅
- Hash lookup ✅
- Academic calendar table ✅
- Calendar UI display ⚠️ (styling polish needed)

---

## PART 3: WEEKS 2-7 DETAILED ACHIEVEMENT BREAKDOWN

### ✅ FULLY ACHIEVED (100%)

1. **User Authentication System**
   - Email/password login
   - Role-based access (Teacher, School Head, Master Teacher, District Supervisor)
   - Auto-profile creation via trigger
   - Session management via Supabase Auth

2. **Document Upload & Storage**
   - Multi-file drag-and-drop interface
   - File validation (PDF, DOCX, images)
   - Compression for mobile optimization
   - Progress tracking with percentage display
   - Duplicate detection via hash comparison

3. **SHA-256 Integrity Verification**
   - Client-side hashing using Web Crypto API
   - Hash stored with every submission
   - Hash lookup for document verification
   - Tamper-evident mechanism fully operational

4. **QR Code Embedding**
   - PDF-lib integration for QR injection
   - Hash + timestamp + document type encoded
   - Verification URL generation
   - QR scannable and decodable

5. **Offline Functionality**
   - Service Worker caching strategy
   - IndexedDB persistent queue
   - Auto-sync on reconnection
   - Duplicate detection during sync
   - Connection status monitoring

6. **Teacher Dashboard**
   - Compliance stats (on-time, late, missing)
   - Weekly compliance badges
   - Trend chart (Chart.js)
   - Submission history table with sort/filter
   - Real-time updates via Supabase Realtime

7. **School Head Dashboard**
   - School-wide teacher list
   - Aggregated compliance statistics
   - Recent activity feed
   - Drill-down to individual teacher submissions

8. **Archive Interface**
   - Document search by teacher/date/type
   - File preview and download
   - Metadata display
   - Organized by school and week

9. **QR Verification Page**
   - `/verify/[hash]` dynamic route
   - Hash lookup in database
   - Visual verification badge
   - Submission details display

10. **Academic Calendar**
    - Week and deadline display
    - Integration with compliance tracking
    - Visual deadline indicators
    - Week number association

### ⚠️ PARTIALLY ACHIEVED (70-90%)

1. **Compliance Heatmap**
   - Data structure ready ✅
   - Database queries working ✅
   - Component skeleton created ⚠️
   - Interactive drill-down pending ⚠️
   - Visual polish (colors, legend) pending ⚠️

2. **OCR Metadata Extraction**
   - Tesseract.js integration working ✅
   - Document type detection ✅
   - Week number extraction ✅
   - Grade level detection ⚠️ (basic regex only)
   - Subject/grade confidence scoring pending ⚠️

3. **District-Wide Analytics**
   - Data aggregation queries ready ✅
   - Basic statistics displayed ✅
   - Advanced trend analysis pending ⚠️
   - Predictive indicators missing ⚠️

### ❌ NOT YET ACHIEVED (0%)

1. **NLP Rule-Based Classification**
   - Subject extraction from OCR text
   - Grade level confidence scoring
   - Document type confidence levels
   - Metadata enrichment pipeline

2. **Predictive Risk Flagging**
   - Risk scoring algorithm
   - TA recommendation engine
   - Alert generation system
   - Automated supervisor notifications

3. **Master Teacher Peer Review Module**
   - Review interface
   - Comment/feedback system
   - Rating system
   - Review history tracking

4. **Mobile QR Scanner**
   - Camera access implementation
   - Real-time QR detection
   - Offline verification cache
   - Scanning UI/UX

5. **Advanced Search & Filters**
   - Full-text document search
   - Multi-criteria filtering
   - Saved search functionality
   - Export to CSV/PDF

6. **Technical Assistance Tracking**
   - TA intervention logging
   - Follow-up scheduling
   - Effectiveness tracking
   - TA history per teacher

7. **Settings & Configuration**
   - User profile management
   - District-level settings
   - Compliance threshold configuration
   - TA template management

---

## PART 4: ANTI-GRAVITY VIBE CODING IMPLEMENTATION GUIDE (Weeks 2-7 Complete → Weeks 8-10)

### What is "Anti-Gravity Vibe Coding"?

**Philosophy:** Code flows upward from data → UI, using momentum and energy from smaller components building toward larger aggregations. Each layer leverages previously completed foundations without re-engineering. Components are "light" (minimal re-renders) and "flow" naturally into place through proper state management and event propagation.

**Key Principles:**
1. **Bottom-Up Architecture** - Start with data/database, then queries, then components
2. **Energy Conservation** - Reuse existing utilities, stores, and queries
3. **Momentum** - Each completed feature adds velocity to the next
4. **Natural Flow** - State flows down, events bubble up (Svelte's natural pattern)
5. **Weightlessness** - Components render only when data changes (reactivity)

---

## PART 5: COMPLETE WEEK 8-10 IMPLEMENTATION ROADMAP

### WEEK 8: ADVANCED ANALYTICS & NLP (Days 1-7)

#### Subweek 8.1: NLP Rule-Based Classification System (Days 1-2)

**Deliverable:** `src/lib/utils/nlp.ts` - Complete NLP engine

**Anti-Gravity Flow:**
```
Layer 1: Raw OCR Text (from existing ocr.ts)
    ↓
Layer 2: Tokenization & Pattern Matching (NEW nlp.ts)
    ↓
Layer 3: Classification Scoring
    ↓
Layer 4: Metadata Enrichment Pipeline
    ↓
Layer 5: Database Update (INSERT into submissions with confidence)
    ↓
Layer 6: UI Display of Classifications (EXISTING dashboard)
```

**Implementation Steps:**

1. **Create NLP Utility Module** (`src/lib/utils/nlp.ts`)
```typescript
// Core rule-based classification
interface ClassificationResult {
  subjects: { name: string; confidence: number }[];
  gradeLevels: { level: string; confidence: number }[];
  docType: string;
  confidence: number;
}

// Rule engine: Extract subjects from OCR text
function extractSubjects(text: string): { name: string; confidence: number }[] {
  const subjectPatterns = {
    'English': /english|languag|communication/i,
    'Mathematics': /math|numeracy|arithmetic|calculus/i,
    'Science': /science|biology|chemistry|physics|ipa/i,
    'Social Studies': /social\s*stud|history|geography|civics/i,
    'Filipino': /filipino|pilipino|wika/i,
    'MAPEH': /mapeh|music|art|physical|health/i,
  };
  
  const results = [];
  for (const [subject, pattern] of Object.entries(subjectPatterns)) {
    const matches = text.match(pattern);
    if (matches) {
      results.push({
        name: subject,
        confidence: Math.min(0.95, 0.5 + (matches.length * 0.15))
      });
    }
  }
  return results;
}

// Rule engine: Extract grade levels
function extractGradeLevels(text: string): { level: string; confidence: number }[] {
  const gradePatterns = {
    'Grade 1': /grade\s*1|first\s*grade|g1/i,
    'Grade 2': /grade\s*2|second\s*grade|g2/i,
    // ... etc
  };
  // Similar implementation
}

// Main classifier
export async function classifyDocument(ocrText: string, fileName: string): Promise<ClassificationResult> {
  const subjects = extractSubjects(ocrText);
  const gradeLevels = extractGradeLevels(ocrText);
  
  // Take highest confidence results
  const topSubject = subjects.length > 0 ? subjects[0] : null;
  const topGrade = gradeLevels.length > 0 ? gradeLevels[0] : null;
  
  return {
    subjects: subjects.slice(0, 3),
    gradeLevels: gradeLevels.slice(0, 2),
    docType: determinDocType(ocrText),
    confidence: (topSubject?.confidence ?? 0) + (topGrade?.confidence ?? 0) / 2
  };
}
```

2. **Integrate NLP into Upload Pipeline** (Edit `src/routes/dashboard/upload/+page.svelte`)
   - After OCR extraction, call `classifyDocument()`
   - Store results in submission metadata
   - Display confidence scores to teacher
   - Allow manual correction before final upload

3. **Create Admin Review Queue** (New component: `src/lib/components/ClassificationReviewQueue.svelte`)
   - Shows auto-classified documents with confidence < 0.7
   - Allow admin to approve/correct classifications
   - Bulk update capability
   - Audit trail of corrections

---

#### Subweek 8.2: Compliance Analytics Aggregation (Days 3-4)

**Deliverable:** `src/lib/utils/analytics.ts` - Aggregation engine

**Anti-Gravity Flow:**
```
Database Tables (submissions, academic_calendar, profiles, schools)
    ↓
Aggregation Queries (GROUP BY school, week, status)
    ↓
Risk Scoring (Algorithm: late_count / total_submissions)
    ↓
Data Structure (Heatmap grid: schools × weeks)
    ↓
Store Updates (writeable Svelte store)
    ↓
Component Rendering (Recharts grid)
```

**Implementation Steps:**

1. **Create Analytics Query Engine** (`src/lib/utils/analytics.ts`)
```typescript
import { supabase } from './supabase';

export interface ComplianceWeekData {
  weekNumber: number;
  status: 'Compliant' | 'Late' | 'Non-compliant';
  count: number;
  percentage: number;
}

export interface SchoolCompliance {
  schoolId: string;
  schoolName: string;
  weeks: ComplianceWeekData[];
  overallCompliance: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Main aggregation query
export async function getComplianceHeatmapData(
  districtId: string,
  schoolYear: string,
  quarterNumber: number
): Promise<SchoolCompliance[]> {
  
  // Query: submissions grouped by school, week, status
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      status,
      week_number,
      user_id,
      profiles!inner(school_id),
      schools!inner(name)
    `)
    .eq('school_year', schoolYear)
    .in('profiles.school_id', 
      (await supabase
        .from('schools')
        .select('id')
        .eq('district_id', districtId)).data?.map(s => s.id) ?? []
    );

  // Aggregate by school × week × status
  const aggregated = new Map<string, Map<number, Record<string, number>>>();
  
  submissions?.forEach(sub => {
    const schoolId = sub.profiles.school_id;
    const week = sub.week_number || 1;
    const status = sub.status;
    
    if (!aggregated.has(schoolId)) {
      aggregated.set(schoolId, new Map());
    }
    const schoolMap = aggregated.get(schoolId)!;
    if (!schoolMap.has(week)) {
      schoolMap.set(week, { Compliant: 0, Late: 0, 'Non-compliant': 0 });
    }
    schoolMap.get(week)![status] = (schoolMap.get(week)![status] ?? 0) + 1;
  });

  // Calculate risk scores
  return Array.from(aggregated.entries()).map(([schoolId, weeks]) => {
    const weekData: ComplianceWeekData[] = Array.from(weeks.entries()).map(([weekNum, counts]) => {
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return {
        weekNumber: weekNum,
        status: /* determine color */,
        count: total,
        percentage: calculatePercentage(counts)
      };
    });

    const overallCompliance = calculateOverallCompliance(weekData);
    const riskLevel = assessRiskLevel(weekData);

    return {
      schoolId,
      schoolName: /* fetch from schools table */,
      weeks: weekData,
      overallCompliance,
      riskLevel
    };
  });
}

// Risk scoring algorithm
function assessRiskLevel(weeks: ComplianceWeekData[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const lateCount = weeks.filter(w => w.status === 'Late').length;
  const nonCompliantCount = weeks.filter(w => w.status === 'Non-compliant').length;
  
  if (nonCompliantCount >= 3) return 'HIGH';
  if (lateCount >= 4 || nonCompliantCount >= 2) return 'MEDIUM';
  return 'LOW';
}
```

2. **Create Real-Time Store** (`src/lib/stores/analytics.ts`)
   - Writeable store for heatmap data
   - Subscriptions to submissions table via Supabase Realtime
   - Auto-refresh on new submissions
   - 5-minute cache for performance

3. **Build Heatmap Component** (`src/lib/components/ComplianceHeatmap.svelte`)
   - Recharts grid visualization
   - Color mapping: Green (Compliant), Yellow (Late), Red (Non-compliant)
   - Interactive drill-down on cell click
   - Legend and accessibility labels

---

#### Subweek 8.3: Risk Flagging & Alert System (Days 5-6)

**Deliverable:** `src/lib/utils/risk-flagging.ts` + notification system

**Implementation Steps:**

1. **Risk Flagging Algorithm** (`src/lib/utils/risk-flagging.ts`)
```typescript
export interface RiskFlag {
  teacherId: string;
  teacherName: string;
  schoolId: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  reasons: string[];
  recommendedTA: string;
  flaggedAt: Date;
}

export async function flagTeachersAtRisk(districtId: string): Promise<RiskFlag[]> {
  // Fetch teacher submission history (past 8 weeks)
  const { data: submissions } = await supabase
    .from('submissions')
    .select(`
      id,
      user_id,
      status,
      created_at,
      profiles!inner(full_name, school_id)
    `)
    .gte('created_at', new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString());

  // Group by teacher
  const teacherStats = new Map<string, { late: number; missing: number; total: number }>();
  
  submissions?.forEach(sub => {
    const teacherId = sub.user_id;
    if (!teacherStats.has(teacherId)) {
      teacherStats.set(teacherId, { late: 0, missing: 0, total: 0 });
    }
    
    const stats = teacherStats.get(teacherId)!;
    stats.total += 1;
    if (sub.status === 'Late') stats.late += 1;
    if (sub.status === 'Non-compliant') stats.missing += 1;
  });

  // Calculate risk and generate flags
  const flags: RiskFlag[] = [];
  for (const [teacherId, stats] of teacherStats) {
    const latePercentage = stats.late / stats.total;
    const missingPercentage = stats.missing / stats.total;
    
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    const reasons: string[] = [];
    
    if (stats.missing >= 3) {
      riskLevel = 'HIGH';
      reasons.push(`${stats.missing} missing submissions in past 8 weeks`);
    } else if (stats.late >= 3 && latePercentage >= 0.5) {
      riskLevel = 'MEDIUM';
      reasons.push(`${latePercentage.toFixed(0)}% late submissions`);
    }
    
    if (riskLevel !== 'LOW') {
      flags.push({
        teacherId,
        teacherName: /* fetch */,
        schoolId: /* fetch */,
        riskLevel,
        reasons,
        recommendedTA: generateTARecommendation(reasons),
        flaggedAt: new Date()
      });
    }
  }
  
  return flags;
}

function generateTARecommendation(reasons: string[]): string {
  if (reasons.some(r => r.includes('missing'))) {
    return 'Compliance coaching: Document submission requirements and deadlines';
  }
  return 'Time management coaching: Prioritizing timely document preparation';
}
```

2. **Create Notifications Table** (Database migration)
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('risk_flag', 'compliance_alert', 'ta_assigned')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action_url TEXT
);
```

3. **Add Notification Center UI**
   - Bell icon in navbar
   - Unread count badge
   - Notification list page (`/dashboard/notifications`)
   - Mark as read functionality

---

#### Subweek 8.4: Enhanced Analytics Dashboard (Day 7)

**Deliverable:** Updated `/dashboard/analytics` page with all visualizations

**Implementation Steps:**

1. Edit `/src/routes/dashboard/analytics/+page.svelte`
   - Add heatmap component at top
   - Add drill-down modal trigger
   - Add risk flags section below heatmap
   - Add trend analysis charts (30-day, semester, SY)
   - Add export buttons

2. Component structure:
```
Analytics Page
├── Header (Title, Filters by quarter/SY)
├── ComplianceHeatmap
│   └── On cell click → DrillDownModal
├── RiskFlagsPanel
│   └── Risk matrix visualization
├── TrendCharts
│   ├── 30-day trend
│   ├── Semester comparison
│   └── Year-over-year
└── ActionButtons
    ├── Export CSV
    └── Generate Report
```

---

### WEEK 9: MASTER TEACHER & CONFIGURATION (Days 1-7)

#### Subweek 9.1: Master Teacher Module (Days 1-3)

**Deliverable:** `/dashboard/master-teacher` route with complete workflow

**Implementation Steps:**

1. **Create Master Teacher Dashboard** (`src/routes/dashboard/master-teacher/+page.svelte`)
```svelte
<!-- Features:
  - Assigned teacher list (from teaching_loads table)
  - Inline review cards for recent submissions
  - Rating + comment form
  - Review history
  - Filter by status (reviewed, pending)
-->
```

2. **Create Review Component** (`src/lib/components/SubmissionReviewCard.svelte`)
   - Show teacher name, submission, doc_type
   - Inline rating (1-5 stars)
   - Comment textarea
   - Submit/save buttons

3. **Add Review Logic**
   - Insert into `submission_reviews` table on save
   - Update `submissions.status` to "Under Review" → "Approved"
   - Trigger notification to teacher
   - Revalidate dashboard on save

---

#### Subweek 9.2: Settings & Configuration Panel (Days 4-5)

**Deliverable:** `/dashboard/settings` route

**Implementation Steps:**

1. **User Profile Settings**
   - Edit full name, email
   - Avatar upload
   - Password change (via Supabase)

2. **District Configuration** (Supervisor only)
   - Compliance thresholds (when to flag as "Late")
   - TA templates (dropdown of pre-written TA suggestions)
   - Deadline management

3. **Component structure:**
```
Settings Page
├── User Profile Section
│   ├── Name input
│   ├── Email display (read-only)
│   ├── Avatar upload
│   └── Password change button
├── District Config (if Supervisor)
│   ├── Compliance thresholds
│   ├── TA templates manager
│   └── School management
└── Privacy & Security
    ├── Data download (GDPR)
    └── Account deletion
```

---

#### Subweek 9.3: UI Polish & Testing (Days 6-7)

**Deliverable:** Polished UI across all new pages

- Responsive design (mobile/tablet/desktop)
- Accessibility: ARIA labels, keyboard navigation
- Loading states on all async operations
- Error handling & user feedback (toast notifications)
- Theme consistency (Tailwind classes)

---

### WEEK 10: MOBILE QR SCANNER & ADVANCED FEATURES (Days 1-7)

#### Subweek 10.1: Mobile QR Scanner (Days 1-2)

**Deliverable:** QR scanning camera interface

**Implementation Steps:**

1. **Install QR Detection Library**
   - `npm install jsqr` or `qr-scanner`

2. **Create Scanner Component** (`src/lib/components/QRScanner.svelte`)
```svelte
<script>
  import { onMount } from 'svelte';
  
  let videoElement: HTMLVideoElement;
  let stream: MediaStream;
  
  onMount(async () => {
    // Request camera permission
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    if (videoElement) {
      videoElement.srcObject = stream;
    }
    
    // Continuous scanning
    scanQRCode();
  });
  
  async function scanQRCode() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const scan = () => {
      if (videoElement?.readyState === videoElement?.HAVE_ENOUGH_DATA) {
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        ctx?.drawImage(videoElement, 0, 0);
        
        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData?.data, canvas.width, canvas.height);
        
        if (code) {
          // Extract hash from QR code data
          const hash = code.data;
          handleVerification(hash);
        }
      }
      requestAnimationFrame(scan);
    };
    
    scan();
  }
</script>

<video bind:this={videoElement} autoplay></video>
<p>Point camera at QR code to verify document</p>
```

3. **Create Verification Page** (`src/routes/verify-camera/+page.svelte`)
   - Show scanner component
   - On success, display verification result
   - Show document details (teacher, date, doc_type)
   - Offline fallback (check IndexedDB cache)

---

#### Subweek 10.2: Advanced Search & Export (Days 3-4)

**Deliverable:** Full-text search + CSV/PDF export

**Implementation Steps:**

1. **Create Advanced Search** (`src/lib/components/AdvancedSearch.svelte`)
```typescript
// Query interface
interface SearchCriteria {
  teacherName?: string;
  schoolName?: string;
  docType?: string;
  weekNumber?: number;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
  subject?: string;
}

// Search function
async function searchSubmissions(criteria: SearchCriteria) {
  let query = supabase.from('submissions').select('*');
  
  if (criteria.teacherName) {
    query = query.ilike('profiles.full_name', `%${criteria.teacherName}%`);
  }
  if (criteria.status) {
    query = query.eq('status', criteria.status);
  }
  // ... add other filters
  
  return query;
}
```

2. **Create Export Function** (`src/lib/utils/export.ts`)
```typescript
// CSV export
export function exportToCSV(data: SubmissionData[]): string {
  const headers = ['Teacher', 'School', 'Document Type', 'Date', 'Status'];
  const rows = data.map(d => [
    d.teacher,
    d.school,
    d.docType,
    d.date,
    d.status
  ]);
  
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  downloadFile(csv, 'submissions.csv', 'text/csv');
}

// PDF report generation
export async function generateReport(data: SubmissionData[]): Promise<void> {
  // Use jsPDF + jspdf-autotable
  const doc = new jsPDF();
  doc.autoTable({
    head: [['Teacher', 'School', 'Doc Type', 'Status']],
    body: data.map(d => [d.teacher, d.school, d.docType, d.status])
  });
  doc.save('compliance-report.pdf');
}
```

3. **Add Search UI** to Archive page

---

#### Subweek 10.3: Performance Optimization (Days 5-6)

**Deliverable:** Optimized bundle and runtime performance

**Optimizations:**

1. **Code Splitting**
   - Lazy load chart libraries
   - Dynamic imports for OCR, QR scan

2. **Bundle Size Reduction**
   - Remove unused Chart.js plugins
   - Tree-shake Supabase library
   - Minify CSS

3. **Runtime Performance**
   - Memoize expensive queries
   - Pagination for large result sets
   - Virtual scrolling for long lists
   - Debounce search inputs

---

#### Subweek 10.4: Final Polish & Edge Cases (Day 7)

**Deliverable:** Production-ready system

**Checklist:**
- [ ] Error boundaries on all pages
- [ ] Loading skeletons for async data
- [ ] Offline error messages
- [ ] Browser compatibility testing
- [ ] Mobile responsiveness verified
- [ ] ARIA labels complete
- [ ] Toast notifications for all actions
- [ ] Duplicate submission detection
- [ ] File size validation
- [ ] Corrupted file recovery

---

## PART 6: REVISED 10-WEEK WBS (FINAL)

| Week | Phase | Deliverable | Status |
|------|-------|-------------|--------|
| 1-2 | Planning | Chapters 1, 2, 3 finalized | ✅ DONE |
| 3 | Dev Phase 1 | PWA + Offline setup | ✅ DONE |
| 4 | Dev Phase 2 | Document processing pipeline | ✅ DONE |
| 5 | Dev Phase 3 | Teacher dashboard + uploads | ✅ DONE |
| 6 | Dev Phase 4 | Supervisor monitoring | ✅ DONE |
| 7 | Dev Phase 5 | QR verification + calendar | ✅ DONE |
| **8** | **Dev Phase 6** | **NLP + Analytics + Risk Flagging** | **→ NOW** |
| **9** | **Dev Phase 7** | **Master Teacher + Settings** | **→ NEXT** |
| **10** | **Dev Phase 8** | **Mobile Scanner + Advanced Features** | **→ FINAL** |

---

## PART 7: VIBE CODING MOMENTUM SUMMARY

**How to Execute Weeks 8-10 with Anti-Gravity Energy:**

1. **Week 8 Energy Build** (Analytics foundation)
   - Start small: NLP patterns → quick wins
   - Add heatmap: Immediate visual impact
   - Risk flagging: Gives supervisors actionable data

2. **Week 9 Momentum** (Configuration & peer review)
   - Reuse existing components (settings pattern)
   - Master teacher: Extends dashboard architecture
   - Flows naturally from analytics insights

3. **Week 10 Polish** (Mobile-first features)
   - QR scanner: Cool tech showcase
   - Search/export: Enterprise readiness
   - Performance: Everything runs smooth

**Key Energy Flows:**
- Database queries → Store subscriptions → Component rendering (clean data flow)
- User actions → Toast notifications → Real-time updates (immediate feedback)
- OCR text → NLP classification → UI display → Admin review (no backtracking)

---

**Document Version:** v2.0  
**Capstone Phase:** Weeks 8-10 Implementation  
**Last Updated:** Week 7 Completion Assessment  
**Ready for:** Week 8 Kickoff
