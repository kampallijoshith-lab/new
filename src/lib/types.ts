import { z } from 'zod';

export type MedicineInfo = {
  primaryUses?: string;
  howItWorks?: string;
  commonIndications?: string[];
  safetyDisclaimer?: string;
  error?: string;
};

// Zod schemas for multi-step analysis
export const OCRResultSchema = z.object({
    drugName: z.string(),
    dosage: z.string(),
    imprint: z.string(),
    manufacturer: z.string(),
});

export const ResearchInterpretationSchema = z.object({
    officialDescription: z.string(),
    knownRecalls: z.array(z.string()),
    pharmacology: z.object({
        uses: z.string(),
        howItWorks: z.string(),
        indications: z.array(z.string()),
    }),
});

export const VisualForensicSchema = z.object({
    qualityScore: z.number(),
    redFlags: z.array(z.string()),
    physicalDesc: z.object({
        color: z.string(),
        shape: z.string(),
    }),
});

export const ForensicAnalysisInputZodSchema = z.object({
  photoDataUri: z.string(),
});
export type ForensicAnalysisInput = z.infer<typeof ForensicAnalysisInputZodSchema>;

export type Source = {
  uri: string;
  title: string;
  tier: number;
};

export type CoreMatch = {
  status: 'match' | 'conflict' | 'omission';
  reason: string;
  evidence_quote?: string;
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

export type ForensicAnalysisResult = {
  score: number;
  verdict: Verdict;
  imprint: string;
  sources?: Source[];
  coreResults: CoreResults;
  timestamp: string;
  scanId: string;
  primaryUses?: string;
  howItWorks?: string;
  commonIndications?: string[];
  safetyDisclaimer?: string;
  analysisError?: string | null;
};

export type ScannerState = 'idle' | 'scanning' | 'analyzing' | 'results' | 'cooldown';
export type AnalysisStepStatus = 'pending' | 'in-progress' | 'complete' | 'error';
export interface AnalysisStep {
  title: string;
  status: AnalysisStepStatus;
  duration: number;
}

export type Verdict = 'Authentic' | 'Inconclusive' | 'Counterfeit Risk';

export interface ResultData {
  score: number;
  verdict: Verdict;
  aiFactors: any;
  manualFactors: any;
}
