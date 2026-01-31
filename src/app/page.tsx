'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Header } from '@/components/layout/header';
import { LiveAlertsTicker } from '@/components/medilens/live-alerts-ticker';
import { AnalysisResults } from '@/components/medilens/analysis-results';
import { performAnalysis } from '@/app/actions';
import type { AnalysisResult } from '@/lib/types';

const searchSchema = z.object({
  query: z.string().min(3, {
    message: 'Search query must be at least 3 characters.',
  }),
});

export default function Home() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof searchSchema>>({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      query: '',
    },
  });

  async function onSubmit(values: z.infer<typeof searchSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const analysisResult = await performAnalysis(values.query);
      setResult(analysisResult);
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 w-full">
        <div className="container mx-auto px-4 py-8 md:py-16 text-center flex flex-col items-center">
          <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tighter mb-4">
            Verify Your Medicine
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8">
            Enter a medicine's name or batch number to analyze its authenticity against global databases.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full max-w-lg space-y-4">
              <FormField
                control={form.control}
                name="query"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="e.g., Combiflam, Batch A123"
                          className="pl-10 h-12 text-lg"
                          {...field}
                          disabled={isLoading}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" size="lg" className="w-full text-lg" disabled={isLoading}>
                {isLoading ? 'Analyzing...' : 'Analyze Medicine'}
              </Button>
            </form>
          </Form>

          <div className="w-full max-w-4xl mt-12">
            <AnalysisResults result={result} isLoading={isLoading} error={error} />
          </div>
        </div>
      </main>
      <LiveAlertsTicker />
    </div>
  );
}
