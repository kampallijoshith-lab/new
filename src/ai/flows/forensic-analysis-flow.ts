'use server';
/**
 * @fileOverview A multi-agent forensic and pharmacological analysis flow.
 * This system uses a "Mixture of Experts" approach:
 * 1. Gemini: Acts as the "Vision Expert" to describe the pill image.
 * 2. Exa: Acts as the "Research Librarian" to find ground-truth data.
 * 3. Groq: Acts as the "Fast Analyst" to perform the final analysis and generate the report.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ForensicAnalysisInput, ForensicAnalysisResult } from '@/lib/types';
import { ForensicAnalysisInputZodSchema } from '@/lib/types';
import Groq from 'groq-sdk';
import Exa from 'exa-js';


// Helper to clean JSON from LLM responses.
function cleanJSON(str: string): any {
    if (!str) return null;
    try {
      const firstBrace = str.indexOf('{');
      const lastBrace = str.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        str = str.substring(firstBrace, lastBrace + 1);
      }
      return JSON.parse(str.replace(/```json|```/g, '').trim());
    } catch (e) {
      console.error("Failed to parse JSON from LLM:", str, e);
      return { analysisError: 'Failed to parse AI response. The response was not valid JSON.' };
    }
}

// Zod schema for the final, unified output.
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


// Step 1: Gemini - The Vision Expert
const visionInputSchema = z.object({
    imprint: z.string().describe("The detected imprint on the pill. Can be 'NONE' if no imprint is visible."),
    color: z.string().describe("The primary color of the pill."),
    shape: z.string().describe("The shape of the pill (e.g., round, oval)."),
});

const visionPrompt = ai.definePrompt({
    name: 'pillVisionPrompt',
    input: { schema: ForensicAnalysisInputZodSchema },
    output: { schema: visionInputSchema, format: 'json' },
    model: 'googleai/gemini-2.5-flash',
    prompt: `You are a machine vision expert. Look at the image of the medicine and describe its physical characteristics.
Focus only on:
1.  **Imprint:** Detect any text, logos, or numbers. If none, return 'NONE'.
2.  **Color:** Identify the primary color.
3.  **Shape:** Identify the pill's shape (e.g., round, oval, capsule).
You MUST return ONLY a single, valid JSON object that strictly conforms to the provided schema. Do not include any explanatory text, markdown formatting, or any characters outside of the JSON object.

**Input Image:**
{{media url=photoDataUri}}
`,
});

// Main orchestration flow
const multiAgentAnalysisFlow = ai.defineFlow(
  {
    name: 'multiAgentAnalysisFlow',
    inputSchema: ForensicAnalysisInputZodSchema,
    outputSchema: UnifiedAnalysisResultSchema,
  },
  async (input) => {
    // API Key Validation
    if (!process.env.GEMINI_API_KEY || !process.env.EXA_API_KEY || !process.env.GROQ_API_KEY) {
        throw new Error("Missing required API keys (GEMINI_API_KEY, EXA_API_KEY, or GROQ_API_KEY) in environment variables.");
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const exa = new Exa({ apiKey: process.env.EXA_API_KEY });

    // Step 1: Get visual description from Gemini
    const visionResponse = await visionPrompt(input);
    const visualDesc = visionResponse.output;
    if (!visualDesc) {
        throw new Error("Step 1 Failed: Could not get visual description from Gemini.");
    }
    
    // Step 2: Get research from Exa
    const searchQuery = `official drug data for ${visualDesc.imprint} ${visualDesc.color} ${visualDesc.shape} pill`;
    const exaResults = await exa.searchAndContents(searchQuery, {
        numResults: 5,
        highlights: true,
        includeDomains: ["drugs.com", "dailymed.nlm.nih.gov", "webmd.com", "goodrx.com", "rxlist.com"],
    });

    if (!exaResults || exaResults.results.length === 0) {
        throw new Error("Step 2 Failed: Could not find any research data from Exa for the specified pill.");
    }

    const researchData = exaResults.results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.highlights?.join("\n") || r.text || "",
    })).map(r => `Source: ${r.title} (${r.url})\nContent: ${r.content}`).join('\n\n---\n\n');


    // Step 3: Get final analysis from Groq
    const analysisPrompt = `You are a world-class Pharmaceutical Forensic Analyst AI running on a high-speed inference engine.
Your task is to provide a comprehensive, one-shot analysis of a pill based on a visual description and external research.

**IMPORTANT: You MUST return ONLY a single, valid JSON object that strictly conforms to the provided schema. Do not include any explanatory text, markdown formatting, or any characters outside of the JSON object.**

**ANALYSIS DETAILS:**

**1. Visual Description (from vision model):**
- Imprint: "${visualDesc.imprint}"
- Color: "${visualDesc.color}"
- Shape: "${visualDesc.shape}"

**2. Ground-Truth Research (from search model):**
${researchData}

**YOUR TASK:**

1.  **Image Quality Gate:** You can assume the image quality is sufficient. 'analysisError' should be null unless there is a catastrophic failure in reasoning.

2.  **Comparative Analysis:** Compare the Visual Description against the Ground-Truth Research. For each core feature (imprint, color, shape), determine the status: 'match', 'conflict', or 'omission'. Provide an 'evidence_quote' from the research for each decision.

3.  **Pharmacological Information:** Based on the identified drug from the research, provide: 'primaryUses', 'howItWorks', 'commonIndications', and a 'safetyDisclaimer'.

4.  **Final Scoring & Verdict:** Calculate a final authenticity 'score' (0-100) based on a weighted combination of the comparative analysis results. Assign a final 'verdict' ('Authentic', 'Inconclusive', 'Counterfeit Risk') based on the score. A score > 85 is Authentic, > 65 is Inconclusive, and <= 65 is Counterfeit Risk.

5.  **Final Touches:** Populate the 'timestamp' with the current ISO date and time, and create a unique 'scanId' (e.g., 'scan_' + current timestamp). Set the 'imprint' field in the final JSON to the one from the visual description.

Now, perform the analysis and generate the JSON report.
`;

    const groqResponse = await groq.chat.completions.create({
        messages: [{ role: 'user', content: analysisPrompt }],
        model: 'llama3-70b-8192', // A powerful model available on Groq
        temperature: 0.1,
        response_format: { type: "json_object" },
    });

    const finalReportText = groqResponse.choices[0]?.message?.content;
    if (!finalReportText) {
        throw new Error("Step 3 Failed: Did not receive a valid response from Groq.");
    }
    
    const finalReport = cleanJSON(finalReportText);
    
    // Validate the final object against our schema before returning.
    return UnifiedAnalysisResultSchema.parse(finalReport);
  }
);


// This is the main function exported to the rest of the application.
export async function forensicAnalysisFlow(
  input: ForensicAnalysisInput
): Promise<ForensicAnalysisResult> {
  // We keep the original function signature so the UI doesn't need to change.
  // It now calls our new multi-agent flow.
  return multiAgentAnalysisFlow(input);
}
