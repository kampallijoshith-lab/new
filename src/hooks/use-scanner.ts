'use client';

import { useState, useCallback } from 'react';
import type { ScannerState, AnalysisStep, Question, ResultData } from '@/lib/types';
import { getAnalysisResults } from '@/app/actions';

const initialAnalysisSteps: AnalysisStep[] = [
  { title: 'Uploading Image...', status: 'pending', duration: 1000 },
  { title: 'Reading Imprints & Text...', status: 'pending', duration: 2000 },
  { title: 'Analyzing Physical Factors...', status: 'pending', duration: 2000 },
  { title: 'Cross-referencing Global Databases...', status: 'pending', duration: 3000 },
  { title: 'Finalizing Verdict...', status: 'pending', duration: 1000 },
];

const manualQuestions: Question[] = [
    { id: 'q1', text: 'Was the price significantly lower than usual?', factor: 'price' },
    { id: 'q2', text: 'Was the medicine purchased from a reputable, licensed pharmacy?', factor: 'source' },
    { id: 'q3', text: 'Does the packaging appear professional and free of spelling errors?', factor: 'packaging' },
    { id: 'q4', text: 'Were all safety seals intact before you opened it?', factor: 'seals' },
    { id: 'q5', text: 'Did you consult a pharmacist about this medicine?', factor: 'pharmacist' },
    { id: 'q6', text: 'Are you experiencing unexpected side effects?', factor: 'sideEffects' },
    { id: 'q7', text: 'Does the dosage information seem correct and clear?', factor: 'dosage' },
    { id: 'q8', text: 'Is the expiration date clearly visible and not expired?', factor: 'expiration' },
];


export const useScanner = () => {
  const [state, setState] = useState<ScannerState>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(initialAnalysisSteps);
  const [questions] = useState<Question[]>(manualQuestions);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [results, setResults] = useState<ResultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const startScan = useCallback(() => {
    setState('scanning');
    setImage(null);
    setResults(null);
    setError(null);
    setCurrentQuestionIndex(0);
    setAnalysisSteps(initialAnalysisSteps.map(s => ({ ...s, status: 'pending' })));
  }, []);
  
  const handleImageCapture = useCallback((imageDataUrl: string) => {
    setImage(imageDataUrl);
    setState('analyzing');
    _runAnalysis();
  }, []);

  const _runAnalysis = async () => {
    let currentSteps = [...initialAnalysisSteps];

    for (let i = 0; i < currentSteps.length; i++) {
        currentSteps = currentSteps.map((step, idx) => 
            idx === i ? { ...step, status: 'in-progress' } : step
        );
        setAnalysisSteps(currentSteps);
        
        await new Promise(resolve => setTimeout(resolve, currentSteps[i].duration));

        currentSteps = currentSteps.map((step, idx) => 
            idx === i ? { ...step, status: 'complete' } : step
        );
        setAnalysisSteps(currentSteps);
    }
    
    // After AI analysis, move to questionnaire
    setState('questionnaire');
  };

  const answerQuestion = useCallback((answer: boolean) => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, fetch final results
      setState('results');
      // In a real app, we would send answers to the backend
      // For now, we'll just fetch placeholder results
      getAnalysisResults({}).then(res => {
          setResults(res);
      }).catch(err => {
          setError('Failed to fetch analysis results.');
          setState('idle');
      });
    }
  }, [currentQuestionIndex, questions.length]);

  const restart = useCallback(() => {
    setState('idle');
    setImage(null);
    setResults(null);
    setError(null);
    setCurrentQuestionIndex(0);
  }, []);

  return {
    state,
    image,
    analysisSteps,
    questions,
    currentQuestionIndex,
    results,
    error,
    startScan,
    handleImageCapture,
    answerQuestion,
    restart,
  };
};
