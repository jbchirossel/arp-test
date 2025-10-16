'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckSquare, Square, Archive, RotateCcw, Filter, Search, Plus, Calendar, User, Clock, Tag, X, Minus, Wrench, Settings, FileText, AlertTriangle, RefreshCw, LayoutDashboard, BarChart3, LogOut, Sun, Moon, MessageSquare, Edit3, Package, Cpu, FileSpreadsheet, Printer, Users } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import ProfileAvatar from '../components/ProfileAvatar';
import Notification, { useNotification } from '../components/Notification';
import TodoList from '../gantt/components/TodoList';
import { getMyAssignments, createAssignment, toggleAssignment, getChecklistItems, getGanttData } from '@/lib/supabase-gantt';
import AuthGuard from '../components/AuthGuard';
import { useAuth } from '../contexts/AuthContext';

type Todo = {
  id: number;
  title: string;
  description?: string;
  done: boolean;
  task_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  task_title?: string;
  task_ensemble_id?: number;
  ensemble_name?: string;
  machine_name?: string;
};

type SimpleTodo = {
  id: number;
  text: string;
  done: boolean;
};



// Composant HamburgerMenu (même pattern que sur Gantt)
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

      {mounted && open && (
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
        </>
      )}
    </div>
  );
}

export default function TodoPage() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  const { user, profile, session, signOut, loading, role: userRole } = useAuth();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [archived, setArchived] = useState<Todo[]>([]);
  const [taskTodosMap, setTaskTodosMap] = useState<Record<number, SimpleTodo[]>>({});
  const [loadingTaskTodos, setLoadingTaskTodos] = useState<Record<number, boolean>>({});
  const [taskWeeks, setTaskWeeks] = useState<Record<number, { start: number; end: number }>>({});

  const [showArchive, setShowArchive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [newTodo, setNewTodo] = useState('');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [collapsedCardIds, setCollapsedCardIds] = useState<Record<number, boolean>>({});
  
  // États pour la recherche modale
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchModalTerm, setSearchModalTerm] = useState('');

  const fullName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : '';
  const username = profile?.email?.split('@')[0] || '';
  const role = userRole;

  // Gérer le thème au chargement (même logique que Dashboard)
  useEffect(() => {
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const systemDark = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    setIsDarkMode(!!shouldBeDark);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', !!shouldBeDark);
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    }
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', newDarkMode);
    }
  };

  // Fermer le menu utilisateur si clic extérieur
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

  const handleLogout = async () => {
    await signOut?.();
    showNotification('success', 'Déconnexion', 'Vous avez été déconnecté avec succès.');
    setTimeout(() => {
      router.replace('/login');
    }, 800);
  };

  useEffect(() => {
    if (profile) {
      fetchTodos();
    }
  }, [refresh, profile]);

  const fetchTodos = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data: any = await getMyAssignments();
      setTodos(data);

      // Charger les todos détaillées pour chaque tâche liée
      const uniqueTaskIds: number[] = Array.from(new Set((data || []).map((t: Todo) => t.task_id).filter((id: number | undefined): id is number => typeof id === 'number')));
      if (uniqueTaskIds.length > 0) {
        await Promise.all([
          loadTaskTodos(uniqueTaskIds),
          loadTaskWeeks(uniqueTaskIds),
        ]);
      } else {
        setTaskTodosMap({});
      }
    } catch (err: any) {
      console.error('Erreur fetchTodos:', err);
      setError(err.message || 'Erreur');
    }
    setIsLoading(false);
  };

  const toggleCollapsedCard = (todoId: number) => {
    setCollapsedCardIds(prev => ({ ...prev, [todoId]: !prev[todoId] }));
  };

  const loadTaskTodos = async (taskIds: number[]) => {
    const newLoading: Record<number, boolean> = {};
    taskIds.forEach(id => { newLoading[id] = true; });
    setLoadingTaskTodos(prev => ({ ...prev, ...newLoading }));

    try {
      const results = await Promise.all(taskIds.map(async (taskId) => {
        try {
          const items = await getChecklistItems(taskId);
          const list: SimpleTodo[] = (items || [])
            .map((t) => ({ id: t.id, text: t.text, done: t.done }));
          return { taskId, todos: list };
        } catch (error) {
          console.error(`Error loading checklist for task ${taskId}:`, error);
          return { taskId, todos: [] as SimpleTodo[] };
        }
      }));

      const mapUpdate: Record<number, SimpleTodo[]> = {};
      results.forEach(({ taskId, todos }) => { mapUpdate[taskId] = todos; });
      setTaskTodosMap(prev => ({ ...prev, ...mapUpdate }));
    } finally {
      const cleared: Record<number, boolean> = {};
      taskIds.forEach(id => { cleared[id] = false; });
      setLoadingTaskTodos(prev => ({ ...prev, ...cleared }));
    }
  };

  const setTodosForTask = (taskId: number) => (updater: React.SetStateAction<SimpleTodo[]>) => {
    setTaskTodosMap(prev => ({
      ...prev,
      [taskId]: typeof updater === 'function' ? (updater as (prev: SimpleTodo[]) => SimpleTodo[])(prev[taskId] || []) : updater,
    }));
  };

  // Helpers priorité dynamique
  const getISOWeek = (date: Date) => {
    const tmp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    // Jeudi de la semaine courante
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
  };

  const getDynamicPriority = (startWeek: number, endWeek: number) => {
    const currentWeek = getISOWeek(new Date());
    const weeksFromStart = Math.max(0, currentWeek - startWeek);
    if (weeksFromStart < 3) {
      return { label: 'Pas urgent', cls: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' };
    }
    if (weeksFromStart < 6) {
      return { label: 'Moyennement urgent', cls: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300' };
    }
    return { label: 'Urgent', cls: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' };
  };

  const loadTaskWeeks = async (taskIds: number[]) => {
    try {
      const data = await getGanttData(2025);
      const map: Record<number, { start: number; end: number }> = {};
      (data.tasks || []).forEach((t) => {
        if (taskIds.includes(t.id)) {
          map[t.id] = { start: t.start_week, end: t.end_week };
        }
      });
      if (Object.keys(map).length > 0) {
        setTaskWeeks(prev => ({ ...prev, ...map }));
      }
    } catch (error) {
      console.error('Error loading task weeks:', error);
    }
  };

  // Fonction pour ouvrir la modal de recherche
  const openSearchModal = () => {
    setSearchModalTerm(searchTerm);
    setShowSearchModal(true);
  };

  // Fonction pour appliquer la recherche depuis la modal
  const applySearch = () => {
    setSearchTerm(searchModalTerm);
    setShowSearchModal(false);
  };

  // Fonction pour effacer la recherche
  const clearSearch = () => {
    setSearchTerm('');
    setSearchModalTerm('');
  };

  // Fonction pour générer des suggestions intelligentes basées sur les données disponibles
  const generateSmartSuggestions = () => {
    const suggestions = [];
    
    // Extraire les données uniques des todos
    const machines = Array.from(new Set(todos.map(t => t.machine_name).filter(Boolean)));
    const ensembles = Array.from(new Set(todos.map(t => t.ensemble_name).filter(Boolean)));
    const taskTypes = Array.from(new Set(todos.map(t => t.task_title).filter(Boolean)));
    
    // Suggestions basées sur les machines
    machines.forEach(machine => {
      suggestions.push({
        text: machine,
        category: 'machine',
        icon: 'Wrench',
        description: `Machine ${machine}`
      });
    });
    
    // Suggestions basées sur les ensembles
    ensembles.forEach(ensemble => {
      suggestions.push({
        text: ensemble,
        category: 'ensemble',
        icon: 'Settings',
        description: `Ensemble ${ensemble}`
      });
    });
    
    // Suggestions basées sur les types de tâches
    taskTypes.forEach(type => {
      suggestions.push({
        text: type,
        category: 'task_type',
        icon: 'FileText',
        description: `Type de tâche ${type}`
      });
    });
    
    // Suggestions basées sur l'urgence dynamique
    const urgentTasks = todos.filter(todo => {
      if (!todo.task_id || !taskWeeks[todo.task_id]) return false;
      const weeks = taskWeeks[todo.task_id];
      const prio = getDynamicPriority(weeks.start, weeks.end);
      return prio.label === 'Urgent';
    });
    
    if (urgentTasks.length > 0) {
      suggestions.push({
        text: 'urgent',
        category: 'priority',
        icon: 'AlertTriangle',
        description: `${urgentTasks.length} tâche(s) urgente(s)`
      });
    }
    
    // Suggestions basées sur les semaines actuelles
    const currentWeek = getISOWeek(new Date());
    const currentWeekTasks = todos.filter(todo => {
      if (!todo.task_id || !taskWeeks[todo.task_id]) return false;
      const weeks = taskWeeks[todo.task_id];
      return weeks.start <= currentWeek && weeks.end >= currentWeek;
    });
    
    if (currentWeekTasks.length > 0) {
      suggestions.push({
        text: `semaine ${currentWeek}`,
        category: 'week',
        icon: 'Calendar',
        description: `${currentWeekTasks.length} tâche(s) cette semaine`
      });
    }
    
    // Suggestions basées sur le statut
    const pendingTasks = todos.filter(t => !t.done);
    const completedTasks = todos.filter(t => t.done);
    
    if (pendingTasks.length > 0) {
      suggestions.push({
        text: 'en cours',
        category: 'status',
        icon: 'RefreshCw',
        description: `${pendingTasks.length} tâche(s) en cours`
      });
    }
    
    if (completedTasks.length > 0) {
      suggestions.push({
        text: 'terminé',
        category: 'status',
        icon: 'CheckSquare',
        description: `${completedTasks.length} tâche(s) terminée(s)`
      });
    }
    
    return suggestions;
  };

  // Fonction pour filtrer les suggestions en fonction du terme de recherche
  const getFilteredSuggestions = (searchTerm: string) => {
    const allSuggestions = generateSmartSuggestions();
    if (!searchTerm) return allSuggestions.slice(0, 8); // Limiter à 8 suggestions par défaut
    
    return allSuggestions
      .filter(suggestion => 
        suggestion.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        suggestion.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 6); // Limiter à 6 suggestions filtrées
  };


  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;

    try {
      if (!selectedTask) {
        showNotification('error', 'Erreur', 'Veuillez sélectionner une tâche liée');
        return;
      }
      const newTodoItem: any = await createAssignment({
        title: text,
        description: '',
        task_id: selectedTask,
        user_id: profile!.id,
      } as any);
      setTodos(prev => [...prev, newTodoItem]);
      setNewTodo('');
      setSelectedTask(null);
      showNotification('success', 'Succès', 'Tâche ajoutée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la todo:', error);
      showNotification('error', 'Erreur', 'Impossible d\'ajouter la tâche');
    }
  };

  const toggleTodo = async (todoId: number, currentDone: boolean) => {
    try {
      await toggleAssignment(todoId, !currentDone);
      setTodos(prev =>
        prev.map(todo => (todo.id === todoId ? { ...todo, done: !currentDone } : todo))
      );
      showNotification('success', 'Succès', 'Tâche mise à jour');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la todo:', error);
      showNotification('error', 'Erreur', 'Impossible de mettre à jour la tâche');
    }
  };

  

  const archiveTodo = (todo: Todo) => {
    const confirmed = confirm('Archiver cette tâche ? Elle sera retirée de la liste principale.');
    if (!confirmed) return;

    if (archived.some(t => t.id === todo.id)) return;

    const newArchived = [...archived, todo];
    localStorage.setItem('archivedTodos', JSON.stringify(newArchived));
    setArchived(newArchived);
    setTodos(prev => prev.filter(t => t.id !== todo.id));
    showNotification('success', 'Succès', 'Tâche archivée');
  };

  const clearArchives = () => {
    localStorage.removeItem('archivedTodos');
    setArchived([]);
    showNotification('success', 'Succès', 'Archives vidées');
  };



  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-500 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-500 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const filteredTodos = todos.filter(todo => {
    // Recherche améliorée qui prend en compte toutes les nouvelles informations
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      todo.title.toLowerCase().includes(searchLower) ||
      (todo.machine_name && todo.machine_name.toLowerCase().includes(searchLower)) ||
      (todo.ensemble_name && todo.ensemble_name.toLowerCase().includes(searchLower)) ||
      (todo.task_title && todo.task_title.toLowerCase().includes(searchLower)) ||
      // Recherche par urgence
      (searchLower === 'urgent' && todo.task_id && taskWeeks[todo.task_id] && 
       getDynamicPriority(taskWeeks[todo.task_id].start, taskWeeks[todo.task_id].end).label === 'Urgent') ||
      // Recherche par semaine
      (searchLower.startsWith('semaine ') && todo.task_id && taskWeeks[todo.task_id]) ||
      // Recherche par statut
      (searchLower === 'en cours' && !todo.done) ||
      (searchLower === 'terminé' && todo.done);
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'pending' && !todo.done) ||
      (filterStatus === 'completed' && todo.done);
    const matchesPriority = filterPriority === 'all';
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] flex items-center justify-center">
        <div className="text-xl text-gray-800 dark:text-white animate-pulse">Chargement des tâches...</div>
      </main>
    );
  }

  return (
    <AuthGuard requireAuth={true} requireApproved={true}>
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white relative">
      {/* Fond animé */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-blue-500/15 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-blue-600/8 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-blue-400/12 rounded-full blur-lg animate-pulse" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-blue-700/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
        
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#7f49e8]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/3 w-24 h-24 bg-[#8c68d8]/15 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[#7a5bc4]/8 rounded-full blur-2xl animate-pulse dark:block hidden" style={{ animationDelay: '2s', animationDuration: '8s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-[#9d7ce8]/12 rounded-full blur-lg animate-pulse dark:block hidden" style={{ animationDelay: '3s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-36 h-36 bg-[#6b46c1]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '4s', animationDuration: '7s' }}></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6">
        <div className="flex justify-between items-center mb-6 relative">
          <div className="flex items-center gap-3">
            <HamburgerMenu
              items={[
                { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
                { label: "Gantt", href: "/gantt", icon: <BarChart3 className="w-4 h-4" /> },
                { label: "Todo", href: "/todo", icon: <CheckSquare className="w-4 h-4" /> },
                { label: "Machines", href: "/machines", icon: <Cpu className="w-4 h-4" /> },
              ]}
            />
          </div>

          <h1 className="text-3xl font-extrabold flex items-center gap-3 text-blue-600 dark:text-purple-400">
            <CheckSquare className="w-8 h-8" />
            Mes Tâches Assignées
          </h1>

          <div className="flex items-center gap-3">
            <ProfileAvatar
              fullName={fullName}
              size="lg"
              onClick={() => setShowUserMenu(!showUserMenu)}
              showUploadButton={false}
            />
          </div>

          {showUserMenu && (
            <div
              ref={userMenuRef}
              className="absolute top-20 right-0 bg-white/40 dark:bg-gradient-to-br dark:from-gray-900/95 dark:to-gray-800/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 w-72 border border-gray-200/50 dark:border-white/10 z-[9999] animate-in slide-in-from-top-2 duration-300"
            >
              {/* Header avec avatar (identique Dashboard) */}
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-white/10">
                <ProfileAvatar
                  fullName={fullName || username || 'Utilisateur'}
                  size="md"
                  showUploadButton={true}
                />
                <div className="flex-1">
                  <div className="text-lg font-bold text-gray-800 dark:text-white">{fullName || 'Utilisateur'}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">@{username || 'user'}</div>
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
                    <div className="text-gray-800 dark:text-white font-medium">{role === 'admin' ? 'Administrateur' : 'Utilisateur'}</div>
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
                    <div className="text-gray-800 dark:text-white font-medium">{isDarkMode ? 'Mode sombre' : 'Mode clair'}</div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                      isDarkMode ? 'bg-blue-500 focus:ring-blue-300' : 'bg-yellow-400 focus:ring-yellow-300'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 rounded-full shadow-md transform transition-all duration-300 flex items-center justify-center ${
                        isDarkMode ? 'translate-x-6 bg-gray-800' : 'translate-x-0.5 bg-white'
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



        {/* Section d'information supprimée */}

        {/* Liste des tâches */}
        <div className="space-y-4">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
                  ? 'Aucune tâche ne correspond aux critères'
                  : 'Aucune tâche assignée pour le moment'
                }
              </p>
            </div>
          ) : (
            filteredTodos.map((todo) => {
              return (
                <div
                  key={todo.id}
                  className={`bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/50 dark:border-white/20 transition-all duration-300 hover:shadow-lg ${
                    todo.done ? 'opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTodo(todo.id, todo.done)}
                      className="text-blue-500 dark:text-purple-400 hover:text-blue-600 dark:hover:text-purple-500 cursor-pointer active:scale-95 transition-transform mt-1"
                    >
                      {todo.done ? (
                        <CheckSquare className="w-6 h-6" />
                      ) : (
                        <Square className="w-6 h-6" />
                      )}
                    </button>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className={`text-lg font-semibold ${
                              todo.done ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-white'
                            }`}>
                              {[
                                todo.machine_name,
                                todo.ensemble_name,
                                todo.task_title,
                              ].filter(Boolean).join(' - ') || todo.title}
                            </h3>
                            {/* En mode réduit, afficher semaines + urgence + statut à droite du titre */}
                            {collapsedCardIds[todo.id] && typeof todo.task_id === 'number' && taskWeeks[todo.task_id] && (() => {
                              const weeks = taskWeeks[todo.task_id];
                              const prio = getDynamicPriority(weeks.start, weeks.end);
                              const taskTodos = taskTodosMap[todo.task_id] || [];
                              const completedTodos = taskTodos.filter(t => t.done).length;
                              const totalTodos = taskTodos.length;
                              
                              // Logique de statut
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
                                    <Calendar className="w-4 h-4" />
                                    <span>{`S${weeks.start}-S${weeks.end}`}</span>
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusClass}`}>{statusLabel}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${prio.cls}`}>{prio.label}</span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Liste des sous-tâches au même format que dans le Gantt */}
                          {!collapsedCardIds[todo.id] && typeof todo.task_id === 'number' && taskWeeks[todo.task_id] && (() => {
                            const weeks = taskWeeks[todo.task_id];
                            const prio = getDynamicPriority(weeks.start, weeks.end);
                            const taskTodos = taskTodosMap[todo.task_id] || [];
                            const completedTodos = taskTodos.filter(t => t.done).length;
                            const totalTodos = taskTodos.length;
                            
                            // Logique de statut
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
                                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{`S${weeks.start}-S${weeks.end}`}</span>
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${statusClass}`}>{statusLabel}</span>
                                  <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${prio.cls}`}>{prio.label}</span>
                                </div>
                              );
                          })()}

                          {!collapsedCardIds[todo.id] && (
                            typeof todo.task_id === 'number' && (
                              <div className="mt-4">
                                <TodoList
                                  taskId={todo.task_id}
                                  todos={taskTodosMap[todo.task_id] || []}
                                  setTodos={setTodosForTask(todo.task_id)}
                                />
                              </div>
                            )
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleCollapsedCard(todo.id)}
                            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            title={collapsedCardIds[todo.id] ? 'Agrandir' : 'Réduire'}
                            type="button"
                          >
                            {collapsedCardIds[todo.id] ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          </button>
                          {todo.done && (
                            <button
                              onClick={() => archiveTodo(todo)}
                              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                              title="Archiver"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          {/* Suppression désactivée : seul l'archivage est autorisé */}
                        </div>
                      </div>
                      {/* Footer: date en bas */}
                      {!collapsedCardIds[todo.id] && (
                        <div className="mt-4 pt-3 border-t border-white/40 dark:border-white/10 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>Créée le {new Date(todo.created_at).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Boutons flottants */}
        <div className="fixed bottom-6 right-6 flex flex-col gap-3">
          {/* Bouton de recherche */}
          <button
            onClick={openSearchModal}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
            title="Rechercher des tâches"
          >
            <Search className="w-5 h-5" />
          </button>
          
          {/* Bouton d'archives */}
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="bg-gray-700 hover:bg-gray-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
            title={showArchive ? "Fermer les archives" : "Voir les tâches archivées"}
          >
            {showArchive ? (
              <span className="text-xl font-bold">×</span>
            ) : (
              <Archive className="w-5 h-5" />
            )}
          </button>
          {archived.length > 0 && (
            <button
              onClick={clearArchives}
              className="bg-red-600 hover:bg-red-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg cursor-pointer active:scale-95 transition-transform"
              title="Vider les archives"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Section Archives */}
        {showArchive && (
          <div className="mt-12 bg-white/20 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/30 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-purple-400 flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Tâches archivées ({archived.length})
              </h2>
              <button
                onClick={() => setShowArchive(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors p-1"
                title="Fermer les archives"
              >
                <span className="text-2xl font-bold">×</span>
              </button>
            </div>
            {archived.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">Aucune tâche archivée.</p>
            ) : (
              <div className="space-y-3">
                {archived.map(todo => (
                  <div key={todo.id} className="bg-white/20 dark:bg-white/10 rounded-xl p-4 border border-white/30 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <CheckSquare className="w-5 h-5 text-green-500" />
                      <div className="flex-1">
                        <div className="font-medium text-gray-700 dark:text-gray-300 line-through">
                          {todo.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Archivée le {new Date(todo.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de recherche */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
          <div className="relative z-10 bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10">
            <button
              onClick={() => setShowSearchModal(false)}
              className="absolute top-3 right-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white cursor-pointer active:scale-95 transition-transform"
              aria-label="Fermer"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
                Rechercher des tâches
              </h2>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tapez votre recherche..."
                  value={searchModalTerm}
                  onChange={(e) => setSearchModalTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  className="w-full pl-12 pr-4 py-4 bg-white/60 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 text-lg"
                  autoFocus
                />
                
                {/* Suggestions en temps réel */}
                {searchModalTerm && searchModalTerm.length > 1 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-xl border border-white/50 dark:border-white/30 shadow-lg z-10 max-h-60 overflow-y-auto">
                    {getFilteredSuggestions(searchModalTerm).slice(0, 4).map((suggestion) => {
                      const getIcon = (iconName: string) => {
                        switch (iconName) {
                          case 'Wrench': return <Wrench className="w-5 h-5" />;
                          case 'Settings': return <Settings className="w-5 h-5" />;
                          case 'FileText': return <FileText className="w-5 h-5" />;
                          case 'AlertTriangle': return <AlertTriangle className="w-5 h-5" />;
                          case 'Calendar': return <Calendar className="w-5 h-5" />;
                          case 'RefreshCw': return <RefreshCw className="w-5 h-5" />;
                          case 'CheckSquare': return <CheckSquare className="w-5 h-5" />;
                          default: return <Search className="w-5 h-5" />;
                        }
                      };
                      
                      return (
                        <button
                          key={suggestion.text}
                          onClick={() => {
                            setSearchModalTerm(suggestion.text);
                            applySearch();
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center gap-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                          type="button"
                        >
                          {getIcon(suggestion.icon)}
                          <div className="flex-1">
                            <div className="font-medium text-gray-800 dark:text-white">
                              {suggestion.text}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {suggestion.description}
                            </div>
                          </div>
                          <span className="text-xs text-blue-500 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                            {suggestion.category}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Suggestions de recherche intelligentes */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Suggestions :
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {getFilteredSuggestions(searchModalTerm).slice(0, 6).map((suggestion) => {
                    const getIcon = (iconName: string) => {
                      switch (iconName) {
                        case 'Wrench': return <Wrench className="w-4 h-4" />;
                        case 'Settings': return <Settings className="w-4 h-4" />;
                        case 'FileText': return <FileText className="w-4 h-4" />;
                        case 'AlertTriangle': return <AlertTriangle className="w-4 h-4" />;
                        case 'Calendar': return <Calendar className="w-4 h-4" />;
                        case 'RefreshCw': return <RefreshCw className="w-4 h-4" />;
                        case 'CheckSquare': return <CheckSquare className="w-4 h-4" />;
                        default: return <Search className="w-4 h-4" />;
                      }
                    };
                    
                    return (
                      <button
                        key={suggestion.text}
                        onClick={() => {
                          setSearchModalTerm(suggestion.text);
                          applySearch();
                        }}
                        className="px-2 py-1.5 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors text-sm flex items-center gap-1.5"
                        type="button"
                      >
                        {getIcon(suggestion.icon)}
                        <span className="font-medium">{suggestion.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Statistiques de recherche simplifiées */}
              {searchModalTerm && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800/30">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">{filteredTodos.length}</span> résultat(s)
                    </div>
                    {filteredTodos.length > 0 && (
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          {filteredTodos.filter(t => !t.done).length} en cours
                        </span>
                        <span className="text-blue-600 dark:text-blue-400">
                          {filteredTodos.filter(t => t.done).length} terminées
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowSearchModal(false)}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-sm"
                type="button"
              >
                Annuler
              </button>
              {searchModalTerm && (
                <button
                  onClick={clearSearch}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors font-medium text-sm"
                  type="button"
                >
                  Effacer
                </button>
              )}
              <button
                onClick={applySearch}
                className="flex-1 px-3 py-2 bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
                type="button"
              >
                Rechercher
              </button>
            </div>
          </div>
        </div>
      )}

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