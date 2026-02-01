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

async function runAgentA(photoDataUri: string) {
    const key = process.env.GEMINI_API_KEY_A || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY_A. Please configure it in your Vercel/environment settings.");
    
    try {
        const aiA = createSpecializedAi(key);
        const { output } = await aiA.generate({
            prompt: [
                { text: "Extract all textual information from this medicine packaging. Focus on Drug Name, Dosage, Imprint, and Manufacturer. Be precise. If nothing is found, return empty strings." },
                { media: { url: photoDataUri, contentType: 'image/jpeg' } }
            ],
            output: { schema: OCRResultSchema, format: 'json' }
        });
        if (!output) throw new Error("Agent A failed to extract metadata.");
        return output;
    } catch (e: any) {
        throw new Error(`Agent A (Vision OCR) failed: ${e.message}`);
    }
}

async function runAgentB(drugInfo: z.infer<typeof OCRResultSchema>) {
    const exaKey = process.env.EXA_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY_B || process.env.GEMINI_API_KEY;
    
    if (!exaKey) throw new Error("Missing EXA_API_KEY. Please configure it in your Vercel settings.");
    if (!geminiKey) throw new Error("Missing GEMINI_API_KEY_B. Please configure it in your Vercel settings.");
    
    try {
        const exa = new Exa({ apiKey: exaKey });
        const aiB = createSpecializedAi(geminiKey);

        const query = `official product details, pill imprint, and packaging for ${drugInfo.drugName} ${drugInfo.dosage} ${drugInfo.manufacturer}`;
        const exaResults = await exa.searchAndContents(query, {
            numResults: 3,
            highlights: true,
            includeDomains: ["drugs.com", "dailymed.nlm.nih.gov", "fda.gov", "who.int"],
        });

        const context = exaResults.results.map(r => `Source: ${r.title}\nContent: ${r.highlights?.join("\n") || r.text}`).join('\n\n');

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
    } catch (e: any) {
        throw new Error(`Agent B (Research) failed: ${e.message}`);
    }
}

async function runAgentC(photoDataUri: string) {
    const key = process.env.GEMINI_API_KEY_C || process.env.GEMINI_API_KEY;
    if (!key) throw new Error("Missing GEMINI_API_KEY_C. Please configure it in your Vercel settings.");

    try {
        const aiC = createSpecializedAi(key);
        const { output } = await aiC.generate({
            prompt: [
                { text: "Analyze the visual integrity of this packaging. Check for blurry printing, misaligned logos, incorrect fonts, or tampered safety seals. Provide a detailed physical description based ONLY on what you see." },
                { media: { url: photoDataUri, contentType: 'image/jpeg' } }
            ],
            output: { schema: VisualForensicSchema, format: 'json' }
        });
        if (!output) throw new Error("Agent C (Forensic) failed visual analysis.");
        return output;
    } catch (e: any) {
        throw new Error(`Agent C (Forensic) failed: ${e.message}`);
    }
}

// --- ORCHESTRATOR ---

export async function forensicAnalysisFlow(input: ForensicAnalysisInput): Promise<ForensicAnalysisResult> {
    try {
        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) throw new Error("Missing GROQ_API_KEY. Please configure it in your Vercel settings.");
        
        const groq = new Groq({ apiKey: groqKey });

        // Step 1: Sequential OCR
        const drugMetadata = await runAgentA(input.photoDataUri);

        // Step 2: Parallel Sprint
        const [researchTeamResult, visualForensics] = await Promise.all([
            runAgentB(drugMetadata),
            runAgentC(input.photoDataUri)
        ]);

        const { interpreted: research, rawSources } = researchTeamResult;

        // Step 3: Master Synthesis (Groq)
        const synthesisPrompt = `
You are a Lead Pharmaceutical Forensic Orchestrator. Generate a valid JSON final report.

OCR Data: ${JSON.stringify(drugMetadata)}
Research: ${JSON.stringify(research)}
Visual: ${JSON.stringify(visualForensics)}

Calculate an Authenticity Score (0-100) and Verdict ('Authentic', 'Inconclusive', 'Counterfeit Risk').
`;

        const groqResponse = await groq.chat.completions.create({
            messages: [{ role: 'user', content: synthesisPrompt }],
            model: 'llama3-70b-8192',
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const finalReportText = groqResponse.choices[0]?.message?.content;
        if (!finalReportText) throw new Error("Final synthesis failed on Groq.");
        
        const parsed = JSON.parse(finalReportText);
        
        // Add required fields for UI
        const result: ForensicAnalysisResult = {
            ...parsed,
            timestamp: new Date().toISOString(),
            scanId: 'scan_' + Date.now(),
            imprint: drugMetadata.imprint || 'NONE',
            sources: rawSources,
            primaryUses: research.pharmacology.uses,
            howItWorks: research.pharmacology.howItWorks,
            commonIndications: research.pharmacology.indications,
            safetyDisclaimer: "Disclaimer: This analysis is performed by AI agents and is for informational purposes only. Consult a healthcare professional before consuming medicine.",
            analysisError: null
        };

        return UnifiedAnalysisResultSchema.parse(result);
    } catch (e: any) {
        // Return a safe error object instead of throwing
        // This prevents the generic Next.js "omitted in production" error
        return {
            score: 0,
            verdict: 'Inconclusive',
            imprint: 'N/A',
            timestamp: new Date().toISOString(),
            scanId: 'error_' + Date.now(),
            analysisError: e.message || "An unexpected error occurred during multi-agent analysis.",
            coreResults: {
                imprint: { match: false, status: 'omission', reason: 'Analysis failed' },
                color: { match: false, status: 'omission', reason: 'Analysis failed' },
                shape: { match: false, status: 'omission', reason: 'Analysis failed' },
                generic: { match: false, status: 'omission', reason: 'Analysis failed' },
                source: { match: false, reason: 'Analysis failed' }
            }
        } as ForensicAnalysisResult;
    }
}
