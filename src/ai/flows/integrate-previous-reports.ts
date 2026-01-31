'use server';

/**
 * @fileOverview Integrates medicine data with previous medical reports and history using GenAI to identify fake medicines.
 *
 * - integratePreviousReports - A function that handles the integration of previous medical reports.
 * - IntegratePreviousReportsInput - The input type for the integratePreviousReports function.
 * - IntegratePreviousReportsOutput - The return type for the integratePreviousReports function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntegratePreviousReportsInputSchema = z.object({
  medicineData: z
    .string()
    .describe('Data about the medicine, including name and batch number.'),
  medicalReports: z
    .string()
    .describe('Previous medical reports and patient history related to medicine use.'),
});
export type IntegratePreviousReportsInput = z.infer<
  typeof IntegratePreviousReportsInputSchema
>;

const IntegratePreviousReportsOutputSchema = z.object({
  isFake: z.boolean().describe('Whether the medicine is likely to be fake.'),
  reason: z
    .string()
    .describe('The reason why the medicine is suspected to be fake.'),
  trendAnalysis: z
    .string()
    .describe('Analysis of trends related to fake medications based on reports.'),
});
export type IntegratePreviousReportsOutput = z.infer<
  typeof IntegratePreviousReportsOutputSchema
>;

export async function integratePreviousReports(
  input: IntegratePreviousReportsInput
): Promise<IntegratePreviousReportsOutput> {
  return integratePreviousReportsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'integratePreviousReportsPrompt',
  input: {schema: IntegratePreviousReportsInputSchema},
  output: {schema: IntegratePreviousReportsOutputSchema},
  prompt: `You are an expert in identifying fake medicines by analyzing medicine data and previous medical reports.

  Analyze the provided medicine data and medical reports to determine if the medicine is likely to be fake.
  Provide a reason for your determination and an analysis of trends related to fake medications based on the reports.

  Medicine Data: {{{medicineData}}}
  Medical Reports: {{{medicalReports}}}`,
});

const integratePreviousReportsFlow = ai.defineFlow(
  {
    name: 'integratePreviousReportsFlow',
    inputSchema: IntegratePreviousReportsInputSchema,
    outputSchema: IntegratePreviousReportsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
