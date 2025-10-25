Goal (what judges will see in 3–4 minutes)

You drop a few carrier invoice PDFs (plus an email or two).
The app parses → matches → flags anomalies → generates a customer invoice → schedules carrier payment, and shows the cashflow impact on a live dashboard.
All actions are explainable and reproducible (Daytona run logs).

Scope (MVP you can finish fast)

AP: Parse carrier invoices (PDFs), reconcile to a “Shipments” table, schedule payment if clean.

AR: Auto-create customer invoice with markup, attach POD, set NET-45.

Controls: Rules for duplicates, mismatch vs contracted rate, missing POD, new vendor/bank changes.

UI: One-page dashboard: Unmatched, Flagged, Ready to Pay / Invoice, simple Cashflow chart.

Agents: Inngest sandbox runs the “reconcile & generate artifacts” step; Claude Code writes/edits the reconciliation script.

High-level flow (system diagram in words)

Ingest

Upload PDFs or forward an email (for hackathon, just drag & drop).

Store raw file + create invoice_raw record.

Parse

LLM/OCR → JSON fields (vendor, invoice_no, load_id, amount, charges[], service_date, payment_terms).

Match

Join to shipments by load_id or fuzzy (origin+dest+date).

Compute expected_amount from rate_confirmations (base + accessorials).

Check

Rule engine returns status: ok | warn | fail plus flags[] (duplicate, overcharge, missing POD, new vendor, bank change).

LLM “reason” string for human explanation.

Decide

If ok:

AP: stage payment for carrier (NET 7 by default).

AR: generate customer invoice PDF with markup; set NET 45.

If warn/fail: open a one-click “Create Dispute” modal with pre-filled email text.

Visualize

Dashboard cards + cashflow forecast (payables due vs receivables expected).

Timeline of actions with Inngest job links (provable automation).

Data model (lean Drizzle-style tables)

shipments

id (pk), load_id (unique), shipper_id, carrier_id, origin, destination, pickup_at, deliver_at, expected_amount, rate_breakdown (json), pod_file_id (nullable)

vendors (carriers)

id, name, mc_dot (nullable), ach_routing_last4, ach_account_last4, bank_last_updated_at

customers (shippers)

id, name, net_terms_days (default 45)

invoices_carrier_raw

id, file_id, text (long), parsed_json (json), status (parsed|failed), created_at

invoices_carrier

id, vendor_id, invoice_no, load_id, amount, service_date, due_date, bank_change_declared (bool), parsed_from_id (fk), match_confidence (0–1), status (unmatched|matched|flagged|ready_to_pay|paid)

invoices_customer

id, customer_id, shipment_id, amount, due_date, pdf_file_id, status (draft|sent|paid)

payables

id, carrier_invoice_id, scheduled_for, amount, status (scheduled|paid|canceled)

receivables

id, customer_invoice_id, expected_on, amount, status (open|paid|late)

flags

id, entity_table, entity_id, severity (low|med|high), code (DUPLICATE_INVOICE, AMOUNT_MISMATCH, MISSING_POD, NEW_VENDOR, BANK_CHANGE, …), explanation

API surface (Hono)

POST /api/ingest/invoice → accepts PDF, returns invoices_carrier_raw.id

POST /api/parse/:rawId → LLM/OCR → invoices_carrier row

POST /api/reconcile/:carrierInvoiceId → kicks Inngest job to run reconcile.ts

GET /api/invoices?status=flagged|ready_to_pay|unmatched

POST /api/payables/schedule/:carrierInvoiceId

POST /api/ar/generate/:shipmentId → creates invoices_customer + PDF

GET /api/cashflow/forecast → returns 30-day buckets for chart

POST /api/flags/resolve/:flagId → mark resolved (for demo)

Inngest + Claude Code SDK loop (the “wow” bit)

reconcile.ts (inside sandbox)

Pull carrier invoice JSON + shipment by load_id.

Compute expected_amount (base + accessorials) from rate_breakdown.

Rules:

duplicate (same vendor+invoice_no or same amount/date within 7d),

amount mismatch > 2%,

missing POD (shipments.pod_file_id is null),

vendor bank changed in last 7 days,

fuzzy match score < 0.85.

Emit flags[], status.

If ok, create payables.scheduled_for = now + 7d and invoices_customer with markup (e.g., +12%).

Write a short natural-language reason back for the UI.

Claude Code SDK assist

If reconcile script fails (test cases), auto-suggest a diff (e.g., new accessorial mapping) and commit within the sandbox.

Keep a visible “Patch applied by AI” note with diff link for judges.

Frontend (one page, fast to build)

Header: “FreightFlow — AP/AR Copilot” + “Upload Invoice” button.
Left column (3 cards):

Unmatched (list with “Try Fuzzy Match” CTA)

Flagged (chips with flag codes; click → modal shows explanation + “Resolve / Dispute”)

Ready to Pay / Invoice (buttons: “Schedule ACH”, “Generate AR PDF”)

Right column:

Cashflow chart (next 30 days: payables vs receivables stacked lines).

Activity feed (”Invoice C-102 matched to Load 784, flagged AMOUNT_MISMATCH 7.6% — reason: fuel surcharge not in rate con. Created draft customer invoice.”)

Modals:

Dispute: auto-filled email draft citing differences and attaching diff table.

Invoice Preview: render AR PDF (logo, line items, markup).

Seed data & fixtures (ship fast)

shipments.csv (10 rows) with load_id, lanes, base rates, expected accessorials, POD on 7/10 rows.

carriers.csv, customers.csv.

8 sample carrier invoices (PDFs):

3 clean,

1 duplicate,

2 amount mismatches (fuel/layover),

1 missing POD,

1 bank change notice (same invoice, different ACH).

4 emails (as .eml or just text blobs): one with “updated bank details”, one with altered invoice number.

You can generate all of these synthetically; store PDFs as simple templates with variable placeholders.

Acceptance tests (hit these and you win)

Upload clean invoice → status ready_to_pay, AR invoice created, cashflow updates.

Upload duplicate → flag DUPLICATE_INVOICE high; cannot schedule payment.

Amount mismatch ±>2% → flag + Dispute modal prefilled with delta explanation.

Missing POD → flag; “Attach POD” resolves it then becomes ready_to_pay.

Bank change in vendor last 7d → high severity; requires manual approval toggle.

Implementation steps (timeboxed)
T-12 hours (prep)

Bootstrap Next.js app + Hono API + Drizzle schema + seed script.

Build minimal dashboard shells + upload control.

Day 1

File storage + invoices_carrier_raw creation.

Parser endpoint (LLM/OCR stub with deterministic JSON from fixtures to avoid fragility).

Inngest job scaffold + reconcile.ts v1 (exact match only).

UI lists for Unmatched / Flagged / Ready.

Day 2

Rules engine + flags + explanations.

AR PDF generator (server-side template) + Payables scheduler (fake ACH).

Cashflow forecast (group by day).

Delight polish: activity feed, one-click Dispute, Inngest logs link.

Stretch (if time remains)

Fuzzy matching (origin+dest+date distance).

Early-pay discount simulation (2/10 Net 30).

“Confidence” bar with LLM rationale.

Minimal rules engine (paste-in snippet)
type FlagCode =
  | 'DUPLICATE_INVOICE'
  | 'AMOUNT_MISMATCH'
  | 'MISSING_POD'
  | 'NEW_VENDOR'
  | 'BANK_CHANGE'
  | 'LOW_MATCH_CONFIDENCE';

export function checkInvoice(i: CarrierInvoice, s?: Shipment, ctx: Ctx): CheckResult {
  const flags: Flag[] = [];
  if (!s) flags.push(flag('LOW_MATCH_CONFIDENCE', 'No shipment found for load_id / fuzzy match < 0.85', 'high'));
  if (ctx.recentInvoices.some(r => r.vendor_id===i.vendor_id && (r.invoice_no===i.invoice_no || (r.amount===i.amount && daysBetween(r.service_date, i.service_date) <= 7))))
    flags.push(flag('DUPLICATE_INVOICE', 'Duplicate number or amount/date window match', 'high'));
  if (s && Math.abs(i.amount - s.expected_amount) / s.expected_amount > 0.02)
    flags.push(flag('AMOUNT_MISMATCH', `Invoice ${i.amount} vs expected ${s.expected_amount}`, 'med'));
  if (s && !s.pod_file_id)
    flags.push(flag('MISSING_POD', 'No proof of delivery attached', 'med'));
  if (ctx.vendor.is_new) flags.push(flag('NEW_VENDOR', 'First-time vendor', 'low'));
  if (ctx.vendor.bank_last_updated_at && daysBetween(ctx.vendor.bank_last_updated_at, new Date()) <= 7)
    flags.push(flag('BANK_CHANGE', 'Recent bank detail change', 'high'));

  const status = flags.some(f => f.severity==='high') ? 'flagged' :
                 flags.length ? 'warn' : 'ok';

  return { status, flags, reason: summarize(flags, i, s) };
}

Demo script (say these lines)

“I’ll upload two invoices: one clean, one with a hidden duplicate.”

“The clean one got parsed, matched to Load #784, and is ready to pay—we auto-created the customer invoice with +12% markup and forecast receipts in 45 days.”

“The second gets flagged DUPLICATE_INVOICE and BANK_CHANGE; here’s the explanation and the one-click Dispute email.”

“Here’s the Inngest job log showing the exact reconciliation script that ran—no magic.”

“Cashflow forecast updates immediately; notice how blocking the duplicate preserved $2,000 of working capital.”

What to pre-bake (so the live demo is smooth)

Parser returns clean JSON for your sample PDFs (avoid live OCR flakiness).

Inngest jobs run against a local fixture DB snapshot to be deterministic.

One “Attach POD” action that flips a flag from MISSING_POD → resolved.

If you want, I can provide:

a tiny seed dataset (CSV) and

a static invoice PDF template with placeholders
so you can drop them straight into the repo and start wiring endpoints.