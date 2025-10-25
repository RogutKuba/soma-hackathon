import { useQuery } from '@tanstack/react-query';
import { API_CLIENT } from '@/query/client';

// Types matching API responses
export interface MatchingResult {
  id: string;
  po_id: string;
  bol_id: string | null;
  invoice_id: string;
  match_status:
    | 'perfect_match'
    | 'minor_variance'
    | 'major_variance'
    | 'no_match';
  confidence_score: number;
  comparison: {
    po_total: number;
    bol_total?: number;
    invoice_total: number;
    variance: number;
    variance_pct: number;
    charge_comparison: Array<{
      description: string;
      po_amount: string | null;
      bol_amount: string | null;
      invoice_amount: string | null;
      status: 'match' | 'variance' | 'missing' | 'extra';
    }>;
    llm_reasoning?: string;
  };
  flags_count: number;
  high_severity_flags: number;
  created_at: string;
}

// Queries
export const useGetAllMatchingResultsQuery = () => {
  return useQuery<MatchingResult[]>({
    queryKey: ['matching-results'],
    queryFn: async () => {
      return API_CLIENT.fetch('/matching', {
        method: 'GET',
      });
    },
    refetchInterval: 2000,
  });
};

export const useGetMatchingResultByInvoiceQuery = (invoiceId: string) => {
  return useQuery<MatchingResult | null>({
    queryKey: ['matching-result', invoiceId],
    queryFn: async () => {
      return API_CLIENT.fetch(`/matching/invoice/${invoiceId}`, {
        method: 'GET',
      });
    },

    enabled: !!invoiceId,
  });
};
