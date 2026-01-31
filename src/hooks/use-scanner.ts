'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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

const COOLDOWN_SECONDS = 60;
const COOLDOWN_STORAGE_KEY = 'medilens_cooldown_end';

type InternalState = 'idle' | 'scanning' | 'analyzing' | 'results' | 'cooldown';

export const useScanner = () => {
  const [state, setState] = useState<InternalState>('idle');
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(initialAnalysisSteps);

  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  const isCoolingDown = state === 'cooldown';

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || imageQueue.length === 0) {
      return; // Already processing or queue is empty
    }

    const now = Date.now();
    const cooldownEndTime = parseInt(localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0', 10);

    if (now < cooldownEndTime) {
      setState('cooldown'); // Ensure state reflects cooldown
      return; // Still in cooldown
    }
    
    isProcessingRef.current = true;
    const nextImage = imageQueue[0];
    const remainingImages = imageQueue.slice(1);

    setImageQueue(remainingImages);
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
    
    await runStep(0); // Uploading and queueing
    
    try {
        await runStep(1); // Performing unified analysis
        const result = await forensicAnalysisFlow({ photoDataUri: nextImage });
        await Promise.all([runStep(2), runStep(3), runStep(4), runStep(5), runStep(6)]);

        setAnalysisResult(result);
        setAnalysisSteps(currentSteps.map(step => ({...step, status: 'complete'})));
    } catch (e: any) {
        console.error("Analysis failed:", e);
        setError(e.message || 'An unexpected error occurred during analysis.');
    } finally {
        const newCooldownEnd = Date.now() + COOLDOWN_SECONDS * 1000;
        localStorage.setItem(COOLDOWN_STORAGE_KEY, newCooldownEnd.toString());
        setState('results');
    }
  }, [imageQueue]);


  // Cooldown Timer Management
  useEffect(() => {
    if (state === 'cooldown') {
      cooldownTimerRef.current = setInterval(() => {
        const cooldownEndTime = parseInt(localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0', 10);
        const now = Date.now();
        const remaining = Math.ceil((cooldownEndTime - now) / 1000);

        if (remaining > 0) {
          setCooldownTime(remaining);
        } else {
          setCooldownTime(0);
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
          setState('idle'); // Cooldown finished, ready for next manual start or queue processing
        }
      }, 1000);
    } else {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    }
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, [state]);

  // Main Processing Engine Trigger
  useEffect(() => {
    if (state === 'idle' && imageQueue.length > 0) {
      processQueue();
    }
  }, [state, imageQueue, processQueue]);

  // Automatic Transition from Results to Cooldown
  useEffect(() => {
    if (state === 'results') {
      const timer = setTimeout(() => {
        isProcessingRef.current = false; // Release lock
        setState('cooldown'); // Start cooldown
      }, 4000); // Display results for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [state]);


  const startScan = useCallback(() => {
    if (isProcessingRef.current || state === 'cooldown') return;
    setState('scanning');
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  }, [state]);
  
  const handleImageCapture = useCallback((imageDataUrl: string) => {
    if (state === 'cooldown' || isProcessingRef.current) return;
    setImageQueue([imageDataUrl]);
    setState('idle'); // Let the engine pick it up
  }, [state]);

  const handleMultipleImages = useCallback((imageDataUrls: string[]) => {
    if (state === 'cooldown' || isProcessingRef.current || imageDataUrls.length === 0) return;
    setImageQueue(imageDataUrls);
    setState('idle'); // Let the engine pick it up
  }, [state]);

  const restart = useCallback(() => {
    setState('idle');
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
    isProcessingRef.current = false;
    localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    setCooldownTime(0);
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
  }, []);

  const medicineInfo: MedicineInfo | null = analysisResult 
    ? {
        primaryUses: analysisResult.primaryUses,
        howItWorks: analysisResult.howItWorks,
        commonIndications: analysisResult.commonIndications,
        safetyDisclaimer: analysisResult.safetyDisclaimer,
        error: analysisResult.analysisError || error || undefined,
      } 
    : error ? { error } : null;

  const forensicResult: ForensicAnalysisResult | null = analysisResult && !analysisResult.analysisError 
    ? analysisResult 
    : null;

  return {
    state: state as ScannerState,
    analysisSteps,
    medicineInfo,
    forensicResult,
    error,
    imageQueue,
    isCoolingDown,
    cooldownTime,
    startScan,
    handleImageCapture,
    handleMultipleImages,
    restart,
  };
};
