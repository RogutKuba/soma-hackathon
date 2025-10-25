import { useState } from 'react';
import { useGetAllBillsOfLadingQuery } from '@/query/bol.query';
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
import { UploadBolForm } from './UploadBolForm';
import {
  RiFileList3Line,
  RiTruckLine,
  RiMapPinLine,
  RiCalendarLine,
  RiScales3Line,
  RiAddLine,
  RiFilePdfLine,
  RiExternalLinkLine,
  RiEyeLine,
} from '@remixicon/react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  delivered: 'bg-blue-100 text-blue-800 border-blue-200',
  invoiced: 'bg-purple-100 text-purple-800 border-purple-200',
  matched: 'bg-green-100 text-green-800 border-green-200',
};

const statusLabels = {
  pending: 'Pending',
  delivered: 'Delivered',
  invoiced: 'Invoiced',
  matched: 'Matched',
};

export function BolTable() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { data, isLoading, error, refetch } = useGetAllBillsOfLadingQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bills of Lading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-muted-foreground'>
              Loading bills of lading...
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
          <CardTitle>Bills of Lading</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <div className='text-destructive'>
              Failed to load bills of lading
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const billsOfLading = data?.bills_of_lading || [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='flex items-center gap-2'>
              <RiFileList3Line className='h-5 w-5' />
              Bills of Lading
            </CardTitle>
            <div className='flex items-center gap-3'>
              <Badge variant='secondary'>{billsOfLading.length} Total</Badge>
              <Dialog
                open={uploadDialogOpen}
                onOpenChange={setUploadDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size='sm' className='gap-2'>
                    <RiAddLine className='h-4 w-4' />
                    Upload BOL
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle>Upload Bill of Lading</DialogTitle>
                    <DialogDescription>
                      Upload a bill of lading PDF for automatic parsing and data
                      extraction
                    </DialogDescription>
                  </DialogHeader>
                  <UploadBolForm
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
          {billsOfLading.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-center'>
              <RiFileList3Line className='h-12 w-12 text-muted-foreground mb-4' />
              <p className='text-muted-foreground text-sm'>
                No bills of lading yet. Upload your first BOL to get started.
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b'>
                    <th className='text-left py-3 px-4 font-medium text-sm'>
                      BOL Number
                    </th>
                    <th className='text-left py-3 px-4 font-medium text-sm'>
                      PO Number
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
                    <th className='text-left py-3 px-4 font-medium text-sm'>
                      Weight
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
                  {billsOfLading.map((bol) => (
                    <tr
                      key={bol.id}
                      className='border-b hover:bg-muted/50 transition-colors'
                    >
                      {/* BOL Number */}
                      <td className='py-4 px-4'>
                        <div className='flex items-center gap-2'>
                          <RiFileList3Line className='h-4 w-4 text-muted-foreground' />
                          <span className='font-medium'>{bol.bol_number}</span>
                        </div>
                      </td>

                      {/* PO Number */}
                      <td className='py-4 px-4'>
                        <div className='text-sm font-medium text-blue-600'>
                          {bol.po_number}
                        </div>
                      </td>

                      {/* Carrier */}
                      <td className='py-4 px-4'>
                        <div className='flex items-center gap-2'>
                          <RiTruckLine className='h-4 w-4 text-muted-foreground' />
                          <span className='text-sm'>{bol.carrier_name}</span>
                        </div>
                      </td>

                      {/* Route */}
                      <td className='py-4 px-4'>
                        <div className='flex flex-col gap-1'>
                          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                            <RiMapPinLine className='h-3 w-3' />
                            <span className='truncate max-w-[150px]'>
                              {bol.origin}
                            </span>
                          </div>
                          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                            <RiMapPinLine className='h-3 w-3' />
                            <span className='truncate max-w-[150px]'>
                              {bol.destination}
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
                              {new Date(bol.pickup_date).toLocaleDateString(
                                'en-US',
                                {
                                  month: 'short',
                                  day: 'numeric',
                                }
                              )}
                            </span>
                          </div>
                          <div className='flex items-center gap-1 text-xs text-muted-foreground'>
                            <span>�</span>
                            <span>
                              {new Date(bol.delivery_date).toLocaleDateString(
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

                      {/* Weight */}
                      <td className='py-4 px-4'>
                        {bol.weight_lbs ? (
                          <div className='flex items-center gap-1 text-sm'>
                            <RiScales3Line className='h-4 w-4 text-muted-foreground' />
                            <span>{bol.weight_lbs.toLocaleString()} lbs</span>
                          </div>
                        ) : (
                          <span className='text-xs text-muted-foreground'>
                            N/A
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className='py-4 px-4 text-center'>
                        <Badge
                          variant='outline'
                          className={statusColors[bol.status]}
                        >
                          {statusLabels[bol.status]}
                        </Badge>
                      </td>

                      {/* PDF Link */}
                      <td className='py-4 px-4 text-center'>
                        {bol.file?.url ? (
                          <a
                            href={bol.file.url}
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
