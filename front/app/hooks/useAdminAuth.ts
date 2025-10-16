'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook pour protéger les pages admin
 * Redirige vers /login si non connecté
 * Redirige vers /dashboard si pas admin
 */
export function useAdminAuth() {
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) return;

    // Si pas connecté, rediriger vers login
    if (!user || !profile) {
      router.push('/login');
      return;
    }

    // Si connecté mais pas admin, rediriger vers dashboard
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [user, profile, loading, isAdmin, router]);

  return {
    isAdmin,
    loading,
    profile,
    user,
  };
}

