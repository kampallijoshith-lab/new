'use server';

/**
 * @fileOverview Cross-references medicine information against a 'Global Health Threats' Firestore collection using GenAI to identify potential risks.
 *
 * - crossReferenceGlobalHealthThreats - A function that handles the cross-referencing process.
 * - CrossReferenceInput - The input type for the crossReferenceGlobalHealthThreats function.
 * - CrossReferenceOutput - The return type for the crossReferenceGlobalHealthThreats function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {firestore} from 'firebase-admin';

const CrossReferenceInputSchema = z.object({
  medicineInfo: z
    .string()
    .describe('The medicine information to cross-reference, including name and batch number.'),
});
export type CrossReferenceInput = z.infer<typeof CrossReferenceInputSchema>;

const CrossReferenceOutputSchema = z.object({
  matchFound: z
    .boolean()
    .describe('Whether a match was found in the Global Health Threats collection.'),
  alertDetails: z
    .string()
    .optional()
    .describe('Details of the alert if a match is found.'),
  source: z
    .string()
    .optional()
    .describe('Source of the alert if a match is found.'),
  reason: z
    .string()
    .optional()
    .describe('Reason for the alert if a match is found.'),
});
export type CrossReferenceOutput = z.infer<typeof CrossReferenceOutputSchema>;

export async function crossReferenceGlobalHealthThreats(
  input: CrossReferenceInput
): Promise<CrossReferenceOutput> {
  return crossReferenceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'crossReferencePrompt',
  input: {schema: CrossReferenceInputSchema},
  output: {schema: CrossReferenceOutputSchema},
  prompt: `You are an expert in identifying falsified medicines.
  Cross-reference the provided medicine information against your knowledge of global health threats related to counterfeit drugs.
  Based on the information, determine if there is a match in the Global Health Threats collection and provide alert details, source, and reason if a match is found.
  medicineInfo: {{{medicineInfo}}}
  Make sure the output is valid JSON. Do not include any text outside of the JSON. The "matchFound" field must always be populated.
  If no alert details, source, or reason exists, omit those fields instead of setting them to null.
  If the medicine name or batch number match any alerts in the 'Global Health Threats' database, then set matchFound to true.`,
});

const crossReferenceFlow = ai.defineFlow(
  {
    name: 'crossReferenceFlow',
    inputSchema: CrossReferenceInputSchema,
    outputSchema: CrossReferenceOutputSchema,
  },
  async input => {
    // Simulate fetching data from Firestore
    const db = firestore();
    const globalHealthThreatsCollection = db.collection('GlobalHealthThreats');
    const snapshot = await globalHealthThreatsCollection.get();

    let matchFound = false;
    let alertDetails = undefined;
    let source = undefined;
    let reason = undefined;

    snapshot.forEach(doc => {
      const data = doc.data();
      if (
        input.medicineInfo.includes(data.medicineName) ||
        input.medicineInfo.includes(data.batchNumber)
      ) {
        matchFound = true;
        alertDetails = data.alertDetails;
        source = data.source;
        reason = data.reason;
      }
    });

    // If no match is found in Firestore, use the LLM to check against known threats
    if (!matchFound) {
      const {output} = await prompt(input);
      return output!;
    } else {
      // If a match is found in Firestore, return the data
      return {
        matchFound: true,
        alertDetails: alertDetails,
        source: source,
        reason: reason,
      };
    }
  }
);
