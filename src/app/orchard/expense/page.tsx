'use client';

import { Suspense } from 'react';
import ExpenseClient from './ExpenseClient';

export default function ExpensePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    }>
      <ExpenseClient />
    </Suspense>
  );
}
