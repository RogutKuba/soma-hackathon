import { useMutation, useQuery } from '@tanstack/react-query';
import { API_CLIENT } from '@/query/client';

// Types
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

export interface ExtractedBOLData {
  bol_number: string;
  po_number: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight_lbs?: number;
  item_description?: string;
  actual_charges?: Array<{
    description: string;
    amount: number;
  }>;
}

interface OcrBillOfLadingResponse {
  success: boolean;
  data: ExtractedBOLData;
  file: FileEntity;
}

export interface CreateBillOfLadingInput {
  bol_number: string;
  po_number: string;
  po_id?: string;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight_lbs?: number;
  item_description?: string;
  actual_charges?: Array<{
    description: string;
    amount: number;
  }>;
  file_id: string;
  pod_file_id?: string;
  pod_signed_at?: string;
}

export interface BillOfLading {
  id: string;
  bol_number: string;
  po_number: string;
  po_id: string | null;
  carrier_name: string;
  origin: string;
  destination: string;
  pickup_date: string;
  delivery_date: string;
  weight_lbs: number | null;
  item_description: string | null;
  actual_charges: Array<{ description: string; amount: number }> | null;
  file_id: string;
  pod_file_id: string | null;
  pod_signed_at: string | null;
  status: 'pending' | 'delivered' | 'invoiced' | 'matched';
  created_at: string;
  updated_at: string;
  file: {
    id: string;
    filename: string;
    url: string;
    mime_type: string;
    size_bytes: number;
  } | null;
}

interface CreateBillOfLadingResponse {
  success: boolean;
  bill_of_lading: BillOfLading;
}

interface GetAllBillsOfLadingResponse {
  success: boolean;
  bills_of_lading: BillOfLading[];
  count: number;
}

interface GetBillOfLadingByIdResponse {
  success: boolean;
  bill_of_lading: BillOfLading;
}

interface UpdateBOLStatusInput {
  id: string;
  status: 'pending' | 'delivered' | 'invoiced' | 'matched';
}

// Queries
export const useGetAllBillsOfLadingQuery = (filters?: {
  status?: 'pending' | 'delivered' | 'invoiced' | 'matched';
  carrier_name?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.carrier_name)
    params.append('carrier_name', filters.carrier_name);

  const queryString = params.toString();
  const url = queryString ? `/bol?${queryString}` : '/bol';

  return useQuery<GetAllBillsOfLadingResponse>({
    queryKey: ['bills-of-lading', filters],
    queryFn: async () => {
      return API_CLIENT.fetch(url, {
        method: 'GET',
      });
    },
  });
};

export const useGetBillOfLadingByIdQuery = (id: string) => {
  return useQuery<GetBillOfLadingByIdResponse>({
    queryKey: ['bill-of-lading', id],
    queryFn: async () => {
      return API_CLIENT.fetch(`/bol/${id}`, {
        method: 'GET',
      });
    },
    enabled: !!id,
  });
};

// Mutations
export const useOcrBillOfLadingMutation = () => {
  return useMutation({
    mutationFn: async (file: File): Promise<OcrBillOfLadingResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      return API_CLIENT.fetch('/ocr/bill-of-lading', {
        method: 'POST',
        body: formData,
      });
    },
  });
};

export const useCreateBillOfLadingMutation = () => {
  const mutation = useMutation({
    mutationFn: async (
      data: CreateBillOfLadingInput
    ): Promise<CreateBillOfLadingResponse> => {
      return API_CLIENT.fetch('/bol', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
  });

  return {
    createBillOfLading: mutation.mutateAsync,
    ...mutation,
  };
};

export const useUpdateBOLStatusMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: UpdateBOLStatusInput): Promise<CreateBillOfLadingResponse> => {
      return API_CLIENT.fetch(`/bol/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    },
  });

  return {
    updateBOLStatus: mutation.mutateAsync,
    ...mutation,
  };
};
