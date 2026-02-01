import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Standard AI instance using the default GEMINI_API_KEY.
 */
export const ai = genkit({
  plugins: [googleAI({ apiVersion: 'v1beta' })],
  model: 'googleai/gemini-2.5-flash',
});

/**
 * Helper to create a Genkit instance with a specific API key.
 * This allows us to distribute load across multiple keys.
 */
export function createSpecializedAi(apiKey: string | undefined) {
  return genkit({
    plugins: [googleAI({ 
      apiKey: apiKey || process.env.GEMINI_API_KEY, // Fallback to main key if specific one is missing
      apiVersion: 'v1beta' 
    })],
    model: 'googleai/gemini-2.5-flash',
  });
}
