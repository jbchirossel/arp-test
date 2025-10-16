'use client';

import { useRouter } from "next/navigation";
import { ArrowLeft } from 'lucide-react';
import Notification, { useNotification } from '../components/Notification';
import AuthGuard from '../components/AuthGuard';

export default function PatchNotesPage() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  
  return (
    <AuthGuard requireAuth={true} requireApproved={true} requireAdmin={true}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8">
        <div className="max-w-5xl mx-auto">
          {/* Bouton Retour */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-purple-400 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au menu
            </button>
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-blue-600 dark:text-[#8c68d8] mb-2">📝 Patch Notes</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Cette section sera prochainement disponible.</p>
            <div className="inline-block px-4 py-2 bg-gray-700 rounded-lg text-white">En construction…</div>
          </div>
        </div>

        {/* Notification */}
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      </main>
    </AuthGuard>
  );
}
