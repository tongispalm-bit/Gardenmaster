'use client';

import { Suspense } from 'react';
import ComingSoonClient from '../_components/ComingSoonClient';
import { Stethoscope } from 'lucide-react';

export default function HospitalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
      </div>
    }>
      <ComingSoonClient
        tabId="hospital"
        title="ห้องพยาบาล"
        Icon={Stethoscope}
        accentClass="text-red-500"
      />
    </Suspense>
  );
}
