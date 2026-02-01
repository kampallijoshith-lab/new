'use server';
/**
 * @fileOverview Parallel Specialist Team Forensic Analysis.
 * 
 * Logic Flow:
 * 1. Agent A (Vision OCR): Extracts text/imprint from packaging (Sequential).
 * 2. Agent B (Research Intelligence) & Agent C (Visual Forensic): Run in parallel.
 *    - Agent B uses Exa for raw data and Gemini B for medical interpretation.
 *    - Agent C uses Gemini C for deep visual forensic inspection.
 * 3. Master Synthesis (Groq): Combines ALL findings into the final verdict without loss.
 */

import { ai, createSpecializedAi } from '@/ai/genkit';
import { z } from 'zod';
import type { ForensicAnalysisInput, ForensicAnalysisResult } from '@/lib/types';
import { ForensicAnalysisInputZodSchema } from '@/lib/types';
import Groq from 'groq-sdk';
import Exa from 'exa-js';

// --- SUB-SCHEMAS FOR AGENTS ---

const OCRResultSchema = z.object({
    drugName: z.string().describe("The name of the drug found on the packaging."),
    dosage: z.string().describe("The dosage (e.g., 500mg)."),
    imprint: z.string().describe("Any imprint or codes detected on pills or box."),
    manufacturer: z.string().describe("The manufacturer name if visible."),
});

const ResearchInterpretationSchema = z.object({
    officialDescription: z.string().describe("Verified physical description of the drug from official sources."),
    knownRecalls: z.array(z.string()).describe("List of any known batch recalls or fake-medicine alerts."),
    pharmacology: z.object({
        uses: z.string(),
        howItWorks: z.string(),
        indications: z.array(z.string()),
    }),
});

const VisualForensicSchema = z.object({
    qualityScore: z.number().min(0).max(100).describe("Confidence in packaging visual integrity."),
    redFlags: z.array(z.string()).describe("Any visual anomalies found (e.g., blurry text, misaligned logos)."),
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
        imprint: z.object({ match: z.boolean(), status: z.enum(['match', 'conflict', 'omission']), reason: z.string(), evidence_quote: z.string().optional() }),
        color: z.object({ match: z.boolean(), status: z.enum(['match', 'conflict', 'omission']), reason: z.string(), evidence_quote: z.string().optional() }),
        shape: z.object({ match: z.boolean(), status: z.enum(['match', 'conflict', 'omission']), reason: z.string(), evidence_quote: z.string().optional() }),
        generic: z.object({ match: z.boolean(), status: z.enum(['match', 'conflict', 'omission']), reason: z.string(), evidence_quote: z.string().optional() }),
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

// --- SPECIALIZED AGENT RUNNERS ---

/**
 * AGENT A: The Vision OCR Specialist
 * Uses GEMINI_API_KEY_A (Falls back to GEMINI_API_KEY)
 */
async function runAgentA(photoDataUri: string) {
    const aiA = createSpecializedAi(process.env.GEMINI_API_KEY_A);
    const { output } = await aiA.generate({
        prompt: [
            { text: "Extract all textual information from this medicine packaging. Focus on Drug Name, Dosage, Imprint, and Manufacturer. Be precise. If nothing is found, return empty strings." },
            { media: { url: photoDataUri, contentType: 'image/jpeg' } }
        ],
        output: { schema: OCRResultSchema, format: 'json' }
    });
    if (!output) throw new Error("Agent A failed to extract metadata. Ensure GEMINI_API_KEY is valid.");
    return output;
}

/**
 * AGENT B: The Research Intelligence Agent
 * Uses EXA + GEMINI_API_KEY_B
 */
async function runAgentB(drugInfo: z.infer<typeof OCRResultSchema>) {
    const exa = new Exa({ apiKey: process.env.EXA_API_KEY });
    const aiB = createSpecializedAi(process.env.GEMINI_API_KEY_B);

    const query = `official product details, pill imprint, and packaging for ${drugInfo.drugName} ${drugInfo.dosage} ${drugInfo.manufacturer}`;
    const exaResults = await exa.searchAndContents(query, {
        numResults: 3,
        highlights: true,
        includeDomains: ["drugs.com", "dailymed.nlm.nih.gov", "fda.gov", "who.int"],
    });

    const context = exaResults.results.map(r => `Source: ${r.title}\nContent: ${r.highlights?.join("\n") || r.text}`).join('\n\n');

    const { output } = await aiB.generate({
        prompt: `Based on the following search results for ${drugInfo.drugName}, provide a structured interpretation of its official physical characteristics and pharmacological data. Do not omit any safety details.
        
        Search Results:
        ${context}`,
        output: { schema: ResearchInterpretationSchema, format: 'json' }
    });

    if (!output) throw new Error("Agent B (Research) failed to interpret data. Ensure EXA_API_KEY and GEMINI_API_KEY are valid.");

    return {
        interpreted: output,
        rawSources: exaResults.results.map(r => ({ uri: r.url, title: r.title, tier: 1 }))
    };
}

/**
 * AGENT C: The Visual Forensic Scientist
 * Uses GEMINI_API_KEY_C
 */
async function runAgentC(photoDataUri: string) {
    const aiC = createSpecializedAi(process.env.GEMINI_API_KEY_C);
    const { output } = await aiC.generate({
        prompt: [
            { text: "Analyze the visual integrity of this packaging. Check for blurry printing, misaligned logos, incorrect fonts, or tampered safety seals. Provide a detailed physical description based ONLY on what you see." },
            { media: { url: photoDataUri, contentType: 'image/jpeg' } }
        ],
        output: { schema: VisualForensicSchema, format: 'json' }
    });
    if (!output) throw new Error("Agent C (Forensic) failed visual analysis.");
    return output;
}

// --- ORCHESTRATOR ---

const multiAgentAnalysisFlow = ai.defineFlow(
  {
    name: 'multiAgentAnalysisFlow',
    inputSchema: ForensicAnalysisInputZodSchema,
    outputSchema: UnifiedAnalysisResultSchema,
  },
  async (input) => {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Step 1: Sequential OCR
    const drugMetadata = await runAgentA(input.photoDataUri);

    // Step 2: Parallel Sprint (Zero-Loss execution)
    const [researchTeamResult, visualForensics] = await Promise.all([
        runAgentB(drugMetadata),
        runAgentC(input.photoDataUri)
    ]);

    const { interpreted: research, rawSources } = researchTeamResult;

    // Step 3: Master Synthesis (Groq) - The Brain that combines everything
    const synthesisPrompt = `
You are a Lead Pharmaceutical Forensic Orchestrator. Combine findings from three specialized agents into a final report. DO NOT LOSE ANY INFORMATION.

1. **OCR Data (Agent A - Extraction):**
- Name: ${drugMetadata.drugName}
- Dosage: ${drugMetadata.dosage}
- Imprint: ${drugMetadata.imprint}
- Manufacturer: ${drugMetadata.manufacturer}

2. **Ground Truth (Agent B - Global Research):**
- Official Physical Description: ${research.officialDescription}
- Recalls/Threats: ${research.knownRecalls.join(', ')}
- Pharmacology: ${research.pharmacology.uses}
- How it Works: ${research.pharmacology.howItWorks}
- Common Indications: ${research.pharmacology.indications.join(', ')}

3. **Visual Inspection (Agent C - Visual Forensics):**
- Quality Score: ${visualForensics.qualityScore}
- Red Flags: ${visualForensics.redFlags.join(', ')}
- Observed Color: ${visualForensics.physicalDesc.color}
- Observed Shape: ${visualForensics.physicalDesc.shape}

**TASK:** Generate a valid JSON final report. Compare Agent A/C findings against Agent B's Ground Truth. Calculate a total Authenticity Score (0-100) and Verdict. 
Be rigorous. A mismatch in Imprint is a high-risk factor.
`;

    const groqResponse = await groq.chat.completions.create({
        messages: [{ role: 'user', content: synthesisPrompt }],
        model: 'llama3-70b-8192',
        temperature: 0.1,
        response_format: { type: "json_object" },
    });

    const finalReportText = groqResponse.choices[0]?.message?.content;
    if (!finalReportText) throw new Error("Final synthesis failed on Groq. Ensure GROQ_API_KEY is valid.");
    
    const parsed = JSON.parse(finalReportText);
    parsed.timestamp = new Date().toISOString();
    parsed.scanId = 'scan_' + Date.now();
    parsed.imprint = drugMetadata.imprint || 'NONE';
    parsed.sources = rawSources;
    parsed.primaryUses = research.pharmacology.uses;
    parsed.howItWorks = research.pharmacology.howItWorks;
    parsed.commonIndications = research.pharmacology.indications;
    parsed.safetyDisclaimer = "Disclaimer: This analysis is performed by multiple specialized AI agents and is for informational purposes only. Always consult a healthcare professional before consuming medicine.";

    return UnifiedAnalysisResultSchema.parse(parsed);
  }
);

export async function forensicAnalysisFlow(input: ForensicAnalysisInput): Promise<ForensicAnalysisResult> {
  return multiAgentAnalysisFlow(input);
}
