'use server';
/**
 * @fileOverview Parallel Specialist Team Forensic Analysis.
 * 
 * Logic Flow:
 * 1. Agent A (Vision): Extracts text/imprint from packaging (Sequential).
 * 2. Agent B (Research) & Agent C (Forensic): Run in parallel.
 *    - Agent B uses Exa to find ground-truth data for the drug name.
 *    - Agent C analyzes visual characteristics (logos, seals, colors).
 * 3. Master Synthesis (Groq): Combines all findings into the final verdict.
 */

import { ai, createSpecializedAi } from '@/ai/genkit';
import { z } from 'zod';
import type { ForensicAnalysisInput, ForensicAnalysisResult } from '@/lib/types';
import { ForensicAnalysisInputZodSchema } from '@/lib/types';
import Groq from 'groq-sdk';
import Exa from 'exa-js';

// --- SCHEMAS ---

const OCRResultSchema = z.object({
    drugName: z.string().describe("The name of the drug found on the packaging."),
    dosage: z.string().describe("The dosage (e.g., 500mg)."),
    imprint: z.string().describe("Any imprint or codes detected."),
    manufacturer: z.string().describe("The manufacturer name if visible."),
});

const VisualForensicSchema = z.object({
    qualityScore: z.number().min(0).max(100).describe("Confidence in packaging visual integrity."),
    redFlags: z.array(z.string()).describe("Any visual anomalies found (e.g., blurry text)."),
    physicalDesc: z.object({
        color: z.string(),
        shape: z.string(),
    }),
});

const UnifiedAnalysisResultSchema = z.object({
    score: z.number(),
    verdict: z.enum(['Authentic', 'Inconclusive', 'Counterfeit Risk']),
    imprint: z.string(),
    sources: z.array(z.object({ uri: z.string(), title: z.string(), tier: z.number() })).optional(),
    coreResults: z.object({
        imprint: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        color: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        shape: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        generic: z.object({ match: z.boolean(), status: z.string(), reason: z.string(), evidence_quote: z.string().optional() }),
        source: z.object({ match: z.boolean(), reason: z.string() }),
    }),
    timestamp: z.string(),
    scanId: z.string(),
    primaryUses: z.string().optional(),
    howItWorks: z.string().optional(),
    commonIndications: z.array(z.string()).optional(),
    safetyDisclaimer: z.string().optional(),
    analysisError: z.string().optional().nullable(),
});

// --- AGENTS ---

/**
 * AGENT A: The Vision OCR Specialist
 * Distributed to: GEMINI_API_KEY_A
 */
async function runAgentA(photoDataUri: string) {
    const aiA = createSpecializedAi(process.env.GEMINI_API_KEY_A);
    const { output } = await aiA.generate({
        prompt: [
            { text: "Extract all textual information from this medicine packaging. Focus on Drug Name, Dosage, and Manufacturer." },
            { media: { url: photoDataUri, contentType: 'image/jpeg' } }
        ],
        output: { schema: OCRResultSchema, format: 'json' }
    });
    if (!output) throw new Error("Agent A failed to extract text.");
    return output;
}

/**
 * AGENT B: The Research Librarian
 * Distributed to: GEMINI_API_KEY_B + EXA
 */
async function runAgentB(drugInfo: z.infer<typeof OCRResultSchema>) {
    const exa = new Exa({ apiKey: process.env.EXA_API_KEY });
    const query = `official product details and packaging for ${drugInfo.drugName} ${drugInfo.dosage} ${drugInfo.manufacturer}`;
    
    const exaResults = await exa.searchAndContents(query, {
        numResults: 3,
        highlights: true,
        includeDomains: ["drugs.com", "dailymed.nlm.nih.gov", "fda.gov"],
    });

    return exaResults.results.map(r => ({
        title: r.title,
        url: r.url,
        content: r.highlights?.join("\n") || r.text || "",
    }));
}

/**
 * AGENT C: The Visual Forensic Scientist
 * Distributed to: GEMINI_API_KEY_C
 */
async function runAgentC(photoDataUri: string) {
    const aiC = createSpecializedAi(process.env.GEMINI_API_KEY_C);
    const { output } = await aiC.generate({
        prompt: [
            { text: "Analyze the visual quality of this medicine packaging. Check for font consistency, logo alignment, and seal integrity. Describe the physical characteristics of the pill if visible." },
            { media: { url: photoDataUri, contentType: 'image/jpeg' } }
        ],
        output: { schema: VisualForensicSchema, format: 'json' }
    });
    if (!output) throw new Error("Agent C failed visual forensic analysis.");
    return output;
}

// --- ORCHESTRATION ---

const multiAgentAnalysisFlow = ai.defineFlow(
  {
    name: 'multiAgentAnalysisFlow',
    inputSchema: ForensicAnalysisInputZodSchema,
    outputSchema: UnifiedAnalysisResultSchema,
  },
  async (input) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Step 1: Agent A (Sequential)
    const drugMetadata = await runAgentA(input.photoDataUri);

    // Step 2 & 3: Parallel Sprint
    // Running Research and Forensic analysis at the same time
    const [researchResults, visualForensics] = await Promise.all([
        runAgentB(drugMetadata),
        runAgentC(input.photoDataUri)
    ]);

    // Step 4: Final Synthesis (Groq)
    const researchSummary = researchResults.map(r => `Source: ${r.title}\nContent: ${r.content}`).join('\n\n');
    
    const synthesisPrompt = `
You are a Lead Pharmaceutical Forensic Orchestrator. Combine the findings from three specialized agents into a final report.

1. **OCR Data (Agent A):**
- Name: ${drugMetadata.drugName}
- Dosage: ${drugMetadata.dosage}
- Imprint: ${drugMetadata.imprint}

2. **Ground Truth Research (Agent B):**
${researchSummary}

3. **Visual Forensic Analysis (Agent C):**
- Quality Score: ${visualForensics.qualityScore}
- Red Flags: ${visualForensics.redFlags.join(', ')}
- Physical: ${visualForensics.physicalDesc.color} ${visualForensics.physicalDesc.shape}

**TASK:**
Generate a final JSON report.
- Compare Agent A and C against Agent B.
- Determine if the imprints, colors, and names match the official data.
- Calculate an overall authenticity score (0-100).
- Assign a verdict: 'Authentic' (>85), 'Inconclusive' (65-85), or 'Counterfeit Risk' (<65).
- Include pharmacolocial info (uses, how it works) found in the research.

**IMPORTANT: Return ONLY valid JSON matching the schema.**
`;

    const groqResponse = await groq.chat.completions.create({
        messages: [{ role: 'user', content: synthesisPrompt }],
        model: 'llama3-70b-8192',
        temperature: 0.1,
        response_format: { type: "json_object" },
    });

    const finalReportText = groqResponse.choices[0]?.message?.content;
    if (!finalReportText) throw new Error("Final synthesis failed.");
    
    const parsed = JSON.parse(finalReportText);
    parsed.timestamp = new Date().toISOString();
    parsed.scanId = 'scan_' + Date.now();
    parsed.imprint = drugMetadata.imprint || 'NONE';

    return UnifiedAnalysisResultSchema.parse(parsed);
  }
);

export async function forensicAnalysisFlow(input: ForensicAnalysisInput): Promise<ForensicAnalysisResult> {
  return multiAgentAnalysisFlow(input);
}
