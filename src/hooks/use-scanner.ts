'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScannerState, AnalysisStep, MedicineInfo, ForensicAnalysisResult } from '@/lib/types';
import { forensicAnalysisFlow } from '@/ai/flows/forensic-analysis-flow';

const initialAnalysisSteps: AnalysisStep[] = [
  { title: 'Extracting drug name and dosage', status: 'pending', duration: 1500 },
  { title: 'Researching global health databases', status: 'pending', duration: 3000 },
  { title: 'Inspecting visual packaging quality', status: 'pending', duration: 3000 },
  { title: 'Synergizing all specialist findings', status: 'pending', duration: 1000 },
  { title: 'Finalizing authenticity score and verdict...', status: 'pending', duration: 800 },
];

const COOLDOWN_SECONDS = 15; 
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
      return; 
    }

    const now = Date.now();
    const cooldownEndTime = parseInt(localStorage.getItem(COOLDOWN_STORAGE_KEY) || '0', 10);

    if (now < cooldownEndTime) {
      setState('cooldown');
      return;
    }
    
    isProcessingRef.current = true;
    const nextImage = imageQueue[0];
    const remainingImages = imageQueue.slice(1);

    setImageQueue(remainingImages);
    setAnalysisResult(null);
    setError(null);
    setState('analyzing');

    let currentSteps = [...initialAnalysisSteps].map(s => ({ ...s, status: 'pending' as const }));
    
    const updateStep = (index: number, status: AnalysisStep['status']) => {
        currentSteps = currentSteps.map((step, idx) => 
            idx === index ? { ...step, status } : step
        );
        setAnalysisSteps(currentSteps);
    };

    try {
        updateStep(0, 'in-progress');
        // Start the parallel multi-agent flow
        const analysisPromise = forensicAnalysisFlow({ photoDataUri: nextImage });
        
        // Wait for first step OCR (simulated timing for UI)
        await new Promise(r => setTimeout(r, 1500));
        updateStep(0, 'complete');

        // Parallel Start: Researching and Inspecting
        updateStep(1, 'in-progress');
        updateStep(2, 'in-progress');
        
        const result = await analysisPromise;
        
        updateStep(1, 'complete');
        updateStep(2, 'complete');
        
        // Final Synthesis
        updateStep(3, 'in-progress');
        await new Promise(r => setTimeout(r, 1000));
        updateStep(3, 'complete');

        // Final Verdict Processing
        updateStep(4, 'in-progress');
        await new Promise(r => setTimeout(r, 800));
        updateStep(4, 'complete');

        setAnalysisResult(result);
    } catch (e: any) {
        console.error("Multi-agent analysis failed:", e);
        // Extract the most helpful error message
        const errorMessage = e.message || 'Analysis failed. Check your API keys.';
        setError(errorMessage);
    } finally {
        const newCooldownEnd = Date.now() + COOLDOWN_SECONDS * 1000;
        localStorage.setItem(COOLDOWN_STORAGE_KEY, newCooldownEnd.toString());
        setState('results');
    }
  }, [imageQueue]);


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
          setState('idle');
        }
      }, 1000);
    } else {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    }
    return () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); };
  }, [state]);

  useEffect(() => {
    if (state === 'idle' && imageQueue.length > 0) {
      processQueue();
    }
  }, [state, imageQueue, processQueue]);

  useEffect(() => {
    if (state === 'results') {
      const timer = setTimeout(() => {
        isProcessingRef.current = false;
        setState('cooldown');
      }, 10000); // 10 seconds for user to review
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
    setState('idle');
  }, [state]);

  const handleMultipleImages = useCallback((imageDataUrls: string[]) => {
    if (state === 'cooldown' || isProcessingRef.current || imageDataUrls.length === 0) return;
    setImageQueue(imageDataUrls);
    setState('idle');
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