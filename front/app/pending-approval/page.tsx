'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, Clock, Mail } from 'lucide-react';

export default function PendingApprovalPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si pas connecté, rediriger vers login
      if (!user) {
        router.push('/login');
        return;
      }

      // Si approuvé, rediriger vers dashboard
      if (profile?.status === 'approved') {
        router.push('/dashboard');
        return;
      }

      // Si rejeté, afficher un message et déconnecter
      if (profile?.status === 'rejected') {
        alert('Votre demande d\'accès a été refusée. Veuillez contacter un administrateur.');
        signOut();
        router.push('/login');
        return;
      }
    }
  }, [loading, user, profile, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-[#8c68d8]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
        {/* Icône animée */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 dark:bg-[#8c68d8] rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-blue-100 dark:bg-[#8c68d8]/20 p-6 rounded-full">
              <Clock className="w-12 h-12 text-blue-600 dark:text-[#8c68d8] animate-pulse" />
            </div>
          </div>
        </div>

        {/* Titre */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Compte en attente de validation
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Votre compte a été créé avec succès !
          <br />
          Un administrateur doit valider votre accès avant que vous puissiez utiliser la plateforme.
        </p>

        {/* Informations utilisateur */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Mail className="w-4 h-4" />
            <span className="font-medium">{profile?.email}</span>
          </div>
          {profile?.first_name && (
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {profile.first_name} {profile.last_name}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Vous recevrez une notification par email dès que votre compte sera validé.
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-3 bg-blue-600 dark:bg-[#8c68d8] text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-[#7f49e8] transition-colors"
          >
            Vérifier le statut
          </button>

          <button
            onClick={signOut}
            className="w-full px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Se déconnecter
          </button>
        </div>

        {/* Message d'aide */}
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          En cas de problème, contactez l'administrateur du site.
        </p>
      </div>
    </div>
  );
}
