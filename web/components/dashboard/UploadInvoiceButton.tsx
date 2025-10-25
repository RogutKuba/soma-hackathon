"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RiUploadCloudLine, RiFileTextLine } from "@remixicon/react";

export function UploadInvoiceButton() {
  const [open, setOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    // Filter for PDF files only
    const pdfFiles = files.filter(file => file.type === "application/pdf");

    if (pdfFiles.length === 0) {
      alert("Please upload PDF files only");
      return;
    }

    // TODO: Handle file upload
    console.log("Uploading files:", pdfFiles);

    // For demo: close dialog after upload
    setTimeout(() => {
      setOpen(false);
    }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <RiUploadCloudLine className="h-5 w-5" />
          Upload Invoice
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Upload Carrier Invoice</DialogTitle>
          <DialogDescription>
            Upload a PDF invoice for automatic parsing and 3-way matching
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Drag and Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
              ${isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
              }
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <RiUploadCloudLine className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-1">
              Drag and drop your invoice PDF here
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              or click to browse
            </p>
            <Button type="button" variant="outline" size="sm">
              Select File
            </Button>
          </div>

          <input
            id="file-input"
            type="file"
            accept=".pdf,application/pdf"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Info Section */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <RiFileTextLine className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">What happens next?</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1 list-disc list-inside">
                  <li>AI extracts invoice data (BOL #, PO #, charges)</li>
                  <li>System matches to existing PO and BOL</li>
                  <li>3-way comparison identifies discrepancies</li>
                  <li>Invoice appears in dashboard (ready to approve or flagged)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
