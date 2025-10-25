import { useMutation } from '@tanstack/react-query';
import { API_CLIENT } from '@/query/client';

// Types matching API responses
export interface ExtractedPOData {
  po_number: string;
  customer_name: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  expected_charges: Array<{
    description: string;
    amount: number;
  }>;
  total_amount: number;
}

export interface FileEntity {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  file_type: string | null;
  created_at: string;
  url: string;
}

export interface ExtractedInvoiceData {
  invoice_number: string;
  carrier_name: string;
  invoice_date: string;
  po_number?: string;
  bol_number?: string;
  charges: Array<{
    description: string;
    amount: number;
  }>;
  total_amount: number;
  payment_terms?: string;
  due_date?: string;
}

interface OcrPurchaseOrderResponse {
  success: boolean;
  data: ExtractedPOData;
  file: FileEntity;
}

interface OcrInvoiceResponse {
  success: boolean;
  data: ExtractedInvoiceData;
  file: FileEntity;
}

// Mutations
export const useOcrPurchaseOrderMutation = () => {
  const mutation = useMutation({
    mutationFn: async (file: File): Promise<OcrPurchaseOrderResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      return API_CLIENT.fetch('/ocr/purchase-order', {
        method: 'POST',
        body: formData,
      });
    },
  });

  return {
    ocrPurchaseOrder: mutation.mutateAsync,
    ...mutation,
  };
};

export const useOcrInvoiceMutation = () => {
  const mutation = useMutation({
    mutationFn: async (file: File): Promise<OcrInvoiceResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      return API_CLIENT.fetch('/ocr/invoice', {
        method: 'POST',
        body: formData,
      });
    },
  });

  return {
    ocrInvoice: mutation.mutateAsync,
    ...mutation,
  };
};
