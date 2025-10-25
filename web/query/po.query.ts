import { useMutation, useQuery } from '@tanstack/react-query';
import { API_CLIENT } from '@/query/client';

// Types matching API responses
export interface CreatePurchaseOrderInput {
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
  fileId: string; // Changed from File to fileId (string)
}

export interface PurchaseOrder {
  id: string;
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
  status: 'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed';
  created_at: string;
  updated_at: string;
  file_id: string;
  file: {
    id: string;
    filename: string;
    url: string;
    mime_type: string;
    size_bytes: number;
  } | null;
}

interface CreatePurchaseOrderResponse {
  success: boolean;
  purchase_order: PurchaseOrder;
}

interface GetAllPurchaseOrdersResponse {
  success: boolean;
  purchase_orders: PurchaseOrder[];
  count: number;
}

interface UpdatePOStatusInput {
  id: string;
  status: 'pending' | 'bol_received' | 'invoiced' | 'matched' | 'disputed';
}

// Queries
export const useGetAllPurchaseOrdersQuery = () => {
  return useQuery<GetAllPurchaseOrdersResponse>({
    queryKey: ['purchase-orders'],
    queryFn: async () => {
      return API_CLIENT.fetch('/purchase-orders', {
        method: 'GET',
      });
    },
    refetchInterval: 3000,
  });
};

export const useGetPurchaseOrderByIdQuery = (id: string) => {
  return useQuery<CreatePurchaseOrderResponse>({
    queryKey: ['purchase-order', id],
    queryFn: async () => {
      return API_CLIENT.fetch(`/purchase-orders/${id}`, {
        method: 'GET',
      });
    },
    enabled: !!id,
  });
};

// Mutations
export const useCreatePurchaseOrderMutation = () => {
  const mutation = useMutation({
    mutationFn: async (
      data: CreatePurchaseOrderInput
    ): Promise<CreatePurchaseOrderResponse> => {
      // No longer using FormData - just sending JSON
      return API_CLIENT.fetch('/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          po_number: data.po_number,
          customer_name: data.customer_name,
          carrier_name: data.carrier_name,
          origin: data.origin,
          destination: data.destination,
          pickup_date: data.pickup_date,
          delivery_date: data.delivery_date,
          expected_charges: data.expected_charges,
          total_amount: data.total_amount,
          fileId: data.fileId, // Pass the file ID from OCR
        }),
      });
    },
  });

  return {
    createPurchaseOrder: mutation.mutateAsync,
    ...mutation,
  };
};

export const useUpdatePOStatusMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: UpdatePOStatusInput): Promise<CreatePurchaseOrderResponse> => {
      return API_CLIENT.fetch(`/purchase-orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    },
  });

  return {
    updatePOStatus: mutation.mutateAsync,
    ...mutation,
  };
};
