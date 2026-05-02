/**
 * useMedicationChecker - Smart Drug Interaction Checker
 * Checks drug-drug interactions, allergy cross-reactions, and chronic condition contraindications
 */

import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface MedicationInput {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface InteractionResult {
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'contraindicated';
  medication1: string;
  medication2: string;
  description: string;
  recommendation: string;
  alternatives?: string[];
}

export interface AllergyWarning {
  medication: string;
  allergy: string;
  severity: 'moderate' | 'severe' | 'contraindicated';
  description: string;
  alternatives: string[];
}

export interface ConditionWarning {
  medication: string;
  condition: string;
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  description: string;
  recommendation: string;
  alternatives: string[];
}

export interface MedicationAnalysis {
  interactions: InteractionResult[];
  allergyWarnings: AllergyWarning[];
  conditionWarnings: ConditionWarning[];
  generalWarnings: string[];
  overallRisk: 'low' | 'moderate' | 'high';
  disclaimer: string;
}

export interface SmartCheckInput {
  medications: MedicationInput[];
  allergies?: string[];
  chronicConditions?: string[];
  currentMedications?: string;
}

export function useMedicationChecker() {
  const mutation = useMutation({
    mutationFn: async (input: SmartCheckInput): Promise<MedicationAnalysis> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('check-medication-interactions', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: input,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      // Normalize — ensure arrays exist for backward compat
      const result = data.data;
      return {
        interactions: result.interactions || [],
        allergyWarnings: result.allergyWarnings || [],
        conditionWarnings: result.conditionWarnings || [],
        generalWarnings: result.generalWarnings || [],
        overallRisk: result.overallRisk || 'low',
        disclaimer: result.disclaimer || '',
      };
    },
    onError: (error: Error) => {
      toast({
        title: 'Analysis Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    checkInteractions: mutation.mutateAsync,
    isChecking: mutation.isPending,
    result: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  };
}

export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'contraindicated':
      return 'text-red-700 bg-red-100 border-red-300 dark:text-red-300 dark:bg-red-950/40 dark:border-red-800';
    case 'severe':
      return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-800';
    case 'moderate':
      return 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:text-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-800';
    case 'mild':
      return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-950/30 dark:border-blue-800';
    default:
      return 'text-green-600 bg-green-50 border-green-200 dark:text-green-300 dark:bg-green-950/30 dark:border-green-800';
  }
}

export function getSeverityLabel(severity: string): string {
  switch (severity) {
    case 'contraindicated': return 'Contraindicated';
    case 'severe': return 'Severe';
    case 'moderate': return 'Moderate';
    case 'mild': return 'Mild';
    default: return 'None';
  }
}

export function getRiskColor(risk: MedicationAnalysis['overallRisk']): string {
  switch (risk) {
    case 'high': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-950/40';
    case 'moderate': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-950/40';
    default: return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-950/40';
  }
}

export function getSeverityIcon(severity: string): '🔴' | '🟠' | '🟡' | '🔵' | '🟢' {
  switch (severity) {
    case 'contraindicated': return '🔴';
    case 'severe': return '🟠';
    case 'moderate': return '🟡';
    case 'mild': return '🔵';
    default: return '🟢';
  }
}
