'use client';

import { Suspense } from 'react';
import ChemicalStockClient from './ChemicalStockClient';

export default function ChemicalStockPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    }>
      <ChemicalStockClient />
    </Suspense>
  );
}
