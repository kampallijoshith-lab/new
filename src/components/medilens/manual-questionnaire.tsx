'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { Question } from '@/lib/types';
import { Check, X } from 'lucide-react';

interface ManualQuestionnaireProps {
  question: Question;
  currentIndex: number;
  total: number;
  onAnswer: (answer: boolean) => void;
}

export default function ManualQuestionnaire({
  question,
  currentIndex,
  total,
  onAnswer,
}: ManualQuestionnaireProps) {
  const progressValue = ((currentIndex + 1) / total) * 100;

  return (
    <div className="w-full flex flex-col items-center">
      <Progress value={progressValue} className="w-full mb-4" />
      <p className="text-sm text-muted-foreground mb-6 font-medium">
        Question {currentIndex + 1} of {total}
      </p>

      <h2 className="font-headline text-3xl font-bold mb-8 text-center">
        {question.text}
      </h2>

      <div className="w-full grid grid-cols-2 gap-4">
        <Button
          onClick={() => onAnswer(true)}
          className="h-24 text-2xl bg-success/20 text-success-foreground hover:bg-success/30 border-2 border-success"
        >
          <Check className="mr-2 h-8 w-8" /> Yes
        </Button>
        <Button
          onClick={() => onAnswer(false)}
          className="h-24 text-2xl bg-destructive/20 text-destructive-foreground hover:bg-destructive/30 border-2 border-destructive"
        >
          <X className="mr-2 h-8 w-8" /> No
        </Button>
      </div>

       <p className="mt-8 text-sm text-muted-foreground">
        Your answers help our AI make a more accurate assessment.
      </p>
    </div>
  );
}
