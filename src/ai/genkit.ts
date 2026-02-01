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
 * This allows us to distribute load across multiple keys to avoid rate limits.
 */
export function createSpecializedAi(apiKey: string | undefined) {
  // Use the specific key if provided, otherwise fall back to the main key.
  const finalKey = apiKey || process.env.GEMINI_API_KEY;
  
  return genkit({
    plugins: [googleAI({ 
      apiKey: finalKey,
      apiVersion: 'v1beta' 
    })],
    model: 'googleai/gemini-2.5-flash',
  });
}
