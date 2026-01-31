import { config } from 'dotenv';
config();

import '@/ai/flows/integrate-previous-reports.ts';
import '@/ai/flows/analyze-drug-data.ts';
import '@/ai/flows/cross-reference-global-health-threats.ts';