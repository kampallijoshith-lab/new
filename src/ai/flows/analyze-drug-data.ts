'use server';

/**
 * @fileOverview Analyzes medicine data from WHO, FDA, and CDSCO to determine if a searched medicine is potentially falsified or dangerous.
 *
 * - analyzeDrugData - A function that handles the analysis of drug data.
 * - AnalyzeDrugDataInput - The input type for the analyzeDrugData function.
 * - AnalyzeDrugDataOutput - The return type for the analyzeDrugData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDrugDataInputSchema = z.object({
  medicineName: z.string().describe('The name of the medicine to analyze.'),
  batchNumber: z.string().optional().describe('The batch number of the medicine, if available.'),
});
export type AnalyzeDrugDataInput = z.infer<typeof AnalyzeDrugDataInputSchema>;

const AnalyzeDrugDataOutputSchema = z.object({
  isFalsified: z.boolean().describe('Whether the medicine is potentially falsified or dangerous.'),
  alertSource: z.string().optional().describe('The source of the alert (WHO, FDA, CDSCO), if applicable.'),
  reason: z.string().optional().describe('The reason for the falsification or danger, if applicable.'),
  confidenceLevel: z
    .number()
    .optional()
    .describe('A number from 0 to 1 representing the confidence level in the analysis.'),
});
export type AnalyzeDrugDataOutput = z.infer<typeof AnalyzeDrugDataOutputSchema>;

export async function analyzeDrugData(input: AnalyzeDrugDataInput): Promise<AnalyzeDrugDataOutput> {
  return analyzeDrugDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDrugDataPrompt',
  input: {schema: AnalyzeDrugDataInputSchema},
  output: {schema: AnalyzeDrugDataOutputSchema},
  prompt: `You are an expert in pharmaceutical safety and falsified medicines.

  You will analyze data from WHO Alerts, FDA Counterfeit lists, and CDSCO spurious drug reports to determine if the medicine is potentially falsified or dangerous.
  If a match is found, identify the source of the alert (WHO, FDA, or CDSCO) and the reason for the failure. Provide a confidence level (0-1).
  If no match is found, indicate that the medicine is not found in the databases with a high confidence level.

  Medicine Name: {{{medicineName}}}
  Batch Number (if available): {{{batchNumber}}}

  Respond in JSON format.
  `,
});

const analyzeDrugDataFlow = ai.defineFlow(
  {
    name: 'analyzeDrugDataFlow',
    inputSchema: AnalyzeDrugDataInputSchema,
    outputSchema: AnalyzeDrugDataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
