-- ============================================================================
-- SCHÉMA COMPLET OPTIMISÉ POUR SUPABASE
-- ============================================================================
-- Ce fichier contient toutes les tables et fonctions nécessaires pour l'app
-- Exécutez ce script dans l'éditeur SQL de Supabase
-- ============================================================================

-- ============================================================================
-- TABLES PRINCIPALES
-- ============================================================================

-- Table: machines
CREATE TABLE IF NOT EXISTS machines (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  year INT NOT NULL DEFAULT 2025,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_machines_name_year ON machines(name, year);
CREATE INDEX IF NOT EXISTS idx_machines_year ON machines(year);

-- Table: ensembles
CREATE TABLE IF NOT EXISTS ensembles (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  machine_id BIGINT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  year INT NOT NULL DEFAULT 2025,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ensembles_machine_id ON ensembles(machine_id);
CREATE INDEX IF NOT EXISTS idx_ensembles_year ON ensembles(year);

-- Table: tasks
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  type TEXT NOT NULL, -- ETUDE, APPRO, MONTAGE, TEST, FAT, INSTALLATION, PROD
  start_week INT NOT NULL,
  end_week INT NOT NULL,
  year INT NOT NULL DEFAULT 2025,
  comments TEXT,
  ensemble_id BIGINT NOT NULL REFERENCES ensembles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_ensemble_id ON tasks(ensemble_id);
CREATE INDEX IF NOT EXISTS idx_tasks_year ON tasks(year);
CREATE INDEX IF NOT EXISTS idx_tasks_start_week ON tasks(start_week);

-- Table: contacts
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_category ON contacts(category);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Table: task_checklist_items
CREATE TABLE IF NOT EXISTS task_checklist_items (
  id BIGSERIAL PRIMARY KEY,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_checklist_items_task_id ON task_checklist_items(task_id);

-- Table: user_assignments
CREATE TABLE IF NOT EXISTS user_assignments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_assignments_user_id ON user_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_task_id ON user_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_user_assignments_done ON user_assignments(done);

-- ============================================================================
-- TRIGGER FUNCTION POUR updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers uniquement s’ils n’existent pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_machines_updated_at'
      AND c.relname = 'machines'
      AND n.nspname = 'public'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_machines_updated_at
      BEFORE UPDATE ON public.machines
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_ensembles_updated_at'
      AND c.relname = 'ensembles'
      AND n.nspname = 'public'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_ensembles_updated_at
      BEFORE UPDATE ON public.ensembles
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_tasks_updated_at'
      AND c.relname = 'tasks'
      AND n.nspname = 'public'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_tasks_updated_at
      BEFORE UPDATE ON public.tasks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_contacts_updated_at'
      AND c.relname = 'contacts'
      AND n.nspname = 'public'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_contacts_updated_at
      BEFORE UPDATE ON public.contacts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_task_checklist_items_updated_at'
      AND c.relname = 'task_checklist_items'
      AND n.nspname = 'public'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_task_checklist_items_updated_at
      BEFORE UPDATE ON public.task_checklist_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'update_user_assignments_updated_at'
      AND c.relname = 'user_assignments'
      AND n.nspname = 'public'
      AND NOT t.tgisinternal
  ) THEN
    CREATE TRIGGER update_user_assignments_updated_at
      BEFORE UPDATE ON public.user_assignments
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Activer RLS sur toutes les tables
ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ensembles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assignments ENABLE ROW LEVEL SECURITY;

-- Politiques pour machines
DROP POLICY IF EXISTS "Tous peuvent lire les machines" ON machines;
CREATE POLICY "Tous peuvent lire les machines" ON machines
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Tous peuvent créer des machines" ON machines;
CREATE POLICY "Tous peuvent créer des machines" ON machines
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent modifier les machines" ON machines;
CREATE POLICY "Tous peuvent modifier les machines" ON machines
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent supprimer les machines" ON machines;
CREATE POLICY "Tous peuvent supprimer les machines" ON machines
  FOR DELETE TO authenticated USING (true);

-- Politiques pour ensembles
DROP POLICY IF EXISTS "Tous peuvent lire les ensembles" ON ensembles;
CREATE POLICY "Tous peuvent lire les ensembles" ON ensembles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Tous peuvent créer des ensembles" ON ensembles;
CREATE POLICY "Tous peuvent créer des ensembles" ON ensembles
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent modifier les ensembles" ON ensembles;
CREATE POLICY "Tous peuvent modifier les ensembles" ON ensembles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent supprimer les ensembles" ON ensembles;
CREATE POLICY "Tous peuvent supprimer les ensembles" ON ensembles
  FOR DELETE TO authenticated USING (true);

-- Politiques pour tasks
DROP POLICY IF EXISTS "Tous peuvent lire les tâches" ON tasks;
CREATE POLICY "Tous peuvent lire les tâches" ON tasks
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Tous peuvent créer des tâches" ON tasks;
CREATE POLICY "Tous peuvent créer des tâches" ON tasks
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent modifier les tâches" ON tasks;
CREATE POLICY "Tous peuvent modifier les tâches" ON tasks
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent supprimer les tâches" ON tasks;
CREATE POLICY "Tous peuvent supprimer les tâches" ON tasks
  FOR DELETE TO authenticated USING (true);

-- Politiques pour contacts
DROP POLICY IF EXISTS "Tous peuvent lire les contacts" ON contacts;
CREATE POLICY "Tous peuvent lire les contacts" ON contacts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Tous peuvent créer des contacts" ON contacts;
CREATE POLICY "Tous peuvent créer des contacts" ON contacts
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent modifier les contacts" ON contacts;
CREATE POLICY "Tous peuvent modifier les contacts" ON contacts
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent supprimer les contacts" ON contacts;
CREATE POLICY "Tous peuvent supprimer les contacts" ON contacts
  FOR DELETE TO authenticated USING (true);

-- Politiques pour task_checklist_items
DROP POLICY IF EXISTS "Tous peuvent lire les checklist items" ON task_checklist_items;
CREATE POLICY "Tous peuvent lire les checklist items" ON task_checklist_items
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Tous peuvent créer des checklist items" ON task_checklist_items;
CREATE POLICY "Tous peuvent créer des checklist items" ON task_checklist_items
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent modifier les checklist items" ON task_checklist_items;
CREATE POLICY "Tous peuvent modifier les checklist items" ON task_checklist_items
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Tous peuvent supprimer les checklist items" ON task_checklist_items;
CREATE POLICY "Tous peuvent supprimer les checklist items" ON task_checklist_items
  FOR DELETE TO authenticated USING (true);

-- Politiques pour user_assignments
DROP POLICY IF EXISTS "Les utilisateurs voient leurs assignments" ON user_assignments;
CREATE POLICY "Les utilisateurs voient leurs assignments" ON user_assignments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Tous peuvent créer des assignments" ON user_assignments;
CREATE POLICY "Tous peuvent créer des assignments" ON user_assignments
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Les utilisateurs modifient leurs assignments" ON user_assignments;
CREATE POLICY "Les utilisateurs modifient leurs assignments" ON user_assignments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Les utilisateurs suppriment leurs assignments" ON user_assignments;
CREATE POLICY "Les utilisateurs suppriment leurs assignments" ON user_assignments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================================
-- FONCTIONS RPC
-- ============================================================================

-- Fonction: get_gantt_data
-- Récupère toutes les données Gantt pour une année donnée
CREATE OR REPLACE FUNCTION get_gantt_data(p_year INT DEFAULT 2025)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'machines', (
      SELECT COALESCE(json_agg(m.* ORDER BY m.name), '[]'::json)
      FROM machines m
      WHERE m.year = p_year
    ),
    'ensembles', (
      SELECT COALESCE(json_agg(e.* ORDER BY e.name), '[]'::json)
      FROM ensembles e
      WHERE e.year = p_year
    ),
    'tasks', (
      SELECT COALESCE(json_agg(t.* ORDER BY t.start_week), '[]'::json)
      FROM tasks t
      WHERE t.year = p_year
    ),
    'contacts', (
      SELECT COALESCE(json_agg(c.* ORDER BY c.last_name), '[]'::json)
      FROM contacts c
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_gantt_data(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_gantt_data(INT) TO anon;

-- Fonction: get_my_assignments
-- Récupère les assignments de l'utilisateur connecté avec infos enrichies
-- Supprimer l’ancienne version si la signature/retour diffèrent
DROP FUNCTION IF EXISTS public.get_my_assignments();
 
CREATE OR REPLACE FUNCTION get_my_assignments()
RETURNS TABLE (
  id BIGINT,
  title TEXT,
  description TEXT,
  done BOOLEAN,
  task_id BIGINT,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  task_title TEXT,
  task_ensemble_id BIGINT,
  ensemble_name TEXT,
  machine_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ua.id,
    ua.title,
    ua.description,
    ua.done,
    ua.task_id,
    ua.user_id,
    ua.created_at,
    ua.updated_at,
    t.type AS task_title,
    t.ensemble_id AS task_ensemble_id,
    e.name AS ensemble_name,
    m.name AS machine_name
  FROM user_assignments ua
  LEFT JOIN tasks t ON ua.task_id = t.id
  LEFT JOIN ensembles e ON t.ensemble_id = e.id
  LEFT JOIN machines m ON e.machine_id = m.id
  WHERE ua.user_id = auth.uid()
  ORDER BY ua.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_assignments() TO authenticated;

-- ============================================================================
-- COMMENTAIRES SUR LES OPTIMISATIONS
-- ============================================================================

-- 1. INDEX OPTIMAUX:
--    - Index composites pour (name, year) sur machines pour éviter les doublons
--    - Index sur clés étrangères pour accélérer les JOINs
--    - Index sur les colonnes fréquemment filtrées (year, done, category)

-- 2. RLS (ROW LEVEL SECURITY):
--    - user_assignments: Chaque utilisateur ne voit que ses propres assignments
--    - Autres tables: Accessibles à tous les utilisateurs authentifiés

-- 3. CASCADE DELETE:
--    - machine supprimée → ensembles supprimés → tasks supprimées
--    - task supprimée → checklist items supprimés
--    - Évite les données orphelines

-- 4. FONCTIONS RPC:
--    - get_gantt_data: Récupère toutes les données en un seul appel (optimisé)
--    - get_my_assignments: Récupère les assignments avec JOINs pré-calculés

-- 5. TRIGGERS:
--    - updated_at automatiquement mis à jour à chaque modification
--    - Évite les erreurs d'oubli de mise à jour
