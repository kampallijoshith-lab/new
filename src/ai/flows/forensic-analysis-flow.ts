'use server';

import { ai, createSpecializedAi } from '@/ai/genkit';
import { z } from 'zod';
import { OCRResultSchema, ResearchInterpretationSchema, VisualForensicSchema } from '@/lib/types';
import Groq from 'groq-sdk';
import Exa from 'exa-js';

// --- AGENT RUNNERS ---

export async function runAgentA(photoDataUri: string) {
    const key = (process.env.GEMINI_API_KEY_A || process.env.GEMINI_API_KEY)?.trim();
    if (!key) return { error: "Missing GEMINI_API_KEY (Check your environment variables)" };
    
    try {
        const aiA = createSpecializedAi(key);
        const { output } = await aiA.generate({
            prompt: [
                { text: "Extract textual information from this medicine packaging: Drug Name, Dosage, Imprint, Manufacturer. Be brief." },
                { media: { url: photoDataUri, contentType: 'image/jpeg' } }
            ],
            output: { schema: OCRResultSchema, format: 'json' }
        });
        return output;
    } catch (e: any) {
        return { error: `Agent A (OCR) failed: ${e.message}` };
    }
}

export async function runAgentB(drugInfo: any) {
    const exaKey = process.env.EXA_API_KEY?.trim();
    const geminiKey = (process.env.GEMINI_API_KEY_B || process.env.GEMINI_API_KEY)?.trim();
    
    if (!exaKey) return { error: "Missing EXA_API_KEY in Vercel/Environment settings." };
    if (!geminiKey) return { error: "Missing Gemini API Key for Agent B." };
    
    let exaResults;
    try {
        const exa = new Exa({ apiKey: exaKey });
        const query = `official product details for ${drugInfo.drugName} ${drugInfo.dosage} ${drugInfo.manufacturer}`;
        exaResults = await exa.searchAndContents(query, {
            numResults: 2,
            includeDomains: ["drugs.com", "fda.gov", "who.int", "medlineplus.gov"],
        });
    } catch (e: any) {
        return { error: `Agent B (Research) - Exa Search failed: ${e.message}. (Check if your EXA_API_KEY is correct and active)` };
    }

    try {
        const aiB = createSpecializedAi(geminiKey);
        const context = exaResults.results.map(r => `Source: ${r.title}\nContent: ${r.text}`).join('\n\n');

        const { output } = await aiB.generate({
            prompt: `Interpret physical and medical characteristics for ${drugInfo.drugName} based on these search results. If the results are irrelevant, state what is missing.\n\nResults:\n${context}`,
            output: { schema: ResearchInterpretationSchema, format: 'json' }
        });

        return {
            interpreted: output,
            rawSources: exaResults.results.map(r => ({ uri: r.url, title: r.title, tier: 1 }))
        };
    } catch (e: any) {
        return { error: `Agent B (Research) - Gemini Interpretation failed: ${e.message}` };
    }
}

export async function runAgentC(photoDataUri: string) {
    const key = (process.env.GEMINI_API_KEY_C || process.env.GEMINI_API_KEY)?.trim();
    if (!key) return { error: "Missing Gemini API Key for Agent C." };

    try {
        const aiC = createSpecializedAi(key);
        const { output } = await aiC.generate({
            prompt: [
                { text: "Analyze the packaging quality and pill appearance (color, shape, imprint) shown in the photo. Compare against standard medical manufacturing quality. Look for blurriness, spelling errors, or physical inconsistencies." },
                { media: { url: photoDataUri, contentType: 'image/jpeg' } }
            ],
            output: { schema: VisualForensicSchema, format: 'json' }
        });
        return output;
    } catch (e: any) {
        return { error: `Agent C (Forensic) failed: ${e.message}` };
    }
}

export async function runMasterSynthesis(metadata: any, research: any, visual: any, rawSources: any) {
    const groqKey = process.env.GROQ_API_KEY?.trim();
    if (!groqKey) return { error: "Missing GROQ_API_KEY for Agent D (Synthesis)." };
    
    try {
        const groq = new Groq({ apiKey: groqKey });
        const synthesisPrompt = `
        You are a Forensic Medical Expert. Analyze these findings and return a JSON report.
        
        OCR DATA: ${JSON.stringify(metadata)}
        RESEARCH DATA: ${JSON.stringify(research)}
        VISUAL ANALYSIS: ${JSON.stringify(visual)}
        
        Compare the physical characteristics (color, shape, imprint) found in the photo (Visual) against the official records (Research).
        
        Required JSON format:
        {
          "score": number (0-100),
          "verdict": "Authentic" | "Inconclusive" | "Counterfeit Risk",
          "coreResults": {
            "imprint": { "status": "match"|"conflict"|"omission", "reason": "...", "evidence_quote": "..." },
            "color": { "status": "match"|"conflict"|"omission", "reason": "...", "evidence_quote": "..." },
            "shape": { "status": "match"|"conflict"|"omission", "reason": "...", "evidence_quote": "..." },
            "source": { "match": boolean, "reason": "..." }
          }
        }
        `;

        const groqResponse = await groq.chat.completions.create({
            messages: [{ role: 'user', content: synthesisPrompt }],
            model: 'llama3-70b-8192',
            temperature: 0.1,
            response_format: { type: "json_object" },
        });

        const parsed = JSON.parse(groqResponse.choices[0]?.message?.content || '{}');
        
        return {
            ...parsed,
            timestamp: new Date().toISOString(),
            scanId: 'scan_' + Date.now(),
            imprint: metadata.imprint || 'NONE',
            sources: rawSources,
            primaryUses: research?.pharmacology?.uses,
            howItWorks: research?.pharmacology?.howItWorks,
            commonIndications: research?.pharmacology?.indications,
            safetyDisclaimer: "Disclaimer: This AI analysis is for informational purposes only and does not replace professional medical advice. If you suspect a counterfeit medicine, do not consume it.",
            analysisError: null
        };
    } catch (e: any) {
        return { error: `Agent D (Synthesis) failed: ${e.message}` };
    }
}
