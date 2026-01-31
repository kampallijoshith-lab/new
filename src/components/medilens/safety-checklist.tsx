import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const checklistItems = [
  'Verify packaging integrity; look for tears, damage, or unusual materials.',
  'Check for spelling errors or poor-quality printing on the label and box.',
  'Ensure all safety seals (box glue, bottle cap seal) are present and intact.',
  'Compare the tablet or capsule appearance (color, size, shape) with a known genuine product.',
  'Confirm the expiration date is clearly printed and has not passed.',
  'Check that the manufacturer and country of origin details are correct.',
];

export function SafetyChecklist() {
  return (
    <Card className="animate-in fade-in-50">
      <CardHeader className="text-left">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <CardTitle className="font-headline text-2xl">No Direct Threats Found</CardTitle>
        </div>
        <CardDescription>
          Our analysis did not find this medicine in counterfeit databases. However, always perform a manual safety check.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-left">
        <h4 className="font-semibold mb-4">Physical Inspection Checklist:</h4>
        <ul className="space-y-3">
          {checklistItems.map((item, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-muted-foreground font-semibold">
          If you notice any discrepancies or have doubts, consult a pharmacist or doctor before use.
        </p>
      </CardContent>
    </Card>
  );
}
