'use client';

import { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, Calendar, CheckSquare, Cpu, FileText, Sun, Moon } from 'lucide-react';
import Notification, { useNotification } from '../components/Notification';
import ProfileAvatar from '../components/ProfileAvatar';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  const { user, profile, session, signOut, loading, role: userRole } = useAuth();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  // Gérer le thème au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);

    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Fonction pour basculer le thème
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  // Rediriger vers login si pas connecté
  useEffect(() => {
    if (loading) return;

    if (!session || !user || !profile) {
      router.replace("/login");
      return;
    }
  }, [user, profile, session, loading, router]);

  // Calculer les informations utilisateur depuis le profil Supabase
  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : user?.email?.split('@')[0] || "Utilisateur";
  const username = user?.email?.split('@')[0] || "user";
  const role = userRole;

  // Ferme le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = async () => {
    await signOut();
    showNotification('success', 'Déconnexion', 'Vous avez été déconnecté avec succès.');
    setTimeout(() => {
      router.replace("/login");
    }, 1500);
  };

  // Afficher le loader pendant le chargement
  if (loading || !profile) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#0f0d1a] via-[#1a1628] to-[#1a0f2a] flex items-center justify-center">
        <div className="text-xl text-white animate-pulse">Chargement du menu...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8 relative">
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

      {/* Bulle utilisateur en haut à droite */}
      <div className="absolute top-5 right-7 flex items-center gap-3 z-20">
        <ProfileAvatar
          fullName={fullName}
          size="lg"
          onClick={() => setShowUserMenu(v => !v)}
          showUploadButton={false}
        />

        {showUserMenu && (
          <div
            ref={menuRef}
            className="absolute top-20 right-0 bg-white/40 dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-72 border border-gray-200/50 dark:border-white/10 z-[9999] animate-in slide-in-from-top-2 duration-300"
          >
            {/* Header avec avatar */}
            <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
              <ProfileAvatar
                fullName={fullName}
                size="md"
                showUploadButton={true}
              />
              <div className="flex-1">
                <div className="text-lg font-bold text-gray-800 dark:text-white">{fullName || "Utilisateur"}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{username}</div>
              </div>
            </div>

            {/* Informations utilisateur */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 dark:bg-[#8c68d8]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600 dark:text-[#8c68d8]" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Rôle</div>
                  <div className="text-gray-800 dark:text-white font-medium">{role === "admin" ? "Administrateur" : "Utilisateur"}</div>
                </div>
              </div>

              {/* Section thème */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 dark:bg-blue-500/20 flex items-center justify-center">
                  {isDarkMode ? (
                    <Moon className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                  ) : (
                    <Sun className="w-4 h-4 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Thème</div>
                  <div className="text-gray-800 dark:text-white font-medium">
                    {isDarkMode ? "Mode sombre" : "Mode clair"}
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                    isDarkMode 
                      ? 'bg-blue-500 focus:ring-blue-300' 
                      : 'bg-yellow-400 focus:ring-yellow-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center ${
                      isDarkMode 
                        ? 'translate-x-6 bg-gray-800' 
                        : 'translate-x-0.5 bg-white'
                    }`}
                  >
                    {isDarkMode ? (
                      <Moon className="w-3 h-3 text-blue-400" />
                    ) : (
                      <Sun className="w-3 h-3 text-yellow-600" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* Bouton déconnexion */}
            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl px-4 py-3 font-semibold transition-all duration-300 cursor-pointer flex items-center justify-center gap-3 shadow-lg hover:shadow-red-500/25 hover:scale-105"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        )}
      </div>

      {/* Boutons de navigation en haut */}
      <div className="flex gap-2 mb-8 self-start">
        {role === "admin" && (
          <>
            <button
              onClick={() => router.push('/patch-notes')}
              className="group relative overflow-hidden bg-gradient-to-r from-blue-500/10 to-purple-500/10 dark:from-blue-600/20 dark:to-purple-600/20 border-2 border-blue-500/30 dark:border-[#8c68d8]/40 text-blue-700 dark:text-[#8c68d8] font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-blue-500/25 dark:hover:shadow-[#8c68d8]/25 hover:scale-105 transition-all duration-300 cursor-pointer flex items-center gap-2 backdrop-blur-sm hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 dark:hover:from-blue-600/30 dark:hover:to-purple-600/30"
            >
              <div className="relative z-10 flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow-inner">
                  <FileText className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-sm">Patch Notes</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 dark:from-blue-600/10 dark:to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            <button
              onClick={() => router.push('/roles')}
              className="group relative overflow-hidden bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-600/20 dark:to-teal-600/20 border-2 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400 font-semibold py-2 px-4 rounded-xl shadow-lg hover:shadow-emerald-500/25 dark:hover:shadow-emerald-500/25 hover:scale-105 transition-all duration-300 cursor-pointer flex items-center gap-2 backdrop-blur-sm hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-teal-500/20 dark:hover:from-emerald-600/30 dark:hover:to-teal-600/30"
            >
              <div className="relative z-10 flex items-center gap-2">
                <div className="w-5 h-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md flex items-center justify-center shadow-inner">
                  <Settings className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-sm">Gestion des Rôles</span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-600/10 dark:to-teal-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </>
        )}
      </div>

      {/* Contenu principal */}
      <div className="flex flex-col items-center justify-center flex-1 relative z-10">
        <h1 className="text-4xl font-bold mb-10 text-center">
          Menu Principal <span className="text-blue-600 dark:text-[#8c68d8]">ARP</span>
        </h1>

        {/* Boutons en rangées de 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl mx-auto">
          {/* Boutons Admin uniquement */}
          {role === "admin" && (
            <>
              <button
                onClick={() => router.push('/machines')}
                className="border-2 border-gray-800 dark:border-white bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm text-gray-800 dark:text-white font-semibold py-8 px-6 rounded-2xl shadow-xl text-lg hover:bg-blue-200/50 dark:hover:bg-white/10 hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 group"
              >
                <Cpu className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span>Analyse Machines</span>
              </button>
            </>
          )}

          {/* Boutons Admin et User */}
          <button
            onClick={() => router.push('/gantt')}
            className="border-2 border-gray-800 dark:border-white bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm text-gray-800 dark:text-white font-semibold py-8 px-6 rounded-2xl shadow-xl text-lg hover:bg-blue-200/50 dark:hover:bg-white/10 hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 group"
          >
            <Calendar className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span>Gantt</span>
          </button>

          <button
            onClick={() => router.push('/todo')}
            className="border-2 border-gray-800 dark:border-white bg-blue-100/50 dark:bg-white/5 backdrop-blur-sm text-gray-800 dark:text-white font-semibold py-8 px-6 rounded-2xl shadow-xl text-lg hover:bg-blue-200/50 dark:hover:bg-white/10 hover:scale-105 transition-all duration-300 cursor-pointer flex flex-col items-center gap-3 group"
          >
            <CheckSquare className="w-8 h-8 group-hover:scale-110 transition-transform" />
            <span>To-Do</span>
          </button>

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
  );
} 