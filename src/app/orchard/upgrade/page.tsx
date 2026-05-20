'use client';

import { Suspense } from 'react';
import UpgradeClient from './UpgradeClient';

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    }>
      <UpgradeClient />
    </Suspense>
  );
}
