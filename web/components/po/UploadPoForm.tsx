'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useOcrPurchaseOrderMutation,
  type ExtractedPOData,
  type FileEntity,
} from '@/query/ocr.query';
import { useCreatePurchaseOrderMutation } from '@/query/po.query';
import { toast } from 'sonner';

interface ChargeItem {
  description: string;
  amount: string;
}

interface UploadPoFormProps {
  onSuccess?: () => void;
}

export function UploadPoForm({ onSuccess }: UploadPoFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileEntity, setFileEntity] = useState<FileEntity | null>(null);
  const [formData, setFormData] = useState<ExtractedPOData>({
    po_number: '',
    customer_name: '',
    carrier_name: '',
    origin: '',
    destination: '',
    pickup_date: '',
    delivery_date: '',
    expected_charges: [],
    total_amount: 0,
  });
  const [charges, setCharges] = useState<ChargeItem[]>([
    { description: '', amount: '' },
  ]);
  // Use query hooks
  const ocrMutation = useOcrPurchaseOrderMutation();
  const createPoMutation = useCreatePurchaseOrderMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);

      try {
        const result = await ocrMutation.ocrPurchaseOrder(file);
        if (result.success) {
          // Store extracted data
          setFormData(result.data);
          setCharges(
            result.data.expected_charges.map((charge) => ({
              description: charge.description,
              amount: charge.amount.toString(),
            }))
          );

          // Store file entity (file is already uploaded to R2)
          setFileEntity(result.file);

          toast.success('PDF processed successfully', {
            description: 'Form has been auto-filled with extracted data',
          });
        }
      } catch (error) {
        console.error('OCR error:', error);
        toast.error('Failed to process PDF', {
          description: 'Please try again or fill the form manually',
        });
      }
    } else {
      toast.error('Invalid file type', {
        description: 'Please upload a PDF file',
      });
    }
  };

  const handleInputChange = (
    field: keyof ExtractedPOData,
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
      toast.error('Missing file', {
        description: 'Please upload a purchase order PDF',
      });
      return;
    }

    // Convert charges to expected format
    const expected_charges = charges
      .filter((charge) => charge.description && charge.amount)
      .map((charge) => ({
        description: charge.description,
        amount: parseFloat(charge.amount),
      }));

    const total_amount = calculateTotal();

    try {
      // Note: File is already uploaded during OCR step
      // Pass the fileId instead of the file
      await createPoMutation.createPurchaseOrder({
        ...formData,
        expected_charges,
        total_amount,
        fileId: fileEntity.id,  // Use the file ID from OCR response
      });

      toast.success('Purchase order created!', {
        description: `PO ${formData.po_number} has been added to the system`,
      });

      // Reset form
      setUploadedFile(null);
      setFileEntity(null);
      setFormData({
        po_number: '',
        customer_name: '',
        carrier_name: '',
        origin: '',
        destination: '',
        pickup_date: '',
        delivery_date: '',
        expected_charges: [],
        total_amount: 0,
      });
      setCharges([{ description: '', amount: '' }]);

      // Call onSuccess callback to close dialog
      onSuccess?.();
    } catch (error) {
      console.error('Create PO error:', error);
      toast.error('Failed to create purchase order', {
        description: 'Please try again or contact support',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className='space-y-6'>
        {/* File Upload */}
        <div className='space-y-2'>
          <Label htmlFor='po-file'>Purchase Order PDF</Label>
          <Input
            id='po-file'
            type='file'
            accept='application/pdf'
            onChange={handleFileUpload}
            disabled={ocrMutation.isPending || createPoMutation.isPending}
          />
          {uploadedFile && fileEntity && (
            <div className='text-sm space-y-1'>
              <p className='text-muted-foreground'>
                Uploaded: {fileEntity.filename}
              </p>
              <p className='text-xs text-green-600'>
                ✓ File saved ({(fileEntity.size_bytes / 1024).toFixed(1)} KB)
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
                <Label htmlFor='po_number'>PO Number</Label>
                <Input
                  id='po_number'
                  value={formData.po_number}
                  onChange={(e) =>
                    handleInputChange('po_number', e.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='customer_name'>Customer Name</Label>
                <Input
                  id='customer_name'
                  value={formData.customer_name}
                  onChange={(e) =>
                    handleInputChange('customer_name', e.target.value)
                  }
                  required
                />
              </div>
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

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='origin'>Origin</Label>
                <Input
                  id='origin'
                  value={formData.origin}
                  onChange={(e) => handleInputChange('origin', e.target.value)}
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='destination'>Destination</Label>
                <Input
                  id='destination'
                  value={formData.destination}
                  onChange={(e) =>
                    handleInputChange('destination', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='pickup_date'>Pickup Date</Label>
                <Input
                  id='pickup_date'
                  type='date'
                  value={formData.pickup_date.split('T')[0]}
                  onChange={(e) =>
                    handleInputChange('pickup_date', e.target.value)
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='delivery_date'>Delivery Date</Label>
                <Input
                  id='delivery_date'
                  type='date'
                  value={formData.delivery_date.split('T')[0]}
                  onChange={(e) =>
                    handleInputChange('delivery_date', e.target.value)
                  }
                  required
                />
              </div>
            </div>

            {/* Expected Charges */}
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <Label>Expected Charges</Label>
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
              po_number: '',
              customer_name: '',
              carrier_name: '',
              origin: '',
              destination: '',
              pickup_date: '',
              delivery_date: '',
              expected_charges: [],
              total_amount: 0,
            });
            setCharges([{ description: '', amount: '' }]);
          }}
        >
          Reset
        </Button>
        <Button
          type='submit'
          disabled={
            !uploadedFile || ocrMutation.isPending || createPoMutation.isPending
          }
        >
          {createPoMutation.isPending ? 'Creating...' : 'Create Purchase Order'}
        </Button>
      </div>
    </form>
  );
}
