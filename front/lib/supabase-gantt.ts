/**
 * Helpers Supabase pour les modules Gantt et Todo
 * 
 * Ce fichier contient toutes les fonctions pour interagir avec Supabase
 * pour les opérations Gantt et Todo
 */

import { supabase } from './supabase';

// ============================================================================
// TYPES
// ============================================================================

export type Machine = {
  id: number;
  name: string;
  year: number;
  created_at: string;
  updated_at: string;
};

export type Ensemble = {
  id: number;
  name: string;
  machine_id: number;
  year: number;
  comments?: string;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: number;
  type: string; // ETUDE, APPRO, MONTAGE, TEST, FAT, INSTALLATION, PROD
  start_week: number;
  end_week: number;
  year: number;
  comments?: string;
  ensemble_id: number;
  created_at: string;
  updated_at: string;
};

export type Contact = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  category: string;
  created_at: string;
  updated_at: string;
};

export type ChecklistItem = {
  id: number;
  text: string;
  done: boolean;
  task_id: number;
  created_at: string;
  updated_at: string;
};

export type UserAssignment = {
  id: number;
  title: string;
  description?: string;
  done: boolean;
  task_id: number;
  user_id: string;
  created_at: string;
  updated_at: string;
  // Données enrichies
  task_title?: string;
  task_ensemble_id?: number;
  ensemble_name?: string;
  machine_name?: string;
};

export type GanttData = {
  machines: Machine[];
  ensembles: Ensemble[];
  tasks: Task[];
  contacts: Contact[];
};

// ============================================================================
// GANTT DATA - Récupération globale
// ============================================================================

/**
 * Récupère toutes les données Gantt pour une année donnée
 */
export async function getGanttData(year: number = 2025): Promise<GanttData> {
  const { data, error } = await supabase.rpc('get_gantt_data', { p_year: year });
  
  if (error) {
    console.error('Error fetching Gantt data:', error);
    throw error;
  }
  
  return data as GanttData;
}

// ============================================================================
// MACHINES
// ============================================================================

/**
 * Récupère toutes les machines pour une année
 */
export async function getMachines(year: number = 2025) {
  const { data, error } = await supabase
    .from('machines')
    .select('*')
    .eq('year', year)
    .order('name');
  
  if (error) throw error;
  return data as Machine[];
}

/**
 * Crée une nouvelle machine
 */
export async function createMachine(name: string, year: number = 2025) {
  const { data, error } = await supabase
    .from('machines')
    .insert({ name, year })
    .select()
    .single();
  
  if (error) throw error;
  return data as Machine;
}

/**
 * Met à jour une machine
 */
export async function updateMachine(id: number, updates: Partial<Machine>) {
  const { data, error } = await supabase
    .from('machines')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Machine;
}

/**
 * Supprime une machine (cascade sur ensembles/tâches)
 */
export async function deleteMachine(id: number) {
  const { error } = await supabase
    .from('machines')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// ENSEMBLES
// ============================================================================

/**
 * Récupère tous les ensembles pour une machine
 */
export async function getEnsembles(machineId: number) {
  const { data, error } = await supabase
    .from('ensembles')
    .select('*')
    .eq('machine_id', machineId)
    .order('name');
  
  if (error) throw error;
  return data as Ensemble[];
}

/**
 * Récupère tous les ensembles pour une année
 */
export async function getEnsemblesByYear(year: number = 2025) {
  const { data, error } = await supabase
    .from('ensembles')
    .select('*')
    .eq('year', year)
    .order('name');
  
  if (error) throw error;
  return data as Ensemble[];
}

/**
 * Crée un nouvel ensemble
 */
export async function createEnsemble(
  name: string,
  machineId: number,
  year: number = 2025,
  comments?: string
) {
  const { data, error } = await supabase
    .from('ensembles')
    .insert({ name, machine_id: machineId, year, comments })
    .select()
    .single();
  
  if (error) throw error;
  return data as Ensemble;
}

/**
 * Met à jour un ensemble
 */
export async function updateEnsemble(id: number, updates: Partial<Ensemble>) {
  const { data, error } = await supabase
    .from('ensembles')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Ensemble;
}

/**
 * Supprime un ensemble (cascade sur tâches)
 */
export async function deleteEnsemble(id: number) {
  const { error } = await supabase
    .from('ensembles')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// TASKS
// ============================================================================

/**
 * Récupère toutes les tâches pour un ensemble
 */
export async function getTasks(ensembleId: number) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('ensemble_id', ensembleId)
    .order('start_week');
  
  if (error) throw error;
  return data as Task[];
}

/**
 * Récupère toutes les tâches pour une année
 */
export async function getTasksByYear(year: number = 2025) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('year', year);
  
  if (error) throw error;
  return data as Task[];
}

/**
 * Récupère une tâche par ID
 */
export async function getTask(id: number) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data as Task;
}

/**
 * Crée une nouvelle tâche
 */
export async function createTask(task: {
  type: string;
  start_week: number;
  end_week: number;
  ensemble_id: number;
  year?: number;
  comments?: string;
}) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...task, year: task.year || 2025 })
    .select()
    .single();
  
  if (error) throw error;
  return data as Task;
}

/**
 * Met à jour une tâche
 */
export async function updateTask(id: number, updates: Partial<Task>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Task;
}

/**
 * Supprime une tâche
 */
export async function deleteTask(id: number) {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// CONTACTS
// ============================================================================

/**
 * Récupère tous les contacts
 */
export async function getContacts() {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .order('last_name');
  
  if (error) throw error;
  return data as Contact[];
}

/**
 * Récupère les contacts par catégorie
 */
export async function getContactsByCategory(category: string) {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('category', category)
    .order('last_name');
  
  if (error) throw error;
  return data as Contact[];
}

/**
 * Crée un nouveau contact
 */
export async function createContact(contact: {
  first_name: string;
  last_name: string;
  email: string;
  category: string;
}) {
  const { data, error } = await supabase
    .from('contacts')
    .insert(contact)
    .select()
    .single();
  
  if (error) throw error;
  return data as Contact;
}

/**
 * Met à jour un contact
 */
export async function updateContact(id: number, updates: Partial<Contact>) {
  const { data, error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as Contact;
}

/**
 * Supprime un contact
 */
export async function deleteContact(id: number) {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// CHECKLIST ITEMS
// ============================================================================

/**
 * Récupère les items de checklist pour une tâche
 */
export async function getChecklistItems(taskId: number) {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at');
  
  if (error) throw error;
  return data as ChecklistItem[];
}

/**
 * Crée un item de checklist
 */
export async function createChecklistItem(text: string, taskId: number) {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .insert({ text, task_id: taskId })
    .select()
    .single();
  
  if (error) throw error;
  return data as ChecklistItem;
}

/**
 * Met à jour un item de checklist
 */
export async function updateChecklistItem(id: number, updates: { text?: string; done?: boolean }) {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as ChecklistItem;
}

/**
 * Supprime un item de checklist
 */
export async function deleteChecklistItem(id: number) {
  const { error } = await supabase
    .from('task_checklist_items')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// USER ASSIGNMENTS (TODOS)
// ============================================================================

/**
 * Récupère les assignments de l'utilisateur connecté (Mes Todos)
 */
export async function getMyAssignments() {
  const { data, error } = await supabase.rpc('get_my_assignments');
  
  if (error) throw error;
  return data as UserAssignment[];
}

/**
 * Récupère tous les assignments (admin only)
 */
export async function getAllAssignments() {
  const { data, error } = await supabase.rpc('get_all_assignments');
  
  if (error) throw error;
  return data as UserAssignment[];
}

/**
 * Récupère les assignments pour une tâche spécifique
 */
export async function getAssignmentsByTask(taskId: number) {
  const { data, error } = await supabase
    .from('user_assignments')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at');
  
  if (error) throw error;
  return data as UserAssignment[];
}

/**
 * Crée un assignment (Todo)
 */
export async function createAssignment(assignment: {
  title: string;
  description?: string;
  task_id: number;
  user_id: string;
}) {
  const { data, error } = await supabase
    .from('user_assignments')
    .insert(assignment)
    .select()
    .single();
  
  if (error) throw error;
  return data as UserAssignment;
}

/**
 * Met à jour un assignment
 */
export async function updateAssignment(id: number, updates: {
  title?: string;
  description?: string;
  done?: boolean;
}) {
  const { data, error } = await supabase
    .from('user_assignments')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as UserAssignment;
}

/**
 * Marque un assignment comme done/undone
 */
export async function toggleAssignment(id: number, done: boolean) {
  return updateAssignment(id, { done });
}

/**
 * Supprime un assignment
 */
export async function deleteAssignment(id: number) {
  const { error } = await supabase
    .from('user_assignments')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe aux changements sur les machines
 */
export function subscribeMachines(callback: (payload: any) => void) {
  return supabase
    .channel('machines-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'machines' }, callback)
    .subscribe();
}

/**
 * Subscribe aux changements sur les ensembles
 */
export function subscribeEnsembles(callback: (payload: any) => void) {
  return supabase
    .channel('ensembles-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'ensembles' }, callback)
    .subscribe();
}

/**
 * Subscribe aux changements sur les tâches
 */
export function subscribeTasks(callback: (payload: any) => void) {
  return supabase
    .channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
    .subscribe();
}

/**
 * Subscribe aux changements sur les assignments de l'utilisateur
 */
export function subscribeMyAssignments(userId: string, callback: (payload: any) => void) {
  return supabase
    .channel('my-assignments-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_assignments',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
}

