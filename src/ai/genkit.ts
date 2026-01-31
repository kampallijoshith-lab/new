import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
