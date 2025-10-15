'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ArrowLeft, Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, Loader, X, LayoutDashboard, Sun, Moon, LogOut, User, Calendar, BarChart3, Package, Cpu, TrendingUp, CheckSquare } from 'lucide-react';
import Notification, { useNotification } from '../components/Notification';
import ProfileAvatar from '../components/ProfileAvatar';

type ProcessedFile = {
  filename: string;
  commande: string;
  data: any[];
  row_count: number;
};

type ProcessingResult = {
  success: boolean;
  message: string;
  results: ProcessedFile[];
};

type MenuItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  description?: string;
};

type HamburgerMenuProps = {
  items: MenuItem[];
  className?: string;
};

// Hook personnalisé pour la gestion de l'authentification
const useAuth = () => {
  const router = useRouter();
  const { showNotification } = useNotification();
  const [user, setUser] = useState<{
    fullName: string;
    username: string;
    role: string | null;
  }>({ fullName: '', username: '', role: null });

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) throw new Error();
      const userData = await res.json();
      setUser({
        role: userData.is_superuser ? "admin" : "user",
        fullName: `${userData.first_name} ${userData.last_name}`.trim(),
        username: userData.username
      });
    })
    .catch(() => {
      showNotification('error', 'Erreur', 'Session expirée. Veuillez vous reconnecter.');
      setTimeout(() => router.push('/login'), 1500);
    });
  }, [router, showNotification]);

  return user;
};

// Hook personnalisé pour la gestion du thème
const useTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  const toggleTheme = useCallback(() => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newDarkMode);
  }, [isDarkMode]);

  return { isDarkMode, toggleTheme };
};

// Hook personnalisé pour les appels API
const useApiCall = (showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string) => void) => {
  const router = useRouter();

  const makeApiCall = useCallback(async (
    url: string, 
    options: RequestInit = {},
    showErrorNotification = true
  ) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      showNotification('error', 'Erreur', 'Token d\'authentification manquant. Veuillez vous reconnecter.');
      return null;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        showNotification('error', 'Session expirée', 'Votre session a expiré. Veuillez vous reconnecter.');
        setTimeout(() => router.push('/login'), 1500);
        return null;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Erreur ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      if (showErrorNotification) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors de l\'appel API';
        showNotification('error', 'Erreur', errorMessage);
      }
      throw error;
    }
  }, [showNotification, router]);

  return { makeApiCall };
};

// Composant HamburgerMenu intégré
function HamburgerMenu({ items, className }: HamburgerMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = !!containerRef.current && containerRef.current.contains(target);
      const insidePanel = !!panelRef.current && panelRef.current.contains(target);
      if (insideButton || insidePanel) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      {!open && (
      <button
        aria-label="Ouvrir le menu"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-white/10 backdrop-blur text-gray-800 dark:text-white hover:bg-white/20 transition"
      >
        <span className="sr-only">Menu</span>
        <div className="flex flex-col gap-1.5">
          <span className="block h-0.5 w-6 bg-current"></span>
          <span className="block h-0.5 w-6 bg-current"></span>
          <span className="block h-0.5 w-6 bg-current"></span>
        </div>
      </button>
      )}

      {mounted && open && createPortal(
        <>
          <div
            className="fixed inset-0 z-[2147483645] bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <nav ref={panelRef} className="fixed top-0 left-0 z-[2147483646] h-screen w-72 border-r border-white/20 bg-white/10 backdrop-blur p-4 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">Navigation</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:bg-white/20"
                aria-label="Fermer le menu"
              >
                Fermer
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 hover:bg-white/20 cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      router.push(item.href);
                      setOpen(false);
                    }}
                  >
                    {item.icon && <span className="text-gray-700 dark:text-gray-200">{item.icon}</span>}
                    <div className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-gray-600 dark:text-gray-400">{item.description}</span>
                      )}
                    </div>
                  </a>
                </li>
              ))}
            </ul>
            <div className="pt-2 text-[11px] text-gray-600 dark:text-gray-400">© ARP</div>
          </nav>
        </>,
        document.body
      )}
    </div>
  );
}

export default function IntegrationSolunePage() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  const { makeApiCall } = useApiCall(showNotification);
  const user = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [processingResults, setProcessingResults] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu utilisateur si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    showNotification('success', 'Déconnexion', 'Vous avez été déconnecté avec succès.');
    setTimeout(() => {
      router.push("/login");
    }, 1500);
  }, [showNotification, router]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(files);
    setError('');
  }, []);

  const processFiles = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      showNotification('error', 'Erreur', 'Veuillez sélectionner au moins un fichier');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await makeApiCall(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/solune/upload-files`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response) return;

      const result: ProcessingResult = await response.json();
      setProcessingResults(result.results);
      setShowInstructions(false);
      
      // Afficher la notification immédiatement
      showNotification('success', 'Succès', `${result.results.length} fichier(s) traité(s) avec succès`);

    } catch (error) {
      console.error('Erreur lors du traitement des fichiers:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du traitement des fichiers';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [uploadedFiles, makeApiCall, showNotification]);

  const downloadFile = useCallback(async (blob: Blob, filename: string, successMessage: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    // Afficher la notification immédiatement
    showNotification('success', 'Téléchargement', successMessage);
  }, [showNotification]);

  const downloadCSV = useCallback(async (fileData: ProcessedFile) => {
    try {
      const response = await makeApiCall(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/solune/download-csv`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileData.commande,
            data: fileData.data
          })
        }
      );

      if (!response) return;

      const blob = await response.blob();
      await downloadFile(blob, `${fileData.commande}.csv`, `Fichier ${fileData.commande}.csv téléchargé avec succès`);

    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  }, [makeApiCall, downloadFile]);

  const downloadCSVDirect = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await makeApiCall(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/solune/download-csv-direct`,
        {
          method: 'POST',
          body: formData
        }
      );

      if (!response) return;

      const blob = await response.blob();
      const filename = `${file.name.replace(/\.[^/.]+$/, "")}.csv`;
      await downloadFile(blob, filename, 'Fichier traité et téléchargé avec succès');

    } catch (error) {
      console.error('Erreur lors du téléchargement direct:', error);
    }
  }, [makeApiCall, downloadFile]);

  const clearResults = useCallback(() => {
    setProcessingResults([]);
    setUploadedFiles([]);
    setShowInstructions(true);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Mémoriser les éléments du menu
  const menuItems = useMemo(() => [
    { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Gantt", href: "/gantt", icon: <Calendar className="w-4 h-4" /> },
    { label: "To-Do", href: "/todo", icon: <CheckSquare className="w-4 h-4" /> },
    { label: "Analyse Financière", href: "/analyse-financiere", icon: <BarChart3 className="w-4 h-4" /> },
    { label: "Suivi Sous-Traitance", href: "/sous-traitance", icon: <Package className="w-4 h-4" /> },
    { label: "Analyse Machines", href: "/machines", icon: <Cpu className="w-4 h-4" /> },
    { label: "Intégration Solune", href: "/integration-solune", icon: <FileSpreadsheet className="w-4 h-4" /> },
  ], []);


  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8 relative">
      {/* Fond animé */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 dark:bg-[#7f49e8]/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-blue-500/15 dark:bg-[#8c68d8]/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-600/8 dark:bg-[#7a5bc4]/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-blue-500/10 dark:bg-[#a855f7]/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-blue-600/12 dark:bg-[#9333ea]/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '7s' }}></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <HamburgerMenu items={menuItems} />

        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-blue-600 dark:text-purple-400 absolute left-1/2 transform -translate-x-1/2">
          <FileSpreadsheet className="w-8 h-8" />
          Intégration Solune
        </h1>
        
        <div className="flex items-center gap-3 relative z-[10000]" ref={userMenuRef}>
          <ProfileAvatar
            fullName={user.fullName}
            size="lg"
            onClick={() => setShowUserMenu(v => !v)}
            showUploadButton={false}
          />

          {showUserMenu && (
            <div className="absolute top-20 right-0 bg-white/40 dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-72 border border-gray-200/50 dark:border-white/10 z-[9999] animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
                <ProfileAvatar
                  fullName={user.fullName}
                  size="md"
                  showUploadButton={true}
                />
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-800 dark:text-white">{user.fullName || "Utilisateur"}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{user.username}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/60 dark:bg-white/5 border border-gray-200/50 dark:border-white/10">
                  <div className="w-8 h-8 rounded-full bg-blue-600/20 dark:bg-[#8c68d8]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-blue-600 dark:text-[#8c68d8]" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Rôle</div>
                    <div className="text-gray-800 dark:text-white font-medium">{user.role === "admin" ? "Administrateur" : "Utilisateur"}</div>
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
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Instructions Section */}
        {showInstructions && (
          <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-8 mb-8 shadow-xl border border-gray-200/50 dark:border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-[#8c68d8] dark:to-[#7a5bc4] flex items-center justify-center shadow-lg">
                <FileSpreadsheet className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Instructions</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Guide de traitement des fichiers</p>
              </div>
            </div>
            
            <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/30 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Fichiers Excel :</strong> Si le fichier ne se traite pas, téléchargez-le en format .xlsx dans Excel
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        Actuel problème d'encodage à résoudre, mais honnêtement compliqué
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Zone de dépôt de fichiers */}
            <div className="relative">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="block cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              >
                <div className={`
                  relative overflow-hidden rounded-xl border-2 border-dashed transition-all duration-300
                  ${uploadedFiles.length > 0 
                    ? 'border-green-500/50 bg-green-500/10 dark:bg-green-500/5' 
                    : 'border-gray-400 dark:border-gray-600 hover:border-blue-500/50 bg-gray-100/50 dark:bg-white/5 hover:bg-blue-100/50 dark:hover:bg-blue-500/10'
                  }
                  p-12 text-center group
                `}>
                  
                  <div className={`text-6xl mb-6 transition-all duration-300 ${
                    uploadedFiles.length > 0 ? 'scale-100' : 'group-hover:scale-110'
                  }`}>
                    {uploadedFiles.length > 0 ? (
                      <CheckCircle className="w-16 h-16 text-green-500 dark:text-green-400 mx-auto" />
                    ) : (
                      <Upload className="w-16 h-16 text-blue-500 dark:text-blue-400 mx-auto" />
                    )}
                  </div>
                  
                  <div className={`text-xl font-semibold mb-3 transition-colors duration-300 ${
                    uploadedFiles.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-800 dark:text-white'
                  }`}>
                    {uploadedFiles.length > 0 
                      ? `${uploadedFiles.length} fichier(s) sélectionné(s)` 
                      : 'Déposez vos fichiers Excel'
                    }
                  </div>
                  
                  <div className={`text-sm mb-4 transition-colors duration-300 ${
                    uploadedFiles.length > 0 ? 'text-green-600 dark:text-green-300' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {uploadedFiles.length > 0 
                      ? uploadedFiles.map(f => f.name).join(', ')
                      : 'Glissez-déposez ou cliquez pour parcourir'
                    }
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                    <div>Formats acceptés : .xlsx, .csv</div>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                </div>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={processFiles}
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 dark:from-[#8c68d8] dark:to-[#7a5bc4] hover:from-blue-600 hover:to-blue-700 dark:hover:from-[#7a5bc4] dark:hover:to-[#6b46c1] disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:cursor-not-allowed cursor-pointer flex items-center gap-3"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-5 h-5" />
                      Traiter les fichiers
                    </>
                  )}
                </button>
                <button
                  onClick={clearResults}
                  className="bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center gap-2 border border-gray-200 dark:border-white/20"
                >
                  <X className="w-5 h-5" />
                  Annuler
                </button>
              </div>
            )}
          </div>
        )}

        {/* Résultats */}
        {processingResults.length > 0 && (
          <div className="bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-8 mb-8 shadow-xl border border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-600 dark:to-green-700 flex items-center justify-center shadow-lg">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Fichiers traités</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{processingResults.length} fichier(s) traité(s) avec succès</p>
                </div>
              </div>
              <button
                onClick={clearResults}
                className="bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 text-gray-800 dark:text-white px-6 py-2 rounded-lg transition-all cursor-pointer border border-gray-200 dark:border-white/20 font-medium"
              >
                Nouveau traitement
              </button>
            </div>

            <div className="space-y-6">
              {processingResults.map((result, index) => (
                <div key={index} className="bg-white/60 dark:bg-white/5 rounded-xl p-6 border border-gray-200/50 dark:border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                      {result.filename}
                    </h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-lg">
                      {result.row_count} ligne(s)
                    </div>
                  </div>

                  {/* Aperçu des données */}
                  <div className="mb-4 overflow-x-auto">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Aperçu du fichier traité :</h4>
                    <div className="bg-gray-50 dark:bg-black/20 rounded-lg p-4 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-300 dark:border-gray-600">
                            {Object.keys(result.data[0] || {}).map((header, i) => (
                              <th key={i} className="text-left p-2 text-gray-700 dark:text-gray-300 font-semibold whitespace-nowrap">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.data.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-b border-gray-200 dark:border-gray-700/50">
                              {Object.values(row).map((cell, j) => (
                                <td key={j} className="p-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  {String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {result.data.length > 5 && (
                        <div className="text-xs text-gray-500 dark:text-gray-500 text-center mt-3">
                          ... et {result.data.length - 5} ligne(s) supplémentaire(s)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bouton de téléchargement direct (style vert) */}
                  <div className="flex justify-center">
                    <button
                      onClick={() => {
                        const file = uploadedFiles.find(f => f.name === result.filename);
                        if (file) downloadCSVDirect(file);
                      }}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer flex items-center gap-3"
                    >
                      <Download className="w-5 h-5" />
                      Télécharger {result.commande}.csv
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
