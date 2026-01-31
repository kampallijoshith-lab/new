export type AnalysisResult = {
  isThreat: boolean;
  details: Array<{
    source: string;
    reason: string;
  }>;
  searchTerm: string;
};


export type ScannerState = 'idle' | 'scanning' | 'analyzing' | 'questionnaire' | 'results';

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
