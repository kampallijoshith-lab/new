'use client';

import type { ResultData, Verdict } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ShieldCheck, ShieldAlert, ShieldQuestion, RotateCcw, Flag } from 'lucide-react';
import VerdictGauge from './verdict-gauge';
import { reportCounterfeit } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface ResultsDashboardProps {
  results: ResultData;
  onRestart: () => void;
}

const verdictConfig: Record<Verdict, {
  Icon: React.ElementType;
  title: string;
  description: string;
  className: string;
}> = {
  Authentic: {
    Icon: ShieldCheck,
    title: 'Likely Authentic',
    description: 'Our analysis indicates a high probability of authenticity.',
    className: 'text-success',
  },
  Inconclusive: {
    Icon: ShieldQuestion,
    title: 'Inconclusive',
    description: 'Could not determine authenticity. Please proceed with caution.',
    className: 'text-accent',
  },
  'Counterfeit Risk': {
    Icon: ShieldAlert,
    title: 'Counterfeit Risk',
    description: 'This medicine has a high risk of being counterfeit. DO NOT USE.',
    className: 'text-destructive',
  },
};

export default function ResultsDashboard({ results, onRestart }: ResultsDashboardProps) {
  const { verdict, score } = results;
  const config = verdictConfig[verdict];
  const { toast } = useToast();
  const [isReporting, setIsReporting] = useState(false);

  const handleReport = async () => {
    setIsReporting(true);
    toast({
      title: 'Submitting Report...',
      description: 'Please wait while we submit your report to the authorities.',
    });
    try {
        await reportCounterfeit(results);
        toast({
            title: 'Report Submitted',
            description: 'Thank you for helping keep our communities safe.',
            variant: 'default',
        });
    } catch (error) {
        toast({
            title: 'Report Failed',
            description: 'Could not submit the report. Please try again later.',
            variant: 'destructive',
        });
    } finally {
        setIsReporting(false);
    }
  }

  const factors = [
      { name: 'Imprint Analysis', score: results.aiFactors.imprintAnalysis.score * 100 },
      { name: 'Packaging Quality', score: results.aiFactors.packagingQuality.score * 100 },
      { name: 'Database Cross-reference', score: results.aiFactors.globalDatabaseCheck.score * 100 },
  ];

  return (
    <Card className={cn('w-full transition-all', {
      'border-success bg-success/5': verdict === 'Authentic',
      'border-accent bg-accent/5': verdict === 'Inconclusive',
      'border-destructive bg-destructive/5': verdict === 'Counterfeit Risk',
    })}>
      <CardHeader className="items-center text-center">
        <config.Icon className={cn('h-16 w-16 mb-2', config.className)} />
        <CardTitle className={cn('font-headline text-3xl', config.className)}>{config.title}</CardTitle>
        <CardDescription className="text-base">{config.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-6">
        <VerdictGauge score={score} verdict={verdict} />

        <div className="w-full">
            <h3 className="font-semibold text-center mb-2">Detection Factor Breakdown</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>AI Factor</TableHead>
                        <TableHead className="text-right">Confidence</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {factors.map(factor => (
                        <TableRow key={factor.name}>
                            <TableCell className="font-medium">{factor.name}</TableCell>
                            <TableCell className="text-right">{factor.score.toFixed(0)}%</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
        
        <div className="w-full flex flex-col gap-2">
            {verdict === 'Counterfeit Risk' && (
              <Button size="lg" variant="destructive" onClick={handleReport} disabled={isReporting}>
                <Flag className="mr-2"/> {isReporting ? 'Reporting...' : 'Report as Counterfeit'}
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={onRestart}>
              <RotateCcw className="mr-2"/> Start New Scan
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
