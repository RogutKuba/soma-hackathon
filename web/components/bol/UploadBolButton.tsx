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
import { UploadBolForm } from './UploadBolForm';

export function UploadBolButton() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  return (
    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2" variant="outline">
          <RiUploadCloudLine className="h-5 w-5" />
          Upload BOL
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Bill of Lading</DialogTitle>
          <DialogDescription>
            Upload a bill of lading PDF for automatic parsing and data extraction
          </DialogDescription>
        </DialogHeader>
        <UploadBolForm
          onSuccess={() => {
            setUploadDialogOpen(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
