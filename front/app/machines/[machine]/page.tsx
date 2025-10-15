'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LogOut, User, Sun, Moon, Calendar, CheckSquare, Package, BarChart3, FileSpreadsheet, LayoutDashboard, Cpu, TrendingUp, Calculator } from 'lucide-react';
import Notification, { useNotification } from '../../components/Notification';
import HamburgerMenu from '../../components/HamburgerMenu';
import ProfileAvatar from '../../components/ProfileAvatar';
import Statistiques from './onglets/statistiques';
import CoutDeRevient from './onglets/coutderevient';

export default function MachinePage() {
  const { machine } = useParams();
  const machineName = decodeURIComponent(machine as string);
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  const [role, setRole] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [fullName, setFullName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [onglet, setOnglet] = useState<'statistiques' | 'cout'>('statistiques');
  
  const menuRef = useRef<HTMLDivElement>(null);

  // Gérer le thème au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

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

  // Fonction pour basculer le thème
  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    showNotification('success', 'Déconnexion', 'Vous avez été déconnecté avec succès.');
    setTimeout(() => {
      router.replace("/login");
    }, 1500);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification('error', 'Accès refusé', 'Vous devez être connecté pour accéder à cette page.');
      router.replace("/login");
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) throw new Error();
      const user = await res.json();
      setRole(user.is_superuser ? "admin" : "user");
      setFullName(`${user.first_name} ${user.last_name}`.trim());
      setUsername(user.username);
      setChecking(false);
      
      if (!user.is_superuser) {
        showNotification('error', 'Accès refusé', 'Vous devez être administrateur pour accéder à cette page.');
        router.replace('/dashboard');
        return;
      }
    })
    .catch(() => {
      showNotification('error', 'Erreur de session', 'Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    });
  }, [router, showNotification]);

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] flex items-center justify-center">
        <div className="text-xl text-gray-800 dark:text-white animate-pulse">Vérification de l'authentification...</div>
      </main>
    );
  }

  if (!role || role !== "admin") {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8 relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '6s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-32 h-32 bg-blue-500/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '8s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-blue-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '10s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-28 h-28 bg-blue-400/12 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s', animationDuration: '7s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-44 h-44 bg-blue-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '9s' }}></div>

        <div className="absolute top-1/4 left-1/4 w-40 h-40 bg-[#7f49e8]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '0s', animationDuration: '6s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-32 h-32 bg-[#8c68d8]/15 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '1s', animationDuration: '8s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-[#7a5bc4]/8 rounded-full blur-2xl animate-pulse dark:block hidden" style={{ animationDelay: '2s', animationDuration: '10s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-28 h-28 bg-[#9d7ce8]/12 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '3s', animationDuration: '7s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-44 h-44 bg-[#6b46c1]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '4s', animationDuration: '9s' }}></div>
      </div>

      {/* Menu utilisateur en haut à droite */}
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

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Menu de navigation */}
        <div className="mb-8">
          <HamburgerMenu
            items={[
              { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
              { label: "Gantt", href: "/gantt", icon: <Calendar className="w-4 h-4" /> },
              { label: "To-Do", href: "/todo", icon: <CheckSquare className="w-4 h-4" /> },
              { label: "Analyse Financière", href: "/analyse-financiere", icon: <BarChart3 className="w-4 h-4" /> },
              { label: "Suivi Sous-Traitance", href: "/sous-traitance", icon: <Package className="w-4 h-4" /> },
              { label: "Analyse Machines", href: "/machines", icon: <Cpu className="w-4 h-4" /> },
              { label: "Intégration Solune", href: "/integration-solune", icon: <FileSpreadsheet className="w-4 h-4" /> },
            ]}
          />
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-extrabold mb-4 text-gray-800 dark:text-white">
            {machineName.charAt(0).toUpperCase() + machineName.slice(1).replace(/-/g, ' ')}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Analyse détaillée et gestion de la machine
          </p>
        </div>

        {/* Onglets */}
        <div className="flex justify-center mb-12 gap-4">
          <button
            onClick={() => setOnglet('statistiques')}
            className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 cursor-pointer ${
              onglet === 'statistiques' 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-xl scale-105' 
                : 'bg-blue-100/50 dark:bg-white/5 text-gray-800 dark:text-white border-2 border-gray-800 dark:border-white hover:bg-blue-200/50 dark:hover:bg-white/10'
            }`}
          >
            <TrendingUp className={`w-6 h-6 transition-transform ${onglet === 'statistiques' ? 'scale-110' : 'group-hover:scale-110'}`} />
            Statistiques
          </button>

          <button
            onClick={() => setOnglet('cout')}
            className={`group flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 cursor-pointer ${
              onglet === 'cout' 
                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-xl scale-105' 
                : 'bg-blue-100/50 dark:bg-white/5 text-gray-800 dark:text-white border-2 border-gray-800 dark:border-white hover:bg-blue-200/50 dark:hover:bg-white/10'
            }`}
          >
            <Calculator className={`w-6 h-6 transition-transform ${onglet === 'cout' ? 'scale-110' : 'group-hover:scale-110'}`} />
            Coût de revient
          </button>
        </div>

        {/* Contenu des onglets */}
        <div className="relative z-10">
          {onglet === 'statistiques' && <Statistiques machineName={machineName} />}
          {onglet === 'cout' && <CoutDeRevient machineName={machineName} />}
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
