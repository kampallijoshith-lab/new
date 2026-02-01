'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ScannerState, AnalysisStep, MedicineInfo, ForensicAnalysisResult } from '@/lib/types';
import { forensicAnalysisFlow } from '@/ai/flows/forensic-analysis-flow';

const initialAnalysisSteps: AnalysisStep[] = [
  { title: 'Agent A: Extracting drug name and dosage (Vision OCR)...', status: 'pending', duration: 1500 },
  { title: 'Agent B: Researching global health databases (Interpreter)...', status: 'pending', duration: 3000 },
  { title: 'Agent C: Inspecting visual packaging quality (Forensics)...', status: 'pending', duration: 3000 },
  { title: 'Parallel Execution: Synergizing Agent Findings...', status: 'pending', duration: 500 },
  { title: 'Groq: Synthesizing final forensic verdict...', status: 'pending', duration: 2000 },
  { title: 'Finalizing authenticity score...', status: 'pending', duration: 500 },
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
        // Start the backend flow
        const analysisPromise = forensicAnalysisFlow({ photoDataUri: nextImage });
        
        // Step 0: Agent A
        await new Promise(r => setTimeout(r, 1500));
        updateStep(0, 'complete');

        // Parallel Step Start
        updateStep(1, 'in-progress');
        updateStep(2, 'in-progress');
        updateStep(3, 'in-progress');
        
        // Wait for actual results
        const result = await analysisPromise;
        
        updateStep(1, 'complete');
        updateStep(2, 'complete');
        updateStep(3, 'complete');
        updateStep(4, 'in-progress');
        await new Promise(r => setTimeout(r, 1000));
        updateStep(4, 'complete');
        updateStep(5, 'complete');

        setAnalysisResult(result);
    } catch (e: any) {
        console.error("Analysis failed:", e);
        setError(e.message || 'Analysis failed. This usually means a provider hit a rate limit or a key is missing. Check your server logs.');
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
      }, 8000); // Give user time to see results
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
