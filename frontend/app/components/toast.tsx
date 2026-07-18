'use client';

import { useEffect } from 'react';
import { useAppState } from '@/app/hooks/use-app-state';
import { Check } from 'lucide-react';

export function Toast() {
  const { state, dispatch } = useAppState();
  const { toast } = state;

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch({ type: 'SET_TOAST', payload: null });
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 z-[70] flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium animate-[toastin_0.25s_ease]"
      style={{
        background: 'var(--foreground)',
        color: 'var(--background)',
        transform: 'translateX(-50%)',
      }}
    >
      <span className="grid place-content-center w-[18px] h-[18px] rounded-full bg-[var(--ok)]">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </span>
      {toast}
    </div>
  );
}
