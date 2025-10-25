'use client';

import { UploadInvoiceButton } from '@/components/invoice/UploadInvoiceButton';
import { POTable } from '@/components/po/POTable';
import { BolTable } from '@/components/bol/BolTable';
import { InvoiceTable } from '@/components/invoice/InvoiceTable';
import { MatchingView } from '@/components/matching/MatchingView';

export default function Dashboard() {
  return (
    <div className='min-h-screen bg-background'>
      <div className='container mx-auto p-6 space-y-8'>
        {/* Header */}
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>FreightFlow</h1>
            <p className='text-muted-foreground'>
              3-Way Invoice Matching - PO, BOL, and Invoice Verification
            </p>
          </div>
        </div>

        {/* Purchase Orders Table */}
        <POTable />

        {/* Bills of Lading Table */}
        <BolTable />

        <InvoiceTable />

        <MatchingView />
      </div>
    </div>
  );
}
