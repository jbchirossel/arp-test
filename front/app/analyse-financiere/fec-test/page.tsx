'use client';

import Link from 'next/link';

export default function FecTestPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8 relative">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold mb-4">FEC Test</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          Page de test pour l'analyse FEC.
        </p>

        <Link
          href="/analyse-financiere"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-3 rounded-xl shadow-md transition-all duration-300"
        >
          ← Retour
        </Link>
      </div>
    </main>
  );
}


