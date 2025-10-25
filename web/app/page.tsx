import { UnmatchedInvoicesCard } from "@/components/dashboard/UnmatchedInvoicesCard";
import { FlaggedItemsCard } from "@/components/dashboard/FlaggedItemsCard";
import { ReadyToApproveCard } from "@/components/dashboard/ReadyToApproveCard";
import { ThreeWayMatchSummary } from "@/components/dashboard/ThreeWayMatchSummary";
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed";
import { UploadInvoiceButton } from "@/components/dashboard/UploadInvoiceButton";
import { POTable } from "@/components/po/POTable";
import { UploadBolButton } from "@/components/bol/UploadBolButton";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">FreightFlow</h1>
            <p className="text-muted-foreground">
              3-Way Invoice Matching - PO, BOL, and Invoice Verification
            </p>
          </div>
          <div className="flex gap-3">
            <UploadBolButton />
            <UploadInvoiceButton />
          </div>
        </div>

        {/* Purchase Orders Table */}
        <POTable />

        {/* Main Dashboard Grid */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left Column - 60% width (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Unmatched Invoices */}
            <UnmatchedInvoicesCard />

            {/* Flagged Items */}
            <FlaggedItemsCard />

            {/* Ready to Approve */}
            <ReadyToApproveCard />
          </div>

          {/* Right Column - 40% width (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3-Way Match Summary */}
            <ThreeWayMatchSummary />

            {/* Recent Activity */}
            <RecentActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
