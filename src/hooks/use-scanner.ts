'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScannerState, AnalysisStep, MedicineInfo, ForensicAnalysisResult } from '@/lib/types';
import { step1_OCR, step2_Research, step3_Visual, step4_Synthesis } from '@/app/actions';

const initialAnalysisSteps: AnalysisStep[] = [
  { title: 'Step 1: Extracting drug metadata', status: 'pending', duration: 0 },
  { title: 'Step 2: Researching official records', status: 'pending', duration: 0 },
  { title: 'Step 3: Visual forensic inspection', status: 'pending', duration: 0 },
  { title: 'Step 4: Master AI Synthesis', status: 'pending', duration: 0 },
];

const COOLDOWN_SECONDS = 5; 
const COOLDOWN_STORAGE_KEY = 'medilens_cooldown_end';

export const useScanner = () => {
  const [state, setState] = useState<ScannerState>('idle');
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(initialAnalysisSteps);
  const [cooldownTime, setCooldownTime] = useState(0);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || imageQueue.length === 0) return;
    
    isProcessingRef.current = true;
    const nextImage = imageQueue[0];
    setImageQueue(prev => prev.slice(1));
    setState('analyzing');
    setError(null);
    setAnalysisResult(null);

    const updateStep = (index: number, status: AnalysisStep['status']) => {
        setAnalysisSteps(prev => prev.map((s, i) => i === index ? { ...s, status } : s));
    };

    try {
        // STEP 1: OCR
        updateStep(0, 'in-progress');
        const metadata = await step1_OCR(nextImage);
        if (metadata.error) throw new Error(metadata.error);
        updateStep(0, 'complete');

        // STEP 2 & 3: Parallel Research and Visual (Individual requests)
        updateStep(1, 'in-progress');
        updateStep(2, 'in-progress');
        
        const [research, visual] = await Promise.all([
            step2_Research(metadata),
            step3_Visual(nextImage)
        ]);

        if (research.error) throw new Error(research.error);
        updateStep(1, 'complete');
        
        if (visual.error) throw new Error(visual.error);
        updateStep(2, 'complete');

        // STEP 4: Synthesis
        updateStep(3, 'in-progress');
        const final = await step4_Synthesis({ metadata, research, visual });
        if (final.error) throw new Error(final.error);
        
        updateStep(3, 'complete');
        setAnalysisResult(final);

    } catch (e: any) {
        setError(e.message || "An error occurred during analysis.");
    } finally {
        const newCooldownEnd = Date.now() + COOLDOWN_SECONDS * 1000;
        localStorage.setItem(COOLDOWN_STORAGE_KEY, newCooldownEnd.toString());
        setState('results');
        isProcessingRef.current = false;
    }
  }, [imageQueue]);

  useEffect(() => {
    if (state === 'idle' && imageQueue.length > 0) processQueue();
  }, [state, imageQueue, processQueue]);

  const startScan = () => {
    setState('scanning');
    setAnalysisResult(null);
    setError(null);
    setAnalysisSteps(initialAnalysisSteps.map(s => ({...s, status: 'pending'})));
  };

  const handleImageCapture = (url: string) => {
    setImageQueue([url]);
    setState('idle');
  };

  const handleMultipleImages = (urls: string[]) => {
    setImageQueue(urls);
    setState('idle');
  };

  const restart = () => {
    setState('idle');
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  };

  return {
    state,
    analysisSteps,
    forensicResult: analysisResult,
    medicineInfo: analysisResult ? { ...analysisResult } : (error ? { error } : null),
    error,
    imageQueue,
    isCoolingDown: state === 'cooldown',
    cooldownTime,
    startScan,
    handleImageCapture,
    handleMultipleImages,
    restart,
  };
};
