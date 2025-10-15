'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckSquare, Square, Archive, RotateCcw, Filter, Search, Plus, Calendar, User, Clock, Tag, X, Minus, Wrench, Settings, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import ProfileAvatar from '../components/ProfileAvatar';
import Notification, { useNotification } from '../components/Notification';
import TodoList from '../gantt/components/TodoList';

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



export default function TodoPage() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [archived, setArchived] = useState<Todo[]>([]);
  const [taskTodosMap, setTaskTodosMap] = useState<Record<number, SimpleTodo[]>>({});
  const [loadingTaskTodos, setLoadingTaskTodos] = useState<Record<number, boolean>>({});
  const [taskWeeks, setTaskWeeks] = useState<Record<number, { start: number; end: number }>>({});

  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [newTodo, setNewTodo] = useState('');
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [collapsedCardIds, setCollapsedCardIds] = useState<Record<number, boolean>>({});
  
  // États pour la recherche modale
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchModalTerm, setSearchModalTerm] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    // Récupérer les infos utilisateur
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) throw new Error();
      const user = await res.json();
      setFullName(`${user.first_name} ${user.last_name}`.trim());
      setUsername(user.username);
    })
    .catch(() => {
      showNotification('error', 'Erreur de session', 'Votre session a expiré. Veuillez vous reconnecter.');
      setTimeout(() => router.replace('/login'), 1500);
    });

    fetchTodos();
  }, [refresh]);

  const fetchTodos = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Non connecté');
      
      // Récupérer uniquement les assignments assignés à l'utilisateur connecté
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/my-assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error('Erreur de récupération des todos');
      }
      
      const data: Todo[] = await res.json();
      setTodos(data);

      // Charger les todos détaillées pour chaque tâche liée
      const uniqueTaskIds = Array.from(new Set((data || []).map((t: Todo) => t.task_id).filter((id: number | undefined): id is number => typeof id === 'number')));
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
    setLoading(false);
  };

  const toggleCollapsedCard = (todoId: number) => {
    setCollapsedCardIds(prev => ({ ...prev, [todoId]: !prev[todoId] }));
  };

  const loadTaskTodos = async (taskIds: number[]) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const newLoading: Record<number, boolean> = {};
    taskIds.forEach(id => { newLoading[id] = true; });
    setLoadingTaskTodos(prev => ({ ...prev, ...newLoading }));

    try {
      const results = await Promise.all(taskIds.map(async (taskId) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/task/${taskId}/checklist`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) return { taskId, todos: [] as SimpleTodo[] };
        const data = await res.json();
        const list: SimpleTodo[] = (data || [])
          .map((t: any) => ({ id: t.id, text: t.text, done: t.done }));
        return { taskId, todos: list };
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
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const map: Record<number, { start: number; end: number }> = {};
      (data.tasks || []).forEach((t: any) => {
        if (taskIds.includes(t.id)) {
          map[t.id] = { start: t.start_week, end: t.end_week };
        }
      });
      if (Object.keys(map).length > 0) {
        setTaskWeeks(prev => ({ ...prev, ...map }));
      }
    } catch (_) {
      // silencieux
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

    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text,
          done: false,
          task_id: selectedTask,
        }),
      });

      if (res.ok) {
        const newTodoItem = await res.json();
        setTodos(prev => [...prev, newTodoItem]);
        setNewTodo('');
        setSelectedTask(null);
        showNotification('success', 'Succès', 'Tâche ajoutée avec succès');
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la todo:', error);
      showNotification('error', 'Erreur', 'Impossible d\'ajouter la tâche');
    }
  };

  const toggleTodo = async (todoId: number, currentDone: boolean) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/assignments/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          done: !currentDone,
        }),
      });

      if (res.ok) {
        setTodos(prev =>
          prev.map(todo =>
            todo.id === todoId ? { ...todo, done: !currentDone } : todo
          )
        );
        showNotification('success', 'Succès', 'Tâche mise à jour');
      }
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] flex items-center justify-center">
        <div className="text-xl text-gray-800 dark:text-white animate-pulse">Chargement des tâches...</div>
      </main>
    );
  }

  return (
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
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-800 dark:text-white hover:text-blue-600 dark:hover:text-purple-400 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>
          
                      <h1 className="text-3xl font-extrabold flex items-center gap-3 text-blue-600 dark:text-purple-400">
            <CheckSquare className="w-8 h-8" />
            Mes Tâches Assignées
          </h1>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <ProfileAvatar
              fullName={fullName}
              size="md"
              onClick={() => setShowUserMenu(!showUserMenu)}
              showUploadButton={false}
            />
          </div>
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
  );
} 