'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Notification, { useNotification } from '../components/Notification';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (!error) {
        showNotification('success', 'Connexion réussie !', 'Vous êtes maintenant connecté à votre compte ARP.');

        // Attendre un peu pour que le profil soit chargé
        setTimeout(async () => {
          // Vérifier le statut du profil après connexion
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('status')
              .eq('id', session.user.id)
              .single();

            // Rediriger selon le statut
            if (profile?.status === 'pending') {
              router.push('/pending-approval');
            } else if (profile?.status === 'approved') {
              router.push('/dashboard');
            } else if (profile?.status === 'rejected') {
              showNotification('error', 'Accès refusé', 'Votre demande d\'accès a été refusée. Contactez un administrateur.');
              await supabase.auth.signOut();
            } else {
              router.push('/dashboard');
            }
          }
        }, 1500);
      } else {
        showNotification('error', 'Erreur de connexion', error.message || 'Email ou mot de passe incorrect');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('error', 'Erreur', 'Une erreur est survenue lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] flex flex-col relative overflow-hidden">
      {/* Fond animé avec touches de bleu/violet */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Taches bleues pour le mode clair */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-blue-500/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-blue-400/12 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-blue-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
        
        {/* Taches violettes pour le mode sombre */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#7f49e8]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-[#8c68d8]/15 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[#7a5bc4]/8 rounded-full blur-2xl animate-pulse dark:block hidden" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-[#9d7ce8]/12 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-[#6b46c1]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
      </div>

      {/* HEADER */}
      <header className="flex justify-between items-center px-8 py-6 relative z-10">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-purple-400 transition"
        >
          <ArrowLeft className="w-4 h-4 text-current" />
          Retour
        </button>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <span className="text-3xl font-black text-blue-600 dark:text-purple-400 drop-shadow-xl tracking-wide">ARP</span>
            <span className="ml-2 px-2 py-1 bg-blue-600 dark:bg-purple-600 text-white rounded-lg text-xs tracking-widest shadow-lg">V2</span>
          </div>
        </div>
      </header>
      
      {/* BODY */}
      <main className="flex-1 flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl p-8 shadow-2xl border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Connexion</h1>
              <p className="text-gray-600 dark:text-gray-300">Accédez à votre espace de travail</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
                  placeholder="Entrez votre email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-3 bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30 pr-12"
                    placeholder="Entrez votre mot de passe"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-blue-600 dark:bg-purple-600 hover:bg-blue-700 dark:hover:bg-purple-700 disabled:bg-blue-800 dark:disabled:bg-purple-800 text-white font-bold rounded-xl shadow-lg transition cursor-pointer active:scale-95 transition-transform disabled:cursor-not-allowed"
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Pas encore de compte ?{' '}
                <button
                  onClick={() => router.push('/register')}
                  className="text-blue-600 dark:text-purple-400 hover:text-blue-700 dark:hover:text-purple-300 font-medium"
                >
                  Créer un compte
                </button>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      {/* FOOTER */}
      <footer className="py-4 text-center text-gray-500 text-sm opacity-80 relative z-10">
        © {new Date().getFullYear()} ARP — All rights reserved.
      </footer>

      {/* Notification */}
      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={hideNotification}
      />
    </div>
  );
} 