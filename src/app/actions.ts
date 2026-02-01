'use server';

import { runAgentA, runAgentB, runAgentC, runMasterSynthesis } from '@/ai/flows/forensic-analysis-flow';

/**
 * These individual actions allow the client to orchestrate a long-running 
 * multi-agent flow step-by-step, staying within Vercel's 10s free-tier timeout.
 */

export async function step1_OCR(photoDataUri: string) {
    return await runAgentA(photoDataUri);
}

export async function step2_Research(drugMetadata: any) {
    return await runAgentB(drugMetadata);
}

export async function step3_Visual(photoDataUri: string) {
    return await runAgentC(photoDataUri);
}

export async function step4_Synthesis(data: { metadata: any, research: any, visual: any }) {
    return await runMasterSynthesis(data.metadata, data.research.interpreted, data.visual, data.research.rawSources);
}

export async function reportCounterfeit(data: any) {
    console.log("Reporting counterfeit product:", data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
}
