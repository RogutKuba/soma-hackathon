'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { RiUploadCloudLine } from '@remixicon/react';
import { UploadInvoiceForm } from './UploadInvoiceForm';

export function UploadInvoiceButton() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  return (
    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
      <DialogTrigger asChild>
        <Button size='lg' className='gap-2'>
          <RiUploadCloudLine className='h-5 w-5' />
          Upload Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-4xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>Upload Carrier Invoice</DialogTitle>
          <DialogDescription>
            Upload a PDF invoice for automatic parsing and data extraction
          </DialogDescription>
        </DialogHeader>
        <UploadInvoiceForm
          onSuccess={() => {
            setUploadDialogOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
