export type AnalysisResult = {
  isThreat: boolean;
  details: Array<{
    source: string;
    reason: string;
  }>;
  searchTerm: string;
};
