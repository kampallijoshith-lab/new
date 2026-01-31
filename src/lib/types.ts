import { z } from 'zod';

export type MedicineInfo = {
  primaryUses?: string;
  howItWorks?: string;
  commonIndications?: string[];
  safetyDisclaimer?: string;
  error?: string;
};

export const ForensicAnalysisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the medicine, as a data URI that must include a MIME type and use Base64 encoding."
    ),
});

export type Source = {
  uri: string;
  title: string;
  tier: number;
};

export type CoreMatch = {
  status: 'match' | 'conflict' | 'omission';
  reason: string;
  evidence_quote: string;
};

export type CoreResult = {
  match: boolean;
} & CoreMatch;

export type CoreResults = {
  imprint: CoreResult;
  color: CoreResult;
  shape: CoreResult;
  generic: CoreResult;
  source: {
    match: boolean;
    reason: string;
  };
};

export type DetailedFactor = {
  name: string;
  status: 'match' | 'conflict' | 'omission';
  evidence_quote: string;
};

export type ForensicAnalysisResult = {
  score: number;
  verdict: Verdict;
  imprint: string;
  sources: Source[];
  coreResults: CoreResults;
  detailed: DetailedFactor[];
  timestamp: string;
  scanId: string;
};

export type ScannerState = 'idle' | 'scanning' | 'analyzing' | 'results' ;

export type AnalysisStepStatus = 'pending' | 'in-progress' | 'complete' | 'error';
export interface AnalysisStep {
  title: string;
  status: AnalysisStepStatus;
  duration: number;
}

export interface Question {
  id: string;
  text: string;
  factor: keyof ResultData['manualFactors'];
}

export type Verdict = 'Authentic' | 'Inconclusive' | 'Counterfeit Risk';

// This is legacy and can be removed later
export interface ResultData {
  score: number;
  verdict: Verdict;
  aiFactors: {
    imprintAnalysis: { score: number; details: string };
    packagingQuality: { score: number; details: string };
    globalDatabaseCheck: { score: number; details: string };
  };
  manualFactors: {
    price: { answer: boolean | null, weight: number };
    source: { answer: boolean | null, weight: number };
    packaging: { answer: boolean | null, weight: number };
    seals: { answer: boolean | null, weight: number };
    pharmacist: { answer: boolean | null, weight: number };
    sideEffects: { answer: boolean | null, weight: number };
    dosage: { answer: boolean | null, weight: number };
    expiration: { answer: boolean | null, weight: number };
  };
}
