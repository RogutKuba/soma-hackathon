'use client';

import { useState } from 'react';
import { useGetAllPurchaseOrdersQuery } from '@/query/po.query';
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
import { UploadPoForm } from './UploadPoForm';
import {
  RiFileList3Line,
  RiTruckLine,
  RiMapPinLine,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiAddLine,
} from '@remixicon/react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  bol_received: 'bg-blue-100 text-blue-800 border-blue-200',
  invoiced: 'bg-purple-100 text-purple-800 border-purple-200',
  matched: 'bg-green-100 text-green-800 border-green-200',
  disputed: 'bg-red-100 text-red-800 border-red-200',
};

const statusLabels = {
  pending: 'Pending',
  bol_received: 'BOL Received',
  invoiced: 'Invoiced',
  matched: 'Matched',
  disputed: 'Disputed',
};

export function POTable() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data, isLoading, error, refetch } = useGetAllPurchaseOrdersQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground'>
              Loading purchase orders...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-destructive'>
              Failed to load purchase orders
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const purchaseOrders = data?.purchase_orders || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <RiFileList3Line className='h-5 w-5' />
              Purchase Orders
            </CardTitle>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary'>{purchaseOrders.length} Total</Badge>
              <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <RiAddLine className="h-4 w-4" />
                    Upload PO
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Upload Purchase Order</DialogTitle>
                    <DialogDescription>
                      Upload a purchase order PDF for automatic parsing and data extraction
                    </DialogDescription>
                  </DialogHeader>
                  <UploadPoForm
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
        {purchaseOrders.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center'>
            <RiFileList3Line className='h-12 w-12 text-muted-foreground mb-4' />
            <p className='text-muted-foreground text-sm'>
              No purchase orders yet. Upload your first PO to get started.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead>
                <tr className='border-b'>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    PO Number
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Customer
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Carrier
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Route
                  </th>
                  <th className='text-left py-3 px-4 font-medium text-sm'>
                    Dates
                  </th>
                  <th className='text-right py-3 px-4 font-medium text-sm'>
                    Amount
                  </th>
                  <th className='text-center py-3 px-4 font-medium text-sm'>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr
                    key={po.id}
                    className='border-b hover:bg-muted/50 transition-colors'
                  >
                    {/* PO Number */}
                    <td className='py-4 px-4'>
                      <div className='flex items-center gap-2'>
                        <RiFileList3Line className='h-4 w-4 text-muted-foreground' />
                        <span className='font-medium'>{po.po_number}</span>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className='py-4 px-4'>
                      <div className='text-sm'>{po.customer_name}</div>
                    </td>

                    {/* Carrier */}
                    <td className='py-4 px-4'>
                      <div className='flex items-center gap-2'>
                        <RiTruckLine className='h-4 w-4 text-muted-foreground' />
                        <span className='text-sm'>{po.carrier_name}</span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className='py-4 px-4'>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                          <RiMapPinLine className='h-3 w-3' />
                          <span className='truncate max-w-[150px]'>
                            {po.origin}
                          </span>
                        </div>
                        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                          <RiMapPinLine className='h-3 w-3' />
                          <span className='truncate max-w-[150px]'>
                            {po.destination}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Dates */}
                    <td className='py-4 px-4'>
                      <div className='flex flex-col gap-1'>
                        <div className='flex items-center gap-1 text-xs'>
                          <RiCalendarLine className='h-3 w-3 text-muted-foreground' />
                          <span>
                            {new Date(po.pickup_date).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </span>
                        </div>
                        <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                          <span>→</span>
                          <span>
                            {new Date(po.delivery_date).toLocaleDateString(
                              'en-US',
                              {
                                month: 'short',
                                day: 'numeric',
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className='py-4 px-4 text-right'>
                      <div className='flex items-center justify-end gap-1 font-semibold'>
                        <RiMoneyDollarCircleLine className='h-4 w-4 text-muted-foreground' />
                        <span>
                          {po.total_amount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className='py-4 px-4 text-center'>
                      <Badge
                        variant='outline'
                        className={statusColors[po.status]}
                      >
                        {statusLabels[po.status]}
                      </Badge>
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
