'use client';
import { Suspense } from 'react';
import DurianFruitClient from './DurianFruitClient';

export default function DurianFruitPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-lime-500"></div>
      </div>
    }>
      <DurianFruitClient />
    </Suspense>
  );
}
