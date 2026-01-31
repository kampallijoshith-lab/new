'use client';

import { cn } from "@/lib/utils";
import { Verdict } from "@/lib/types";

interface VerdictGaugeProps {
  score: number;
  verdict: Verdict;
}

const Gauge = ({ value, colorClass }: { value: number, colorClass: string }) => {
  const circumference = 2 * Math.PI * 45; // 2 * pi * r
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
      {/* Background circle */}
      <circle
        className="text-muted/50"
        strokeWidth="10"
        stroke="currentColor"
        fill="transparent"
        r="45"
        cx="50"
        cy="50"
      />
      {/* Foreground circle */}
      <circle
        className={cn("transition-all duration-1000 ease-out", colorClass)}
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r="45"
        cx="50"
        cy="50"
      />
    </svg>
  );
};


export default function VerdictGauge({ score, verdict }: VerdictGaugeProps) {
  const colorClass = 
    verdict === 'Authentic' ? 'text-success' :
    verdict === 'Inconclusive' ? 'text-accent' :
    'text-destructive';

  return (
    <div className="relative flex items-center justify-center">
      <Gauge value={score} colorClass={colorClass} />
      <div className="absolute flex flex-col items-center">
        <span className={cn("font-headline text-5xl font-bold", colorClass)}>
          {score}
        </span>
        <span className="text-sm font-medium text-muted-foreground">Authenticity Score</span>
      </div>
    </div>
  );
}
