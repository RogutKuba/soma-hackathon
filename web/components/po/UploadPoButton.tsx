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
import { RiFileList3Line } from '@remixicon/react';
import { UploadPoForm } from './UploadPoForm';

export function UploadPoButton() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="outline" className="gap-2">
          <RiFileList3Line className="h-5 w-5" />
          Upload Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Purchase Order</DialogTitle>
          <DialogDescription>
            Upload a purchase order PDF for automatic parsing and data extraction
          </DialogDescription>
        </DialogHeader>
        <UploadPoForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
