'use server';
/**
 * @fileOverview A multi-step forensic analysis flow to verify medicine authenticity.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  ForensicAnalysisResult,
  ForensicAnalysisInputSchema,
} from '@/lib/types';

export async function forensicAnalysisFlow(
  input: z.infer<typeof ForensicAnalysisInputSchema>
): Promise<ForensicAnalysisResult> {
  // Helper to clean JSON from LLM responses
  function cleanJSON(str: string): string {
    if (!str) return '';
    try {
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        str = str.substring(firstBrace, lastBrace + 1);
      }
      return str.replace(/```json|```/g, '').trim();
    } catch (e) {
      return str;
    }
  }

  // Helper to calculate weighted scores
  function calculateWeight(status: string, fullWeight: number): number {
    if (status === 'match') return fullWeight;
    if (status === 'omission') return fullWeight * 0.5;
    return 0; // conflict
  }

  // ======================================================================
  // STEP 1: Quality Gate & Image Analysis
  // ======================================================================
  const forensicPrompt = `Role: You are a Senior Pharmaceutical Forensic Analyst.
Task: Analyze image quality and extract physical pill characteristics.
Instructions:
- STEP 1 (Quality Gate): Audit for LENS_BLUR, EXCESSIVE_GLARE, or POOR_FRAMING. If the quality prevents a forensic audit, return ONLY the error code in the "quality_error" field.
- Focus on the Imprint: Look for engravings or debossings. If unclear, set "unclear_imprint": true and provide "best_guess_imprint".
- Physical Analysis: Identify shape, hex-specific color, and texture.
- Strict JSON Output ONLY.

JSON Schema:
{
  "quality_error": "LENS_BLUR" | "EXCESSIVE_GLARE" | "POOR_FRAMING" | "NONE",
  "detected_imprint": "string or 'NONE'",
  "unclear_imprint": boolean,
  "best_guess_imprint": "string",
  "pill_color": { "primary_hex": "string", "secondary_hex": "string" },
  "pill_shape": "string",
  "surface_texture": "string",
  "packaging_info": { "manufacturer": "string", "batch_no": "string", "expiry": "string" },
  "ai_confidence_score": 0.0-1.0
}`;

  const visionResult = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: forensicPrompt,
    config: {
      temperature: 0,
      topP: 0.1,
      topK: 1,
    },
    input: {
      image: { url: input.photoDataUri },
    },
  });

  const visionData = JSON.parse(cleanJSON(visionResult.text));

  if (visionData.quality_error && visionData.quality_error !== 'NONE') {
    throw new Error(
      `QUALITY_GATE_REJECTED: ${visionData.quality_error}. Please re-take the photo in better lighting.`
    );
  }

  // ======================================================================
  // STEP 2: Ground Truth Research (Web Search)
  // ======================================================================
  const searchTerm =
    visionData.unclear_imprint || visionData.detected_imprint === 'NONE'
      ? `Physical description: ${visionData.pill_shape} tablet with primary hex ${visionData.pill_color.primary_hex} markings identification`
      : `Official pharmacological monograph for tablet imprint "${
          visionData.detected_imprint
        }" ${
          visionData.packaging_info.manufacturer !== 'NOT_VISIBLE'
            ? 'by ' + visionData.packaging_info.manufacturer
            : ''
        }`;

  const searchResult = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: searchTerm,
    config: {
      temperature: 0,
      topP: 0.1,
      topK: 1,
    },
  });
  
  const groundTruthText = searchResult.text;
  const attributions = searchResult.references || [];
  
  // ======================================================================
  // STEP 3: Source Reliability Scoring
  // ======================================================================
  const tier1Domains = [
    '.gov', 'nic.in', 'drugs.com', 'dailymed.nlm.nih.gov', 'nih.gov', 'fda.gov', 'who.int'
  ];
  const tier2Domains = ['.com', '.org', '.net'];

  let sourceScore = 0;
  const sources = attributions.map((a: any) => {
    const url = a.url?.toLowerCase() || '';
    let tier = 0;
    if (tier1Domains.some(d => url.includes(d))) tier = 1;
    else if (tier2Domains.some(d => url.includes(d))) tier = 2;
    return { uri: a.url, title: a.title, tier };
  });

  if (sources.some((s: any) => s.tier === 1)) {
    sourceScore = 15;
  } else if (sources.length > 0) {
    sourceScore = 5;
  }

  // ======================================================================
  // STEP 4: Conflict vs Omission Validation
  // ======================================================================
  const validatorSystemPrompt = `You are a validator. Compare forensic features against truth data.
Observed Data: ${JSON.stringify(visionData)}
Truth Data: ${groundTruthText}

RULES:
1. STATUS: Return "match", "conflict" (explicit contradiction), or "omission" (truth data is silent).
2. SCORING: 
   - match = Full Weight.
   - conflict = 0 Points.
   - omission = 50% Weight (Neutral).
3. COLOR: Describe match hex-quantitatively (e.g., "Matches target hex #FFFFFF with 95% confidence").
4. EVIDENCE: Provide a direct "evidence_quote" from the Truth Data for every decision.

Return JSON:
{
  "coreMatches": {
    "imprint": {"status": "match"|"conflict"|"omission", "reason": "string", "evidence_quote": "string"},
    "color": {"status": "match"|"conflict"|"omission", "reason": "string", "evidence_quote": "string"},
    "shape": {"status": "match"|"conflict"|"omission", "reason": "string", "evidence_quote": "string"},
    "generic": {"status": "match"|"conflict"|"omission", "reason": "string", "evidence_quote": "string"}
  },
  "detailedFactors": [
     {"name": "string", "status": "match"|"conflict"|"omission", "evidence_quote": "string"}
  ]
}`;

  const validatorResult = await ai.generate({
    model: 'googleai/gemini-2.5-flash',
    prompt: validatorSystemPrompt,
    config: {
      temperature: 0,
      topP: 0.1,
      topK: 1,
    },
  });

  const validatorData = JSON.parse(cleanJSON(validatorResult.text));

  // ======================================================================
  // STEP 5: Final Scoring Calculation
  // ======================================================================
  let finalScore = 0;
  finalScore += calculateWeight(validatorData.coreMatches.imprint.status, 40);
  finalScore += calculateWeight(validatorData.coreMatches.color.status, 20);
  finalScore += calculateWeight(validatorData.coreMatches.generic.status, 15);
  finalScore += calculateWeight(validatorData.coreMatches.shape.status, 10);
  finalScore += sourceScore;

  const verdict =
    finalScore > 85
      ? 'Authentic'
      : finalScore > 65
      ? 'Inconclusive'
      : 'Counterfeit Risk';

  // ======================================================================
  // STEP 6: Format Final Response
  // ======================================================================
  const resultData: ForensicAnalysisResult = {
    score: Math.round(finalScore),
    verdict,
    imprint: visionData.detected_imprint,
    sources: sources.slice(0, 4),
    coreResults: {
      imprint: {
        match: validatorData.coreMatches.imprint.status !== 'conflict',
        ...validatorData.coreMatches.imprint,
      },
      color: {
        match: validatorData.coreMatches.color.status !== 'conflict',
        ...validatorData.coreMatches.color,
      },
      shape: {
        match: validatorData.coreMatches.shape.status !== 'conflict',
        ...validatorData.coreMatches.shape,
      },
      generic: {
        match: validatorData.coreMatches.generic.status !== 'conflict',
        ...validatorData.coreMatches.generic,
      },
      source: {
        match: sourceScore >= 5,
        reason:
          sourceScore === 15
            ? 'Verified via Tier 1 official sources.'
            : 'Sources limited to Tier 2.',
      },
    },
    detailed: validatorData.detailedFactors || [],
    timestamp: new Date().toISOString(),
    scanId: `scan_${new Date().getTime()}`,
  };

  return resultData;
}
