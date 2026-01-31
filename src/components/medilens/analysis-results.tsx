import { AlertCircle, PackageSearch } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RedAlertCard } from './red-alert-card';
import { SafetyChecklist } from './safety-checklist';
import type { AnalysisResult } from '@/lib/types';

interface AnalysisResultsProps {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

const LoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-12 w-3/4 mx-auto" />
    <Skeleton className="h-8 w-1/2 mx-auto" />
    <div className="space-y-2 pt-4">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
    </div>
  </div>
);

export function AnalysisResults({ result, isLoading, error }: AnalysisResultsProps) {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="text-destructive flex flex-col items-center gap-4">
        <AlertCircle className="h-12 w-12" />
        <h3 className="font-headline text-xl font-semibold">Analysis Failed</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-4 py-8">
        <PackageSearch className="h-16 w-16" />
        <h3 className="font-headline text-2xl font-semibold">Ready to Analyze</h3>
        <p className="max-w-md">Your analysis results will appear here once you search for a medicine.</p>
      </div>
    );
  }

  if (result.isThreat) {
    return <RedAlertCard details={result.details} searchTerm={result.searchTerm} />;
  }

  return <SafetyChecklist />;
}
