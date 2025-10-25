import { useMutation, useQuery } from '@tanstack/react-query';
import { API_CLIENT } from '@/query/client';
import { type CreatePurchaseOrderInput } from '@/query/po.query';

// Database entity types (matching API responses)
interface Experiment {
  id: string;
  repoUrl: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  variantSuggestions?: string[];
}

interface Variant {
  id: string;
  createdAt: string;
  experimentId: string;
  daytonaSandboxId: string;
  publicUrl: string;
  type: 'control' | 'experiment';
  suggestion: string | null;
  analysis: {
    success: boolean;
    summary: string;
    insights: string[];
    issues: string[];
  } | null;
}

interface Agent {
  id: string;
  createdAt: string;
  experimentId: string;
  variantId: string;
  browserTaskId: string;
  browserLiveUrl: string | null;
  taskPrompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result: {
    success: boolean;
    summary: string;
    insights: string[];
    issues: string[];
  } | null;
  rawLogs: string | null;
}

interface CodeAgent {
  id: string;
  createdAt: string;
  updatedAt: string;
  experimentId: string;
  variantId: string;
  claudeSessionId: string | null;
  daytonaSandboxId: string;
  suggestion: string;
  implementationPrompt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  implementationSummary: string | null;
  filesModified: string[] | null;
  codeChanges:
    | {
        file: string;
        changes: string;
      }[]
    | null;
  logs: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

// UI-specific types for display
interface ControlVariant extends Variant {
  type: 'control';
  browserAgent?: Agent;
}

interface ExperimentalVariant extends Variant {
  type: 'experiment';
  browserAgent?: Agent;
  codeAgent?: CodeAgent;
}

interface ExperimentDetail extends Experiment {
  controlVariant?: ControlVariant;
  experimentalVariants?: ExperimentalVariant[];
}

interface StartExperimentInput {
  repoUrl: string;
  goal: string;
}

interface StartExperimentResponse {
  id: string;
  repoUrl: string;
  goal: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

// Queries
export const useExperimentsQuery = () => {
  const query = useQuery({
    queryKey: ['experiments'],
    queryFn: async (): Promise<Experiment[]> => {
      return API_CLIENT.fetch('/experiment', {
        method: 'GET',
      });
    },
  });

  return {
    experiments: query.data,
    ...query,
  };
};

export const useCreatePurchaseOrderMutation = () => {
  const mutation = useMutation({
    mutationFn: async (data: CreatePurchaseOrderInput) => {
      return API_CLIENT.fetch('/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
    },
  });

  return {
    createPurchaseOrder: mutation.mutateAsync,
    ...mutation,
  };
};
