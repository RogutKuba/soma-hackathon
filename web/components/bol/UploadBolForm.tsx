'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useOcrBillOfLadingMutation,
  useCreateBillOfLadingMutation,
  type ExtractedBOLData,
  type FileEntity,
} from '@/query/bol.query';

interface ChargeItem {
  description: string;
  amount: string;
}

interface UploadBolFormProps {
  onSuccess?: () => void;
}

export function UploadBolForm({ onSuccess }: UploadBolFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileEntity, setFileEntity] = useState<FileEntity | null>(null);
  const [formData, setFormData] = useState<ExtractedBOLData>({
    bol_number: '',
    po_number: '',
    carrier_name: '',
    origin: '',
    destination: '',
    pickup_date: '',
    delivery_date: '',
    weight_lbs: undefined,
    item_description: undefined,
    actual_charges: undefined,
  });
  const [charges, setCharges] = useState<ChargeItem[]>([
    { description: '', amount: '' },
  ]);

  // Use query hooks
  const ocrMutation = useOcrBillOfLadingMutation();
  const createBolMutation = useCreateBillOfLadingMutation();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setUploadedFile(file);

      try {
        const result = await ocrMutation.mutateAsync(file);
        if (result.success) {
          // Store extracted data
          setFormData(result.data);

          // Set charges if available
          if (result.data.actual_charges && result.data.actual_charges.length > 0) {
            setCharges(
              result.data.actual_charges.map((charge) => ({
                description: charge.description,
                amount: charge.amount.toString(),
              }))
            );
          }

          // Store file entity (file is already uploaded to R2)
          setFileEntity(result.file);
        }
      } catch (error) {
        console.error('OCR error:', error);
        alert(
          'Failed to process PDF. Please try again or fill the form manually.'
        );
      }
    } else {
      alert('Please upload a PDF file');
    }
  };

  const handleInputChange = (
    field: keyof ExtractedBOLData,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uploadedFile || !fileEntity) {
      alert('Please upload a bill of lading PDF');
      return;
    }

    // Convert charges to expected format (only include non-empty charges)
    const actual_charges = charges
      .filter((charge) => charge.description && charge.amount)
      .map((charge) => ({
        description: charge.description,
        amount: parseFloat(charge.amount),
      }));

    try {
      // Note: File is already uploaded during OCR step
      // Pass the fileId instead of the file
      await createBolMutation.mutateAsync({
        bol_number: formData.bol_number,
        po_number: formData.po_number,
        carrier_name: formData.carrier_name,
        origin: formData.origin,
        destination: formData.destination,
        pickup_date: formData.pickup_date,
        delivery_date: formData.delivery_date,
        weight_lbs: formData.weight_lbs,
        item_description: formData.item_description,
        actual_charges: actual_charges.length > 0 ? actual_charges : undefined,
        file_id: fileEntity.id,  // Use the file ID from OCR response
      });

      alert('Bill of lading created successfully!');

      // Reset form
      setUploadedFile(null);
      setFileEntity(null);
      setFormData({
        bol_number: '',
        po_number: '',
        carrier_name: '',
        origin: '',
        destination: '',
        pickup_date: '',
        delivery_date: '',
        weight_lbs: undefined,
        item_description: undefined,
        actual_charges: undefined,
      });
      setCharges([{ description: '', amount: '' }]);

      // Call onSuccess callback to close dialog
      onSuccess?.();
    } catch (error) {
      console.error('Create BOL error:', error);
      alert('Failed to create bill of lading. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className='space-y-6'>
        {/* File Upload */}
        <div className='space-y-2'>
          <Label htmlFor='bol-file'>Bill of Lading PDF</Label>
          <Input
            id='bol-file'
            type='file'
            accept='application/pdf'
            onChange={handleFileUpload}
            disabled={ocrMutation.isPending || createBolMutation.isPending}
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
                <Label htmlFor='bol_number'>BOL Number</Label>
                <Input
                  id='bol_number'
                  value={formData.bol_number}
                  onChange={(e) =>
                    handleInputChange('bol_number', e.target.value)
                  }
                  required
                />
              </div>
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

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='weight_lbs'>Weight (lbs)</Label>
                <Input
                  id='weight_lbs'
                  type='number'
                  step='0.01'
                  value={formData.weight_lbs || ''}
                  onChange={(e) =>
                    handleInputChange('weight_lbs', parseFloat(e.target.value))
                  }
                  placeholder='Optional'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='item_description'>Item Description</Label>
                <Input
                  id='item_description'
                  value={formData.item_description || ''}
                  onChange={(e) =>
                    handleInputChange('item_description', e.target.value)
                  }
                  placeholder='Optional'
                />
              </div>
            </div>

            {/* Actual Charges */}
            <div className='space-y-4'>
              <div className='flex justify-between items-center'>
                <Label>Actual Charges (Optional)</Label>
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
              bol_number: '',
              po_number: '',
              carrier_name: '',
              origin: '',
              destination: '',
              pickup_date: '',
              delivery_date: '',
              weight_lbs: undefined,
              item_description: undefined,
              actual_charges: undefined,
            });
            setCharges([{ description: '', amount: '' }]);
          }}
        >
          Reset
        </Button>
        <Button
          type='submit'
          disabled={
            !uploadedFile || ocrMutation.isPending || createBolMutation.isPending
          }
        >
          {createBolMutation.isPending ? 'Creating...' : 'Create Bill of Lading'}
        </Button>
      </div>
    </form>
  );
}
