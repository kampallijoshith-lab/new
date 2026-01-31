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

  const isCoolingDown = state === 'cooldown';

  // Cooldown Timer Effect
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
          // If there are more images, move to await state, otherwise idle.
          setState(imageQueue.length > 0 ? 'awaiting_next' : 'idle');
        }
      }, 1000);
    } else {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    }

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, [state, imageQueue.length]);

  // Main Analysis Engine Effect
  useEffect(() => {
    // This effect acts as the engine, processing one image from the queue when ready.
    if (state === 'awaiting_next' && imageQueue.length > 0) {
      const nextImage = imageQueue[0];
      const remainingImages = imageQueue.slice(1);
      
      // Set up for the next analysis
      setImage(nextImage);
      setImageQueue(remainingImages);
      setAnalysisResult(null);
      setError(null);
      
      // Transition to analyzing
      setState('analyzing');
    } else if (state === 'analyzing' && image) {
      _runAnalysis(image);
    }
  }, [state, imageQueue, image]);
  
  const _runAnalysis = async (imageDataUrl: string) => {
    // 1. Start the cooldown immediately
    const endTime = Date.now() + COOLDOWN_SECONDS * 1000;
    localStorage.setItem(COOLDOWN_STORAGE_KEY, endTime.toString());
    setCooldownTime(COOLDOWN_SECONDS);

    // 2. Run analysis steps UI
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
      // 3. Perform the actual AI call
      const result = await forensicAnalysisFlow({ photoDataUri: imageDataUrl });
      await runStep(2); await runStep(3); await runStep(4); await runStep(5); await runStep(6);
      
      setAnalysisResult(result);
      setAnalysisSteps(currentSteps.map(step => ({...step, status: 'complete'})));
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred during analysis.');
    } finally {
      // 4. After analysis, transition to displaying results
      setState('results');
    }
  };
  
  const startScan = useCallback(() => {
    if (state !== 'idle') return;
    setState('scanning');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  }, [state]);

  const handleImageCapture = useCallback((imageDataUrl: string) => {
    // This is called from the scanner UI for a single image
    if (state !== 'scanning') return;
    setImageQueue([imageDataUrl]);
    setState('awaiting_next'); // Kickstart the engine
  }, [state]);

  const handleMultipleImages = useCallback((imageDataUrls: string[]) => {
    if (state !== 'idle' || imageDataUrls.length === 0) return;
    setImageQueue(imageDataUrls);
    setState('awaiting_next'); // Kickstart the engine
  }, [state]);

  const analyzeNext = useCallback(() => {
    if (state !== 'results') return;
    // Transition to cooldown state. The effect will handle moving to the next analysis.
    setState('cooldown');
  }, [state]);

  const restart = useCallback(() => {
    // Only allow restart if not in the middle of something critical
    if (state === 'analyzing' || state === 'cooldown') return;
    setState('idle');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
    // Clear any lingering cooldown
    localStorage.removeItem(COOLDOWN_STORAGE_KEY);
    setCooldownTime(0);
  }, [state]);

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
    state: state as ScannerState, // Public state is simplified
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
    analyzeNext, // This will now transition to cooldown
    restart,
  };
};
