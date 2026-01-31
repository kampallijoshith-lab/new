'use client';

import { CheckCircle, Loader, Circle } from 'lucide-react';
import type { AnalysisStep } from '@/lib/types';

interface AnalysisStepperProps {
  steps: AnalysisStep[];
}

const getStatusIcon = (status: AnalysisStep['status']) => {
  switch (status) {
    case 'complete':
      return <CheckCircle className="h-6 w-6 text-success" />;
    case 'in-progress':
      return <Loader className="h-6 w-6 text-primary animate-spin" />;
    case 'pending':
    default:
      return <Circle className="h-6 w-6 text-muted-foreground" />;
  }
};

export default function AnalysisStepper({ steps }: AnalysisStepperProps) {
  return (
    <div className="w-full flex flex-col items-center">
      <h2 className="font-headline text-3xl font-bold mb-2">Analyzing...</h2>
      <p className="text-muted-foreground mb-8">Our AI is verifying your medicine. Please wait.</p>
      <div className="w-full space-y-6">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="flex-shrink-0">
              {getStatusIcon(step.status)}
            </div>
            <div className="flex-grow">
              <p className={`font-medium ${step.status !== 'pending' ? 'text-foreground' : 'text-muted-foreground'}`}>
                {step.title}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
