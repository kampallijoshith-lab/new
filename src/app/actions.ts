'use server';

import { analyzeDrugData } from '@/ai/flows/analyze-drug-data';
import { crossReferenceGlobalHealthThreats } from '@/ai/flows/cross-reference-global-health-threats';
import type { AnalysisResult } from '@/lib/types';

export async function performAnalysis(
  searchTerm: string
): Promise<AnalysisResult> {
  try {
    if (!searchTerm || searchTerm.trim().length < 3) {
      throw new Error('Search term must be at least 3 characters long.');
    }
    
    // A simple heuristic to separate name from batch if possible.
    // This can be improved with more sophisticated parsing.
    let medicineName = searchTerm;
    let batchNumber = '';
    const batchKeywords = ['batch', 'lot'];
    const words = searchTerm.split(' ');
    const batchIndex = words.findIndex(word => batchKeywords.some(kw => word.toLowerCase().startsWith(kw)));

    if (batchIndex !== -1 && batchIndex + 1 < words.length) {
      medicineName = words.slice(0, batchIndex).join(' ');
      batchNumber = words.slice(batchIndex + 1).join(' ');
    }
    
    const [drugDataResult, healthThreatResult] = await Promise.all([
      analyzeDrugData({ medicineName: medicineName || searchTerm, batchNumber }),
      crossReferenceGlobalHealthThreats({ medicineInfo: searchTerm }),
    ]);

    const isThreat =
      drugDataResult.isFalsified || healthThreatResult.matchFound;
    const details: { source: string; reason: string }[] = [];

    if (
      drugDataResult.isFalsified &&
      drugDataResult.alertSource &&
      drugDataResult.reason
    ) {
      details.push({
        source: drugDataResult.alertSource,
        reason: drugDataResult.reason,
      });
    }

    if (
      healthThreatResult.matchFound &&
      healthThreatResult.source &&
      healthThreatResult.reason
    ) {
      // Avoid duplicates
      if (!details.some(d => d.source === healthThreatResult.source)) {
        details.push({
          source: healthThreatResult.source,
          reason: healthThreatResult.reason,
        });
      }
    }
    
    if (isThreat && details.length === 0) {
      details.push({
        source: 'AI-Powered Analysis',
        reason:
          'A potential risk was identified based on available data patterns, but specific details could not be retrieved. Proceed with extreme caution.',
      });
    }

    return { isThreat, details, searchTerm };
  } catch (error) {
    console.error('Error during analysis:', error);
    // Propagate a user-friendly error message
    if (error instanceof Error) {
        throw new Error(`Analysis failed: ${error.message}`);
    }
    throw new Error('An unexpected error occurred during the analysis.');
  }
}
