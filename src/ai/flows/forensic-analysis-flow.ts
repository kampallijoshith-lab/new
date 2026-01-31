'use server';
/**
 * @fileOverview A unified, single-call forensic and pharmacological analysis flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ForensicAnalysisInput, ForensicAnalysisResult } from '@/lib/types';
import { ForensicAnalysisInputZodSchema } from '@/lib/types';


// Helper to clean JSON from LLM responses.
// Genkit's `output` with a schema should already be parsed, but this is a fallback.
function cleanJSON(str: string): any {
    if (!str) return null;
    try {
      // Find the first '{' and the last '}' to handle potential markdown/text wrapping.
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        str = str.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(str.replace(/```json|```/g, '').trim());
      return parsed;
    } catch (e) {
      console.error("Failed to parse JSON from LLM:", e);
      // Return an object that fits the error schema
      return { analysisError: 'Failed to parse AI response. The response was not valid JSON.' };
    }
}


// This Zod schema defines the unified structure for our single API call.
const UnifiedAnalysisResultSchema = z.object({
    score: z.number().describe('The final authenticity score from 0-100.'),
    verdict: z.enum(['Authentic', 'Inconclusive', 'Counterfeit Risk']).describe('The final verdict.'),
    imprint: z.string().describe("The detected imprint on the pill. Can be 'NONE' if no imprint is visible."),
    sources: z.array(z.object({
        uri: z.string(),
        title: z.string(),
        tier: z.number(),
    })).optional().describe('A list of sources used for ground truth data.'),
    coreResults: z.object({
        imprint: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        color: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        shape: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        generic: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        source: z.object({ match: z.boolean(), reason: z.string() }),
    }).describe('Breakdown of core forensic analysis results.'),
    detailed: z.array(z.object({
        name: z.string(),
        status: z.string(),
        evidence_quote: z.string().optional(),
    })).optional().describe('Detailed factors from validation.'),
    timestamp: z.string().describe('The ISO timestamp of the analysis.'),
    scanId: z.string().describe('A unique ID for the scan.'),
    primaryUses: z.string().optional().describe("What this medicine is typically prescribed for."),
    howItWorks: z.string().optional().describe("A brief explanation of the mechanism."),
    commonIndications: z.array(z.string()).optional().describe("A list of 3-4 specific conditions it treats."),
    safetyDisclaimer: z.string().optional().describe("An explicit safety disclaimer."),
    analysisError: z.string().optional().nullable().describe("If analysis fails, provide the reason here."),
});


const unifiedAnalysisPrompt = ai.definePrompt({
    name: 'unifiedMedicineAnalysisPrompt',
    input: { schema: ForensicAnalysisInputZodSchema },
    output: { schema: UnifiedAnalysisResultSchema, format: 'json' },
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are a world-class Pharmaceutical Forensic Analyst and Pharmacologist AI, tasked with providing a comprehensive, one-shot analysis of a provided medicine image. You will perform a full forensic audit and provide pharmacological information.

**IMPORTANT: You MUST return ONLY a single, valid JSON object that strictly conforms to the provided schema. Do not include any explanatory text, markdown formatting, or any characters outside of the JSON object.**

**Analysis Steps:**

1.  **Image Quality Gate:** First, assess the image for forensic viability. Check for LENS_BLUR, EXCESSIVE_GLARE, or POOR_FRAMING. If the quality is too low for a reliable analysis, set the 'analysisError' field to a descriptive message (e.g., 'QUALITY_GATE_REJECTED: LENS_BLUR. Please provide a clearer image.') and do not populate the other fields. If quality is acceptable, 'analysisError' should be null.

2.  **Forensic Feature Extraction:** If the quality is sufficient, extract all physical characteristics from the image:
    *   **Imprint:** Detect any text, logos, or numbers. If none, return 'NONE'.
    *   **Color:** Identify the primary and secondary colors (if any).
    *   **Shape:** Identify the pill's shape (e.g., round, oval, capsule).
    *   **Texture:** Note the surface texture (e.g., smooth, scored).

3.  **Ground Truth Identification & Research:** Based on the extracted features, perform the equivalent of a web search against authoritative databases (like FDA, DailyMed, Drugs.com) to find the "ground truth" for a genuine pill matching these characteristics. Identify the drug's active ingredients and official physical description.

4.  **Comparative Analysis & Scoring:** Compare the features from the user's image (Step 2) against the ground truth data (Step 3). For each core feature (imprint, color, shape), determine the status:
    *   'match': The feature in the image matches the ground truth.
    *   'conflict': The feature explicitly contradicts the ground truth.
    *   'omission': The ground truth data is silent on this feature.
    *   Provide an 'evidence_quote' from your research for each decision.

5.  **Pharmacological Information:** Based on the identified drug from Step 3, provide:
    *   'primaryUses': The main medical purpose of the drug.
    *   'howItWorks': The mechanism of action.
    *   'commonIndications': A list of common conditions it treats.
    *   'safetyDisclaimer': A standard disclaimer about consulting a healthcare professional.

6.  **Final Scoring & Verdict:** Calculate a final authenticity 'score' (0-100) based on a weighted combination of the comparative analysis results. Assign a final 'verdict' ('Authentic', 'Inconclusive', 'Counterfeit Risk') based on the score. A score > 85 is Authentic, > 65 is Inconclusive, and <= 65 is Counterfeit Risk.

7.  **Final Touches:** Provide a timestamp (using the current ISO date and time) and a unique scanId (in the format 'scan_' + current timestamp).

**Input Image:**
{{media url=photoDataUri}}
`,
});


const unifiedAnalysisFlow = ai.defineFlow(
  {
    name: 'unifiedAnalysisFlow',
    inputSchema: ForensicAnalysisInputZodSchema,
    outputSchema: UnifiedAnalysisResultSchema,
  },
  async (input) => {
    const response = await unifiedAnalysisPrompt(input);
    const output = response.output();

    if (!output) {
        // If the structured output from the model fails, try to parse the raw text.
        const parsedText = cleanJSON(response.text);
        if(parsedText && typeof parsedText === 'object') {
            // Validate the parsed object against our schema before returning.
            return UnifiedAnalysisResultSchema.parse(parsedText);
        }
        throw new Error("Analysis failed: No valid output from AI model.");
    }
    return output;
  }
);

// This is the main function exported to the rest of the application.
export async function forensicAnalysisFlow(
  input: ForensicAnalysisInput
): Promise<ForensicAnalysisResult> {
  return unifiedAnalysisFlow(input);
}
