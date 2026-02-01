'use server';
/**
 * @fileOverview Parallel Specialist Team Forensic Analysis.
 * 
 * Logic Flow:
 * 1. Agent A (Vision OCR): Extracts text/imprint from packaging (Sequential).
 * 2. Agent B (Research Intelligence) & Agent C (Visual Forensic): Run in parallel.
 *    - Agent B uses Exa for raw data and Gemini B for medical interpretation.
 *    - Agent C uses Gemini C for deep visual forensic inspection.
 * 3. Master Synthesis (Groq): Combines all findings into the final verdict.
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
 * Distributed to: GEMINI_API_KEY_A
 */
async function runAgentA(photoDataUri: string) {
    const aiA = createSpecializedAi(process.env.GEMINI_API_KEY_A);
    const { output } = await aiA.generate({
        prompt: [
            { text: "Extract all textual information from this medicine packaging. Focus on Drug Name, Dosage, Imprint, and Manufacturer. Be precise." },
            { media: { url: photoDataUri, contentType: 'image/jpeg' } }
        ],
        output: { schema: OCRResultSchema, format: 'json' }
    });
    if (!output) throw new Error("Agent A (Vision OCR) failed to extract metadata.");
    return output;
}

/**
 * AGENT B: The Research Intelligence Agent
 * Distributed to: EXA + GEMINI_API_KEY_B
 */
async function runAgentB(drugInfo: z.infer<typeof OCRResultSchema>) {
    const exa = new Exa({ apiKey: process.env.EXA_API_KEY });
    const aiB = createSpecializedAi(process.env.GEMINI_API_KEY_B);

    // 1. Search for ground truth
    const query = `official product details, pill imprint, and packaging for ${drugInfo.drugName} ${drugInfo.dosage} by ${drugInfo.manufacturer}`;
    const exaResults = await exa.searchAndContents(query, {
        numResults: 3,
        highlights: true,
        includeDomains: ["drugs.com", "dailymed.nlm.nih.gov", "fda.gov", "who.int"],
    });

    const context = exaResults.results.map(r => `Source: ${r.title}\nContent: ${r.highlights?.join("\n") || r.text}`).join('\n\n');

    // 2. Interpret research using Gemini Key B
    const { output } = await aiB.generate({
        prompt: `Based on the following search results for ${drugInfo.drugName}, provide a structured interpretation of its official physical characteristics and pharmacological data.
        
        Search Results:
        ${context}`,
        output: { schema: ResearchInterpretationSchema, format: 'json' }
    });

    if (!output) throw new Error("Agent B (Research) failed to interpret data.");

    return {
        interpreted: output,
        rawSources: exaResults.results.map(r => ({ uri: r.url, title: r.title, tier: 1 }))
    };
}

/**
 * AGENT C: The Visual Forensic Scientist
 * Distributed to: GEMINI_API_KEY_C
 */
async function runAgentC(photoDataUri: string) {
    const aiC = createSpecializedAi(process.env.GEMINI_API_KEY_C);
    const { output } = await aiC.generate({
        prompt: [
            { text: "Analyze the visual integrity of this packaging. Check for blurry printing, misaligned logos, incorrect fonts, or tampered safety seals. Describe the color and shape of the medicine if visible." },
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

    // Step 1: Sequential OCR (Needs to know WHAT the drug is)
    const drugMetadata = await runAgentA(input.photoDataUri);

    // Step 2: Parallel Sprint (Research and Forensics run simultaneously)
    const [researchTeamResult, visualForensics] = await Promise.all([
        runAgentB(drugMetadata),
        runAgentC(input.photoDataUri)
    ]);

    const { interpreted: research, rawSources } = researchTeamResult;

    // Step 3: Master Synthesis (Groq)
    // We send all specific findings to Groq to generate the final verdict JSON.
    const synthesisPrompt = `
You are a Lead Pharmaceutical Forensic Orchestrator. Combine the findings from three specialized agents into a final report.

1. **OCR Data (Agent A - Extraction):**
- Name: ${drugMetadata.drugName}
- Dosage: ${drugMetadata.dosage}
- Imprint found on package: ${drugMetadata.imprint}

2. **Ground Truth Intelligence (Agent B - Interpretation):**
- Official Pill/Box Description: ${research.officialDescription}
- Known Recalls: ${research.knownRecalls.join(', ')}
- Pharmacology: ${research.pharmacology.uses}

3. **Visual Forensic Analysis (Agent C - Inspection):**
- Quality Score: ${visualForensics.qualityScore}
- Red Flags: ${visualForensics.redFlags.join(', ')}
- Observed Physical: Color ${visualForensics.physicalDesc.color}, Shape ${visualForensics.physicalDesc.shape}

**TASK:**
Generate a final JSON report based on these findings.
- Compare Agent A and C against Agent B's official data.
- Determine if the imprints, colors, and names match the official data.
- If something is missing in research, mark it as 'omission'. If it doesn't match, mark 'conflict'.
- Calculate an overall authenticity score (0-100).
- Assign a verdict: 'Authentic' (>85), 'Inconclusive' (65-85), or 'Counterfeit Risk' (<65).
- Include pharmacolocial info (uses, indications) from the interpretation.

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
    parsed.sources = rawSources;
    
    // Map pharmacological data back to top level for the UI
    parsed.primaryUses = research.pharmacology.uses;
    parsed.howItWorks = research.pharmacology.howItWorks;
    parsed.commonIndications = research.pharmacology.indications;
    parsed.safetyDisclaimer = "Disclaimer: This analysis is performed by AI and is for informational purposes only. Always consult a healthcare professional.";

    return UnifiedAnalysisResultSchema.parse(parsed);
  }
);

export async function forensicAnalysisFlow(input: ForensicAnalysisInput): Promise<ForensicAnalysisResult> {
  return multiAgentAnalysisFlow(input);
}
