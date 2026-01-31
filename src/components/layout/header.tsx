import { MedilensLogo } from '@/components/icons/medilens-logo';

export function Header() {
  return (
    <header className="py-4 px-4 md:px-6 border-b">
      <div className="container mx-auto flex items-center gap-3">
        <MedilensLogo className="h-8 w-8 text-primary" />
        <span className="font-headline text-2xl font-semibold tracking-tight">
          MediLens
        </span>
      </div>
    </header>
  );
}
