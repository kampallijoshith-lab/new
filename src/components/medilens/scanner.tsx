'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

interface ScannerProps {
  handleImageCapture: (imageDataUrl: string) => void;
  onCancel: () => void;
}

export default function Scanner({ handleImageCapture, onCancel }: ScannerProps) {
  const [image, setImage] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getCameraPermission = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        setHasCameraPermission(true);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
      }
    };

    getCameraPermission();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        const dataUrl = canvas.toDataURL('image/png');
        setImage(dataUrl);
    }
  };

  const renderContent = () => {
    if (image) {
      return (
        <div className="relative w-full aspect-video rounded-md overflow-hidden border">
          <img src={image} alt="Medicine preview" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center gap-4">
             <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_2px_#ef4444] animate-laser-scan" />
          </div>
        </div>
      );
    }
    return (
      <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
        {hasCameraPermission === false && (
            <Alert variant="destructive" className="absolute bottom-4 left-4 right-4 w-auto">
              <AlertTitle>Camera Access Required</AlertTitle>
              <AlertDescription>
                Please allow camera access to use this feature.
              </AlertDescription>
            </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <h2 className="font-headline text-3xl font-bold">
        {image ? 'Confirm Image' : 'Scan Your Medicine'}
      </h2>
      
      {renderContent()}

      <canvas ref={canvasRef} className="hidden" />
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      
      <div className="w-full grid grid-cols-2 gap-4">
        {image ? (
          <>
            <Button variant="outline" onClick={() => setImage(null)}>Retake</Button>
            <Button onClick={() => handleImageCapture(image)}>Analyze Image</Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2"/> Upload
            </Button>
            <Button onClick={takePicture} disabled={!hasCameraPermission}>
              <Camera className="mr-2" /> Capture
            </Button>
          </>
        )}
      </div>
       <Button variant="ghost" onClick={onCancel} className="text-muted-foreground">
        <X className="mr-2" /> Cancel
      </Button>
    </div>
  );
}
