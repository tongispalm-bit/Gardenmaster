'use client';

import { Suspense } from 'react';
import ComingSoonClient from '../_components/ComingSoonClient';
import { Wrench } from 'lucide-react';

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    }>
      <ComingSoonClient
        tabId="upgrade"
        title="ค่าปรับปรุง"
        Icon={Wrench}
        accentClass="text-orange-500"
      />
    </Suspense>
  );
}
