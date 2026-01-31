'use client';

import { useState, useCallback } from 'react';
import type { ScannerState, AnalysisStep, MedicineInfo, ForensicAnalysisResult } from '@/lib/types';
import { forensicAnalysisFlow } from '@/ai/flows/forensic-analysis-flow';

const initialAnalysisSteps: AnalysisStep[] = [
  { title: 'Uploading and queueing image...', status: 'pending', duration: 500 },
  { title: 'Performing unified analysis...', status: 'pending', duration: 2000 },
  { title: 'Checking forensic quality...', status: 'pending', duration: 2000 },
  { title: 'Extracting physical characteristics...', status: 'pending', duration: 2500 },
  { title: 'Searching global medical databases...', status: 'pending', duration: 3000 },
  { title: 'Cross-referencing and validating...', status: 'pending', duration: 2500 },
  { title: 'Calculating authenticity score...', status: 'pending', duration: 1000 },
];

export const useScanner = () => {
  const [state, setState] = useState<ScannerState>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(initialAnalysisSteps);
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageQueue, setImageQueue] = useState<string[]>([]);

  const _runAnalysis = async (imageDataUrl: string) => {
    // Reset states for new analysis
    setAnalysisResult(null);
    setError(null);
    setState('analyzing');

    let currentSteps = [...initialAnalysisSteps].map(s => ({ ...s, status: 'pending' as const }));

    const runStep = async (index: number) => {
      if (index < currentSteps.length) {
        currentSteps = currentSteps.map((step, idx) => 
            idx < index ? { ...step, status: 'complete' } :
            idx === index ? { ...step, status: 'in-progress' } :
            step
        );
        setAnalysisSteps(currentSteps);
        await new Promise(resolve => setTimeout(resolve, currentSteps[index].duration));
      }
    };
    
    // Animate first step
    await runStep(0); 
    await runStep(1);

    try {
      // Single, unified API call
      const result = await forensicAnalysisFlow({ photoDataUri: imageDataUrl });
      
      // Animate remaining steps
      await runStep(2);
      await runStep(3);
      await runStep(4);
      await runStep(5);
      await runStep(6);

      setAnalysisResult(result);
      setAnalysisSteps(currentSteps.map(step => ({...step, status: 'complete'})));
      setState('results');

    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred during analysis.');
      setState('results'); // Go to results to show the error
    }
  };

  const _startAnalysisWithQueue = useCallback((imageDataUrls: string[]) => {
    if (imageDataUrls.length === 0) {
      setState('idle');
      setImage(null);
      setAnalysisResult(null);
      setError(null);
      setImageQueue([]);
      return;
    }

    const nextImage = imageDataUrls[0];
    const remainingImages = imageDataUrls.slice(1);

    setImage(nextImage);
    setImageQueue(remainingImages);
    setAnalysisSteps(initialAnalysisSteps.map(s => ({ ...s, status: 'pending' })));
    _runAnalysis(nextImage);
  }, []);

  const startScan = useCallback(() => {
    setState('scanning');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
    setAnalysisSteps(initialAnalysisSteps.map(s => ({ ...s, status: 'pending' })));
  }, []);

  const handleImageCapture = useCallback((imageDataUrl: string) => {
    _startAnalysisWithQueue([imageDataUrl]);
  }, [_startAnalysisWithQueue]);

  const handleMultipleImages = useCallback((imageDataUrls: string[]) => {
    if (imageDataUrls.length > 0) {
      _startAnalysisWithQueue(imageDataUrls);
    }
  }, [_startAnalysisWithQueue]);

  const analyzeNext = useCallback(() => {
    if(imageQueue.length > 0) {
      _startAnalysisWithQueue(imageQueue);
    } else {
      setState('idle');
      setImage(null);
      setAnalysisResult(null);
      setError(null);
      setImageQueue([]);
    }
  }, [imageQueue, _startAnalysisWithQueue]);

  const restart = useCallback(() => {
    setState('idle');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  }, []);

  // Derive the separate info/result objects for the UI to maintain component compatibility.
  const medicineInfo: MedicineInfo | null = analysisResult 
    ? {
        primaryUses: analysisResult.primaryUses,
        howItWorks: analysisResult.howItWorks,
        commonIndications: analysisResult.commonIndications,
        safetyDisclaimer: analysisResult.safetyDisclaimer,
        error: analysisResult.analysisError || undefined,
      } 
    : null;

  const forensicResult: ForensicAnalysisResult | null = analysisResult && !analysisResult.analysisError 
    ? analysisResult 
    : null;

  return {
    state,
    image,
    analysisSteps,
    medicineInfo,
    forensicResult,
    error,
    imageQueue,
    startScan,
    handleImageCapture,
    handleMultipleImages,
    analyzeNext,
    restart,
  };
};
