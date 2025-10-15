'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import TodoList from './components/TodoList';
import { ArrowLeft, Plus, X, Send, Users, Calendar, Settings, Trash2, CheckSquare, Printer, LayoutDashboard, BarChart3, LogOut, User, Sun, Moon, MessageSquare, Edit3, Package, Cpu, FileText, FileSpreadsheet } from 'lucide-react';
import Notification, { useNotification } from '../components/Notification';
import ThemeToggle from '../components/ThemeToggle';
import ProfileAvatar from '../components/ProfileAvatar';

// ---- CONSTANTES LOCALES ----

// Types
type TodoType = { id: number; text: string; done: boolean };

type Ensemble = {
  id: number;
  name: string;
  machine_id: number;
};

type PhaseType = 'ETUDE' | 'APPRO' | 'MONTAGE' | 'TEST' | 'FAT' | 'INSTALLATION' | 'PROD';

const PHASE_LIST: PhaseType[] = ['ETUDE', 'APPRO', 'MONTAGE', 'TEST', 'FAT', 'INSTALLATION', 'PROD'];

const PHASE_COLORS: Record<PhaseType, string> = {
  ETUDE: '#8b5cf6', // violet
  APPRO: '#f97316', // orange
  MONTAGE: '#22c55e', // vert
  TEST: '#3b82f6', // bleu
  FAT: '#ef4444', // rouge
  INSTALLATION: '#f59e0b', // jaune
  PROD: '#ec4899', // rose
};

type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  category: PhaseType;
};

type Task = {
  id: string | number;
  machine: string;
  ensemble: string;
  type: PhaseType;
  startWeek: number;
  endWeek: number;
  comment?: string;
};

type Contact = {
  id: string | number;
  firstName: string;
  lastName: string;
  email: string;
  category: PhaseType;
};

type BackendUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_superuser: boolean;
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

export default function GanttBoard() {
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();
  const currentYear = new Date().getFullYear();

  // --- STATES ---
  const [year, setYear] = useState<number>(currentYear);
  const [machines, setMachines] = useState<any[]>([]);
  const [machinesList, setMachinesList] = useState<any[]>([]);
  const [ensemblesList, setEnsemblesList] = useState<any[]>([]);
  const [newMachine, setNewMachine] = useState('');
  const [ensembles, setEnsembles] = useState<Record<string, string[]>>({});
  const [newEnsemble, setNewEnsemble] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskForm, setTaskForm] = useState({
    machine: '',
    ensemble: '',
    type: 'ETUDE' as PhaseType,
    comment: '',
    startWeek: 1,
    endWeek: 1,
  });
  const [comments, setComments] = useState<Record<string, string>>({});
  const [barHovered, setBarHovered] = useState<null | string | number>(null);
  const [showDeleteBar, setShowDeleteBar] = useState<null | string | number>(null);
  const [taskTodos, setTaskTodos] = useState<TodoType[]>([]);
  const [selectedTask, setSelectedTask] = useState<null | Task>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showContactModal, setShowContactModal] = useState(false);
  const [ready, setReady] = useState(false);
  const [ensemblesPourMachine, setEnsemblesPourMachine] = useState<Ensemble[]>([]);
  const [allUsers, setAllUsers] = useState<BackendUser[]>([]);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendSelected, setSendSelected] = useState<string[]>([]);
  const [extraEmail, setExtraEmail] = useState('');
  const [extraEmails, setExtraEmails] = useState<string[]>([]);
  const [selectedExtraUser, setSelectedExtraUser] = useState('');
  const [extraUsers, setExtraUsers] = useState<BackendUser[]>([]);
  const [myTodos, setMyTodos] = useState([]);
  const [machineAdded, setMachineAdded] = useState(false);
  const [showAddMachineModal, setShowAddMachineModal] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [hoveredEnsemble, setHoveredEnsemble] = useState<string | null>(null);
  const [hoveredMachine, setHoveredMachine] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [role, setRole] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [currentCommentKey, setCurrentCommentKey] = useState<string | null>(null);
  const [currentCommentMachine, setCurrentCommentMachine] = useState<string>("");
  const [currentCommentEnsemble, setCurrentCommentEnsemble] = useState<string>("");
  const [editedComment, setEditedComment] = useState<string>("");
  const [isEditingComment, setIsEditingComment] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Calcul dynamique des largeurs pour que les 52 semaines tiennent dans l'écran
  const ROW_GRID_COLS = useMemo(() => {
    // Largeurs fixes pour les colonnes Ensemble et Commentaire
    const ensembleWidth = 120; // Largeur fixe pour "Ensemble"
    const commentWidth = 110; // Largeur fixe pour "Commentaire" (réduite car bouton)
    
    // Calculer la largeur disponible pour les 52 semaines
    const availableWidth = windowWidth - ensembleWidth - commentWidth - 60; // 60px de marge totale
    
    // Si l'écran est trop petit, utiliser un scroll horizontal avec largeurs fixes
    if (availableWidth < 52 * 15) {
      return `${ensembleWidth}px ${commentWidth}px repeat(52, 15px)`;
    }
    
    // Utiliser des fractions pour que les 52 semaines remplissent exactement l'espace disponible
    return `${ensembleWidth}px ${commentWidth}px repeat(52, 1fr)`;
  }, [windowWidth]);

  const [contactForm, setContactForm] = useState<ContactForm>({
    firstName: '',
    lastName: '',
    email: '',
    category: PHASE_LIST[0],
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [contactTab, setContactTab] = useState<'list' | 'assignments'>('list');
  

  const weeks = useMemo(() => Array.from({ length: 52 }, (_, i) => i + 1), []);
  
  // Affichage sans mois
  const allRows = useMemo(() => {
    const rows: { machine: string; ensemble: string }[] = [];
    machines.forEach((m) =>
      (ensembles[m] || []).forEach((e) => rows.push({ machine: m, ensemble: e }))
    );
    return rows;
  }, [machines, ensembles]);

  const groupedRows = useMemo(() => 
    machines.map(machine => ({
      machine,
      ensembles: ensembles[machine] || []
    })), [machines, ensembles]
  );

  // Index des tâches par machine/ensemble pour éviter les filtres répétitifs
  const tasksByKey = useMemo(() => {
    const index: Record<string, Task[]> = {};
    tasks.forEach(task => {
      const key = `${task.machine}__${task.ensemble}`;
      if (!index[key]) index[key] = [];
      index[key].push(task);
    });
    return index;
  }, [tasks]); 

  // === USE EFFECTS POUR LE PROFIL ET LE THÈME ===
  
  // Gérer le thème au chargement
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
    
    setIsDarkMode(shouldBeDark);
    document.documentElement.classList.toggle('dark', shouldBeDark);
  }, []);

  // Charger les infos utilisateur
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(async res => {
      if (!res.ok) throw new Error();
      const user = await res.json();
      setRole(user.is_superuser ? "admin" : "user");
      setFullName(`${user.first_name} ${user.last_name}`.trim());
      setUsername(user.username);
    })
    .catch(() => {
      // Erreur silencieuse
    });
  }, []);

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

  // === FONCTIONS ASYNC/FETCH ===
  async function ajouterMachine(nom: string) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/machines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: nom, year: year }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.detail || 'Erreur ajout machine');
    }
    return await res.json();
  }

  async function ajouterEnsemble(nom: string, machineId: number) {
    const token = localStorage.getItem('token');
    // console.log('Envoi de la requête d\'ajout d\'ensemble:', { nom, machineId });
    
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name: nom, machine_id: machineId, year: year }),
    });
    
    // console.log('Réponse du serveur:', res.status, res.statusText);
    
    if (!res.ok) {
      let errorMsg = 'Erreur ajout ensemble';
      try {
        const error = await res.json();
        errorMsg = error.detail || errorMsg;
        // console.error('Erreur détaillée:', error);
      } catch (e) {
        // console.error('Erreur lors du parsing de la réponse:', e);
      }
      throw new Error(errorMsg);
    }
    
    const result = await res.json();
    // console.log('Ensemble créé avec succès:', result);
    return result;
  }

  async function ajouterTask(
    type: string,
    startWeek: number,
    endWeek: number,
    ensembleId: number,
    comments = ""
  ) {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        type,
        start_week: startWeek,
        end_week: endWeek,
        year: year,
        ensemble_id: ensembleId,
        comments
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      let message = 'Erreur ajout task';
      if (Array.isArray(error.detail)) {
        message = error.detail.map((e: any) => e.msg).join(' / ');
      } else if (typeof error.detail === 'string') {
        message = error.detail;
      }
      throw new Error(message);
    }
    return await res.json();
  }

  // === USE EFFECTS ===
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/data?year=${year}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setMachinesList(data.machines);
        setMachines(data.machines.map((m: any) => m.name));
        const ensemblesByMachine: Record<string, string[]> = {};
        data.machines.forEach((m: any) => {
          ensemblesByMachine[m.name] = data.ensembles
            .filter((e: any) => e.machine_id === m.id)
            .map((e: any) => e.name);
        });
        setEnsembles(ensemblesByMachine);
        setTasks(
          (data.tasks || []).map((t: any) => {
            // Trouver l'ensemble correspondant
            const ensemble = data.ensembles.find((e: any) => e.id === t.ensemble_id);
            // Trouver la machine correspondante
            const machine = data.machines.find((m: any) => m.id === ensemble?.machine_id);
            
            return {
              ...t,
              startWeek: t.start_week,
              endWeek: t.end_week,
              machine: machine?.name || '',
              ensemble: ensemble?.name || '',
            };
          })
        );
      });
  }, [year]);

  // Charger les ensembles pour la machine sélectionnée (pour ajouter un ensemble)
  useEffect(() => {
    if (!selectedMachine) {
      setEnsemblesPourMachine([]);
      return;
    }
    const machineObj = machinesList.find(m => m.name === selectedMachine);
    if (!machineObj) {
      setEnsemblesPourMachine([]);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      setEnsemblesPourMachine([]);
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${machineObj.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setEnsemblesPourMachine(Array.isArray(data) ? data : []))
      .catch(() => setEnsemblesPourMachine([]));
  }, [selectedMachine, machinesList]);

  // Charger les ensembles pour la machine du formulaire de tâche
  useEffect(() => {
    if (!taskForm.machine) {
      return;
    }
    const machineObj = machinesList.find(m => m.name === taskForm.machine);
    if (!machineObj) {
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      return;
    }
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${machineObj.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => setEnsemblesPourMachine(Array.isArray(data) ? data : []))
      .catch(() => setEnsemblesPourMachine([]));
  }, [taskForm.machine, machinesList]);

  useEffect(() => {
    if (machinesList.length === 0) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    Promise.all(
      machinesList.map((machine: any) =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${machine.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.ok ? res.json() : [])
          .then((data: any[]) => ({ machine: machine.name, ensembles: data }))
      )
    ).then(results => {
      const newEnsembles: Record<string, string[]> = {};
      const newComments: Record<string, string> = {};
      results.forEach(({ machine, ensembles }) => {
        newEnsembles[machine] = ensembles.map((e: any) => e.name);
        ensembles.forEach((e: any) => {
          if (e.comments) {
            const key = `${machine}__${e.name}`;
            newComments[key] = e.comments;
          }
        });
      });
      setEnsembles(newEnsembles);
      setComments(prev => ({ ...newComments, ...prev }));
    });
  }, [machinesList]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Test avec des données statiques pour vérifier si le problème vient de l'API
    const testUsers: BackendUser[] = [
      { id: 1, username: 'admin', email: 'admin@example.com', first_name: 'Admin', last_name: 'User', is_superuser: true },
      { id: 2, username: 'john', email: 'john@example.com', first_name: 'John', last_name: 'Doe', is_superuser: false },
      { id: 3, username: 'jane', email: 'jane@example.com', first_name: 'Jane', last_name: 'Smith', is_superuser: false },
    ];
    
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/auth/users/contacts`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        return res.ok ? res.json() : [];
      })
      .then(data => {
        // Utiliser les données de l'API si disponibles, sinon les données de test
        setAllUsers(data && data.length > 0 ? data : testUsers);
      })
      .catch((error) => {
        setAllUsers(testUsers);
      });
  }, []);

  useEffect(() => {
    if (!selectedTask) {
      setTaskTodos([]);
      return;
    }
    const token = localStorage.getItem('token');
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/task/${selectedTask.id}/checklist`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setTaskTodos(data.map((t: any) => ({
          id: t.id,
          text: t.text,
          done: t.done
        })));
      })
      .catch(() => setTaskTodos([]));
  }, [selectedTask]);

  // Charger les contacts depuis le localStorage au démarrage
  useEffect(() => {
    const savedContacts = localStorage.getItem('gantt-contacts');
    if (savedContacts) {
      try {
        const parsedContacts = JSON.parse(savedContacts);
        setContacts(parsedContacts);
      } catch (error) {
        // console.error('Erreur lors du chargement des contacts:', error);
        setContacts([]);
      }
    }
  }, []);

  // Écouter les changements de taille de fenêtre
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); 

  // --- HANDLERS ---
  
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

  const openCommentModal = (machine: string, ensemble: string) => {
    const commentKey = `${machine}__${ensemble}`;
    const existingComment = comments[commentKey] || "";
    
    setCurrentCommentKey(commentKey);
    setCurrentCommentMachine(machine);
    setCurrentCommentEnsemble(ensemble);
    setEditedComment(existingComment);
    
    // Si le commentaire existe déjà, on ouvre en mode lecture, sinon en mode édition
    setIsEditingComment(existingComment.trim().length === 0);
    setShowCommentModal(true);
  };

  const closeCommentModal = () => {
    setShowCommentModal(false);
    setCurrentCommentKey(null);
    setCurrentCommentMachine("");
    setCurrentCommentEnsemble("");
    setEditedComment("");
    setIsEditingComment(false);
  };

  const saveCommentFromModal = async () => {
    if (!currentCommentMachine || !currentCommentEnsemble) return;
    
    const commentKey = `${currentCommentMachine}__${currentCommentEnsemble}`;
    setComments(prev => ({ ...prev, [commentKey]: editedComment }));
    
    await saveEnsembleComment(currentCommentMachine, currentCommentEnsemble, editedComment, true);
    closeCommentModal();
  };

  async function handleAddMachine(e: React.FormEvent) {
    e.preventDefault();
    const name = newMachine.trim();
    if (!name || machines.includes(name)) return;
    try {
      const machine = await ajouterMachine(name);
      setMachines(prev => [...prev, machine.name]);
      setMachinesList(prev => [...prev, machine]);
      setEnsembles(prev => ({ ...prev, [machine.name]: [] }));
      setNewMachine('');
      setSelectedMachine(machine.name);
      // setMachineAdded(true); // retiré: plus de message vert
      // Ne pas fermer automatiquement la modale
      // setTimeout(() => {
      //   setMachineAdded(false);
      //   setShowAddMachineModal(false);
      // }, 1200);
      showNotification('success', 'Succès', 'Machine ajoutée avec succès');
    } catch (err) {
      showNotification('error', 'Erreur', 'Erreur lors de l\'ajout de la machine');
    }
  }

  async function handleAddEnsemble(e: React.FormEvent) {
    e.preventDefault();
    const name = newEnsemble.trim();

    if (!selectedMachine || !name) {
      return;
    }

    // console.log('Tentative d\'ajout d\'ensemble:', { name, selectedMachine, ensemblesPourMachine });

    if (ensemblesPourMachine.some(e => e.name === name)) {
      // console.log('Ensemble déjà existant sur cette machine');
      showNotification('error', 'Erreur', 'Cet ensemble existe déjà sur cette machine');
      return;
    }

    const machineObj = machinesList.find(m => m.name === selectedMachine);
    if (!machineObj) {
      // console.log('Machine non trouvée:', selectedMachine);
      return;
    }

    // console.log('Machine trouvée:', machineObj);

    try {
      const ensemble = await ajouterEnsemble(name, machineObj.id);
      // console.log('Ensemble ajouté avec succès:', ensemble);
      setEnsembles(prev => ({
        ...prev,
        [selectedMachine]: [...(prev[selectedMachine] || []), ensemble.name],
      }));
      const token = localStorage.getItem('token');
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${machineObj.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : [])
        .then(data => setEnsemblesPourMachine(Array.isArray(data) ? data : []))
        .catch(() => setEnsemblesPourMachine([]));
      setNewEnsemble('');
      showNotification('success', 'Succès', 'Ensemble ajouté avec succès');
    } catch (err) {
      // console.error('Erreur lors de l\'ajout de l\'ensemble:', err);
      showNotification('error', 'Erreur', 'Erreur lors de l\'ajout de l\'ensemble');
    }
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const { machine, ensemble, type, startWeek, endWeek, comment } = taskForm;
    if (!machine || !ensemble || !type || !startWeek || !endWeek) return;
    const machineObj = machinesList.find(m => m.name === machine);
    if (!machineObj) return;
    const ensembleObj = ensemblesPourMachine.find(e => e.name === ensemble);
    if (!ensembleObj) return;
    try {
      const newTask = await ajouterTask(type, startWeek, endWeek, ensembleObj.id, comment);
      const mappedTask = {
        ...newTask,
        startWeek: newTask.start_week,
        endWeek: newTask.end_week,
        machine: machine,
        ensemble: ensemble,
      };
      setTasks(prev => [...prev, mappedTask]);
      setTaskForm(f => ({ ...f, comment: '', startWeek: 1, endWeek: 1 }));
      showNotification('success', 'Succès', 'Tâche ajoutée avec succès');
    } catch (err) {
      showNotification('error', 'Erreur', 'Erreur lors de l\'ajout de la tâche');
    }
  }

  const handleDeleteTask = useCallback(async (id: string | number) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== id));
        setBarHovered(null); 
        setShowDeleteBar(null);
        setSelectedTask(cur => (cur && cur.id === id ? null : cur));
        setTaskTodos([]);
        showNotification('success', 'Succès', 'Tâche supprimée avec succès');
      } else {
        showNotification('error', 'Erreur', 'Erreur lors de la suppression de la tâche');
      }
    } catch (error) {
      showNotification('error', 'Erreur', 'Erreur lors de la suppression de la tâche');
    }
  }, [showNotification]);

  const handleDeleteEnsemble = useCallback(async (machine: string, ensemble: string) => {
    let ensembleId: number | undefined = undefined;
    if (selectedMachine === machine && ensemblesPourMachine.length > 0) {
      const found = ensemblesPourMachine.find(e => e.name === ensemble);
      if (found) ensembleId = found.id;
    }
    if (ensembleId === undefined && machinesList.length > 0) {
      const machineObj = machinesList.find(m => m.name === machine);
      if (machineObj) {
        const token = localStorage.getItem('token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${machineObj.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const found = data.find((e: any) => e.name === ensemble);
          if (found) ensembleId = found.id;
        }
      }
    }
    if (!ensembleId) {
      showNotification('error', 'Erreur', 'Impossible de trouver l\'ensemble à supprimer');
      return;
    }
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${ensembleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      showNotification('error', 'Erreur', 'Erreur lors de la suppression côté serveur');
      return;
    }
    setEnsembles(prev => {
      const update = { ...prev };
      update[machine] = update[machine].filter(e => e !== ensemble);
      return update;
    });
    setTasks(prev => prev.filter(t => !(t.machine === machine && t.ensemble === ensemble)));
    setComments(prev => { const copy = { ...prev }; delete copy[`${machine}__${ensemble}`]; return copy; });
    setTaskTodos([]);
    showNotification('success', 'Succès', 'Ensemble supprimé avec succès');
  }, [selectedMachine, ensemblesPourMachine, machinesList, showNotification]);

  const handleDeleteMachine = useCallback(async (machine: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Trouver l'ID de la machine
    const machineObj = machinesList.find(m => m.name === machine);
    if (!machineObj) {
      showNotification('error', 'Erreur', 'Machine non trouvée');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/machines/${machineObj.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setMachines(prev => prev.filter(m => m !== machine));
        setEnsembles(prev => { const update = { ...prev }; delete update[machine]; return update; });
        setTasks(prev => prev.filter(t => t.machine !== machine));
        setComments(prev => {
          const update = { ...prev };
          Object.keys(update).forEach(key => { if (key.startsWith(machine + '__')) delete update[key]; });
          return update;
        });
        setTaskTodos([]);
        showNotification('success', 'Succès', 'Machine supprimée avec succès');
      } else {
        showNotification('error', 'Erreur', 'Erreur lors de la suppression de la machine');
      }
    } catch (error) {
      showNotification('error', 'Erreur', 'Erreur lors de la suppression de la machine');
    }
  }, [machinesList, showNotification]);

  async function saveEnsembleComment(
    machine: string,
    ensemble: string,
    value: string,
    notify: boolean = false
  ) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const machineObj = machinesList.find((m: any) => m.name === machine);
      if (!machineObj) return;
      const resEns = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${machineObj.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resEns.ok) return;
      const listEns = await resEns.json();
      const found = Array.isArray(listEns) ? listEns.find((e: any) => e.name === ensemble) : null;
      if (!found) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/ensembles/${found.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comments: value }),
      });
      if (notify) {
        if (res.ok) {
          showNotification('success', 'Succès', 'Commentaire bien ajouté');
        } else {
          showNotification('error', 'Erreur', "Échec de l'ajout du commentaire");
        }
      }
    } catch (e) {
      if (notify) {
        showNotification('error', 'Erreur', "Échec de l'ajout du commentaire");
      }
    }
  }

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    const input = contactForm.email.trim().toLowerCase();
    if (!input) return;
    
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
      showNotification('error', 'Erreur', 'Veuillez remplir le prénom et le nom du contact');
      return;
    }
    
    // Ajout local avec sauvegarde dans localStorage
    const newContact: Contact = {
      id: Date.now(), // ID temporaire basé sur le timestamp
      firstName: contactForm.firstName,
      lastName: contactForm.lastName,
      email: contactForm.email,
      category: contactForm.category,
    };
    
    const updatedContacts = [...contacts, newContact];
    setContacts(updatedContacts);
    
    // Sauvegarder dans le localStorage
    localStorage.setItem('gantt-contacts', JSON.stringify(updatedContacts));
    
    setContactForm({ firstName: '', lastName: '', email: '', category: PHASE_LIST[0] });
    setShowSuggestions(false);
    showNotification('success', 'Contact assigné', `${contactForm.firstName} ${contactForm.lastName} a été assigné à la phase ${contactForm.category}`);
  }

  async function handleDeleteContact(id: string | number) {
    // Suppression locale avec mise à jour du localStorage
    const updatedContacts = contacts.filter(c => c.id !== id);
    setContacts(updatedContacts);
    
    // Sauvegarder dans le localStorage
    localStorage.setItem('gantt-contacts', JSON.stringify(updatedContacts));
  }

  function openSendModal() {
    if (!selectedTask) return;
    const defaultChecked = contacts
      .filter(c => c.category === selectedTask.type)
      .map(c => c.email.toLowerCase().trim());
    setSendSelected(defaultChecked);
    setExtraEmail('');
    setExtraEmails([]);
    setSelectedExtraUser('');
    setExtraUsers([]);
    setShowSendModal(true);
  }

  function handleCheckEmail(email: string) {
    const norm = email.toLowerCase().trim();
    setSendSelected(prev =>
      prev.includes(norm) ? prev.filter(e => e !== norm) : [...prev, norm]
    );
  }

  function handleAddExtraEmail() {
    const email = extraEmail.toLowerCase().trim();
    if (email && !sendSelected.includes(email) && !extraEmails.includes(email)) {
      setExtraEmails(prev => [...prev, email]);
      setSendSelected(prev => [...prev, email]);
      setExtraEmail('');
    }
  }

  function handleAddExtraUser() {
    if (!selectedExtraUser) return;
    const user = allUsers.find(u => u.email === selectedExtraUser);
    if (!user) return;
    
    // Vérifier si l'utilisateur n'est pas déjà dans les extras
    if (extraUsers.some(u => u.email === user.email)) return;
    
    setExtraUsers(prev => [...prev, user]);
    setSendSelected(prev => [...prev, user.email.toLowerCase().trim()]);
    setSelectedExtraUser('');
  }

  function handleRemoveExtraUser(userEmail: string) {
    setExtraUsers(prev => prev.filter(u => u.email !== userEmail));
    setSendSelected(prev => prev.filter(e => e !== userEmail.toLowerCase().trim()));
  }

  function handleRemoveExtraEmail(email: string) {
    const norm = email.toLowerCase().trim();
    setExtraEmails(prev => prev.filter(e => e !== norm));
    setSendSelected(prev => prev.filter(e => e !== norm));
  }

  function getUserByIdentifier(identifier: string): BackendUser | undefined {
    const clean = identifier.toLowerCase().trim();
    const usersByEmail = Object.fromEntries(allUsers.map(u => [u.email.toLowerCase().trim(), u]));
    const usersByUsername = Object.fromEntries(allUsers.map(u => [u.username.toLowerCase().trim(), u]));
    return usersByEmail[clean] || usersByUsername[clean.replace(/^@/, '')];
  }

  const handlePrintGantt = useCallback(() => {
    // Créer une nouvelle fenêtre pour l'impression
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Obtenir le contenu du Gantt
    const ganttContainer = document.querySelector('.gantt-container');
    if (!ganttContainer) return;

    // HTML pour la page d'impression
    const printHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Diagramme de Gantt - ${year}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              background: white;
              color: black;
            }
            .print-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
            }
            .print-header h1 {
              font-size: 24px;
              margin: 0;
              color: #333;
            }
            .print-header p {
              margin: 5px 0 0 0;
              color: #666;
              font-size: 14px;
            }
            .gantt-content {
              width: 100%;
              overflow: visible;
            }
            .machine-container {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .machine-header {
              background: #f5f5f5;
              padding: 10px;
              border: 1px solid #ddd;
              font-weight: bold;
              font-size: 16px;
            }
            .gantt-grid {
              border: 1px solid #ddd;
              border-top: none;
            }
            .week-header {
              background: #e9ecef;
              font-weight: bold;
              text-align: center;
              padding: 5px;
              border-right: 1px solid #ddd;
              font-size: 10px;
            }
            .ensemble-row {
              border-bottom: 1px solid #ddd;
              display: flex;
              align-items: center;
            }
            .ensemble-name {
              padding: 8px;
              border-right: 1px solid #ddd;
              font-weight: bold;
              min-width: 150px;
              background: #f8f9fa;
            }
            .week-cell {
              border-right: 1px solid #ddd;
              min-width: 20px;
              height: 30px;
              position: relative;
            }
            .task-bar {
              position: absolute;
              top: 2px;
              bottom: 2px;
              border-radius: 3px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 10px;
            }
            .task-etude { background-color: #8b5cf6; }
            .task-appro { background-color: #f97316; }
            .task-montage { background-color: #22c55e; }
            .task-test { background-color: #3b82f6; }
            .task-fat { background-color: #ef4444; }
            .task-installation { background-color: #f59e0b; }
            .task-prod { background-color: #ec4899; }
            @media print {
              body { margin: 0; }
              .machine-container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>Diagramme de Gantt ${year}</h1>
            <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
          <div class="gantt-content">
            ${Array.from(ganttContainer.querySelectorAll('.machine-container')).map(machineEl => {
              const machineName = machineEl.querySelector('h3')?.textContent?.trim() || 'Machine';
              const ensembles = Array.from(machineEl.querySelectorAll('.ensemble-row'));
              
              return `
                <div class="machine-container">
                  <div class="machine-header">${machineName}</div>
                  <div class="gantt-grid">
                    <div class="ensemble-row" style="background: #e9ecef;">
                      <div class="ensemble-name">Ensemble</div>
                      ${Array.from({length: 52}, (_, i) => `<div class="week-header">${i+1}</div>`).join('')}
                    </div>
                    ${ensembles.map(ensembleEl => {
                      const ensembleName = ensembleEl.querySelector('.ensemble-name')?.textContent?.trim() || 'Ensemble';
                      const taskBars = Array.from(ensembleEl.querySelectorAll('.task-bar'));
                      
                      return `
                        <div class="ensemble-row">
                          <div class="ensemble-name">${ensembleName}</div>
                          ${Array.from({length: 52}, (_, weekIndex) => {
                            const week = weekIndex + 1;
                            const taskInWeek = taskBars.find(task => {
                              const startWeek = parseInt((task as HTMLElement).dataset.startWeek || '0');
                              const endWeek = parseInt((task as HTMLElement).dataset.endWeek || '0');
                              return week >= startWeek && week <= endWeek;
                            });
                            
                            if (taskInWeek) {
                              const taskType = (taskInWeek as HTMLElement).dataset.taskType || 'etude';
                              return `<div class="week-cell"><div class="task-bar task-${taskType}">${taskType[0].toUpperCase()}</div></div>`;
                            }
                            return `<div class="week-cell"></div>`;
                          }).join('')}
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    // Attendre que le contenu soit chargé puis imprimer
    printWindow.onload = () => {
      if (printWindow) {
        printWindow.print();
        printWindow.close();
      }
    };
  }, [year]);

  async function handleSendTodo() {
    if (!selectedTask) return;
    const token = localStorage.getItem("token");
    const todoItems = taskTodos;
    const todoText = todoItems.length
      ? todoItems.map(t => (t.done ? "✔️" : "⬜️") + " " + t.text).join("\n")
      : "Aucune tâche définie.";
    const allSelected = sendSelected.map(e => e.toLowerCase().trim());
    
    // Séparer les emails selon s'ils appartiennent à des utilisateurs de la plateforme ou non
    const platformUserEmails = allUsers.map(u => u.email.toLowerCase().trim());
    const userEmails = allSelected.filter(e => platformUserEmails.includes(e));
    const manualEmails = allSelected.filter(e => !platformUserEmails.includes(e));
    
    for (const identifier of userEmails) {
      const user = allUsers.find(u =>
        u.email.toLowerCase() === identifier ||
        u.username.toLowerCase() === identifier.replace(/^@/, "")
      );
      if (user) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/assign-todo`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({
              user_id: user.id,
              title: `Tâche ${selectedTask.type} - ${selectedTask.ensemble}`,
              body: todoText,
              task_id: selectedTask.id.toString(),
            }),
          });
          
          if (!res.ok) {
            // console.error("Erreur lors de la création de la todo:", await res.text());
          } else {
            // console.log("Todo créée avec succès pour", user.username);
          }
        } catch (error) {
          // console.error("Erreur lors de la création de la todo:", error);
        }
      }
    }
    
    if (manualEmails.length > 0) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/gantt/send-mail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: manualEmails,
          subject: `To-do ${selectedTask.ensemble}`,
          body: `Tâche : ${selectedTask.ensemble}\n\n${todoText}`,
        }),
      });
    }
    showNotification('success', 'Succès', 'To-do envoyée !');
    setShowSendModal(false);
  }

  // --- RENDER ---
  return (
    <>
      <style jsx global>{`
        select option {
          background-color: #f3f4f6 !important;
          color: #1f2937 !important;
        }
        
        .dark select option {
          background-color: #4b5563 !important;
          color: #f9fafb !important;
        }
      `}</style>
      
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-[#0f0d1a] dark:via-[#1a1628] dark:to-[#1a0f2a] text-gray-800 dark:text-white px-4 py-4 relative overflow-hidden">
      {/* Fond animé avec touches de bleu/violet */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Taches bleues pour le mode clair */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-blue-300/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-blue-400/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '3s', animationDuration: '7s' }}></div>
        
        {/* Taches violettes pour le mode sombre */}
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#7f49e8]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-[#8b5cf6]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '1s', animationDuration: '6s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-40 h-40 bg-[#a855f7]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '2s', animationDuration: '5s' }}></div>
        <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-[#9333ea]/10 rounded-full blur-xl animate-pulse dark:block hidden" style={{ animationDelay: '3s', animationDuration: '7s' }}></div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
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

        <h1 className="text-3xl font-extrabold flex items-center gap-3 text-blue-600 dark:text-purple-400 absolute left-1/2 transform -translate-x-1/2">
          <Calendar className="w-8 h-8" />
          Diagramme de Gantt
        </h1>
        
        <div className="flex items-center gap-4 relative z-10">
          <select
            className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-lg px-3 py-2 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 cursor-pointer"
            value={year}
            onChange={e => setYear(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: 5 }).map((_, idx) => (
              <option key={idx} value={currentYear + idx}>
                {currentYear + idx}
              </option>
            ))}
          </select>
          
          {/* Bouton de profil */}
          <ProfileAvatar
            fullName={fullName}
            size="lg"
            onClick={() => setShowUserMenu(v => !v)}
            showUploadButton={false}
          />

          {showUserMenu && (
            <div
              ref={userMenuRef}
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
      </div>


      {/* GANTT */}
      <div className="space-y-6 overflow-x-auto gantt-container">

        {/* Lignes */}
        {groupedRows.length === 0 && (
          <div className="p-6 text-center text-gray-600 dark:text-gray-400">
            Ajoute une machine et un ensemble pour commencer.
          </div>
        )}
        {groupedRows.map(({ machine, ensembles }, machineIndex) => (
          <div key={machine} className="mb-6 machine-container">
            {/* Bulle de la machine */}
            <div className="bg-white/40 dark:bg-white/20 backdrop-blur-sm rounded-2xl border border-white/50 dark:border-white/30 shadow-lg mb-4 overflow-hidden">
              {/* En-tête de la machine */}
              <div 
                className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 dark:from-blue-600/30 dark:to-purple-600/30 px-4 py-3 border-b border-white/30 dark:border-white/20 group"
                onMouseEnter={() => setHoveredMachine(machine)}
                onMouseLeave={() => setHoveredMachine(null)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500 dark:text-purple-400" />
                    {machine}
                  </h3>
                  <button
                    onClick={() => handleDeleteMachine(machine)}
                    className={`text-xs bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg cursor-pointer active:scale-95 transition-transform text-white ${hoveredMachine === machine ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                    title="Supprimer cette machine"
                    type="button"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {/* En-tête sans affichage des mois */}
              </div>

              {/* Contenu de la bulle */}
              <div className="overflow-hidden">
                {ensembles.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 italic">
                    Aucun ensemble pour cette machine
                  </div>
                ) : (
                  <div className="overflow-auto" style={{ minWidth: 'fit-content' }}>
                    {/* Ligne des semaines pour cette machine (grille unifiée) */}
                    <div className="sticky top-0 z-10 border-b border-white/30 dark:border-white/20">
                      <div
                        className="h-8"
                        style={{ display: 'grid', gridTemplateColumns: ROW_GRID_COLS }}
                      >
                        <div className="bg-white/30 dark:bg-white/20 border-r border-white/30 dark:border-white/20 px-2 py-1 font-medium text-gray-800 dark:text-white flex items-center justify-between">
                          <span className="flex-1 text-xs">Ensemble</span>
                          <div className="w-4"></div>
                        </div>
                        <div className="bg-white/30 dark:bg-white/20 border-r border-white/30 dark:border-white/20 px-2 py-1 font-medium text-gray-800 dark:text-white flex items-center text-xs">
                          Commentaire
                        </div>
                        {weeks.map((w) => (
                          <div
                            key={w}
                            className="bg-white/30 dark:bg-white/20 border-r border-white/20 dark:border-white/10 px-0.5 py-1 text-xs text-center text-gray-800 dark:text-white flex items-center justify-center min-w-0 font-medium"
                          >
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>

                                         {/* Ensembles de cette machine */}
                     {ensembles.map((ensemble, idx) => {
                       const lineTasks = tasksByKey[`${machine}__${ensemble}`] || [];
                       const commentKey = `${machine}__${ensemble}`;
                       return (
                        <div
                          key={machine + '_' + ensemble}
                          className="group items-center h-8 border-b border-white/30 dark:border-white/20 transition relative ensemble-row"
                          style={{ display: 'grid', gridTemplateColumns: ROW_GRID_COLS }}
                        >
                          <div 
                            className="px-2 py-1 text-gray-700 dark:text-gray-300 overflow-hidden text-ellipsis whitespace-nowrap flex items-center justify-between border-r border-white/30 dark:border-white/20 group-hover:bg-white/20 dark:group-hover:bg-white/10 hover:bg-white/20 dark:hover:bg-white/10"
                            onMouseEnter={() => setHoveredEnsemble(`${machine}__${ensemble}`)}
                            onMouseLeave={() => setHoveredEnsemble(null)}
                          >
                             <span className="font-medium flex-1 text-xs ensemble-name">{ensemble}</span>
                             <button
                               onClick={() => handleDeleteEnsemble(machine, ensemble)}
                               className={`text-xs bg-red-500 hover:bg-red-600 px-1 py-0.5 rounded cursor-pointer active:scale-95 transition-transform text-white ${hoveredEnsemble === `${machine}__${ensemble}` ? 'opacity-100' : 'opacity-0'} transition-opacity ml-1 flex-shrink-0`}
                               title="Supprimer cet ensemble"
                               type="button"
                             >
                               <Trash2 className="w-3 h-3" />
                             </button>
                           </div>
                           <div className="px-2 py-1 text-gray-700 dark:text-gray-200 border-r border-white/30 dark:border-white/20 group-hover:bg-white/20 dark:group-hover:bg-white/10 flex items-center justify-center">
                              {comments[commentKey] && comments[commentKey].trim().length > 0 ? (
                                <button
                                  onClick={() => openCommentModal(machine, ensemble)}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/20 dark:bg-purple-500/20 hover:bg-blue-500/30 dark:hover:bg-purple-500/30 text-blue-700 dark:text-purple-300 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer active:scale-95"
                                  title="Afficher le commentaire"
                                  type="button"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Afficher</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => openCommentModal(machine, ensemble)}
                                  className="flex items-center gap-1.5 px-2 py-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-purple-400 hover:bg-blue-50/50 dark:hover:bg-purple-500/10 rounded-lg text-xs transition-all duration-200 cursor-pointer active:scale-95"
                                  title="Ajouter un commentaire"
                                  type="button"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Ajouter</span>
                                </button>
                              )}
                            </div>
                          <div style={{ gridColumn: '3 / -1' }} className="relative h-full">
                            {/* grille des semaines en flux (supprime la couture) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(52, 1fr)' }} className="h-full">
                              {weeks.map((w) => (
                                <div key={w} className="border-r border-white/20 dark:border-white/10 group-hover:bg-white/10 dark:group-hover:bg-white/5 min-w-0" />
                              ))}
                            </div>
                            {/* barres de tâches */}
                            {lineTasks.map((t) => {
                              const left = ((t.startWeek - 1) * 100) / weeks.length;
                              const width = ((t.endWeek - t.startWeek + 1) * 100) / weeks.length;
                              return (
                                <div
                                  key={t.id}
                                  className={`absolute top-0.5 bottom-0.5 rounded-md cursor-pointer transition-opacity duration-100 flex items-center justify-center text-xs font-bold task-bar ${
                                    barHovered === t.id
                                      ? 'ring-1 ring-white opacity-100'
                                      : 'opacity-90'
                                  }`}
                                  style={{
                                    backgroundColor: PHASE_COLORS[t.type as PhaseType],
                                    zIndex: barHovered === t.id ? 2 : 1,
                                    left: `${left}%`,
                                    width: `${width}%`,
                                  }}
                                  data-start-week={t.startWeek}
                                  data-end-week={t.endWeek}
                                  data-task-type={t.type.toLowerCase()}
                                  title={`S${t.startWeek}-S${t.endWeek} (${t.type})`}
                                  onMouseEnter={() => setBarHovered(t.id)}
                                  onMouseLeave={() => setBarHovered(null)}
                                  onClick={(e) => {
                                    if (showDeleteBar === t.id) return;
                                    setSelectedTask(t);
                                  }}
                                >
                                  <div className="relative w-full h-full">
                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 py-0.5 rounded bg-black/30 text-white text-xs">
                                      {t.type[0]}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setShowDeleteBar(t.id);
                                      }}
                                      className={`${barHovered === t.id ? 'opacity-100' : 'opacity-0'} transition-opacity bg-red-500 hover:bg-red-600 rounded-full w-3 h-3 flex items-center justify-center text-white text-xs cursor-pointer absolute right-1 top-1/2 -translate-y-1/2`}
                                      title="Supprimer cette tâche"
                                      type="button"
                                    >
                                      <Trash2 className="w-2 h-2" />
                                    </button>
                                  </div>
                                  {showDeleteBar === t.id && (
                                    <div
                                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-80 px-2 py-1 rounded shadow text-xs flex items-center gap-2"
                                      style={{ zIndex: 10 }}
                                    >
                                      <span className="text-white">Supprimer ?</span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteTask(t.id);
                                        }}
                                        className="bg-red-600 hover:bg-red-800 rounded px-2 py-1 text-white text-xs cursor-pointer active:scale-95 transition-transform"
                                      >
                                        Oui
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowDeleteBar(null);
                                        }}
                                        className="bg-gray-600 hover:bg-gray-800 rounded px-2 py-1 text-white text-xs cursor-pointer active:scale-95 transition-transform"
                                      >
                                        Non
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODALE CONTACTS */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowContactModal(false)}
          ></div>
          <div className="relative z-10 bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-lg p-8 mx-4 flex flex-col border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10">
            <button
              onClick={() => setShowContactModal(false)}
              className="absolute top-3 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl cursor-pointer active:scale-95 transition-transform"
              aria-label="Fermer"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-2xl mb-6 text-blue-600 dark:text-purple-400 text-center">
              Contacts
            </h2>
            
            {/* Onglets */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setContactTab('list')}
                className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  contactTab === 'list'
                    ? 'bg-blue-600 dark:bg-purple-600 text-white'
                    : 'bg-white/40 dark:bg-white/20 text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/30'
                }`}
                type="button"
              >
                Liste des contacts
              </button>
              <button
                onClick={() => setContactTab('assignments')}
                className={`flex-1 py-2 px-4 rounded-xl font-semibold transition-all duration-300 ${
                  contactTab === 'assignments'
                    ? 'bg-blue-600 dark:bg-purple-600 text-white'
                    : 'bg-white/40 dark:bg-white/20 text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/30'
                }`}
                type="button"
              >
                Assignations
              </button>
            </div>
            {contactTab === 'list' && (
              <>
                <form className="flex flex-col gap-3 mb-6" onSubmit={handleAddContact}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Prénom"
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 text-base flex-1 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
                      value={contactForm.firstName}
                      onChange={e =>
                        setContactForm({ ...contactForm, firstName: e.target.value })
                      }
                      autoComplete="off"
                    />
                    <input
                      type="text"
                      placeholder="Nom"
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 text-base flex-1 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
                      value={contactForm.lastName}
                      onChange={e =>
                        setContactForm({ ...contactForm, lastName: e.target.value })
                      }
                      autoComplete="off"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Email ou @username"
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 text-base w-full text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
                      value={contactForm.email}
                      onChange={e => {
                        const val = e.target.value;
                        setContactForm((prev: ContactForm) => {
                          const found = allUsers.find(u =>
                            u.email.toLowerCase() === val.toLowerCase() ||
                            u.username.toLowerCase() === val.toLowerCase()
                          );
                          if (found) {
                            return {
                              ...prev,
                              firstName: found.first_name,
                              lastName: found.last_name,
                              email: found.email,
                            };
                          }
                          return { ...prev, email: val, firstName: "", lastName: "" };
                        });
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      autoComplete="off"
                    />
                    
                    {/* Suggestions intelligentes */}
                    {showSuggestions && contactForm.email.length > 0 && (
                      <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-60 overflow-y-auto">
                        {allUsers
                          .filter(u => {
                            const searchTerm = contactForm.email.toLowerCase();
                            return (
                              u.email.toLowerCase().includes(searchTerm) ||
                              u.username.toLowerCase().includes(searchTerm) ||
                              u.first_name.toLowerCase().includes(searchTerm) ||
                              u.last_name.toLowerCase().includes(searchTerm)
                            );
                          })
                          .slice(0, 8)
                          .map(u => (
                            <div
                              key={u.id}
                              className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                              onClick={() => {
                                setContactForm({
                                  ...contactForm,
                                  firstName: u.first_name,
                                  lastName: u.last_name,
                                  email: u.email,
                                });
                                setShowSuggestions(false);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-gray-800 dark:text-white">
                                    {u.first_name} {u.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    @{u.username} • {u.email}
                                  </div>
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
                                  Utilisateur
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                  <select
                    className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 text-base text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500"
                    value={contactForm.category}
                    onChange={e =>
                      setContactForm({
                        ...contactForm,
                        category: e.target.value as PhaseType
                      })
                    }
                  >
                    {PHASE_LIST.map((cat: PhaseType) => (
                      <option key={cat} value={cat}>
                        {cat[0] + cat.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-3 py-2 text-white font-bold text-base mt-2 cursor-pointer active:scale-95 transition-transform"
                  >
                    Ajouter
                  </button>
                </form>
                <div className="overflow-y-auto max-h-52 pr-1">
                </div>
              </>
            )}

            {contactTab === 'assignments' && (
              <div className="space-y-4">
                <div className="text-center text-gray-600 dark:text-gray-400 mb-4">
                  <Users className="w-8 h-8 mx-auto mb-2 text-blue-500 dark:text-purple-400" />
                  <p className="text-sm">Vue d'ensemble des assignations</p>
                </div>
                
                {/* Statistiques */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {contacts.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Contacts totaux
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {PHASE_LIST.filter(cat => contacts.some(c => c.category === cat)).length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Phases couvertes
                    </div>
                  </div>
                </div>

                {/* Assignations par phase */}
                <div className="space-y-4">
                  {PHASE_LIST.map((cat: PhaseType) => {
                    const phaseContacts = contacts.filter(c => c.category === cat);
                    if (phaseContacts.length === 0) return null;
                    
                    return (
                      <div key={cat} className="bg-white/20 dark:bg-white/10 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: PHASE_COLORS[cat] }}
                          ></div>
                          <h3 className="font-semibold text-gray-800 dark:text-white">
                            {cat[0] + cat.slice(1).toLowerCase()}
                          </h3>
                          <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                            {phaseContacts.length} contact{phaseContacts.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {phaseContacts.map(contact => (
                            <div key={contact.id} className="flex items-center justify-between bg-white/30 dark:bg-white/20 rounded-lg p-3">
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">
                                  {contact.firstName} {contact.lastName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {contact.email}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 px-2 py-1 rounded">
                                  Assigné
                                </div>
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-all duration-200 hover:scale-105"
                                  title="Supprimer ce contact"
                                  type="button"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Contacts non assignés */}
                {contacts.filter(c => !c.category).length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4">
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-400 mb-3">
                      ⚠️ Contacts non assignés
                    </h3>
                                            <div className="space-y-2">
                          {contacts.filter(c => !c.category).map(contact => (
                            <div key={contact.id} className="flex items-center justify-between bg-white/30 dark:bg-white/20 rounded-lg p-3">
                              <div>
                                <div className="font-medium text-gray-800 dark:text-white">
                                  {contact.firstName} {contact.lastName}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {contact.email}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 px-2 py-1 rounded">
                                  Non assigné
                                </div>
                                <button
                                  onClick={() => handleDeleteContact(contact.id)}
                                  className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center transition-all duration-200 hover:scale-105"
                                  title="Supprimer ce contact"
                                  type="button"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE TODO LIST */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedTask(null)}
          ></div>
          <div 
            className="relative z-10 bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl p-6 shadow-lg w-[95vw] max-w-md border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedTask(null)}
              className="absolute top-2 right-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-xl cursor-pointer active:scale-95 transition-transform"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">
              To-do list – {selectedTask.machine} / {selectedTask.ensemble} ({selectedTask.type})
            </h2>
            <TodoList
              taskId={Number(selectedTask.id)}
              todos={taskTodos}
              setTodos={setTaskTodos}
            />
            <button
              onClick={openSendModal}
              className="mt-6 bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-3 py-2 text-white font-bold w-full cursor-pointer active:scale-95 transition-transform"
              type="button"
            >
              <Send className="w-4 h-4 inline mr-2" />
              Envoyer à…
            </button>
          </div>
        </div>
      )}

      {/* MODALE ENVOI TODO */}
      {showSendModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
          <div className="relative z-10 bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-lg p-7 mx-4 border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10">
            <button
              onClick={() => setShowSendModal(false)}
              className="absolute top-4 right-5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl cursor-pointer active:scale-95 transition-transform"
              aria-label="Fermer"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="font-bold text-xl mb-4 text-blue-600 dark:text-purple-400 text-center">
              Choisir les destinataires
            </h3>
            <div className="mb-3">
              <div className="font-semibold text-blue-600 dark:text-purple-400 text-base mb-2">
                Contacts ({selectedTask.type[0] + selectedTask.type.slice(1).toLowerCase()})
              </div>
              <ul>
                {contacts.filter(c => c.category === selectedTask.type).map(c => (
                  <li key={c.id} className="flex items-center gap-2 mb-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendSelected.includes(c.email)}
                        onChange={() => handleCheckEmail(c.email)}
                        className="accent-blue-500 dark:accent-purple-500 w-4 h-4"
                      />
                      <span className="text-gray-800 dark:text-white">{c.firstName} {c.lastName}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mb-3">
              <div className="font-semibold text-blue-600 dark:text-purple-400 text-base mb-2">
                Autres destinataires
              </div>
              
              {/* Sélection d'utilisateurs */}
              <div className="mb-3">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Utilisateurs</div>
                <div className="flex gap-2">
                  <select
                    className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 text-base flex-1 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
                    value={selectedExtraUser}
                    onChange={e => setSelectedExtraUser(e.target.value)}
                  >
                    <option value="">Sélectionner un utilisateur...</option>
                    {allUsers
                      .filter(u => {
                        // Exclure les utilisateurs déjà dans les contacts de cette tâche
                        const taskContacts = contacts.filter(c => c.category === selectedTask.type);
                        const contactEmails = taskContacts.map(c => c.email.toLowerCase());
                        // Exclure aussi ceux déjà ajoutés dans extraUsers
                        const extraUserEmails = extraUsers.map(eu => eu.email.toLowerCase());
                        return !contactEmails.includes(u.email.toLowerCase()) && 
                               !extraUserEmails.includes(u.email.toLowerCase());
                      })
                      .map(u => (
                        <option key={u.id} value={u.email}>
                          {u.first_name} {u.last_name} ({u.username})
                        </option>
                      ))}
                  </select>
                  <button
                    className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-3 py-2 text-white font-bold cursor-pointer active:scale-95 transition-transform"
                    onClick={handleAddExtraUser}
                    type="button"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <ul className="mt-2">
                  {extraUsers.map(user => (
                    <li key={user.email} className="flex items-center gap-2 mb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendSelected.includes(user.email.toLowerCase().trim())}
                          onChange={() => handleCheckEmail(user.email)}
                          className="accent-blue-500 dark:accent-purple-500 w-4 h-4"
                        />
                        <span className="text-gray-800 dark:text-white text-base">
                          {user.first_name} {user.last_name}
                        </span>
                      </label>
                      <button
                        onClick={() => handleRemoveExtraUser(user.email)}
                        className="text-xs text-red-500 hover:text-red-600"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sélection d'emails manuels */}
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">E-mails externes</div>
                <div className="flex gap-2">
                  <input
                    type="email"
                    className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-3 py-2 text-base flex-1 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30"
                    placeholder="Ajouter un e-mail…"
                    value={extraEmail}
                    onChange={e => setExtraEmail(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddExtraEmail(); }}}
                  />
                  <button
                    className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-3 py-2 text-white font-bold cursor-pointer active:scale-95 transition-transform"
                    onClick={handleAddExtraEmail}
                    type="button"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <ul className="mt-2">
                  {extraEmails.map(email => (
                    <li key={email} className="flex items-center gap-2 mb-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendSelected.includes(email)}
                          onChange={() => handleCheckEmail(email)}
                          className="accent-blue-500 dark:accent-purple-500 w-4 h-4"
                        />
                        <span className="text-gray-800 dark:text-white text-base">{email}</span>
                      </label>
                      <button
                        onClick={() => handleRemoveExtraEmail(email)}
                        className="text-xs text-red-500 hover:text-red-600"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <button
              onClick={handleSendTodo}
              className="mt-4 bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-4 py-2 text-white font-bold w-full text-lg cursor-pointer active:scale-95 transition-transform disabled:opacity-50"
              type="button"
              disabled={sendSelected.length === 0}
            >
              <Send className="w-5 h-5 inline mr-2" />
              Envoyer
            </button>
          </div>
        </div>
      )}

      {/* Boutons flottants */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-40">
        {/* Bouton Impression */}
        <button
          onClick={handlePrintGantt}
          className="bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700 hover:from-green-600 hover:to-emerald-700 dark:hover:from-green-700 dark:hover:to-emerald-800 rounded-full w-14 h-14 flex items-center justify-center text-white shadow-lg hover:shadow-green-500/50 dark:hover:shadow-green-600/50 focus:outline-none cursor-pointer active:scale-95 transition-all duration-300"
          title="Imprimer le diagramme de Gantt"
          type="button"
        >
          <Printer className="w-6 h-6" />
        </button>
        
        {/* Bouton Contact */}
        <button
          onClick={() => setShowContactModal(true)}
          className="bg-gradient-to-br from-cyan-500 to-blue-500 dark:from-cyan-600 dark:to-blue-600 hover:from-cyan-600 hover:to-blue-600 dark:hover:from-cyan-700 dark:hover:to-blue-700 rounded-full w-14 h-14 flex items-center justify-center text-white shadow-lg hover:shadow-cyan-500/50 dark:hover:shadow-cyan-600/50 focus:outline-none cursor-pointer active:scale-95 transition-all duration-300"
          title="Gérer les contacts"
          type="button"
        >
          <Users className="w-6 h-6" />
        </button>
        
        {/* Bouton Ajouter */}
        <button
          onClick={() => setShowAddMachineModal(true)}
          className="bg-gradient-to-br from-blue-500 to-purple-600 dark:from-purple-500 dark:to-purple-700 hover:from-blue-600 hover:to-purple-700 dark:hover:from-purple-600 dark:hover:to-purple-800 rounded-full w-14 h-14 flex items-center justify-center text-white shadow-lg hover:shadow-purple-500/50 dark:hover:shadow-purple-600/50 focus:outline-none cursor-pointer active:scale-95 transition-all duration-300"
          title="Ajouter machine, ensemble ou tâche"
          type="button"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Modale complète pour ajouter */}
      {showAddMachineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowAddMachineModal(false);
              setNewMachine('');
              setNewEnsemble('');
              setTaskForm({
                machine: '',
                ensemble: '',
                type: 'ETUDE' as PhaseType,
                comment: '',
                startWeek: 1,
                endWeek: 1,
              });
              setMachineAdded(false);
            }}
          ></div>
          <div 
            className="relative z-10 bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-y-auto border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowAddMachineModal(false);
                setNewMachine('');
                setNewEnsemble('');
                setTaskForm({
                  machine: '',
                  ensemble: '',
                  type: 'ETUDE' as PhaseType,
                  comment: '',
                  startWeek: 1,
                  endWeek: 1,
                });
                setMachineAdded(false);
              }}
              className="absolute top-3 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl cursor-pointer active:scale-95 transition-transform z-10"
              aria-label="Fermer"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-8">
              <h2 className="font-bold text-2xl mb-8 text-blue-600 dark:text-purple-400 text-center">
                Ajouter machine, ensemble ou tâche
              </h2>
              
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Section Machines */}
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 dark:border-white/20">
                  <div className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 dark:text-white">
                    <Settings className="w-6 h-6 text-blue-500 dark:text-purple-400" />
                    Machines
                  </div>
                  <form className="flex flex-col gap-4" onSubmit={handleAddMachine}>
                    <input
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 w-full text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30 text-sm"
                      placeholder="Nom de la machine"
                      value={newMachine}
                      onChange={(e) => setNewMachine(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-4 py-2 text-white font-bold cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
                      type="submit"
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </form>
                  {/* Message de succès supprimé volontairement */}
                </div>

                {/* Section Ensembles */}
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 dark:border-white/20">
                  <div className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 dark:text-white">
                    <Plus className="w-6 h-6 text-blue-500 dark:text-purple-400" />
                    Ensembles
                  </div>
                  <form className="flex flex-col gap-4" onSubmit={handleAddEnsemble}>
                    <select
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 w-full text-sm"
                      value={selectedMachine}
                      onChange={(e) => setSelectedMachine(e.target.value)}
                    >
                      <option value="">Sélectionner une machine…</option>
                      {machines.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 w-full text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30 text-sm disabled:opacity-50"
                      placeholder="Nom de l'ensemble"
                      value={newEnsemble}
                      onChange={(e) => setNewEnsemble(e.target.value)}
                      disabled={!selectedMachine}
                      autoComplete="off"
                    />
                    <button
                      className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-4 py-2 text-white font-bold cursor-pointer active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                      type="submit"
                      disabled={!selectedMachine}
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter
                    </button>
                  </form>
                </div>

                {/* Section Nouvelle tâche */}
                <div className="bg-white/20 dark:bg-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/30 dark:border-white/20">
                  <div className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 dark:text-white">
                    <CheckSquare className="w-6 h-6 text-blue-500 dark:text-purple-400" />
                    Nouvelle tâche
                  </div>
                  <form className="flex flex-col gap-4" onSubmit={handleAddTask}>
                    <div className="space-y-3">
                      <select
                        className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 w-full text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 text-sm"
                        value={taskForm.machine}
                        onChange={(e) =>
                          setTaskForm((f) => ({
                            ...f,
                            machine: e.target.value,
                            ensemble: '',
                          }))
                        }
                      >
                        <option value="">Sélectionner une machine…</option>
                        {machines.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 w-full text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 text-sm disabled:opacity-50"
                        value={taskForm.ensemble}
                        onChange={e =>
                          setTaskForm((f) => ({
                            ...f,
                            ensemble: e.target.value,
                          }))
                        }
                        disabled={!taskForm.machine}
                      >
                        <option value="">Sélectionner un ensemble…</option>
                        {Array.isArray(ensemblesPourMachine) && ensemblesPourMachine.map((e) => (
                          <option key={e.id} value={e.name}>{e.name}</option>
                        ))}
                      </select>
                    </div>
                    <select
                      className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 text-sm"
                      value={taskForm.type}
                      onChange={(e) =>
                        setTaskForm((f) => ({
                          ...f,
                          type: e.target.value as PhaseType,
                        }))
                      }
                    >
                      {PHASE_LIST.map((p: PhaseType) => (
                        <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30 text-sm"
                        type="number"
                        min={1}
                        max={52}
                        value={taskForm.startWeek}
                        onChange={(e) =>
                          setTaskForm((f) => ({
                            ...f,
                            startWeek: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                        placeholder="Semaine de début"
                      />
                      <input
                        className="bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30 text-sm"
                        type="number"
                        min={1}
                        max={52}
                        value={taskForm.endWeek}
                        onChange={(e) =>
                          setTaskForm((f) => ({
                            ...f,
                            endWeek: parseInt(e.target.value, 10) || 1,
                          }))
                        }
                        placeholder="Semaine de fin"
                      />
                    </div>
                    <button
                      className="bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-4 py-2 text-white font-bold cursor-pointer active:scale-95 transition-transform"
                      type="submit"
                    >
                      Ajouter la tâche
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE COMMENTAIRE */}
      {showCommentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeCommentModal}
          ></div>
          <div className="relative z-10 bg-white/30 dark:bg-white/15 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-2xl p-8 mx-4 border border-white/40 dark:border-white/25 shadow-blue-500/20 dark:shadow-purple-500/20 ring-1 ring-white/20 dark:ring-white/10">
            <button
              onClick={closeCommentModal}
              className="absolute top-3 right-4 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white text-2xl cursor-pointer active:scale-95 transition-transform"
              aria-label="Fermer"
              type="button"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-6">
              <h2 className="font-bold text-2xl text-blue-600 dark:text-purple-400 text-center mb-2">
                Commentaire
              </h2>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {currentCommentMachine} / {currentCommentEnsemble}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isEditingComment ? "Éditer le commentaire" : "Commentaire"}
              </label>
              {isEditingComment ? (
                <textarea
                  className="w-full bg-white/40 dark:bg-white/20 border border-white/50 dark:border-white/30 rounded-xl px-4 py-3 text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-purple-500 focus:border-transparent focus:bg-white/60 dark:focus:bg-white/30 min-h-[200px] resize-y"
                  placeholder="Saisissez votre commentaire ici..."
                  value={editedComment}
                  onChange={(e) => setEditedComment(e.target.value)}
                  autoFocus
                />
              ) : (
                <div className="w-full bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 rounded-xl px-4 py-3 text-gray-800 dark:text-white min-h-[200px] whitespace-pre-wrap">
                  {editedComment || <span className="text-gray-400 dark:text-gray-500 italic">Aucun commentaire</span>}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeCommentModal}
                className="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 rounded-xl px-4 py-3 text-gray-800 dark:text-white font-semibold transition-all duration-300 cursor-pointer active:scale-95"
                type="button"
              >
                Fermer
              </button>
              {isEditingComment ? (
                <button
                  onClick={saveCommentFromModal}
                  className="flex-1 bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-4 py-3 text-white font-semibold transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  type="button"
                >
                  <Edit3 className="w-4 h-4" />
                  Enregistrer
                </button>
              ) : (
                <button
                  onClick={() => setIsEditingComment(true)}
                  className="flex-1 bg-blue-500 dark:bg-purple-600 hover:bg-blue-600 dark:hover:bg-purple-700 rounded-xl px-4 py-3 text-white font-semibold transition-all duration-300 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  type="button"
                >
                  <Edit3 className="w-4 h-4" />
                  Modifier
                </button>
              )}
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
    </>
  );
}