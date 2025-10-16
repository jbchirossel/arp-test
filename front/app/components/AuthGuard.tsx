'use client';

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireApproved?: boolean;
  requireAdmin?: boolean;
}

export default function AuthGuard({
  children,
  requireAuth = false,
  requireApproved = false,
  requireAdmin = false,
}: AuthGuardProps) {
  const { user, profile, loading, isAdmin, isPending, isApproved } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPages = ['/login', '/register', '/pending-approval'];
  const isPublicPage = publicPages.includes(pathname);

  useEffect(() => {
    if (loading) return;

    // Si pas connecté et que la page nécessite une auth
    if (!user && requireAuth && !isPublicPage) {
      router.push('/login');
      return;
    }

    // Si connecté
    if (user && profile) {
      // Si rejeté, déconnecter et rediriger
      if (profile.status === 'rejected' && pathname !== '/login') {
        alert('Votre demande d\'accès a été refusée. Veuillez contacter un administrateur.');
        router.push('/login');
        return;
      }

      // Si en attente et pas sur la page d'attente
      if (isPending && pathname !== '/pending-approval') {
        router.push('/pending-approval');
        return;
      }

      // Si approuvé et sur la page d'attente, rediriger vers dashboard
      if (isApproved && pathname === '/pending-approval') {
        router.push('/dashboard');
        return;
      }

      // Si la page nécessite d'être approuvé
      if (requireApproved && !isApproved && pathname !== '/pending-approval') {
        router.push('/pending-approval');
        return;
      }

      // Si la page nécessite d'être admin
      if (requireAdmin && !isAdmin) {
        router.push('/dashboard');
        return;
      }

      // Si connecté et approuvé, ne pas rester sur login/register
      if (isApproved && (pathname === '/login' || pathname === '/register')) {
        router.push('/dashboard');
        return;
      }
    }
  }, [user, profile, loading, pathname, router, requireAuth, requireApproved, requireAdmin, isAdmin, isPending, isApproved]);

  // Afficher le loader pendant la vérification
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-[#8c68d8]" />
      </div>
    );
  }

  return <>{children}</>;
}
