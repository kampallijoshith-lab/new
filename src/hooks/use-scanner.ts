'use client';

import { useState, useCallback, useEffect } from 'react';
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


export const useScanner = () => {
  const [state, setState] = useState<ScannerState>('idle');
  const [image, setImage] = useState<string | null>(null);
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(initialAnalysisSteps);
  const [analysisResult, setAnalysisResult] = useState<ForensicAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageQueue, setImageQueue] = useState<string[]>([]);
  
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    const checkCooldown = () => {
      const cooldownEndTime = localStorage.getItem(COOLDOWN_STORAGE_KEY);
      if (cooldownEndTime) {
        const endTime = parseInt(cooldownEndTime, 10);
        const now = Date.now();
        if (now < endTime) {
          setIsCoolingDown(true);
          const remaining = Math.ceil((endTime - now) / 1000);
          setCooldownTime(remaining);
        } else {
          setIsCoolingDown(false);
          setCooldownTime(0);
          localStorage.removeItem(COOLDOWN_STORAGE_KEY);
        }
      }
    };
    
    checkCooldown();
    
    if (isCoolingDown) {
      timer = setInterval(checkCooldown, 1000);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isCoolingDown]);


  const startCooldown = () => {
    const endTime = Date.now() + COOLDOWN_SECONDS * 1000;
    localStorage.setItem(COOLDOWN_STORAGE_KEY, endTime.toString());
    setIsCoolingDown(true);
    setCooldownTime(COOLDOWN_SECONDS);
  };

  const _runAnalysis = async (imageDataUrl: string) => {
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
      const result = await forensicAnalysisFlow({ photoDataUri: imageDataUrl });
      await runStep(2);
      await runStep(3);
      await runStep(4);
      await runStep(5);
      await runStep(6);
      setAnalysisResult(result);
      setAnalysisSteps(currentSteps.map(step => ({...step, status: 'complete'})));
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'An unexpected error occurred during analysis.');
    } finally {
      setState('results');
    }
  };
  
  const initiateAnalysis = useCallback((imageDataUrls: string[]) => {
    if (state !== 'idle' && state !== 'scanning') {
      return;
    }
    if (isCoolingDown) {
      return;
    }
    if (!imageDataUrls || imageDataUrls.length === 0) {
      return;
    }

    startCooldown();
    setState('analyzing');
    
    const nextImage = imageDataUrls[0];
    const remainingImages = imageDataUrls.slice(1);
    
    setImage(nextImage);
    setImageQueue(remainingImages);
    setAnalysisResult(null);
    setError(null);
    setAnalysisSteps(initialAnalysisSteps.map(s => ({ ...s, status: 'pending' })));

    _runAnalysis(nextImage);
  }, [state, isCoolingDown]);


  const startScan = useCallback(() => {
    if (state !== 'idle' || isCoolingDown) return;
    setState('scanning');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  }, [state, isCoolingDown]);

  const handleImageCapture = useCallback((imageDataUrl: string) => {
    initiateAnalysis([imageDataUrl]);
  }, [initiateAnalysis]);

  const handleMultipleImages = useCallback((imageDataUrls: string[]) => {
    initiateAnalysis(imageDataUrls);
  }, [initiateAnalysis]);

  const analyzeNext = useCallback(() => {
    // Let's reset state before initiating, to allow `initiateAnalysis` to proceed.
    setState('idle');
    // Use a timeout to ensure state update has propagated before calling initiateAnalysis.
    setTimeout(() => initiateAnalysis(imageQueue), 0);
  }, [imageQueue, initiateAnalysis]);


  const restart = useCallback(() => {
    if (isCoolingDown) return;
    setState('idle');
    setImage(null);
    setAnalysisResult(null);
    setError(null);
    setImageQueue([]);
  }, [isCoolingDown]);

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
    isCoolingDown,
    cooldownTime,
    startScan,
    handleImageCapture,
    handleMultipleImages,
    analyzeNext,
    restart,
  };
};
