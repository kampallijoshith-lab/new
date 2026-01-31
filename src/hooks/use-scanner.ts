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

type InternalState = 'idle' | 'scanning' | 'analyzing' | 'results' | 'cooldown' | 'awaiting_next';

export const useScanner = () => {
  const [state, setState] = useState<InternalState>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(initialAnalysisSteps);
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  
  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldownTimerRef = useRef<NodeJS.Timeout>();
  const isProcessingRef = useRef(false);

  const isCoolingDown = state === 'cooldown';

  // Cooldown Timer Effect: Manages the cooldown period and decides what to do when it ends.
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
          // Cooldown over. If there are more images, trigger the next analysis. Otherwise, go idle.
          if (imageQueue.length > 0) {
            setState('awaiting_next');
          } else {
            setState('idle');
          }
        }
      }, 1000);
    } else {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    }
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, [state, imageQueue.length]);

  // Engine Entry Point: Kicks off the analysis for the next item in the queue.
  useEffect(() => {
    if (state === 'awaiting_next' && imageQueue.length > 0 && !isProcessingRef.current) {
      isProcessingRef.current = true; // Acquire lock

      const nextImage = imageQueue[0];
      const remainingImages = imageQueue.slice(1);
      
      setImage(nextImage);
      setImageQueue(remainingImages);
      setAnalysisResult(null); // Clear previous results
      setError(null);
      
      setState('analyzing'); // Proceed to analysis
    }
  }, [state, imageQueue]);

  // Analysis Runner: Executes the async analysis when the state is 'analyzing'.
  useEffect(() => {
    const runAnalysis = async () => {
      if (state === 'analyzing' && image) {
        const endTime = Date.now() + COOLDOWN_SECONDS * 1000;
        localStorage.setItem(COOLDOWN_STORAGE_KEY, endTime.toString());
        setCooldownTime(COOLDOWN_SECONDS);

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

        await runStep(0);
        await runStep(1);

        try {
          const result = await forensicAnalysisFlow({ photoDataUri: image });
          await runStep(2); await runStep(3); await runStep(4); await runStep(5); await runStep(6);
          setAnalysisResult(result);
          setAnalysisSteps(currentSteps.map(step => ({...step, status: 'complete'})));
        } catch (e: any) {
          console.error(e);
          setError(e.message || 'An unexpected error occurred during analysis.');
        } finally {
          setState('results'); // Transition to showing results
        }
      }
    };

    runAnalysis();
  }, [state, image]);

  // Automatic Transition from Results to Cooldown
  useEffect(() => {
    if (state === 'results') {
      const timer = setTimeout(() => {
        isProcessingRef.current = false; // Release lock
        setState('cooldown'); // Start cooldown, which will then trigger the next image if available
      }, 4000); // Display results for 4 seconds
      return () => clearTimeout(timer);
    }
  }, [state]);
  
  const startScan = useCallback(() => {
    if (isProcessingRef.current) return;
    setState('scanning');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  }, []);

  const handleImageCapture = useCallback((imageDataUrl: string) => {
    if (isProcessingRef.current) return;
    setImageQueue([imageDataUrl]);
    setState('awaiting_next'); // Kickstart the engine
  }, []);

  const handleMultipleImages = useCallback((imageDataUrls: string[]) => {
    if (isProcessingRef.current || imageDataUrls.length === 0) return;
    setImageQueue(imageDataUrls);
    setState('awaiting_next'); // Kickstart the engine
  }, []);

  const restart = useCallback(() => {
    if (isProcessingRef.current) return;
    setState('idle');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
    localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    setCooldownTime(0);
  }, []);

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
    state: state as ScannerState,
    image,
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
