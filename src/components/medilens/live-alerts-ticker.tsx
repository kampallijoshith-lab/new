'use client';

import { AlertTriangle } from 'lucide-react';
import { useMemo } from 'react';

const alerts = [
  { medicine: 'CoughSys', batch: 'CS-9812', location: 'Nigeria', date: '2025-03-15' },
  { medicine: 'PainOff', batch: 'PO-4567', location: 'India', date: '2025-03-12' },
  { medicine: 'FeverGo', batch: 'FG-2201', location: 'Brazil', date: '2025-03-10' },
  { medicine: 'VitaBoost', batch: 'VB-7890', location: 'Vietnam', date: '2025-03-08' },
  { medicine: 'HeartHelp', batch: 'HH-5543', location: 'USA', date: '2025-03-05' },
  { medicine: 'AllerFree', batch: 'AF-1122', location: 'EU', date: '2025-03-01' },
  { medicine: 'SleepWell', batch: 'SW-8877', location: 'Canada', date: '2024-12-20' },
  { medicine: 'FluGone', batch: 'FLG-3344', location: 'Australia', date: '2024-11-05' },
];

const TickerItem = ({ alert }: { alert: (typeof alerts)[0] }) => (
  <div className="flex items-center gap-4 mx-6 text-sm">
    <AlertTriangle className="h-4 w-4 text-accent" />
    <div className="flex items-center gap-2">
      <span className="font-semibold">{alert.medicine}</span>
      <span className="text-muted-foreground">({alert.batch})</span>
    </div>
    <span className="font-bold text-accent-foreground/80 bg-accent/20 px-2 py-0.5 rounded-full">{alert.location}</span>
    <span className="text-muted-foreground">{alert.date}</span>
  </div>
);

export function LiveAlertsTicker() {
  const duplicatedAlerts = useMemo(() => [...alerts, ...alerts], []);

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-card border-t flex items-center overflow-hidden">
      <style jsx>{`
        .animate-ticker {
          animation: ticker 60s linear infinite;
        }
        @keyframes ticker {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
      <div className="flex whitespace-nowrap animate-ticker">
        {duplicatedAlerts.map((alert, index) => (
          <TickerItem key={index} alert={alert} />
        ))}
      </div>
    </div>
  );
}
