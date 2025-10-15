'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Edit3, Save, BarChart3, Users, Calendar, DollarSign, TrendingUp, FileText, Trash2, Download, Eye, EyeOff, Building2, Clock, User, Briefcase, Sun, LayoutDashboard, LogOut, Moon, CheckSquare, Square, Plus, X, RefreshCw, Search, Filter, ChevronDown, ChevronUp, Minus, Package, Cpu, FileSpreadsheet } from 'lucide-react';
import HamburgerMenu from "../../components/HamburgerMenu";
import Notification, { useNotification } from '../../components/Notification';
import ProfileAvatar from '../../components/ProfileAvatar';

// Types
type FECSegment = {
  titre: string;
  mois_annee: string;
  total: number;
  matieres_premieres?: number;
  sous_traitance?: number;
};

type FECCharge = {
  CompteLib: string;
  CompteNum: string;
  montant: number;
  mois_annee: string;
};

type FECResults = {
  production: FECSegment;
  achats_consommes: FECSegment;
  charges_directes: FECCharge[];
  charges_indirectes: FECCharge[];
  impots_et_taxes: FECCharge[];
  personnel_adm_hors_pro: FECCharge[];
  couts_salariaux: {
    mois_annee: string;
    personnel_production: number;
    charges_patronales_p: number;
    supplements_p?: number;
    personnel_adm: number;
    charges_patronales_hp: number;
    supplements_hp?: number;
    total_production: number;
    total_adm: number;
  };
  tresorerie?: {
    titre: string;
    mois_annee: string;
    total: number;
  };
};

type SavedAnalysis = {
  id: number;
  filename: string;
  upload_date: string;
  results: FECResults;
};

type Todo = {
  id: number;
  text: string;
  done: boolean;
  task_id?: number;
  user_id?: number;
  assigned_by?: string;
  created_at: string;
  updated_at: string;
  priority?: 'low' | 'medium' | 'high';
  due_date?: string;
  tags?: string[];
  task_title?: string;
  task_ensemble_id?: number;
  ensemble_name?: string;
  machine_name?: string;
};

// Composants UI modernes
function ModernCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color = "blue" }: { 
  title: string; 
  value: string; 
  icon: any; 
  color?: "blue" | "green" | "purple" | "orange" | "red" 
}) {
  const colorClasses = {
    blue: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    green: "text-green-400 bg-green-400/10 border-green-400/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    orange: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    red: "text-red-400 bg-red-400/10 border-red-400/20"
  };

  return (
    <div className="p-4 rounded-xl border bg-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

// Modale d'upload moderne
function ModernUploadModal({ open, onClose, onFileChosen }: { open: boolean; onClose: () => void; onFileChosen: (f: File) => void; }) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#1a1a1a] rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-full w-full sm:w-[480px] relative border border-white/10" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl transition-colors" onClick={onClose} aria-label="Fermer">×</button>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/20 rounded-xl">
            <Upload className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Importer un fichier FEC</h2>
            <p className="text-gray-400 text-sm">Sélectionnez un fichier Excel (.xlsx ou .xls)</p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileChosen(f); }}
          className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer focus:file:ring-2 focus:file:ring-blue-400 cursor-pointer transition mb-4"
        />
        <div className="text-xs text-gray-400 bg-white/5 p-3 rounded-lg">
          <strong>Formats acceptés :</strong> Excel (.xlsx, .xls)<br/>
          <strong>Contenu attendu :</strong> Fichier FEC avec colonnes CompteNum, CompteLib, Debit, Credit, EcritureDate
        </div>
      </div>
    </div>
  );
}

// Page principale
export default function AnalyseFECPage() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();

  // État principal
  const [fecData, setFecData] = useState<FECResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [editableValues, setEditableValues] = useState<Record<string, number>>({});
  const [editingField, setEditingField] = useState<string | null>(null);
  const [shouldStick, setShouldStick] = useState(false);
  const [fullName, setFullName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // États pour les todos
  const [showTodoMenu, setShowTodoMenu] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [loadingTodos, setLoadingTodos] = useState(false);
  const [taskTodosMap, setTaskTodosMap] = useState<Record<number, { id: number; text: string; done: boolean }[]>>({});
  const [loadingTaskTodos, setLoadingTaskTodos] = useState<Record<number, boolean>>({});
  const [taskWeeks, setTaskWeeks] = useState<Record<number, { start: number; end: number }>>({});
  const [collapsedCardIds, setCollapsedCardIds] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  
  const menuRef = useRef<HTMLDivElement>(null);
  const todoMenuRef = useRef<HTMLDivElement>(null);
  const [showKpi, setShowKpi] = useState(false);

  // KPI: Marge sur coût variable = Production - Achats consommés - Coûts directs + Personnel de production + Charges patronales P + VAR.CP
  const calculerMargeCoutVariable = (): number => {
    if (!fecData) return 0;
    const production = fecData.production?.total ?? 0;
    const achats = fecData.achats_consommes?.total ?? 0;

    // Total des charges directes (toutes)
    let totalChargesDirectes = 0;
    let varCp = 0;
    (fecData.charges_directes || []).forEach((c) => {
      const lib = (c.CompteLib || '').toUpperCase().trim();
      totalChargesDirectes += c.montant || 0;
      if (lib === 'VAR.CP') {
        varCp += c.montant || 0;
      }
    });

    const persoProd = fecData.couts_salariaux?.personnel_production ?? 0;
    const chargesPatP = fecData.couts_salariaux?.charges_patronales_p ?? 0;

    return production - achats - totalChargesDirectes + persoProd + chargesPatP + varCp;
  };

  const getVarCp = (): number => {
    if (!fecData) return 0;
    let varCp = 0;
    (fecData.charges_directes || []).forEach((c) => {
      const lib = (c.CompteLib || '').toUpperCase().trim();
      if (lib === 'VAR.CP') {
        varCp += c.montant || 0;
      }
    });
    return varCp;
  };

  // KPI: Marge brute = Production - Achats consommés
  const calculerMargeBrute = (): number => {
    if (!fecData) return 0;
    const production = fecData.production?.total ?? 0;
    const achats = fecData.achats_consommes?.total ?? 0;
    return production - achats;
  };

  // KPI: Taux de marge sur coût variable = MSCV / Production
  const calculerTauxMargeCoutVariable = (): number => {
    if (!fecData) return 0;
    const production = fecData.production?.total ?? 0;
    if (production === 0) return 0;
    return calculerMargeCoutVariable() / production;
  };

  // KPI: Taux de marge brute = Marge brute / Production
  const calculerTauxMargeBrute = (): number => {
    if (!fecData) return 0;
    const production = fecData.production?.total ?? 0;
    if (production === 0) return 0;
    return calculerMargeBrute() / production;
  };

  // KPI: Taux d'EBITDA = EBITDA / Production
  const calculerTauxEBITDA = (): number => {
    if (!fecData) return 0;
    const production = fecData.production?.total ?? 0;
    if (production === 0) return 0;
    return (calculerEBITDA() || 0) / production;
  };

  // KPI: Taux d'EBIT = Résultat d'exploitation / Production
  const calculerTauxEBIT = (): number => {
    if (!fecData) return 0;
    const production = fecData.production?.total ?? 0;
    if (production === 0) return 0;
    return (calculerResultatExploitation() || 0) / production;
  };

  // Helpers d'affichage KPI
  const formatPourcentage = (value: number) => `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} %`;

  // Config API
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Authentification et chargement initial
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      showNotification('error', 'Accès refusé', 'Vous devez être connecté pour accéder à cette page.');
      router.replace("/login");
      return;
    }

    // Vérifier l'authentification
    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) throw new Error();
      const user = await res.json();
      
      // Récupérer les données utilisateur
      setFullName(`${user.first_name} ${user.last_name}`.trim());
      setUsername(user.username);
      
      if (!user.is_superuser) {
        showNotification('error', 'Accès refusé', 'Vous devez être administrateur pour accéder à cette page.');
        router.replace('/dashboard');
        return;
      }

      // Analyses existantes - pas de rechargement automatique
    })
    .catch(() => {
      showNotification('error', 'Erreur de session', 'Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => {
        router.replace("/login");
      }, 2000);
    });
  }, [router, showNotification, API_BASE]);

  // Gérer le thème au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Ferme les menus si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (todoMenuRef.current && !todoMenuRef.current.contains(e.target as Node)) {
        setShowTodoMenu(false);
      }
    }

    if (showUserMenu || showTodoMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu, showTodoMenu]);

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

  // Fonctions pour gérer les todos
  const fetchTodos = async () => {
    setLoadingTodos(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.warn('Pas de token disponible');
        setLoadingTodos(false);
        return;
      }
      
      console.log('Chargement des todos depuis:', `${API_BASE}/api/v1/gantt/todos/assigned`);
      
      const response = await fetch(`${API_BASE}/api/v1/gantt/todos/assigned`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Réponse fetchTodos:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Todos chargées:', data?.length || 0, 'todos');
        setTodos(data); // Ne plus limiter pour avoir tous les détails
        
        // Charger les détails des tâches associées
        const uniqueTaskIds = Array.from(new Set(
          data.map((t: Todo) => t.task_id)
            .filter((id: number | undefined): id is number => typeof id === 'number')
        ));
        if (uniqueTaskIds.length > 0) {
          await Promise.all([
            loadTaskTodos(uniqueTaskIds as number[]),
            loadTaskWeeks(uniqueTaskIds as number[]),
          ]);
        }
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
        console.error('Erreur API fetchTodos:', errorData);
        showNotification('error', 'Erreur', 'Impossible de charger les todos');
      }
    } catch (error: any) {
      console.error('Erreur lors du chargement des todos:', error);
      showNotification('error', 'Erreur', 'Problème de connexion lors du chargement des todos');
    }
    setLoadingTodos(false);
  };

  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) {
      showNotification('warning', 'Attention', 'Veuillez saisir un texte pour la todo');
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      showNotification('error', 'Erreur', 'Vous devez être connecté');
      return;
    }

    try {
      console.log('Envoi de la todo:', { text, done: false });
      
      const response = await fetch(`${API_BASE}/api/v1/gantt/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          done: false,
        }),
      });

      console.log('Réponse API:', response.status, response.statusText);

      if (response.ok) {
        const newTodoItem = await response.json();
        console.log('Nouvelle todo créée:', newTodoItem);
        
        setTodos(prev => [newTodoItem, ...prev.slice(0, 9)]); // Garder max 10 todos
        setNewTodo('');
        showNotification('success', 'Todo ajoutée', 'Votre todo a été ajoutée avec succès');
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
        console.error('Erreur API:', errorData);
        showNotification('error', 'Erreur', errorData.detail || 'Impossible d\'ajouter la todo');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de la todo:', error);
      showNotification('error', 'Erreur', error.message || 'Impossible d\'ajouter la todo');
    }
  };

  const toggleTodo = async (todoId: number, currentDone: boolean) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE}/api/v1/gantt/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          done: !currentDone,
        }),
      });

      if (response.ok) {
        setTodos(prev =>
          prev.map(todo =>
            todo.id === todoId ? { ...todo, done: !currentDone } : todo
          )
        );
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la todo:', error);
    }
  };

  // Charger les todos quand on ouvre le menu ou au début
  useEffect(() => {
    if (showTodoMenu) {
      fetchTodos();
    }
  }, [showTodoMenu]);

  // Charger les todos au démarrage pour avoir le badge
  useEffect(() => {
    fetchTodos();
  }, []);

  // Fonctions utilitaires pour les todos avancées
  const getDynamicPriority = (weekStart: number, weekEnd: number) => {
    const currentWeek = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    
    if (currentWeek >= weekStart && currentWeek <= weekEnd) {
      return { label: 'Urgent', cls: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' };
    } else if (currentWeek + 1 >= weekStart) {
      return { label: 'Proche', cls: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' };
    } else {
      return { label: 'Futur', cls: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' };
    }
  };

  const toggleCollapsedCard = (todoId: number) => {
    setCollapsedCardIds(prev => ({
      ...prev,
      [todoId]: !prev[todoId]
    }));
  };

  const loadTaskTodos = async (taskIds: number[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const results: Record<number, { id: number; text: string; done: boolean }[]> = {};
    
    await Promise.all(taskIds.map(async (taskId) => {
      if (loadingTaskTodos[taskId]) return;
      
      setLoadingTaskTodos(prev => ({ ...prev, [taskId]: true }));
      
      try {
        const res = await fetch(`${API_BASE}/api/v1/gantt/tasks/${taskId}/todos`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          results[taskId] = data;
        }
      } catch (error) {
        console.error(`Erreur lors du chargement des todos pour la tâche ${taskId}:`, error);
      } finally {
        setLoadingTaskTodos(prev => ({ ...prev, [taskId]: false }));
      }
    }));
    
    setTaskTodosMap(prev => ({ ...prev, ...results }));
  };

  const loadTaskWeeks = async (taskIds: number[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const results: Record<number, { start: number; end: number }> = {};
    
    await Promise.all(taskIds.map(async (taskId) => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/gantt/tasks/${taskId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
          const data = await res.json();
          results[taskId] = {
            start: data.start_week || 1,
            end: data.end_week || 1
          };
        }
      } catch (error) {
        console.error(`Erreur lors du chargement des semaines pour la tâche ${taskId}:`, error);
      }
    }));
    
    setTaskWeeks(results);
  };

  // Fonction de filtrage des todos
  const getFilteredTodos = () => {
    return todos.filter(todo => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        todo.text.toLowerCase().includes(searchLower) ||
        (todo.machine_name && todo.machine_name.toLowerCase().includes(searchLower)) ||
        (todo.ensemble_name && todo.ensemble_name.toLowerCase().includes(searchLower)) ||
        (todo.task_title && todo.task_title.toLowerCase().includes(searchLower)) ||
        (searchLower === 'urgent' && todo.task_id && taskWeeks[todo.task_id] && 
         getDynamicPriority(taskWeeks[todo.task_id].start, taskWeeks[todo.task_id].end).label === 'Urgent') ||
        (searchLower === 'en cours' && !todo.done) ||
        (searchLower === 'terminé' && todo.done);
      
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'pending' && !todo.done) ||
        (filterStatus === 'completed' && todo.done);
      
      return matchesSearch && matchesStatus;
    });
  };

  // Détecter le scroll pour le comportement sticky
  useEffect(() => {
    const handleScroll = () => {
      // L'indicateur devient sticky quand il atteint le haut de l'écran
      const scrollTop = window.scrollY;
      const headerHeight = 200; // Hauteur approximative du header
      setShouldStick(scrollTop > headerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  // Upload et traitement des fichiers FEC
  const handleFileChosen = async (file: File) => {
    setLoading(true);
    setUploadedFile(file);
    setShowUpload(false);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/api/v1/fec-analysis/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erreur inconnue' }));
        throw new Error(errorData.detail || `Erreur ${response.status}`);
      }

      const result = await response.json();
      setFecData(result.data);

      // Initialiser les valeurs éditables avec les valeurs par défaut
      const initialEditableValues: Record<string, number> = {
        'EAU_modifiable': 88,
        'ASSURANCES_modifiable': 1852,
        'ASSURANCES ADI_modifiable': 38,
        'AXA HOMME CLE_modifiable': 100,
        'ABONNEMENT-FORMATION_modifiable': 0,
        'PRESTATIONS GAG_modifiable': 0,
        'PRESTATIONS CONSULTING_modifiable': 0,
        'HONORAIRES COMPTABLES_modifiable': 3000,
        'HONORAIRES JURIDIQUES_modifiable': 300,
        'HONORAIRES DIVERS_modifiable': 100,
        'FRAIS FACTURATION FOURNISSEURS_modifiable': 86,
        'IMPOTS ET TAXES_modifiable': 600,
        'Dotations aux amortissements_modifiable': 10057,
        'Produits financiers_modifiable': 0,
        'Charges financières_modifiable': 600,
        'Résultat exceptionnel_modifiable': 0,
      };
      
      setEditableValues(initialEditableValues);
      
      showNotification('success', 'Analyse terminée', 'Le fichier FEC a été analysé avec succès');
      
    } catch (error: any) {
      showNotification('error', 'Erreur d\'analyse', error.message || 'Erreur lors du traitement du fichier FEC');
      console.error('Erreur lors du traitement:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger une analyse spécifique
  const handleLoadAnalysis = async (analysisId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/v1/fec-analysis/analyses/${analysisId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const analysis = await response.json();
        const results = JSON.parse(analysis.results);
        setFecData(results);
        showNotification('success', 'Analyse chargée', `Analyse "${analysis.filename}" chargée avec succès`);
      }
    } catch (error) {
      showNotification('error', 'Erreur de chargement', 'Impossible de charger cette analyse');
      console.error('Erreur lors du chargement:', error);
    }
  };

  // Supprimer une analyse
  const handleDeleteAnalysis = async (analysisId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette analyse ?')) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/v1/fec-analysis/analyses/${analysisId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification('success', 'Analyse supprimée', 'L\'analyse a été supprimée avec succès');
        
        // Si l'analyse supprimée était celle actuellement affichée, vider les données
        const currentAnalysis = savedAnalyses.find(a => a.id === analysisId);
        if (currentAnalysis && fecData) {
          setFecData(null);
          setEditableValues({});
        }
        
        // Supprimer l'analyse de la liste locale
        setSavedAnalyses(prev => prev.filter(a => a.id !== analysisId));
      } else {
        throw new Error('Erreur lors de la suppression');
      }
    } catch (error) {
      showNotification('error', 'Erreur de suppression', 'Impossible de supprimer cette analyse');
      console.error('Erreur lors de la suppression:', error);
    }
  };

  // Générer le contenu HTML pour le PDF
  const generatePDFContent = () => {
    if (!fecData) return '';

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Analyse FEC - ${fecData.production.mois_annee}</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 20px; 
          color: #333;
          line-height: 1.4;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
        }
        .header h1 { 
          color: #2563eb; 
          margin: 0; 
          font-size: 28px;
        }
        .header .period { 
          color: #666; 
          font-size: 18px; 
          margin-top: 5px;
        }
        .section { 
          margin: 25px 0; 
          page-break-inside: avoid;
        }
        .section-title { 
          background: #f8fafc; 
          color: #2563eb; 
          padding: 12px 15px; 
          font-weight: bold; 
          font-size: 16px;
          border-left: 4px solid #2563eb;
          margin-bottom: 15px;
        }
        .kpi-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 15px; 
          margin: 20px 0;
        }
        .kpi-card { 
          border: 1px solid #e2e8f0; 
          padding: 15px; 
          border-radius: 8px;
          text-align: center;
        }
        .kpi-label { 
          font-size: 12px; 
          color: #64748b; 
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .kpi-value { 
          font-size: 20px; 
          font-weight: bold; 
          color: #1e293b;
        }
        .kpi-value.positive { color: #059669; }
        .kpi-value.negative { color: #dc2626; }
        .table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 15px 0;
          font-size: 12px;
        }
        .table th, .table td { 
          border: 1px solid #e2e8f0; 
          padding: 8px 12px; 
          text-align: left;
        }
        .table th { 
          background: #f1f5f9; 
          font-weight: bold;
          color: #334155;
        }
        .table .amount { 
          text-align: right; 
          font-family: monospace;
        }
        .summary-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .two-column {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        @media print {
          body { margin: 10px; }
          .section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Analyse FEC</h1>
        <div class="period">${fecData.production.mois_annee}</div>
        <div style="font-size: 12px; color: #666; margin-top: 10px;">
          Généré le ${new Date().toLocaleDateString('fr-FR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>

      <!-- KPIs Principaux -->
      <div class="section">
        <div class="section-title">📈 Indicateurs Clés</div>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-label">Production</div>
            <div class="kpi-value">${fecData.production.total.toLocaleString('fr-FR')} €</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">EBITDA</div>
            <div class="kpi-value ${calculerEBITDA() >= 0 ? 'positive' : 'negative'}">${calculerEBITDA().toLocaleString('fr-FR')} €</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Résultat d'exploitation</div>
            <div class="kpi-value ${calculerResultatExploitation() >= 0 ? 'positive' : 'negative'}">${calculerResultatExploitation().toLocaleString('fr-FR')} €</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Résultat net</div>
            <div class="kpi-value ${calculerResultatNet() >= 0 ? 'positive' : 'negative'}">${calculerResultatNet().toLocaleString('fr-FR')} €</div>
          </div>
        </div>
      </div>

      <!-- Production et Achats -->
      <div class="section">
        <div class="section-title">Production et Achats</div>
        <div class="summary-box">
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center;">
            <div>
              <div style="font-weight: bold; color: #2563eb;">Production</div>
              <div style="font-size: 18px; margin-top: 5px;">${fecData.production.total.toLocaleString('fr-FR')} €</div>
            </div>
            <div>
              <div style="font-weight: bold; color: #dc2626;">Achats consommés</div>
              <div style="font-size: 18px; margin-top: 5px;">${fecData.achats_consommes.total.toLocaleString('fr-FR')} €</div>
              <div style="font-size: 11px; color: #666;">MP: ${fecData.achats_consommes.matieres_premieres?.toLocaleString('fr-FR') || '0'} € | ST: ${fecData.achats_consommes.sous_traitance?.toLocaleString('fr-FR') || '0'} €</div>
            </div>
            <div>
              <div style="font-weight: bold; color: ${calculerMargeSurCoutsDirects() >= 0 ? '#059669' : '#dc2626'};">Marge sur coûts directs</div>
              <div style="font-size: 18px; margin-top: 5px;">${calculerMargeSurCoutsDirects().toLocaleString('fr-FR')} €</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Synthèse finale -->
      <div class="section">
        <div class="section-title">Synthèse des Résultats</div>
        <table class="table">
          <tr style="background: #f8fafc;">
            <td style="font-weight: bold;">EBITDA</td>
            <td class="amount" style="font-weight: bold; color: ${calculerEBITDA() >= 0 ? '#059669' : '#dc2626'};">${calculerEBITDA().toLocaleString('fr-FR')} €</td>
          </tr>
          <tr>
            <td>- Dotations aux amortissements</td>
            <td class="amount">${(editableValues['Dotations aux amortissements_modifiable'] || 0).toLocaleString('fr-FR')} €</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="font-weight: bold;">= Résultat d'exploitation</td>
            <td class="amount" style="font-weight: bold; color: ${calculerResultatExploitation() >= 0 ? '#059669' : '#dc2626'};">${calculerResultatExploitation().toLocaleString('fr-FR')} €</td>
          </tr>
          <tr>
            <td>+ Produits financiers</td>
            <td class="amount">${(editableValues['Produits financiers_modifiable'] || 0).toLocaleString('fr-FR')} €</td>
          </tr>
          <tr>
            <td>- Charges financières</td>
            <td class="amount">${(editableValues['Charges financières_modifiable'] || 0).toLocaleString('fr-FR')} €</td>
          </tr>
          <tr style="background: #f8fafc;">
            <td style="font-weight: bold;">= Résultat courant</td>
            <td class="amount" style="font-weight: bold; color: ${calculerResultatCourant() >= 0 ? '#059669' : '#dc2626'};">${calculerResultatCourant().toLocaleString('fr-FR')} €</td>
          </tr>
          <tr>
            <td>- Résultat exceptionnel</td>
            <td class="amount">${(editableValues['Résultat exceptionnel_modifiable'] || 0).toLocaleString('fr-FR')} €</td>
          </tr>
          <tr style="background: #e0f2fe; font-weight: bold; font-size: 14px;">
            <td style="font-weight: bold;">= RÉSULTAT NET</td>
            <td class="amount" style="font-weight: bold; font-size: 16px; color: ${calculerResultatNet() >= 0 ? '#059669' : '#dc2626'};">${calculerResultatNet().toLocaleString('fr-FR')} €</td>
          </tr>
        </table>
      </div>

    </body>
    </html>
    `;
  };

  // Exporter l'analyse actuelle en PDF (méthode native navigateur)
  const handleExportAnalysis = () => {
    if (!fecData) return;
    // Créer le contenu HTML pour téléchargement direct
    const htmlContent = generatePDFContent();

    // Créer un blob et télécharger
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `analyse_fec_${fecData.production.mois_annee.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Ouvrir aussi dans une nouvelle fenêtre pour impression PDF
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 1000);
      };
    }

    URL.revokeObjectURL(url);
    showNotification('success', 'Export réussi', 'Fichier téléchargé et prêt pour impression PDF');
  };

  // Gestion des champs éditables
  const handleEditableChange = (charge: FECCharge, newValue: string) => {
    const key = `${charge.CompteLib}_${charge.CompteNum}`;
    const numValue = parseFloat(newValue) || 0;
    setEditableValues(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  const handleEditableKeyDown = (charge: FECCharge, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setEditingField(null);
    }
  };

  // Fonctions de calcul (identiques à l'ancien projet)
  const getValueColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const calculerCoutsDirects = () => {
    if (!fecData) return 0;
    
    const chargesDirectesSpecifiques = [
      'ELECTRICITE',
      'FOURN.ENT.&P.OUT',
      'MATERIEL ET OUTILLAGE INTRACOM',
      'LOCATION AIR LIQUIDE',
      'EVACUATION DECHETS',
      'PERSONNEL EXTERIEUR A L\' ENTREPRISE',
      'VAR.CP',
      'TRANSPORTS SUR ACHATS',
      'PORTS SUR VENTES'
    ];
    
    let total = 0;
    
    fecData.charges_directes.forEach(charge => {
      if (chargesDirectesSpecifiques.includes(charge.CompteLib)) {
        total += charge.montant;
      }
    });
    
    if (fecData.couts_salariaux) {
      total += fecData.couts_salariaux.personnel_production + fecData.couts_salariaux.charges_patronales_p;
    }
    
    return total;
  };

  const calculerMargeSurCoutsDirects = () => {
    if (!fecData) return 0;
    return fecData.production.total - fecData.achats_consommes.total - calculerCoutsDirects();
  };

  const calculerTotalChargesIndirectes = () => {
    if (!fecData) return 0;
    
    const chargesIndirectesSpecifiques = [
      "EAU", "GAZ", "CARB.LUBRIF.", "FOURNITURES ADMINISTRATIVES", "VETEMENTS DE TRAVAIL",
      "LOCATION VEHICULES", "CREDIT BAIL TOUR HASS ST20Y OCC", "LOCATION MATERIEL SETIN",
      "LOCAT.IMMOBIL.", "LOCATIONS DIVERSES", "LOCATION COPIEUR  RICOH", "LOCATION LOGICIEL",
      "LOCATION TOYOTA FK-120-KZ", "CHARGES LOCATIVES", "ENTRETIEN BIENS IMMOBILIERS",
      "ENTRETIEN MATERIEL ET OUTILLAGE", "ENT.MAT.TRANSP.", "ENTRETIEN MATERIEL DE BUREAU",
      "MAINTENANCE INFORMATIQUE", "MAINTENANCE", "ASSURANCES", "ASSURANCES ADI", "AXA HOMME CLE",
      "ABONNEMENT-FORMATION", "PRESTATIONS GAG", "PRESTATIONS CONSULTING", "HONORAIRES COMPTABLES",
      "HONORAIRES JURIDIQUES", "HONORAIRES DIVERS", "FRAIS D'ACTES & CONTENTIEUX",
      "ANNONCES ET INSERTIONS", "FRAIS /EFFETS", "FRAIS DE DEPLACEMENTS", "RECEPTIONS",
      "TELEPHONE", "AFFRANCHISSEMENT", "SERVICES BANCAIRES", "FRAIS FACTURATION FOURNISSEURS",
      "COTISATIONS"
    ];
    
    let total = 0;
    
    fecData.charges_indirectes.forEach(charge => {
      if (chargesIndirectesSpecifiques.includes(charge.CompteLib)) {
        total += charge.montant;
      }
    });
    
    Object.keys(editableValues).forEach(key => {
      const chargeLib = key.split('_')[0];
      if (chargesIndirectesSpecifiques.includes(chargeLib)) {
        total += editableValues[key] || 0;
      }
    });
    
    return total;
  };

  const calculerEBITDA = () => {
    if (!fecData) return 0;
    
    const margeSurCoutsDirects = calculerMargeSurCoutsDirects();
    const totalChargesIndirectes = calculerTotalChargesIndirectes();
    
    let totalChargesASoustraire = 0;
    if (fecData.couts_salariaux) {
      totalChargesASoustraire += fecData.couts_salariaux.personnel_adm + fecData.couts_salariaux.charges_patronales_hp;
    }
    
    totalChargesASoustraire += editableValues['IMPOTS ET TAXES_modifiable'] || 0;
    
    return margeSurCoutsDirects - totalChargesIndirectes - totalChargesASoustraire;
  };

  const calculerResultatExploitation = () => {
    if (!fecData) return 0;
    const ebitda = calculerEBITDA();
    const dotationsAmortissements = editableValues['Dotations aux amortissements_modifiable'] || 0;
    return ebitda - dotationsAmortissements;
  };

  const calculerResultatCourant = () => {
    if (!fecData) return 0;
    const resultatExploitation = calculerResultatExploitation();
    const produitsFinanciers = editableValues['Produits financiers_modifiable'] || 0;
    const chargesFinancieres = editableValues['Charges financières_modifiable'] || 0;
    return resultatExploitation + produitsFinanciers - chargesFinancieres;
  };

  const calculerResultatNet = () => {
    if (!fecData) return 0;
    const resultatCourant = calculerResultatCourant();
    const resultatExceptionnel = editableValues['Résultat exceptionnel_modifiable'] || 0;
    return resultatCourant - resultatExceptionnel;
  };

  // Rendu des cartes de charges
  const renderChargeCard = (charge: FECCharge, colorClass: string) => {
    const isEditable = charge.CompteNum === 'modifiable' && charge.CompteLib !== 'AUTRES PRODUITS ET CHARGES';
    const key = `${charge.CompteLib}_${charge.CompteNum}`;
    const displayValue = isEditable ? (editableValues[key] || 0) : charge.montant;
    const isEditing = editingField === key;
    const isEmpty = isEditable && (editableValues[key] || 0) === 0;

    return (
      <div key={`${charge.CompteLib}_${charge.CompteNum}`} className={`rounded-lg p-4 ${
        isEmpty ? 'bg-[#1a1d24] border-2 border-dashed border-gray-500' : 'bg-[#23262c]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">{charge.CompteLib}</div>
          {isEditable && (
            <button
              onClick={() => isEditing ? setEditingField(null) : setEditingField(key)}
              className="text-xs text-gray-400 hover:text-blue-400 cursor-pointer opacity-60 hover:opacity-100"
            >
              {isEditing ? '✓' : '●'}
            </button>
          )}
        </div>
        <div className="text-xs text-gray-400 mb-2">{charge.CompteNum}</div>
        {isEditable && isEditing ? (
          <input
            type="number"
            value={displayValue.toString()}
            onChange={(e) => handleEditableChange(charge, e.target.value)}
            onKeyDown={(e) => handleEditableKeyDown(charge, e)}
            onFocus={() => setEditingField(key)}
            onBlur={() => setEditingField(null)}
            className={`text-lg font-bold ${colorClass} bg-transparent border-b border-gray-600 focus:border-blue-400 focus:outline-none w-full`}
            step="0.01"
            min="-999999999"
            autoFocus
          />
        ) : (
          <div className={`text-lg font-bold ${colorClass} ${isEmpty ? 'text-gray-500' : ''}`}>
            {displayValue.toLocaleString('fr-FR')} €
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white p-8 relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-blue-500/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-blue-400/12 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-blue-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
      </div>

      {/* Menu utilisateur et todos en haut à droite */}
      <div className="absolute top-5 right-7 flex items-center gap-3 z-20">
        {/* Bouton Todo */}
        <div className="relative">
          <button
            onClick={() => setShowTodoMenu(v => !v)}
            className="w-12 h-12 bg-white/20 dark:bg-gradient-to-br dark:from-gray-700/80 dark:to-gray-600/80 backdrop-blur-xl rounded-full flex items-center justify-center shadow-lg border border-gray-200/50 dark:border-white/20 hover:bg-white/30 dark:hover:from-gray-600/80 dark:hover:to-gray-500/80 transition-all duration-300 hover:scale-105"
            title="Todos rapides"
          >
            <CheckSquare className="w-5 h-5 text-gray-600 dark:text-white" />
          </button>
          
          {/* Badge de notification pour les todos non terminées */}
          {todos.filter(t => !t.done).length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {todos.filter(t => !t.done).length > 9 ? '9+' : todos.filter(t => !t.done).length}
            </div>
          )}
        </div>

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
                  <div className="text-gray-800 dark:text-white font-medium">Administrateur</div>
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

        {/* Modal Todo Complet */}
        {showTodoMenu && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
              ref={todoMenuRef}
              className="bg-white/95 dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl w-[90vw] max-w-4xl h-[85vh] border border-gray-200/50 dark:border-white/10 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/20 dark:bg-[#8c68d8]/20 flex items-center justify-center">
                    <CheckSquare className="w-5 h-5 text-blue-600 dark:text-[#8c68d8]" />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-800 dark:text-white">Mes Todos</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getFilteredTodos().filter(t => !t.done).length} en cours • {getFilteredTodos().filter(t => t.done).length} terminées
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchTodos}
                    disabled={loadingTodos}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors disabled:opacity-50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Actualiser les todos"
                  >
                    <RefreshCw className={`w-5 h-5 ${loadingTodos ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowTodoMenu(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Barre d'outils */}
              <div className="p-4 border-b border-gray-200 dark:border-white/10 space-y-4">
                {/* Formulaire d'ajout */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ajouter une nouvelle todo..."
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTodo();
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-white/20 rounded-lg text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8c68d8]"
                  />
                  <button
                    onClick={addTodo}
                    disabled={!newTodo.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-[#8c68d8] dark:hover:bg-[#7c5ac8] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>

                {/* Filtres et recherche */}
                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher dans les todos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-white/20 rounded-lg text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8c68d8] text-sm"
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'completed')}
                    className="px-3 py-2 bg-white/60 dark:bg-white/10 border border-gray-200/50 dark:border-white/20 rounded-lg text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-[#8c68d8] text-sm"
                  >
                    <option value="all">Toutes</option>
                    <option value="pending">En cours</option>
                    <option value="completed">Terminées</option>
                  </select>
                </div>
              </div>

              {/* Liste des todos */}
              <div className="flex-1 overflow-y-auto p-4">
                {loadingTodos ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-[#8c68d8]"></div>
                  </div>
                ) : getFilteredTodos().length === 0 ? (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-medium">Aucune todo trouvée</div>
                    <div className="text-sm">
                      {todos.length === 0 ? 'Ajoutez votre première todo ci-dessus' : 'Essayez un autre filtre ou terme de recherche'}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getFilteredTodos().map((todo) => (
                      <div
                        key={todo.id}
                        className={`bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/50 dark:border-white/20 transition-all duration-300 hover:shadow-lg ${
                          todo.done ? 'opacity-75' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => toggleTodo(todo.id, todo.done)}
                            className="text-blue-500 dark:text-[#8c68d8] hover:text-blue-600 dark:hover:text-[#7c5ac8] cursor-pointer active:scale-95 transition-transform mt-1"
                          >
                            {todo.done ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h3 className={`text-base font-semibold ${
                                    todo.done ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white'
                                  }`}>
                                    {[
                                      todo.machine_name,
                                      todo.ensemble_name,
                                      todo.task_title,
                                    ].filter(Boolean).join(' - ') || todo.text}
                                  </h3>
                                  
                                  {/* Badges en mode réduit */}
                                  {collapsedCardIds[todo.id] && typeof todo.task_id === 'number' && taskWeeks[todo.task_id] && (() => {
                                    const weeks = taskWeeks[todo.task_id];
                                    const prio = getDynamicPriority(weeks.start, weeks.end);
                                    const taskTodos = taskTodosMap[todo.task_id] || [];
                                    const completedTodos = taskTodos.filter(t => t.done).length;
                                    const totalTodos = taskTodos.length;
                                    
                                    let statusLabel = '';
                                    let statusClass = '';
                                    
                                    if (totalTodos === 0) {
                                      statusLabel = 'Pas commencé';
                                      statusClass = 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
                                    } else if (completedTodos === 0) {
                                      statusLabel = 'Pas commencé';
                                      statusClass = 'bg-gray-100 dark:bg-gray-900/20 text-gray-700 dark:text-gray-300';
                                    } else if (completedTodos === totalTodos) {
                                      statusLabel = 'Terminé';
                                      statusClass = 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
                                    } else {
                                      statusLabel = 'En cours';
                                      statusClass = 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
                                    }
                                    
                                    return (
                                      <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 shrink-0">
                                        <span className="inline-flex items-center gap-1">
                                          <Calendar className="w-3 h-3" />
                                          <span className="text-xs">{`S${weeks.start}-S${weeks.end}`}</span>
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}>{statusLabel}</span>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${prio.cls}`}>{prio.label}</span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Détails de la tâche en mode étendu */}
                                {!collapsedCardIds[todo.id] && typeof todo.task_id === 'number' && taskWeeks[todo.task_id] && (() => {
                                  const weeks = taskWeeks[todo.task_id];
                                  const prio = getDynamicPriority(weeks.start, weeks.end);
                                  const taskTodos = taskTodosMap[todo.task_id] || [];
                                  
                                  return (
                                    <div className="mt-3 space-y-3">
                                      {/* Infos de la tâche */}
                                      <div className="flex flex-wrap gap-2 text-sm">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
                                          <Calendar className="w-3 h-3" />
                                          Semaines {weeks.start}-{weeks.end}
                                        </span>
                                        <span className={`px-2 py-1 rounded-lg text-xs font-medium ${prio.cls}`}>
                                          {prio.label}
                                        </span>
                                      </div>

                                      {/* Sous-todos */}
                                      {taskTodos.length > 0 && (
                                        <div className="bg-white/20 dark:bg-white/5 rounded-lg p-3">
                                          <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                              Sous-tâches ({taskTodos.filter(t => t.done).length}/{taskTodos.length})
                                            </span>
                                          </div>
                                          <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {taskTodos.map((subtodo) => (
                                              <div key={subtodo.id} className="flex items-center gap-2 text-sm">
                                                {subtodo.done ? (
                                                  <CheckSquare className="w-3 h-3 text-green-500" />
                                                ) : (
                                                  <Square className="w-3 h-3 text-gray-400" />
                                                )}
                                                <span className={subtodo.done ? 'line-through text-gray-500' : 'text-gray-700 dark:text-gray-300'}>
                                                  {subtodo.text}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>

                              {/* Bouton collapse/expand */}
                              {typeof todo.task_id === 'number' && taskWeeks[todo.task_id] && (
                                <button
                                  onClick={() => toggleCollapsedCard(todo.id)}
                                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded transition-colors"
                                >
                                  {collapsedCardIds[todo.id] ? (
                                    <ChevronDown className="w-4 h-4" />
                                  ) : (
                                    <ChevronUp className="w-4 h-4" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Todo simple (sans tâche associée) */}
                            {!todo.task_id && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Todo personnelle
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-white/10 flex justify-between items-center">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Total: {getFilteredTodos().length} todos
                </div>
                <button
                  onClick={() => {
                    setShowTodoMenu(false);
                    router.push('/todo');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-[#8c68d8] dark:hover:bg-[#7c5ac8] text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Page complète
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
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

        {/* Indicateur de période - à droite du contenu, sticky quand il atteint le haut */}
        {fecData && (
          <div className={`transition-all duration-300 ${
            shouldStick 
              ? 'fixed top-4 z-40' 
              : 'absolute top-32'
          }`} style={{ 
            right: shouldStick ? '20px' : '-150px'
          }}>
            <div className={`rounded-lg px-4 py-2 border shadow-lg transition-all duration-300 ${
              shouldStick 
                ? 'bg-gray-800/95 backdrop-blur-md border-gray-600/60' 
                : 'bg-gray-800/80 backdrop-blur-sm border-gray-600/50'
            }`}>
              <div className="text-xs text-gray-400">
                Période
              </div>
              <div className="text-sm font-semibold text-white">
                {fecData.production.mois_annee}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-extrabold mb-2">Analyse <span className="text-blue-600 dark:text-[#8c68d8]">FEC</span></h1>
              <p className="text-gray-600 dark:text-gray-400">Analysez vos écritures comptables et générez des rapports détaillés</p>
            </div>
            <div className="flex items-center gap-3">
              {fecData && (
                <>
                  <button
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105"
                    onClick={() => setShowKpi(!showKpi)}
                    title={showKpi ? "Retour à l'analyse FEC" : "Voir les KPI"}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {showKpi ? 'Analyse FEC' : 'KPI'}
                  </button>
                  <button
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105"
                    onClick={() => handleExportAnalysis()}
                    title="Exporter l'analyse actuelle"
                  >
                    <Download className="w-4 h-4" />
                    Exporter
                  </button>
                  <button
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:scale-105"
                    onClick={() => setShowUpload(true)}
                    title="Uploader un fichier FEC"
                  >
                    <Upload className="w-4 h-4" />
                    Importer FEC
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Analyses sauvegardées */}
        {savedAnalyses.length > 0 && (
          <ModernCard className="mb-6 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-gray-300">Analyses sauvegardées ({savedAnalyses.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {savedAnalyses.map((analysis) => (
                <div
                  key={analysis.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm text-white truncate pr-2">
                      {analysis.filename}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleLoadAnalysis(analysis.id)}
                        className="p-1 text-blue-400 hover:text-blue-300 rounded"
                        title="Charger cette analyse"
                      >
                        <Eye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteAnalysis(analysis.id)}
                        className="p-1 text-red-400 hover:text-red-300 rounded"
                        title="Supprimer cette analyse"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(analysis.upload_date).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <button
                    onClick={() => handleLoadAnalysis(analysis.id)}
                    className="w-full mt-2 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 py-1 rounded transition-colors"
                  >
                    Charger l'analyse
                  </button>
                </div>
              ))}
            </div>
          </ModernCard>
        )}

        {/* Upload Section - Affiché seulement si pas de données */}
        {!fecData && !loading && (
          <ModernCard className="mb-8 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Analyse FEC</h3>
              <p className="text-gray-400 mb-6">Importez un fichier Excel FEC pour commencer l'analyse comptable.</p>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 mx-auto" 
                onClick={() => setShowUpload(true)}
              >
                <Upload className="w-4 h-4" />
                Importer un fichier FEC
              </button>
            </div>
          </ModernCard>
        )}

        {/* Loading */}
        {loading && (
          <ModernCard className="mb-8 p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <h3 className="text-xl font-bold text-white mb-2">Analyse en cours...</h3>
              <p className="text-gray-400">Traitement des données comptables</p>
            </div>
          </ModernCard>
        )}

        {/* Vue d'ensemble - Production et Grands agrégats OR Vue KPI */}
        {fecData && (
          <ModernCard className="mb-8 p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-400">{showKpi ? 'KPI' : "Vue d'ensemble"}</h2>
            </div>

            {showKpi ? (
              <div className="space-y-10">
                {/* Synthèse en tête */}
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Synthèse</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Production de l'exercice" value={`${(fecData.production?.total ?? 0).toLocaleString('fr-FR')} €`} icon={TrendingUp} color={(fecData.production?.total ?? 0) >= 0 ? "green" : "red"} />
                    <StatCard title="Résultat net" value={`${calculerResultatNet().toLocaleString('fr-FR')} €`} icon={TrendingUp} color={calculerResultatNet() >= 0 ? "green" : "red"} />
                    <StatCard title="EBITDA" value={`${calculerEBITDA().toLocaleString('fr-FR')} €`} icon={TrendingUp} color={calculerEBITDA() >= 0 ? "green" : "red"} />
                  </div>
                </div>

                {/* Marges */}
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Marges</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Marge brute" value={`${calculerMargeBrute().toLocaleString('fr-FR')} €`} icon={TrendingUp} color={calculerMargeBrute() >= 0 ? "green" : "red"} />
                    <StatCard title="Taux de marge brute" value={`${formatPourcentage(calculerTauxMargeBrute())}`} icon={TrendingUp} color={calculerTauxMargeBrute() >= 0 ? "green" : "red"} />
                    <StatCard title="Marge sur coût variable" value={`${calculerMargeCoutVariable().toLocaleString('fr-FR')} €`} icon={TrendingUp} color={calculerMargeCoutVariable() >= 0 ? "green" : "red"} />
                    <StatCard title="Taux marge sur coût variable" value={`${formatPourcentage(calculerTauxMargeCoutVariable())}`} icon={TrendingUp} color={calculerTauxMargeCoutVariable() >= 0 ? "green" : "red"} />
                  </div>
                </div>

                {/* Rentabilité */}
                <div>
                  <h3 className="text-sm uppercase tracking-wider text-gray-400 mb-3">Rentabilité</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title="Résultat d'exploitation" value={`${calculerResultatExploitation().toLocaleString('fr-FR')} €`} icon={BarChart3} color={calculerResultatExploitation() >= 0 ? "green" : "red"} />
                    <StatCard title="Taux d'EBIT" value={`${formatPourcentage(calculerTauxEBIT())}`} icon={BarChart3} color={calculerTauxEBIT() >= 0 ? "green" : "red"} />
                    <StatCard title="Taux d'EBITDA" value={`${formatPourcentage(calculerTauxEBITDA())}`} icon={TrendingUp} color={calculerTauxEBITDA() >= 0 ? "green" : "red"} />
                    <StatCard title="Résultat courant" value={`${calculerResultatCourant().toLocaleString('fr-FR')} €`} icon={DollarSign} color={calculerResultatCourant() >= 0 ? "green" : "red"} />
                    <StatCard title="Trésorerie" value={`${(fecData.tresorerie?.total ?? 0).toLocaleString('fr-FR')} €`} icon={DollarSign} color={(fecData.tresorerie?.total ?? 0) >= 0 ? "green" : "red"} />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Production - Carte principale */}
                <div className="mb-6">
                  <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-600/50 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-bold ${getValueColor(fecData.production.total)}`}>
                        {fecData.production.titre}
                      </h3>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-black text-white mb-2">
                        {fecData.production.total.toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grands agrégats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <StatCard title="EBITDA" value={`${calculerEBITDA().toLocaleString('fr-FR')} €`} icon={TrendingUp} color={calculerEBITDA() >= 0 ? "green" : "red"} />
                  <StatCard title="Résultat d'exploitation" value={`${calculerResultatExploitation().toLocaleString('fr-FR')} €`} icon={BarChart3} color={calculerResultatExploitation() >= 0 ? "green" : "red"} />
                  <StatCard title="Résultat courant" value={`${calculerResultatCourant().toLocaleString('fr-FR')} €`} icon={DollarSign} color={calculerResultatCourant() >= 0 ? "green" : "red"} />
                  <StatCard title="Résultat net" value={`${calculerResultatNet().toLocaleString('fr-FR')} €`} icon={TrendingUp} color={calculerResultatNet() >= 0 ? "green" : "red"} />
                </div>

                {/* Trésorerie */}
                {fecData.tresorerie && (
                  <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-600/50 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-bold ${getValueColor(fecData.tresorerie.total)}`}>
                        {fecData.tresorerie.titre}
                      </h3>
                    </div>
                    <div className="text-center">
                      <div className="text-4xl font-black text-white mb-2">
                        {fecData.tresorerie.total.toLocaleString('fr-FR')} €
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </ModernCard>
        )}

        {/* Détails de l'analyse (cachés en mode KPI) */}
        {fecData && !showKpi && (
          <ModernCard className="p-6">
            {/* Achats consommés */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-6 text-orange-400">
                {fecData.achats_consommes.titre}
              </h3>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-105 shadow-lg">
                <div className="text-center">
                  <div className="text-3xl font-black text-white mb-3">
                    {fecData.achats_consommes.total.toLocaleString('fr-FR')} €
                  </div>
                  <div className="text-xs text-gray-400">
                    Matières premières: {fecData.achats_consommes.matieres_premieres?.toLocaleString('fr-FR') || 0} € | 
                    Sous-traitance: {fecData.achats_consommes.sous_traitance?.toLocaleString('fr-FR') || 0} €
                  </div>
                </div>
              </div>
            </div>

            {/* Coûts salariaux */}
            {fecData.couts_salariaux && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-6 text-gray-400">
                  Coûts salariaux
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Production */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-105 shadow-lg">
                    <h4 className="text-sm font-semibold mb-4 text-blue-400 uppercase tracking-wide">Production</h4>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-300">Brut :</span>
                        <span className="text-sm font-semibold text-white">{fecData.couts_salariaux.personnel_production.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-300">Charges patronales :</span>
                        <span className="text-sm font-semibold text-white">{fecData.couts_salariaux.charges_patronales_p.toLocaleString('fr-FR')} €</span>
                      </div>
                      {typeof fecData.couts_salariaux.supplements_p === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-300">Suppléments coût global :</span>
                          <span className="text-sm font-semibold text-white">{fecData.couts_salariaux.supplements_p.toLocaleString('fr-FR')} €</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-600/50 pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-400">Total :</span>
                        <span className="text-lg font-bold text-white">{fecData.couts_salariaux.total_production.toLocaleString('fr-FR')} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Administration */}
                  <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-105 shadow-lg">
                    <h4 className="text-sm font-semibold mb-4 text-purple-400 uppercase tracking-wide">Administration</h4>
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-300">Brut :</span>
                        <span className="text-sm font-semibold text-white">{fecData.couts_salariaux.personnel_adm.toLocaleString('fr-FR')} €</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-300">Charges patronales :</span>
                        <span className="text-sm font-semibold text-white">{fecData.couts_salariaux.charges_patronales_hp.toLocaleString('fr-FR')} €</span>
                      </div>
                      {typeof fecData.couts_salariaux.supplements_hp === 'number' && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-300">Suppléments coût global :</span>
                          <span className="text-sm font-semibold text-white">{fecData.couts_salariaux.supplements_hp.toLocaleString('fr-FR')} €</span>
                        </div>
                      )}
                    </div>
                    <div className="border-t border-gray-600/50 pt-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-semibold text-gray-400">Total :</span>
                        <span className="text-lg font-bold text-white">{fecData.couts_salariaux.total_adm.toLocaleString('fr-FR')} €</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charges directes */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-blue-400">
                Charges directes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fecData.charges_directes.map((charge, index) => 
                  renderChargeCard(charge, 'text-blue-400')
                )}
              </div>
            </div>

            {/* Coûts directs */}
            <div className="mb-8">
              <h3 className={`text-lg font-semibold mb-6 ${getValueColor(calculerCoutsDirects())}`}>
                Coûts directs
              </h3>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-105 shadow-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-3">Calcul automatique</div>
                  <div className="text-3xl font-black text-white">
                    {calculerCoutsDirects().toLocaleString('fr-FR')} €
                  </div>
                </div>
              </div>
            </div>

            {/* Marge sur coûts directs */}
            <div className="mb-8">
              <h3 className={`text-lg font-semibold mb-6 ${getValueColor(calculerMargeSurCoutsDirects())}`}>
                Marge sur coûts directs
              </h3>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-105 shadow-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-3">Calcul automatique</div>
                  <div className="text-3xl font-black text-white">
                    {calculerMargeSurCoutsDirects().toLocaleString('fr-FR')} €
                  </div>
                </div>
              </div>
            </div>

            {/* Charges indirectes */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-purple-400">
                Charges indirectes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fecData.charges_indirectes
                  .filter(charge => !(charge.CompteLib === 'AUTRES PRODUITS ET CHARGES' && charge.CompteNum === 'modifiable'))
                  .map((charge, index) => 
                    renderChargeCard(charge, 'text-purple-400')
                  )}
              </div>
            </div>

            {/* Total charges indirectes */}
            <div className="mb-8">
              <h3 className={`text-lg font-semibold mb-6 ${getValueColor(calculerTotalChargesIndirectes())}`}>
                Total charges indirectes
              </h3>
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600/50 hover:border-gray-500/70 transition-all duration-300 hover:scale-105 shadow-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-400 mb-3">Calcul automatique</div>
                  <div className="text-3xl font-black text-white">
                    {calculerTotalChargesIndirectes().toLocaleString('fr-FR')} €
                  </div>
                </div>
              </div>
            </div>

            {/* Résultats financiers et exceptionnels */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-400">
                Résultats financiers et exceptionnels
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Dotations aux amortissements */}
                <div className={`rounded-lg p-4 ${
                  (editableValues['Dotations aux amortissements_modifiable'] || 0) === 0 
                    ? 'bg-[#1a1d24] border-2 border-dashed border-gray-500' 
                    : 'bg-[#23262c]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">Dotations aux amortissements</div>
                    <button
                      onClick={() => editingField === 'Dotations aux amortissements_modifiable' ? setEditingField(null) : setEditingField('Dotations aux amortissements_modifiable')}
                      className="text-xs text-gray-400 hover:text-blue-400 cursor-pointer opacity-60 hover:opacity-100"
                    >
                      {editingField === 'Dotations aux amortissements_modifiable' ? '✓' : '●'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">modifiable</div>
                  {editingField === 'Dotations aux amortissements_modifiable' ? (
                    <input
                      type="number"
                      value={(editableValues['Dotations aux amortissements_modifiable'] || 0).toString()}
                      onChange={(e) => handleEditableChange({ CompteLib: 'Dotations aux amortissements', CompteNum: 'modifiable' } as FECCharge, e.target.value)}
                      onKeyDown={(e) => handleEditableKeyDown({ CompteLib: 'Dotations aux amortissements', CompteNum: 'modifiable' } as FECCharge, e)}
                      onFocus={() => setEditingField('Dotations aux amortissements_modifiable')}
                      onBlur={() => setEditingField(null)}
                      className="text-lg font-bold text-red-400 bg-transparent border-b border-gray-600 focus:border-blue-400 focus:outline-none w-full"
                      step="0.01"
                      min="-999999999"
                      autoFocus
                    />
                  ) : (
                    <div className={`text-lg font-bold text-red-400 ${
                      (editableValues['Dotations aux amortissements_modifiable'] || 0) === 0 ? 'text-gray-500' : ''
                    }`}>
                      {(editableValues['Dotations aux amortissements_modifiable'] || 0).toLocaleString('fr-FR')} €
                    </div>
                  )}
                </div>

                {/* Charges financières */}
                <div className={`rounded-lg p-4 ${
                  (editableValues['Charges financières_modifiable'] || 0) === 0 
                    ? 'bg-[#1a1d24] border-2 border-dashed border-gray-500' 
                    : 'bg-[#23262c]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">Charges financières</div>
                    <button
                      onClick={() => editingField === 'Charges financières_modifiable' ? setEditingField(null) : setEditingField('Charges financières_modifiable')}
                      className="text-xs text-gray-400 hover:text-blue-400 cursor-pointer opacity-60 hover:opacity-100"
                    >
                      {editingField === 'Charges financières_modifiable' ? '✓' : '●'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">modifiable</div>
                  {editingField === 'Charges financières_modifiable' ? (
                    <input
                      type="number"
                      value={(editableValues['Charges financières_modifiable'] || 0).toString()}
                      onChange={(e) => handleEditableChange({ CompteLib: 'Charges financières', CompteNum: 'modifiable' } as FECCharge, e.target.value)}
                      onKeyDown={(e) => handleEditableKeyDown({ CompteLib: 'Charges financières', CompteNum: 'modifiable' } as FECCharge, e)}
                      onFocus={() => setEditingField('Charges financières_modifiable')}
                      onBlur={() => setEditingField(null)}
                      className="text-lg font-bold text-red-400 bg-transparent border-b border-gray-600 focus:border-blue-400 focus:outline-none w-full"
                      step="0.01"
                      min="-999999999"
                      autoFocus
                    />
                  ) : (
                    <div className={`text-lg font-bold text-red-400 ${
                      (editableValues['Charges financières_modifiable'] || 0) === 0 ? 'text-gray-500' : ''
                    }`}>
                      {(editableValues['Charges financières_modifiable'] || 0).toLocaleString('fr-FR')} €
                    </div>
                  )}
                </div>

                {/* Produits financiers */}
                <div className={`rounded-lg p-4 ${
                  (editableValues['Produits financiers_modifiable'] || 0) === 0 
                    ? 'bg-[#1a1d24] border-2 border-dashed border-gray-500' 
                    : 'bg-[#23262c]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">Produits financiers</div>
                    <button
                      onClick={() => editingField === 'Produits financiers_modifiable' ? setEditingField(null) : setEditingField('Produits financiers_modifiable')}
                      className="text-xs text-gray-400 hover:text-blue-400 cursor-pointer opacity-60 hover:opacity-100"
                    >
                      {editingField === 'Produits financiers_modifiable' ? '✓' : '●'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">modifiable</div>
                  {editingField === 'Produits financiers_modifiable' ? (
                    <input
                      type="number"
                      value={(editableValues['Produits financiers_modifiable'] || 0).toString()}
                      onChange={(e) => handleEditableChange({ CompteLib: 'Produits financiers', CompteNum: 'modifiable' } as FECCharge, e.target.value)}
                      onKeyDown={(e) => handleEditableKeyDown({ CompteLib: 'Produits financiers', CompteNum: 'modifiable' } as FECCharge, e)}
                      onFocus={() => setEditingField('Produits financiers_modifiable')}
                      onBlur={() => setEditingField(null)}
                      className="text-lg font-bold text-green-400 bg-transparent border-b border-gray-600 focus:border-blue-400 focus:outline-none w-full"
                      step="0.01"
                      min="-999999999"
                      autoFocus
                    />
                  ) : (
                    <div className={`text-lg font-bold text-green-400 ${
                      (editableValues['Produits financiers_modifiable'] || 0) === 0 ? 'text-gray-500' : ''
                    }`}>
                      {(editableValues['Produits financiers_modifiable'] || 0).toLocaleString('fr-FR')} €
                    </div>
                  )}
                </div>

                {/* Résultat exceptionnel */}
                <div className={`rounded-lg p-4 ${
                  (editableValues['Résultat exceptionnel_modifiable'] || 0) === 0 
                    ? 'bg-[#1a1d24] border-2 border-dashed border-gray-500' 
                    : 'bg-[#23262c]'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">Résultat exceptionnel</div>
                    <button
                      onClick={() => editingField === 'Résultat exceptionnel_modifiable' ? setEditingField(null) : setEditingField('Résultat exceptionnel_modifiable')}
                      className="text-xs text-gray-400 hover:text-blue-400 cursor-pointer opacity-60 hover:opacity-100"
                    >
                      {editingField === 'Résultat exceptionnel_modifiable' ? '✓' : '●'}
                    </button>
                  </div>
                  <div className="text-xs text-gray-400 mb-2">modifiable</div>
                  {editingField === 'Résultat exceptionnel_modifiable' ? (
                    <input
                      type="number"
                      value={(editableValues['Résultat exceptionnel_modifiable'] || 0).toString()}
                      onChange={(e) => handleEditableChange({ CompteLib: 'Résultat exceptionnel', CompteNum: 'modifiable' } as FECCharge, e.target.value)}
                      onKeyDown={(e) => handleEditableKeyDown({ CompteLib: 'Résultat exceptionnel', CompteNum: 'modifiable' } as FECCharge, e)}
                      onFocus={() => setEditingField('Résultat exceptionnel_modifiable')}
                      onBlur={() => setEditingField(null)}
                      className="text-lg font-bold text-blue-400 bg-transparent border-b border-gray-600 focus:border-blue-400 focus:outline-none w-full"
                      step="0.01"
                      min="-999999999"
                      autoFocus
                    />
                  ) : (
                    <div className={`text-lg font-bold text-blue-400 ${
                      (editableValues['Résultat exceptionnel_modifiable'] || 0) === 0 ? 'text-gray-500' : ''
                    }`}>
                      {(editableValues['Résultat exceptionnel_modifiable'] || 0).toLocaleString('fr-FR')} €
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ModernCard>
        )}

        {/* Modale d'upload */}
        <ModernUploadModal open={showUpload} onClose={() => setShowUpload(false)} onFileChosen={handleFileChosen} />
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
