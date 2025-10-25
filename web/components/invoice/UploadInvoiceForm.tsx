'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useOcrInvoiceMutation,
  type ExtractedInvoiceData,
  type FileEntity,
} from '@/query/ocr.query';
import { useCreateInvoiceMutation } from '@/query/invoice.query';

interface ChargeItem {
  description: string;
  amount: string;
}

interface UploadInvoiceFormProps {
  onSuccess?: () => void;
}

export function UploadInvoiceForm({ onSuccess }: UploadInvoiceFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileEntity, setFileEntity] = useState<FileEntity | null>(null);
  const [formData, setFormData] = useState<ExtractedInvoiceData>({
    invoice_number: '',
    carrier_name: '',
    invoice_date: '',
    po_number: '',
    bol_number: '',
    charges: [],
    total_amount: 0,
    payment_terms: '',
    due_date: '',
  });
  const [charges, setCharges] = useState<ChargeItem[]>([
    { description: '', amount: '' },
  ]);

  // Use query hooks
  const ocrMutation = useOcrInvoiceMutation();
  const createInvoiceMutation = useCreateInvoiceMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);

      try {
        const result = await ocrMutation.ocrInvoice(file);
        if (result.success) {
          // Store extracted data
          setFormData(result.data);
          setCharges(
            result.data.charges.map((charge) => ({
              description: charge.description,
              amount: charge.amount.toString(),
            }))
          );

          // Store file entity (file is already uploaded to R2)
          setFileEntity(result.file);
        }
      } catch (error) {
        console.error('OCR error:', error);
        toast.error(
          'Failed to process PDF. Please try again or fill the form manually.'
        );
      }
    } else {
      toast.error('Please upload a PDF file');
    }
  };

  const handleInputChange = (
    field: keyof ExtractedInvoiceData,
    value: string | number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChargeChange = (
    index: number,
    field: keyof ChargeItem,
    value: string
  ) => {
    const newCharges = [...charges];
    newCharges[index][field] = value;
    setCharges(newCharges);
  };

  const addCharge = () => {
    setCharges([...charges, { description: '', amount: '' }]);
  };

  const removeCharge = (index: number) => {
    setCharges(charges.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return charges.reduce((sum, charge) => {
      const amount = parseFloat(charge.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedFile || !fileEntity) {
      toast.error('Please upload an invoice PDF');
      return;
    }

    // Convert charges to expected format
    const invoiceCharges = charges
      .filter((charge) => charge.description && charge.amount)
      .map((charge) => ({
        description: charge.description,
        amount: parseFloat(charge.amount),
      }));

    const total_amount = calculateTotal();

    try {
      // Note: File is already uploaded during OCR step
      // Pass the fileId instead of the file
      await createInvoiceMutation.createInvoice({
        invoice_number: formData.invoice_number,
        carrier_name: formData.carrier_name,
        invoice_date: formData.invoice_date,
        po_number: formData.po_number || undefined,
        bol_number: formData.bol_number || undefined,
        charges: invoiceCharges,
        total_amount,
        payment_terms: formData.payment_terms || undefined,
        due_date: formData.due_date || undefined,
        invoice_file_id: fileEntity.id,  // Use the file ID from OCR response
      });

      toast.success('Invoice created successfully!');

      // Reset form
      setUploadedFile(null);
      setFileEntity(null);
      setFormData({
        invoice_number: '',
        carrier_name: '',
        invoice_date: '',
        po_number: '',
        bol_number: '',
        charges: [],
        total_amount: 0,
        payment_terms: '',
        due_date: '',
      });
      setCharges([{ description: '', amount: '' }]);

      // Call onSuccess callback to close dialog
      onSuccess?.();
    } catch (error) {
      console.error('Create invoice error:', error);
      toast.error('Failed to create invoice. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className='space-y-6'>
        {/* File Upload */}
        <div className='space-y-2'>
          <Label htmlFor='invoice-file'>Invoice PDF</Label>
          <Input
            id='invoice-file'
            type='file'
            accept='application/pdf'
            onChange={handleFileUpload}
            disabled={ocrMutation.isPending || createInvoiceMutation.isPending}
          />
          {uploadedFile && fileEntity && (
            <div className='text-sm space-y-1'>
              <p className='text-muted-foreground'>
                Uploaded: {fileEntity.filename}
              </p>
              <p className='text-xs text-green-600'>
                 File saved ({(fileEntity.size_bytes / 1024).toFixed(1)} KB)
              </p>
            </div>
          )}
          {ocrMutation.isPending && (
            <p className='text-sm text-blue-600'>Processing PDF with OCR...</p>
          )}
        </div>

        {/* Form Fields - Only show after file upload */}
        {uploadedFile && !ocrMutation.isPending && (
          <>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='invoice_number'>Invoice Number</Label>
                <Input
                  id='invoice_number'
                  value={formData.invoice_number}
                  onChange={(e) =>
                    handleInputChange('invoice_number', e.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='carrier_name'>Carrier Name</Label>
                <Input
                  id='carrier_name'
                  value={formData.carrier_name}
                  onChange={(e) =>
                    handleInputChange('carrier_name', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='po_number'>PO Number</Label>
                <Input
                  id='po_number'
                  value={formData.po_number || ''}
                  onChange={(e) =>
                    handleInputChange('po_number', e.target.value)
                  }
                  placeholder='Optional'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='bol_number'>BOL Number</Label>
                <Input
                  id='bol_number'
                  value={formData.bol_number || ''}
                  onChange={(e) =>
                    handleInputChange('bol_number', e.target.value)
                  }
                  placeholder='Optional'
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='invoice_date'>Invoice Date</Label>
                <Input
                  id='invoice_date'
                  type='date'
                  value={formData.invoice_date.split('T')[0]}
                  onChange={(e) =>
                    handleInputChange('invoice_date', e.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='due_date'>Due Date</Label>
                <Input
                  id='due_date'
                  type='date'
                  value={formData.due_date ? formData.due_date.split('T')[0] : ''}
                  onChange={(e) =>
                    handleInputChange('due_date', e.target.value)
                  }
                  placeholder='Optional'
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='payment_terms'>Payment Terms</Label>
              <Input
                id='payment_terms'
                value={formData.payment_terms || ''}
                onChange={(e) =>
                  handleInputChange('payment_terms', e.target.value)
                }
                placeholder='e.g., NET 30'
              />
            </div>

            {/* Charges */}
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <Label>Charges</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addCharge}
                >
                  Add Charge
                </Button>
              </div>
              {charges.map((charge, index) => (
                <div key={index} className='flex gap-2 items-end'>
                  <div className='flex-1 space-y-2'>
                    <Label htmlFor={`charge-desc-${index}`}>Description</Label>
                    <Input
                      id={`charge-desc-${index}`}
                      value={charge.description}
                      onChange={(e) =>
                        handleChargeChange(index, 'description', e.target.value)
                      }
                      placeholder='e.g., Linehaul'
                    />
                  </div>
                  <div className='w-32 space-y-2'>
                    <Label htmlFor={`charge-amount-${index}`}>Amount</Label>
                    <Input
                      id={`charge-amount-${index}`}
                      type='number'
                      step='0.01'
                      value={charge.amount}
                      onChange={(e) =>
                        handleChargeChange(index, 'amount', e.target.value)
                      }
                      placeholder='0.00'
                    />
                  </div>
                  {charges.length > 1 && (
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      onClick={() => removeCharge(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <div className='flex justify-end'>
                <div className='text-lg font-semibold'>
                  Total: ${calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className='flex justify-between pt-4'>
        <Button
          type='button'
          variant='outline'
          onClick={() => {
            setUploadedFile(null);
            setFileEntity(null);
            setFormData({
              invoice_number: '',
              carrier_name: '',
              invoice_date: '',
              po_number: '',
              bol_number: '',
              charges: [],
              total_amount: 0,
              payment_terms: '',
              due_date: '',
            });
            setCharges([{ description: '', amount: '' }]);
          }}
        >
          Reset
        </Button>
        <Button
          type='submit'
          disabled={
            !uploadedFile || ocrMutation.isPending || createInvoiceMutation.isPending
          }
        >
          {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}
