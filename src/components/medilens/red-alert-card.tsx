import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface RedAlertCardProps {
  details: {
    source: string;
    reason: string;
  }[];
  searchTerm: string;
}

export function RedAlertCard({ details, searchTerm }: RedAlertCardProps) {
  return (
    <Card className="border-accent bg-accent/10 text-accent-foreground animate-in fade-in-50">
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <AlertTriangle className="h-12 w-12 text-accent" />
        <div>
          <CardTitle className="font-headline text-2xl text-accent">Red Alert: Potential Risk Detected</CardTitle>
          <CardDescription className="text-accent-foreground/80">
            The medicine "{searchTerm}" has been flagged in one or more global databases.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 font-semibold">Do not use this product. It may be falsified, substandard, or dangerous.</p>
        <div className="space-y-4 rounded-lg bg-background/50 p-4">
          {details.map((detail, index) => (
            <div key={index}>
              <h4 className="font-semibold text-lg">{detail.source} Alert</h4>
              <p className="text-muted-foreground">{detail.reason}</p>
              {index < details.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-muted-foreground">
          <p className="font-bold">Next Steps:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Report this product to your national or regional health authority.</li>
            <li>Consult a healthcare professional for advice.</li>
            <li>Safely dispose of the product as per local guidelines.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
