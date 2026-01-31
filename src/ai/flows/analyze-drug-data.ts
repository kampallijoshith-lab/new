'use server';

/**
 * @fileOverview Analyzes medicine data from an image to provide information about it.
 *
 * - analyzeDrugData - A function that handles the analysis of drug data from an image.
 * - AnalyzeDrugDataInput - The input type for the analyzeDrugData function.
 * - AnalyzeDrugDataOutput - The return type for the analyzeDrugData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeDrugDataInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of the medicine packaging, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type AnalyzeDrugDataInput = z.infer<typeof AnalyzeDrugDataInputSchema>;

const AnalyzeDrugDataOutputSchema = z.object({
    primaryUses: z.string().optional().describe("What this medicine is typically prescribed for (e.g., Fever, Bacterial Infection, Hypertension)."),
    howItWorks: z.string().optional().describe("A brief explanation of the mechanism (e.g., 'Reduces pain signals in the brain' or 'Kills specific bacteria')."),
    commonIndications: z.array(z.string()).optional().describe("A list of 3-4 specific conditions it treats (e.g., Headache, Muscle pain, Toothache)."),
    safetyDisclaimer: z.string().optional().describe("An explicit statement that this information is for educational purposes and the user must consult a doctor before consumption."),
    error: z.string().optional().describe("If identification fails, provide the reason here. E.g., 'Identification failed. Please upload a clearer image showing the composition.'")
});
export type AnalyzeDrugDataOutput = z.infer<typeof AnalyzeDrugDataOutputSchema>;

export async function analyzeDrugData(input: AnalyzeDrugDataInput): Promise<AnalyzeDrugDataOutput> {
  return analyzeDrugDataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDrugImagePrompt',
  input: {schema: AnalyzeDrugDataInputSchema},
  output: {schema: AnalyzeDrugDataOutputSchema},
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are an expert in pharmacology and medicine identification.
From the provided image of the medicine packaging, identify the active ingredients.

If you can identify the ingredients, provide the following information:
- Primary Uses: What is this medicine typically prescribed for? (e.g., Fever, Bacterial Infection, Hypertension).
- How it Works: Briefly explain the mechanism (e.g., 'Reduces pain signals in the brain' or 'Kills specific bacteria').
- Common Indications: List 3-4 specific conditions it treats (e.g., Headache, Muscle pain, Toothache).
- Safety Disclaimer: Explicitly state that this information is for educational purposes and the user must consult a doctor before consumption.

If the image is too blurry to identify the active ingredients, set the 'error' field to: 'Identification failed. Please upload a clearer image showing the composition.'. In this case, do not populate the other fields.

Respond in JSON format.

Image: {{media url=photoDataUri}}
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
