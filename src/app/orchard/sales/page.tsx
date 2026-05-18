'use client';

import { Suspense } from 'react';
import ComingSoonClient from '../_components/ComingSoonClient';
import { ShoppingCart } from 'lucide-react';

export default function SalesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
      </div>
    }>
      <ComingSoonClient
        tabId="sales"
        title="การซื้อขาย"
        Icon={ShoppingCart}
        accentClass="text-pink-500"
      />
    </Suspense>
  );
}
