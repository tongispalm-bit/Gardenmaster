import { Suspense } from 'react';
import HospitalHistoryClient from './HospitalHistoryClient';

export default function HospitalHistoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-rose-500"></div>
    </div>}>
      <HospitalHistoryClient />
    </Suspense>
  );
}
