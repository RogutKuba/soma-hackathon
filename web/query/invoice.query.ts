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

export interface CreateInvoiceInput {
  invoice_number: string;
  carrier_name: string;
  invoice_date: string;
  po_number?: string;
  bol_number?: string;
  po_id?: string;
  bol_id?: string;
  charges: Array<{
    description: string;
    amount: number;
  }>;
  total_amount: number;
  payment_terms?: string;
  due_date?: string;
  invoice_file_id?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  carrier_name: string;
  invoice_date: string;
  po_number: string | null;
  bol_number: string | null;
  po_id: string | null;
  bol_id: string | null;
  charges: Array<{
    description: string;
    amount: number;
  }>;
  total_amount: number;
  payment_terms: string | null;
  due_date: string | null;
  invoice_file_id: string | null;
  match_type: 'exact' | 'fuzzy' | 'manual' | null;
  match_confidence: number;
  status:
    | 'pending'
    | 'matched'
    | 'flagged'
    | 'approved'
    | 'disputed'
    | 'rejected';
  approved_at: string | null;
  approved_by: string | null;
  approval_notes: string | null;
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

interface CreateInvoiceResponse {
  success: boolean;
  invoice: Invoice;
}

interface GetAllInvoicesResponse {
  success: boolean;
  invoices: Invoice[];
  count: number;
}

interface GetInvoiceByIdResponse {
  success: boolean;
  invoice: Invoice;
}

interface UpdateInvoiceStatusInput {
  id: string;
  status:
    | 'pending'
    | 'matched'
    | 'flagged'
    | 'approved'
    | 'disputed'
    | 'rejected';
}

interface ApproveInvoiceInput {
  id: string;
  approved_by: string;
  notes?: string;
}

// Queries
export const useGetAllInvoicesQuery = (filters?: {
  status?:
    | 'pending'
    | 'matched'
    | 'flagged'
    | 'approved'
    | 'disputed'
    | 'rejected';
  carrier_name?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.carrier_name)
    params.append('carrier_name', filters.carrier_name);

  const queryString = params.toString();
  const url = queryString ? `/invoices?${queryString}` : '/invoices';

  return useQuery<GetAllInvoicesResponse>({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      return API_CLIENT.fetch(url, {
        method: 'GET',
      });
    },
    refetchInterval: 3000,
  });
};

export const useGetInvoiceByIdQuery = (id: string) => {
  return useQuery<GetInvoiceByIdResponse>({
    queryKey: ['invoice', id],
    queryFn: async () => {
      return API_CLIENT.fetch(`/invoices/${id}`, {
        method: 'GET',
      });
    },
    enabled: !!id,
  });
};

// Mutations
export const useCreateInvoiceMutation = () => {
  const mutation = useMutation({
    mutationFn: async (
      data: CreateInvoiceInput
    ): Promise<CreateInvoiceResponse> => {
      return API_CLIENT.fetch('/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
  });

  return {
    createInvoice: mutation.mutateAsync,
    ...mutation,
  };
};

export const useUpdateInvoiceStatusMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: UpdateInvoiceStatusInput): Promise<CreateInvoiceResponse> => {
      return API_CLIENT.fetch(`/invoices/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
    },
  });

  return {
    updateInvoiceStatus: mutation.mutateAsync,
    ...mutation,
  };
};

export const useApproveInvoiceMutation = () => {
  const mutation = useMutation({
    mutationFn: async ({
      id,
      approved_by,
      notes,
    }: ApproveInvoiceInput): Promise<CreateInvoiceResponse> => {
      return API_CLIENT.fetch(`/invoices/${id}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved_by, notes }),
      });
    },
  });

  return {
    approveInvoice: mutation.mutateAsync,
    ...mutation,
  };
};
