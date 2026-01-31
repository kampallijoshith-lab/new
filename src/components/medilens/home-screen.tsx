'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, ShieldCheck } from 'lucide-react';

interface HomeScreenProps {
  onScan: () => void;
}

const steps = [
  {
    icon: Camera,
    title: 'Snap',
    description: 'Take a clear photo of the medicine packaging, front and back.',
  },
  {
    icon: ShieldCheck,
    title: 'Analyze',
    description: 'Our AI analyzes the image against a global database of medicines.',
  },
  {
    icon: Upload,
    title: 'Verify',
    description: 'Get an instant verdict on the medicine\'s authenticity.',
  },
];

export default function HomeScreen({ onScan }: HomeScreenProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      // In a real app, you would read the file and pass it to the scanner
      // For now, just trigger the scan process
      onScan();
    }
  };


  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="font-headline text-4xl md:text-5xl font-bold tracking-tighter mb-4 text-foreground">
        AI-Powered Medicine Verification
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
        Instantly verify the authenticity of your medication in three simple steps.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 w-full max-w-4xl">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full h-16 w-16 mb-2">
              <step.icon className="w-8 h-8" />
            </div>
            <h3 className="font-headline text-xl font-semibold">{step.title}</h3>
            <p className="text-muted-foreground text-sm">{step.description}</p>
          </div>
        ))}
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
            <CardTitle>Start Verification</CardTitle>
            <CardDescription>Choose an option below to begin.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <Button size="lg" onClick={onScan}>
              <Camera className="mr-2" />
              Scan Medicine
            </Button>
            <Button size="lg" variant="secondary" onClick={handleUploadClick}>
              <Upload className="mr-2" />
              Upload Photo
            </Button>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
        </CardContent>
      </Card>
    </div>
  );
}
