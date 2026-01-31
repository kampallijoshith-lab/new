'use client';

import type { ForensicAnalysisResult, Verdict } from '@/lib/types';
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
  results: ForensicAnalysisResult;
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
    description: 'Our forensic analysis indicates a high probability of authenticity.',
    className: 'text-success',
  },
  Inconclusive: {
    Icon: ShieldQuestion,
    title: 'Inconclusive',
    description: 'Could not determine authenticity. Please proceed with caution and consult a professional.',
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
        // This is a placeholder action
        // await reportCounterfeit(results);
        await new Promise(resolve => setTimeout(resolve, 1500));
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
      { name: 'Imprint Match', status: results.coreResults.imprint.status, evidence: results.coreResults.imprint.evidence_quote },
      { name: 'Color Match', status: results.coreResults.color.status, evidence: results.coreResults.color.evidence_quote },
      { name: 'Shape Match', status: results.coreResults.shape.status, evidence: results.coreResults.shape.evidence_quote },
      { name: 'Source Reliability', status: results.coreResults.source.match ? 'match' : 'omission', evidence: results.coreResults.source.reason },
  ];

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'match': return 'text-success';
      case 'conflict': return 'text-destructive';
      case 'omission': return 'text-accent';
      default: return 'text-muted-foreground';
    }
  }

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
            <h3 className="font-semibold text-center mb-2">Forensic Analysis Breakdown</h3>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Factor</TableHead>
                        <TableHead className="text-right">Result</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {factors.map(factor => (
                        <TableRow key={factor.name}>
                            <TableCell className="font-medium">{factor.name}</TableCell>
                            <TableCell className={cn("text-right font-semibold capitalize", getStatusClass(factor.status))}>
                                {factor.status}
                            </TableCell>
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
