'use server';

import { ai, createSpecializedAi } from '@/ai/genkit';
import { z } from 'zod';
import { OCRResultSchema, ResearchInterpretationSchema, VisualForensicSchema } from '@/lib/types';
import Groq from 'groq-sdk';
import Exa from 'exa-js';

// --- AGENT RUNNERS ---

export async function runAgentA(photoDataUri: string) {
    const key = process.env.GEMINI_API_KEY_A || process.env.GEMINI_API_KEY;
    if (!key) return { error: "Missing GEMINI_API_KEY_A" };
    
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
        return { error: `OCR Failed: ${e.message}` };
    }
}

export async function runAgentB(drugInfo: any) {
    const exaKey = process.env.EXA_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY_B || process.env.GEMINI_API_KEY;
    
    if (!exaKey || !geminiKey) return { error: "Missing Research Keys" };
    
    try {
        const exa = new Exa({ apiKey: exaKey });
        const aiB = createSpecializedAi(geminiKey);

        const query = `official product details for ${drugInfo.drugName} ${drugInfo.dosage}`;
        const exaResults = await exa.searchAndContents(query, {
            numResults: 2,
            includeDomains: ["drugs.com", "fda.gov", "who.int"],
        });

        const context = exaResults.results.map(r => `Source: ${r.title}\nContent: ${r.text}`).join('\n\n');

        const { output } = await aiB.generate({
            prompt: `Interpret physical and medical characteristics for ${drugInfo.drugName} from these results:\n${context}`,
            output: { schema: ResearchInterpretationSchema, format: 'json' }
        });

        return {
            interpreted: output,
            rawSources: exaResults.results.map(r => ({ uri: r.url, title: r.title, tier: 1 }))
        };
    } catch (e: any) {
        return { error: `Research Failed: ${e.message}` };
    }
}

export async function runAgentC(photoDataUri: string) {
    const key = process.env.GEMINI_API_KEY_C || process.env.GEMINI_API_KEY;
    if (!key) return { error: "Missing GEMINI_API_KEY_C" };

    try {
        const aiC = createSpecializedAi(key);
        const { output } = await aiC.generate({
            prompt: [
                { text: "Analyze packaging quality and pill appearance (color, shape). Look for blurry text or red flags." },
                { media: { url: photoDataUri, contentType: 'image/jpeg' } }
            ],
            output: { schema: VisualForensicSchema, format: 'json' }
        });
        return output;
    } catch (e: any) {
        return { error: `Visual Analysis Failed: ${e.message}` };
    }
}

export async function runMasterSynthesis(metadata: any, research: any, visual: any, rawSources: any) {
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return { error: "Missing GROQ_API_KEY" };
    
    try {
        const groq = new Groq({ apiKey: groqKey });
        const synthesisPrompt = `
        As a Forensic Expert, analyze these findings and return a JSON report.
        OCR: ${JSON.stringify(metadata)}
        Research: ${JSON.stringify(research)}
        Visual: ${JSON.stringify(visual)}
        
        Required JSON fields: score (0-100), verdict ('Authentic', 'Inconclusive', 'Counterfeit Risk'), coreResults (imprint, color, shape, generic, source).
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
            safetyDisclaimer: "Disclaimer: This AI analysis is for informational purposes only. Consult a doctor before use.",
            analysisError: null
        };
    } catch (e: any) {
        return { error: `Synthesis Failed: ${e.message}` };
    }
}
