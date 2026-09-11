'use client';

import React from 'react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf9f7] text-[#1a1c1b] p-6 text-center">
      <h2 className="text-xl font-bold text-[#954a00] mb-2">Algo deu errado</h2>
      <p className="text-xs text-[#574335] mb-4">{error?.message || 'Ocorreu um erro inesperado na aplicação.'}</p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-[#954a00] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#713700] transition-colors cursor-pointer"
      >
        Tentar novamente
      </button>
    </div>
  );
}
