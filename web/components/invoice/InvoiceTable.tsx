'use client';

import { useState } from 'react';
import { useGetAllInvoicesQuery } from '@/query/invoice.query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { UploadInvoiceForm } from './UploadInvoiceForm';
import {
  RiFileList3Line,
  RiTruckLine,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiEyeLine,
  RiCheckDoubleLine,
  RiFlagLine,
  RiAddLine,
} from '@remixicon/react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  matched: 'bg-blue-100 text-blue-800 border-blue-200',
  flagged: 'bg-red-100 text-red-800 border-red-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  disputed: 'bg-orange-100 text-orange-800 border-orange-200',
  rejected: 'bg-gray-100 text-gray-800 border-gray-200',
};

const statusLabels = {
  pending: 'Pending',
  matched: 'Matched',
  flagged: 'Flagged',
  approved: 'Approved',
  disputed: 'Disputed',
  rejected: 'Rejected',
};

export function InvoiceTable() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data, isLoading, error, refetch } = useGetAllInvoicesQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground'>Loading invoices...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-destructive'>Failed to load invoices</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const invoices = data?.invoices || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <RiFileList3Line className='h-5 w-5' />
              Invoices
            </CardTitle>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary'>{invoices.length} Total</Badge>
              <Dialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size='sm' className='gap-2'>
                    <RiAddLine className='h-4 w-4' />
                    Upload Invoice
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>Upload Carrier Invoice</DialogTitle>
                    <DialogDescription>
                      Upload a PDF invoice for automatic parsing and data
                      extraction
                    </DialogDescription>
                  </DialogHeader>
                  <UploadInvoiceForm
                    onSuccess={() => {
                      setUploadDialogOpen(false);
                      refetch();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <RiFileList3Line className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground text-sm'>
              No invoices yet. Upload your first invoice to get started.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Invoice #
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    PO / BOL
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Carrier
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Date
                  </th>
                  <th className='text-right py-3 px-4 font-medium text-sm'>
                    Amount
                  </th>
                  <th className='text-center py-3 px-4 font-medium text-sm'>
                    Match
                  </th>
                  <th className='text-center py-3 px-4 font-medium text-sm'>
                    Status
                  </th>
                  <th className='text-center py-3 px-4 font-medium text-sm'>
                    PDF
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className='border-b hover:bg-muted/50 transition-colors'
                  >
                    {/* Invoice Number */}
                    <td className='py-4 px-4'>
                      <div className='flex items-center gap-2'>
                        <RiFileList3Line className='h-4 w-4 text-muted-foreground' />
                        <span className='font-medium'>
                          {invoice.invoice_number}
                        </span>
                      </div>
                    </td>

                    {/* PO / BOL Numbers */}
                    <td className='py-4 px-4'>
                      <div className='flex flex-col gap-1'>
                        {invoice.po_number && (
                          <div className='text-xs font-medium text-blue-600'>
                            PO: {invoice.po_number}
                          </div>
                        )}
                        {invoice.bol_number && (
                          <div className='text-xs text-muted-foreground'>
                            BOL: {invoice.bol_number}
                          </div>
                        )}
                        {!invoice.po_number && !invoice.bol_number && (
                          <span className='text-xs text-muted-foreground'>
                            N/A
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Carrier */}
                    <td className='py-4 px-4'>
                      <div className='flex items-center gap-2'>
                        <RiTruckLine className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm'>{invoice.carrier_name}</span>
                      </div>
                    </td>

                    {/* Invoice Date */}
                    <td className='py-4 px-4'>
                      <div className='flex items-center gap-1 text-xs'>
                        <RiCalendarLine className='h-3 w-3 text-muted-foreground' />
                        <span>
                          {new Date(invoice.invoice_date).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            }
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className='py-4 px-4 text-right'>
                      <div className='flex items-center justify-end gap-1 font-semibold'>
                        <RiMoneyDollarCircleLine className='h-4 w-4 text-muted-foreground' />
                        <span>
                          {invoice.total_amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Match Info */}
                    <td className='py-4 px-4 text-center'>
                      {invoice.match_type ? (
                        <div className='flex flex-col gap-1'>
                          <Badge
                            variant='outline'
                            className='text-xs capitalize'
                          >
                            {invoice.match_type}
                          </Badge>
                          {invoice.match_confidence > 0 && (
                            <span className='text-xs text-muted-foreground'>
                              {Math.round(invoice.match_confidence * 100)}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className='text-xs text-muted-foreground'>
                          Unmatched
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className='py-4 px-4 text-center'>
                      <Badge
                        variant='outline'
                        className={statusColors[invoice.status]}
                      >
                        {invoice.status === 'approved' && (
                          <RiCheckDoubleLine className='h-3 w-3 mr-1 inline' />
                        )}
                        {invoice.status === 'flagged' && (
                          <RiFlagLine className='h-3 w-3 mr-1 inline' />
                        )}
                        {statusLabels[invoice.status]}
                      </Badge>
                    </td>

                    {/* PDF Link */}
                    <td className='py-4 px-4 text-center'>
                      {invoice.file?.url ? (
                        <a
                          href={invoice.file.url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline'
                        >
                          <RiEyeLine className='h-4 w-4' />
                        </a>
                      ) : (
                        <span className='text-xs text-muted-foreground'>
                          N/A
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
