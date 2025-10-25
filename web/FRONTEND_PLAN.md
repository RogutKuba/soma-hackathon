# Frontend Planning Document - FreightFlow AP/AR Copilot

## Table of Contents

1. [Project Overview](#project-overview)
2. [Core Features](#core-features)
3. [User Flows](#user-flows)
4. [Page Structure](#page-structure)
5. [Component Architecture](#component-architecture)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [UI/UX Design](#uiux-design)
9. [Implementation Phases](#implementation-phases)
10. [Technical Stack](#technical-stack)

---

## Project Overview

### Purpose

FreightFlow is an automated BOL-to-Invoice matching system for freight/3PL operations. The frontend provides an intuitive interface for:

- **Viewing BOLs** synced from WMS/TMS systems
- **Uploading carrier invoices** (PDF)
- **Reviewing AI-parsed data** and smart matches
- **Flagging and resolving discrepancies**
- **Approving or disputing invoices**
- **Tracking cashflow** and analytics

### The "Wow" Factor

The demo should showcase:
1. **Upload invoice PDF** → AI extracts structured data in seconds
2. **Automatic matching** to existing BOL (exact or fuzzy)
3. **Instant discrepancy detection** with clear explanations
4. **Side-by-side comparison** of BOL vs Invoice charges
5. **One-click approval** or dispute workflows
6. **Transparent audit trail** via Daytona job logs

---

## Core Features

### 1. Dashboard Overview

**Purpose**: Single-page view of all critical information

**Sections**:
- **Header**: App title + "Upload Invoice" CTA
- **Left Column** (3 cards):
  - Unmatched Invoices
  - Flagged Items
  - Ready to Approve/Invoice
- **Right Column**:
  - Cashflow forecast chart (30-day view)
  - Activity feed (real-time updates)

### 2. Invoice Management

**Upload Flow**:
- Drag & drop PDF upload
- AI parsing progress indicator
- Parsed data preview (editable)
- Auto-trigger matching

**List Views**:
- Filter by status (unmatched, flagged, ready, approved)
- Sort by date, amount, carrier
- Bulk actions (approve multiple, export)

**Detail View**:
- Invoice metadata
- Extracted charges breakdown
- Matched BOL information
- Side-by-side comparison
- Flags with explanations
- Action buttons (approve, dispute, reject)

### 3. BOL Management

**List View**:
- All BOLs with status indicators
- Filter by status (awaiting_invoice, invoiced, disputed)
- Search by BOL number, carrier

**Detail View**:
- BOL metadata (route, dates, carrier)
- Expected charges
- Matched invoice (if exists)
- Timeline of actions

### 4. Matching Interface

**Smart Matching**:
- Automatic exact/fuzzy matching
- Confidence score display
- Manual BOL selection for low-confidence matches
- Re-run matching after BOL updates

**Comparison View**:
- Two-column layout (BOL | Invoice)
- Color-coded charge comparisons:
  - ✅ Green: Perfect match
  - ⚠️ Yellow: Variance
  - ❌ Red: Missing/unexpected charge
- Total variance calculation
- Flag chips with details

### 5. Flag System

**Flag Cards**:
- Color-coded by severity (high/med/low)
- Flag code + icon
- Clear explanation
- Context data (amounts, dates, etc.)
- Resolution actions

**Flag Types**:
- `DUPLICATE_INVOICE` - High severity, blocks approval
- `BOL_ALREADY_INVOICED` - High severity, blocks approval
- `AMOUNT_MISMATCH` - Med/High severity
- `UNEXPECTED_CHARGE` - Med severity
- `MISSING_CHARGE` - Low severity
- `NO_BOL_FOUND` - High severity
- `LOW_MATCH_CONFIDENCE` - High severity
- `CARRIER_MISMATCH` - High severity
- `CHARGE_VARIANCE` - Med severity
- `DATE_ANOMALY` - Low severity

### 6. Approval Workflow

**Ready to Approve**:
- List of clean invoices (no blocking flags)
- Quick approve button
- Batch approval for multiple invoices
- Notes field for approval

**Dispute Flow**:
- Pre-filled email template
- Discrepancy table
- Attach supporting documents
- Send to carrier

### 7. Analytics & Reporting

**Matching Stats**:
- Total invoices processed
- Match success rate (exact vs fuzzy)
- Common flags chart
- Carriers with most discrepancies

**Cashflow Forecast**:
- 30-day payables vs receivables
- Stacked area chart
- Expected vs actual amounts
- Working capital impact

**Activity Feed**:
- Real-time updates
- Invoice uploaded → parsed → matched → flagged/approved
- Daytona job links
- User actions

---

## User Flows

### Flow 1: Upload Clean Invoice (Happy Path)

```
User Action                    System Response
─────────────────────────────────────────────────────────
1. Click "Upload Invoice"   →  Open file picker
2. Select PDF                →  Upload progress bar
3. File uploaded             →  Show parsing progress
4. AI parsing complete       →  Display extracted data
                                 (editable preview modal)
5. Confirm data              →  Trigger matching job
6. Matching in progress      →  Loading state with Daytona link
7. Match complete            →  Navigate to detail view
                                 Status: "Ready to Approve"
                                 Show BOL comparison (all green ✅)
8. Click "Approve"           →  Confirmation modal
9. Confirm approval          →  Update status → "Approved"
                                 Show success toast
                                 Update BOL status → "Invoiced"
                                 Refresh dashboard
```

### Flow 2: Handle Flagged Invoice (Exception)

```
User Action                    System Response
─────────────────────────────────────────────────────────
1. Upload invoice            →  Parse → Match
2. Matching complete         →  Status: "Flagged"
                                 Show flags: AMOUNT_MISMATCH,
                                             UNEXPECTED_CHARGE
3. Click flagged invoice     →  Open detail view
                                 Side-by-side comparison
                                 Highlight discrepancies:
                                 - Detention $89 (unexpected)
                                 - Total: $1,089 vs $1,000 (BOL)

4. User options:

   Option A: Add Charge to BOL
   ─────────────────────────
   4a. Click "Add to BOL"    →  Open add charge modal
   5a. Enter: Detention, $89 →  Update BOL
   6a. Click "Re-match"      →  Re-run matching
   7a. Match clears          →  Status: "Ready to Approve"

   Option B: Dispute
   ─────────────────
   4b. Click "Dispute"       →  Open dispute modal
   5b. Review pre-filled     →  Email draft with:
       email                      - BOL vs Invoice table
                                  - Flag explanations
                                  - Requested corrections
   6b. Send email            →  Status: "Disputed"
                                 Email sent to carrier

   Option C: Approve Anyway
   ─────────────────────────
   4c. Click "Approve        →  Confirmation warning:
       Anyway"                   "Override 2 flags?"
   5c. Add notes             →  Explain approval reason
   6c. Confirm               →  Status: "Approved"
                                 Flags marked as "overridden"
```

### Flow 3: Manual BOL Matching

```
User Action                    System Response
─────────────────────────────────────────────────────────
1. Upload invoice            →  Parse complete
2. Match attempt             →  No BOL found (missing BOL #)
                                 Fuzzy match: confidence 0.65
                                 Status: "Flagged"
                                 Flag: LOW_MATCH_CONFIDENCE

3. Click invoice             →  Detail view shows:
                                 - Top 3 BOL candidates
                                 - Confidence scores
                                 - Key matching factors

4. Review candidates:        →  Compare:
   - BOL-784: 65% match          - Carrier: ACME (match ✅)
   - BOL-790: 42% match          - Amount: $1,145 (match ✅)
   - BOL-802: 38% match          - Date: ±3 days (close)

5. Select BOL-784            →  Re-run matching with selected BOL
6. Match complete            →  Full comparison displayed
                                 Status: "Matched" or "Flagged"
                                 (depending on charge comparison)
```

### Flow 4: BOL Management

```
User Action                    System Response
─────────────────────────────────────────────────────────
1. Navigate to BOLs tab      →  List of BOLs with status
                                 Filters: status, carrier, date

2. Filter: "Awaiting          →  Show BOLs without invoices
   Invoice"                      Highlight overdue (>7 days)

3. Click BOL-784             →  Detail view:
                                 - Route info
                                 - Expected charges
                                 - Status: "awaiting_invoice"
                                 - Days outstanding: 5

4. Invoice arrives later     →  (separate upload flow)
                                 Match to BOL-784
                                 BOL status → "invoiced"
```

---

## Page Structure

### Primary Pages

#### 1. `/` - Dashboard (Main View)

**Layout**: Single-page dashboard

**Sections**:
```
┌─────────────────────────────────────────────────────────┐
│ Header: FreightFlow + Upload Invoice Button            │
├───────────────────────────┬─────────────────────────────┤
│ Left Column (60%)         │ Right Column (40%)          │
├───────────────────────────┼─────────────────────────────┤
│ Card: Unmatched (count)   │ Cashflow Chart              │
│ - List items              │ - 30-day forecast           │
│ - "Try Fuzzy Match" CTA   │ - Payables vs Receivables   │
├───────────────────────────┤                             │
│ Card: Flagged (count)     │                             │
│ - List items with flags   │                             │
│ - Severity indicators     ├─────────────────────────────┤
├───────────────────────────┤ Activity Feed               │
│ Card: Ready to Approve    │ - Real-time updates         │
│ - List clean invoices     │ - Timeline view             │
│ - "Approve" buttons       │ - Daytona job links         │
└───────────────────────────┴─────────────────────────────┘
```

**Components**:
- `<DashboardHeader />` - Title + Upload button
- `<UnmatchedInvoicesCard />` - List with fuzzy match CTAs
- `<FlaggedItemsCard />` - List with flag chips
- `<ReadyToApproveCard />` - List with approve buttons
- `<CashflowChart />` - Area chart (recharts)
- `<ActivityFeed />` - Timeline component

#### 2. `/invoices/:id` - Invoice Detail

**Layout**: Two-column detail view

**Sections**:
```
┌─────────────────────────────────────────────────────────┐
│ Breadcrumb: Dashboard > Invoices > INV-12345           │
├───────────────────────────┬─────────────────────────────┤
│ Invoice Info              │ Actions                     │
│ - Carrier: ACME Trucking  │ [Approve] [Dispute] [Reject]│
│ - Invoice #: INV-12345    │                             │
│ - Date: 2025-10-25        │ Status Badge: Flagged       │
│ - Total: $1,234           │                             │
├───────────────────────────┴─────────────────────────────┤
│ Flags (if any)                                          │
│ ⚠️ AMOUNT_MISMATCH: Invoice $1,234 vs BOL $1,145       │
│ ⚠️ UNEXPECTED_CHARGE: Detention $89 not in BOL         │
├─────────────────────────────────────────────────────────┤
│ Side-by-Side Comparison                                 │
│ ┌─────────────────────┬─────────────────────┐          │
│ │ BOL-784             │ Invoice INV-12345   │          │
│ ├─────────────────────┼─────────────────────┤          │
│ │ Linehaul: $1,000 ✓  │ Linehaul: $1,000   │          │
│ │ Fuel: $145 ✓        │ Fuel: $145         │          │
│ │ (none) ❌           │ Detention: $89     │          │
│ ├─────────────────────┼─────────────────────┤          │
│ │ Total: $1,145       │ Total: $1,234 ❌    │          │
│ └─────────────────────┴─────────────────────┘          │
├─────────────────────────────────────────────────────────┤
│ Matching Details                                        │
│ - Match Type: Exact                                     │
│ - Confidence: 100%                                      │
│ - Daytona Job: [View Logs]                             │
├─────────────────────────────────────────────────────────┤
│ PDF Preview                                             │
│ [Embedded PDF viewer or download link]                 │
└─────────────────────────────────────────────────────────┘
```

**Components**:
- `<InvoiceHeader />` - Metadata + actions
- `<FlagList />` - Flag cards
- `<ComparisonTable />` - Two-column charge comparison
- `<MatchingDetails />` - Match info + Daytona link
- `<PDFViewer />` - Embedded viewer

#### 3. `/invoices` - Invoice List

**Layout**: Table view with filters

**Features**:
- Filter by status, carrier, date range
- Search by invoice number
- Sort columns
- Bulk actions
- Export to CSV

#### 4. `/bols` - BOL List

**Layout**: Table view with filters

**Features**:
- Filter by status (awaiting_invoice, invoiced, disputed)
- Search by BOL number
- Highlight overdue BOLs (>7 days without invoice)
- Click to view BOL detail

#### 5. `/bols/:id` - BOL Detail

**Layout**: Single-column detail view

**Sections**:
- BOL metadata (route, dates, carrier)
- Expected charges breakdown
- Matched invoice (if exists)
- Add charge action (for legitimate extras)

#### 6. `/analytics` - Analytics Dashboard (Stretch)

**Sections**:
- Matching stats (success rate, flags breakdown)
- Top carriers by discrepancies
- Unmatched BOLs report
- Processing time trends

---

## Component Architecture

### Component Hierarchy

```
App
├── DashboardLayout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UploadInvoiceButton
│   └── Main
│       ├── DashboardPage
│       │   ├── LeftColumn
│       │   │   ├── UnmatchedInvoicesCard
│       │   │   ├── FlaggedItemsCard
│       │   │   └── ReadyToApproveCard
│       │   └── RightColumn
│       │       ├── CashflowChart
│       │       └── ActivityFeed
│       ├── InvoiceDetailPage
│       │   ├── InvoiceHeader
│       │   ├── FlagList
│       │   ├── ComparisonTable
│       │   ├── MatchingDetails
│       │   └── PDFViewer
│       ├── InvoiceListPage
│       │   ├── FilterBar
│       │   ├── InvoiceTable
│       │   └── Pagination
│       ├── BolListPage
│       │   ├── FilterBar
│       │   ├── BolTable
│       │   └── Pagination
│       └── BolDetailPage
│           ├── BolHeader
│           ├── ChargesBreakdown
│           └── MatchedInvoice
└── Modals
    ├── UploadInvoiceModal
    ├── ParsedDataPreviewModal
    ├── ApproveInvoiceModal
    ├── DisputeInvoiceModal
    ├── AddChargeModal
    └── ManualMatchModal
```

### Shared Components

#### UI Components (shadcn-based)

- `<Button />` - Primary, secondary, outline variants
- `<Card />` - Container for sections
- `<Badge />` - Status indicators, flag severity
- `<Tabs />` - Dashboard navigation
- `<Table />` - Data tables
- `<Dialog />` - Modals
- `<Select />` - Dropdowns
- `<Input />` - Form fields
- `<Textarea />` - Notes, messages
- `<Progress />` - Upload/parsing progress
- `<Toast />` - Success/error notifications
- `<Skeleton />` - Loading states

#### Custom Components

##### `<UploadZone />`
Drag-and-drop file upload with:
- File type validation (PDF only)
- Upload progress
- Error handling

```tsx
<UploadZone
  onUpload={(file) => handleUpload(file)}
  accept=".pdf"
  maxSize={10 * 1024 * 1024} // 10MB
/>
```

##### `<StatusBadge />`
Color-coded status indicators:
- `unmatched` - Gray
- `matched` - Blue
- `flagged` - Yellow
- `ready_to_approve` - Green
- `approved` - Green
- `disputed` - Orange
- `rejected` - Red

```tsx
<StatusBadge status="flagged" />
```

##### `<FlagChip />`
Flag display with icon, code, and severity:
- High: Red background
- Med: Yellow background
- Low: Blue background

```tsx
<FlagChip
  code="AMOUNT_MISMATCH"
  severity="med"
  explanation="Invoice total $1,234 exceeds BOL $1,145 by $89"
/>
```

##### `<ComparisonRow />`
Single charge comparison with status indicator:

```tsx
<ComparisonRow
  description="Linehaul"
  bolAmount={1000}
  invoiceAmount={1000}
  status="match" // match | variance | missing | extra
/>
```

##### `<ActivityItem />`
Timeline item for activity feed:

```tsx
<ActivityItem
  timestamp="2025-10-25T10:30:00Z"
  type="invoice_matched"
  message="Invoice C-102 matched to Load 784"
  metadata={{
    invoiceId: "inv_123",
    bolId: "bol_784"
  }}
/>
```

##### `<CashflowChart />`
Area chart showing payables vs receivables:

```tsx
<CashflowChart
  data={cashflowData}
  dateRange={30} // days
/>
```

##### `<ConfidenceScore />`
Visual confidence indicator (0-100%):
- 85-100%: Green
- 70-84%: Yellow
- <70%: Red

```tsx
<ConfidenceScore value={0.92} />
```

---

## State Management

### React Query (TanStack Query)

**Why**: Perfect for API data fetching with built-in caching, refetching, and optimistic updates.

**Key Queries**:

```tsx
// Invoices
useInvoices(filters) // List with filters
useInvoice(id) // Single invoice detail
useInvoiceParse(rawId) // Parse status
useInvoiceMatch(invoiceId) // Match result

// BOLs
useBols(filters) // List with filters
useBol(id) // Single BOL detail

// Analytics
useMatchingStats() // Dashboard stats
useCashflowForecast(days) // Forecast data
useActivityFeed() // Recent activities
```

**Key Mutations**:

```tsx
useUploadInvoice() // Upload PDF
useApproveInvoice() // Approve invoice
useDisputeInvoice() // Dispute invoice
useAddChargeToBol() // Add charge to BOL
useManualMatch() // Manual BOL selection
```

### Zustand (Client State)

**Why**: Lightweight state management for UI state and temporary data.

**Stores**:

```tsx
// UI State Store
interface UIState {
  uploadModalOpen: boolean
  currentFilter: InvoiceFilter
  selectedInvoices: string[]
  // Actions
  openUploadModal: () => void
  closeUploadModal: () => void
  setFilter: (filter: InvoiceFilter) => void
  toggleInvoiceSelection: (id: string) => void
}

// Upload State Store
interface UploadState {
  file: File | null
  uploadProgress: number
  parseProgress: number
  parsedData: ParsedInvoice | null
  // Actions
  setFile: (file: File) => void
  setUploadProgress: (progress: number) => void
  setParsedData: (data: ParsedInvoice) => void
  reset: () => void
}
```

---

## API Integration

### API Client Setup

**Base Configuration**:

```tsx
// lib/api.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = {
  get: async (endpoint: string) => {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  post: async (endpoint: string, data: any) => {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API Error');
    return res.json();
  },

  upload: async (endpoint: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }
};
```

### API Endpoints (from backend)

#### BOL Management

```tsx
// GET /api/bols
interface GetBolsParams {
  status?: 'awaiting_invoice' | 'invoiced' | 'disputed'
  carrier?: string
  date_from?: string
  date_to?: string
  page?: number
  limit?: number
}

// GET /api/bols/:id
interface BolDetail {
  id: string
  bol_number: string
  carrier_name: string
  origin: string
  destination: string
  expected_charges: Charge[]
  total_amount: number
  status: string
  invoice?: Invoice
}

// POST /api/bols/:id/add-charge
interface AddChargeRequest {
  description: string
  amount: number
  reason: string
}
```

#### Invoice Management

```tsx
// POST /api/invoices/upload
// Returns: { invoice_raw_id, file_id, filename }

// POST /api/invoices/parse/:rawId
// Returns: { invoice_id, parsed_data, confidence }

// POST /api/invoices/match/:invoiceId
interface MatchResult {
  invoice_id: string
  status: 'matched' | 'flagged' | 'unmatched'
  bol_id?: string
  match_type: 'exact' | 'fuzzy' | null
  match_confidence: number
  comparison: ChargeComparison
  flags: Flag[]
  daytona_job_id: string
  daytona_logs_url: string
}

// GET /api/invoices
interface GetInvoicesParams {
  status?: InvoiceStatus
  carrier?: string
  date_from?: string
  date_to?: string
  has_flags?: boolean
}

// POST /api/invoices/approve/:invoiceId
interface ApproveRequest {
  notes?: string
  override_flags?: boolean
}

// POST /api/invoices/dispute/:invoiceId
interface DisputeRequest {
  dispute_reason: string
  flags_referenced: string[]
  custom_message?: string
}
```

### React Query Hooks

```tsx
// hooks/useInvoices.ts
export function useInvoices(params?: GetInvoicesParams) {
  return useQuery({
    queryKey: ['invoices', params],
    queryFn: () => apiClient.get('/api/invoices?' + new URLSearchParams(params))
  });
}

// hooks/useUploadInvoice.ts
export function useUploadInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => apiClient.upload('/api/invoices/upload', file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  });
}

// hooks/useMatchInvoice.ts
export function useMatchInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invoiceId: string) =>
      apiClient.post(`/api/invoices/match/${invoiceId}`, {}),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', data.invoice_id] });
    }
  });
}
```

### Polling for Long Operations

For operations like parsing and matching that may take time:

```tsx
export function useInvoiceMatchStatus(invoiceId: string) {
  return useQuery({
    queryKey: ['invoice-match-status', invoiceId],
    queryFn: () => apiClient.get(`/api/invoices/${invoiceId}`),
    refetchInterval: (data) => {
      // Poll every 2 seconds while status is "parsing" or "matching"
      return data?.status === 'parsing' || data?.status === 'matching'
        ? 2000
        : false;
    }
  });
}
```

---

## UI/UX Design

### Design Principles

1. **Clarity over complexity**: Show most important info first
2. **Progressive disclosure**: Drill down for details
3. **Immediate feedback**: Loading states, success/error messages
4. **Guided workflows**: Clear CTAs, logical flow
5. **Data transparency**: Always show why (explanations, Daytona logs)

### Color Scheme

**Status Colors**:
- `unmatched`: Gray (`text-gray-600`)
- `matched`: Blue (`text-blue-600`)
- `flagged`: Yellow (`text-yellow-600`)
- `ready_to_approve`: Green (`text-green-600`)
- `approved`: Green (`text-green-700`)
- `disputed`: Orange (`text-orange-600`)
- `rejected`: Red (`text-red-600`)

**Flag Severity Colors**:
- `high`: Red (`bg-red-100`, `border-red-500`)
- `med`: Yellow (`bg-yellow-100`, `border-yellow-500`)
- `low`: Blue (`bg-blue-100`, `border-blue-500`)

**Comparison States**:
- ✅ Match: Green (`text-green-600`)
- ⚠️ Variance: Yellow (`text-yellow-600`)
- ❌ Mismatch: Red (`text-red-600`)

### Iconography

**Status Icons**:
- Unmatched: `AlertCircle`
- Matched: `CheckCircle`
- Flagged: `AlertTriangle`
- Approved: `CheckCircle2`
- Disputed: `MessageSquare`

**Flag Icons**:
- `DUPLICATE_INVOICE`: `Copy`
- `AMOUNT_MISMATCH`: `DollarSign`
- `UNEXPECTED_CHARGE`: `Plus`
- `MISSING_CHARGE`: `Minus`
- `NO_BOL_FOUND`: `Search`
- `CARRIER_MISMATCH`: `Truck`
- `DATE_ANOMALY`: `Calendar`

### Typography

**Headings**:
- Page title: `text-3xl font-bold`
- Section title: `text-xl font-semibold`
- Card title: `text-lg font-medium`

**Body**:
- Regular: `text-base`
- Small: `text-sm`
- Metadata: `text-sm text-muted-foreground`

### Spacing & Layout

**Container Widths**:
- Dashboard: Full width (`container mx-auto`)
- Detail pages: Max width 1400px
- Modals: Max width 600px

**Card Spacing**:
- Padding: `p-6`
- Gap between cards: `gap-4`

---

## Implementation Phases

### Phase 1: Core Dashboard (Day 1, 6 hours)

**Goal**: Basic dashboard with invoice upload and list views

**Tasks**:
1. Set up Next.js project structure ✅ (already done)
2. Install additional dependencies:
   - `@tanstack/react-query`
   - `zustand`
   - `recharts`
   - `react-dropzone`
   - `lucide-react`
3. Create base layout and routing:
   - `/` - Dashboard
   - `/invoices/:id` - Invoice detail
   - `/invoices` - Invoice list
   - `/bols` - BOL list
4. Implement UI components:
   - `<DashboardLayout />`
   - `<UploadZone />`
   - `<StatusBadge />`
   - `<FlagChip />`
5. Build dashboard cards:
   - Unmatched Invoices
   - Flagged Items
   - Ready to Approve
6. Set up API client and React Query
7. Implement upload flow:
   - Upload modal
   - Progress indicator
   - Parse status polling

**Deliverable**: Working dashboard with invoice upload

---

### Phase 2: Matching & Comparison (Day 1-2, 6 hours)

**Goal**: Invoice detail view with BOL comparison and flags

**Tasks**:
1. Create invoice detail page
2. Implement comparison table:
   - Two-column layout
   - Color-coded charge rows
   - Total variance display
3. Add flag system:
   - Flag cards with explanations
   - Severity indicators
   - Context data display
4. Build matching info section:
   - Match type (exact/fuzzy)
   - Confidence score
   - Daytona logs link
5. Add PDF viewer/download

**Deliverable**: Complete invoice detail view with comparison

---

### Phase 3: Approval Workflows (Day 2, 4 hours)

**Goal**: Approve, dispute, and manage invoices

**Tasks**:
1. Implement approval flow:
   - Approve modal with notes
   - Batch approval for multiple invoices
   - Success notifications
2. Build dispute flow:
   - Dispute modal
   - Pre-filled email template
   - Send to carrier
3. Add BOL update actions:
   - Add charge modal
   - Re-run matching after update
4. Implement status updates and refetching

**Deliverable**: Full approval and dispute workflows

---

### Phase 4: BOL Management (Day 2, 3 hours)

**Goal**: BOL list and detail views

**Tasks**:
1. Create BOL list page:
   - Table view
   - Filters (status, carrier)
   - Search by BOL number
2. Build BOL detail page:
   - Metadata display
   - Expected charges
   - Matched invoice (if exists)
   - Add charge action
3. Highlight overdue BOLs (>7 days without invoice)

**Deliverable**: Complete BOL management interface

---

### Phase 5: Analytics & Polish (Day 2, 3 hours)

**Goal**: Cashflow chart, activity feed, and refinements

**Tasks**:
1. Implement cashflow chart:
   - 30-day forecast
   - Payables vs receivables
   - Stacked area chart
2. Build activity feed:
   - Real-time updates
   - Timeline view
   - Daytona job links
3. Add analytics dashboard (stretch):
   - Matching stats
   - Flag breakdown
   - Top carriers by discrepancies
4. Polish UI/UX:
   - Loading states
   - Error handling
   - Responsive design
   - Accessibility

**Deliverable**: Complete dashboard with analytics

---

### Phase 6: Demo Prep (Day 2, 2 hours)

**Goal**: Seed data and demo script

**Tasks**:
1. Create seed data:
   - 10 BOLs (various statuses)
   - 8 sample invoices (PDFs):
     - 3 clean matches
     - 1 duplicate
     - 2 amount mismatches
     - 1 missing POD
     - 1 bank change
2. Test all workflows:
   - Upload → parse → match → approve
   - Upload → flags → dispute
   - Manual matching
3. Prepare demo script:
   - Clean invoice (happy path)
   - Flagged invoice (exception handling)
   - Duplicate detection
   - Fuzzy matching
4. Record demo video (optional)

**Deliverable**: Ready-to-demo application

---

## Technical Stack

### Frontend Framework

- **Next.js 16** (App Router)
  - Server components for initial render
  - Client components for interactivity
  - API routes (if needed for proxying)

### UI Components

- **shadcn/ui** ✅ (already installed)
  - Pre-built accessible components
  - Tailwind CSS-based
  - Customizable

### State Management

- **TanStack Query** (React Query)
  - Server state management
  - Caching and refetching
  - Optimistic updates

- **Zustand**
  - Client state (UI state, selections)
  - Lightweight and simple

### Data Visualization

- **Recharts**
  - Cashflow area chart
  - Flag breakdown pie chart
  - Easy to use, responsive

### File Upload

- **react-dropzone**
  - Drag-and-drop interface
  - File validation
  - Progress tracking

### Forms

- **React Hook Form**
  - Form validation
  - Error handling
  - Integration with shadcn components

### Icons

- **Lucide React**
  - Consistent icon set
  - Tree-shakeable
  - Already used by shadcn

### Utilities

- **date-fns** - Date formatting and manipulation
- **clsx** + **tailwind-merge** - Class name utilities ✅
- **zod** - Schema validation for API responses

---

## API Contract

### Base URL

```
Development: http://localhost:3000
Production: TBD
```

### Authentication

For MVP: No authentication
For production: JWT tokens in Authorization header

### Request/Response Format

**Success Response**:
```json
{
  "data": { ... },
  "meta": { ... }
}
```

**Error Response**:
```json
{
  "error": {
    "code": "AMOUNT_MISMATCH",
    "message": "Invoice amount does not match BOL",
    "details": { ... }
  }
}
```

### Key Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/invoices` | List invoices |
| GET | `/api/invoices/:id` | Invoice detail |
| POST | `/api/invoices/upload` | Upload PDF |
| POST | `/api/invoices/parse/:rawId` | Parse invoice |
| POST | `/api/invoices/match/:invoiceId` | Match to BOL |
| POST | `/api/invoices/approve/:invoiceId` | Approve invoice |
| POST | `/api/invoices/dispute/:invoiceId` | Dispute invoice |
| GET | `/api/bols` | List BOLs |
| GET | `/api/bols/:id` | BOL detail |
| POST | `/api/bols/:id/add-charge` | Add charge to BOL |
| GET | `/api/analytics/matching-stats` | Matching statistics |
| GET | `/api/analytics/cashflow/forecast` | Cashflow forecast |

---

## Demo Script

### Setup (Pre-demo)

1. Seed database with 10 BOLs
2. Clear any existing invoices
3. Have 8 sample PDFs ready
4. Open dashboard in browser

### Demo Flow (3-4 minutes)

**Intro (15 seconds)**:
> "FreightFlow automates carrier invoice matching for freight operations. Watch how it handles both clean invoices and exceptions."

**Scenario 1: Clean Invoice (45 seconds)**:
1. Click "Upload Invoice"
2. Drag PDF (ACME Trucking, BOL-784, $1,145)
3. AI extracts data → show parsed fields
4. Auto-match to BOL-784
5. Show side-by-side comparison (all green ✅)
6. Click "Approve" → Status updated
7. Dashboard refreshes → moved to "Approved"

> "Clean invoice gets parsed, matched, and approved in seconds—no manual entry."

**Scenario 2: Flagged Invoice (60 seconds)**:
1. Upload another PDF (unexpected detention charge)
2. Parse complete → match runs
3. Status: "Flagged" with 2 flags:
   - `AMOUNT_MISMATCH`: $89 over expected
   - `UNEXPECTED_CHARGE`: Detention $89
4. Show comparison:
   - Linehaul: ✅ Match
   - Fuel: ✅ Match
   - Detention: ❌ Not in BOL
5. Options:
   - "Add to BOL" → Update BOL → Re-match → Clears
   - OR "Dispute" → Pre-filled email with discrepancies

> "Flags catch discrepancies automatically. I can add the charge to the BOL if it's legitimate, or dispute it with one click."

**Scenario 3: Duplicate Detection (30 seconds)**:
1. Upload same invoice again
2. Parse complete → match runs
3. Immediately flagged: `DUPLICATE_INVOICE` (high severity)
4. Cannot approve → prevents double-payment

> "Duplicate detection prevents paying the same invoice twice."

**Scenario 4: Fuzzy Matching (30 seconds)**:
1. Upload invoice without BOL number
2. Fuzzy matcher finds BOL based on:
   - Carrier match
   - Amount similarity
   - Date proximity
3. Show confidence score: 92%
4. Auto-matched → ready to approve

> "Even without a BOL number, fuzzy matching finds the right BOL with high confidence."

**Outro (15 seconds)**:
> "All matching logic is transparent—click 'View Daytona Logs' to see exactly how each decision was made. FreightFlow saves time, catches errors, and provides full audit trails."

---

## Success Metrics

### Functional Requirements

- ✅ Upload carrier invoice PDF
- ✅ AI parses invoice to structured data
- ✅ Exact matching by BOL number
- ✅ Fuzzy matching when BOL # missing
- ✅ 10 flag types for anomaly detection
- ✅ Side-by-side BOL vs Invoice comparison
- ✅ Approve/dispute/reject workflows
- ✅ Add charge to BOL and re-match
- ✅ Daytona job logs link for transparency
- ✅ Activity feed with real-time updates
- ✅ Cashflow forecast chart

### Performance Targets

- Page load: < 2 seconds
- Invoice upload: < 5 seconds
- AI parsing: < 10 seconds
- Matching job: < 15 seconds
- UI responsiveness: < 100ms interactions

### UX Goals

- Clear status at all times
- Actionable error messages
- One-click common actions
- Minimal clicks to complete tasks
- Mobile-responsive (stretch)

---

## Next Steps

1. **Review and approve** this plan with stakeholders
2. **Set up development environment**:
   - Install dependencies
   - Configure API base URL
   - Set up React Query
3. **Start Phase 1**: Core dashboard
4. **Daily standups** to track progress
5. **Demo rehearsal** before final presentation

---

## Questions & Decisions

### Open Questions

1. **Authentication**: Do we need login for demo? → **No, skip for MVP**
2. **BOL sync**: Manual upload or webhook? → **Manual for demo, webhook later**
3. **PDF parsing**: Use real OCR or deterministic fixtures? → **Fixtures for demo reliability**
4. **Deployment**: Where to host? → **Vercel for frontend, fly.io for backend**
5. **Real-time updates**: WebSockets or polling? → **Polling for simplicity**

### Design Decisions

- **Single-page dashboard**: All critical info visible at once
- **Modal-based upload**: Non-disruptive workflow
- **Inline editing**: Edit parsed data before matching
- **Color-coded everything**: Visual clarity for status/flags
- **Progressive disclosure**: Show summary first, details on click

---

## Appendix

### File Structure

```
web/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Dashboard
│   ├── invoices/
│   │   ├── page.tsx              # Invoice list
│   │   └── [id]/
│   │       └── page.tsx          # Invoice detail
│   ├── bols/
│   │   ├── page.tsx              # BOL list
│   │   └── [id]/
│   │       └── page.tsx          # BOL detail
│   ├── analytics/
│   │   └── page.tsx              # Analytics (stretch)
│   └── globals.css               # Global styles
├── components/
│   ├── ui/                       # shadcn components
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   └── Navigation.tsx
│   ├── invoice/
│   │   ├── InvoiceCard.tsx
│   │   ├── InvoiceTable.tsx
│   │   ├── ComparisonTable.tsx
│   │   ├── FlagList.tsx
│   │   └── PDFViewer.tsx
│   ├── bol/
│   │   ├── BolCard.tsx
│   │   ├── BolTable.tsx
│   │   └── ChargesBreakdown.tsx
│   ├── dashboard/
│   │   ├── UnmatchedCard.tsx
│   │   ├── FlaggedCard.tsx
│   │   ├── ReadyToApproveCard.tsx
│   │   ├── CashflowChart.tsx
│   │   └── ActivityFeed.tsx
│   ├── modals/
│   │   ├── UploadInvoiceModal.tsx
│   │   ├── ApproveInvoiceModal.tsx
│   │   ├── DisputeInvoiceModal.tsx
│   │   └── AddChargeModal.tsx
│   └── shared/
│       ├── UploadZone.tsx
│       ├── StatusBadge.tsx
│       ├── FlagChip.tsx
│       ├── ConfidenceScore.tsx
│       └── ActivityItem.tsx
├── hooks/
│   ├── useInvoices.ts
│   ├── useInvoice.ts
│   ├── useUploadInvoice.ts
│   ├── useMatchInvoice.ts
│   ├── useBols.ts
│   ├── useBol.ts
│   └── useAnalytics.ts
├── lib/
│   ├── api.ts                    # API client
│   ├── query-client.ts           # React Query config
│   ├── utils.ts                  # Utility functions
│   └── types.ts                  # TypeScript types
├── stores/
│   ├── ui-store.ts               # UI state (Zustand)
│   └── upload-store.ts           # Upload state
└── package.json
```

### Key Dependencies

```json
{
  "dependencies": {
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "next": "16.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^5.0.0",
    "recharts": "^2.12.0",
    "react-dropzone": "^14.2.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "eslint": "^9",
    "eslint-config-next": "16.0.0"
  }
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-25
**Author**: Claude (AI Assistant)
**Status**: Ready for Implementation
