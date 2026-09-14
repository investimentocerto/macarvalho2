-- ==============================================================================
-- MaCarvalho ERP - Supabase PostgreSQL Migration Script
-- Vínculo Oficial entre Processos de Fabricação (cost_sectors) e Roteiro de Produção (process_steps)
-- ==============================================================================

-- 1. Garantir colunas necessárias na tabela de Processos de Fabricação (cost_sectors)
CREATE TABLE IF NOT EXISTS public.cost_sectors (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    cost_center_id TEXT NOT NULL REFERENCES public.production_processes(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.cost_sectors ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.cost_sectors ADD COLUMN IF NOT EXISTS operation_type TEXT;
ALTER TABLE public.cost_sectors ADD COLUMN IF NOT EXISTS standard_time_minutes NUMERIC DEFAULT 0;
ALTER TABLE public.cost_sectors ADD COLUMN IF NOT EXISTS description TEXT;

-- 2. Garantir colunas e índices no Roteiro de Produção (process_steps)
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS process_id TEXT;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS equipment_id TEXT;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS cost_center_code TEXT;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS units_per_hour NUMERIC;

CREATE INDEX IF NOT EXISTS process_steps_process_id_idx ON public.process_steps(process_id);
CREATE INDEX IF NOT EXISTS cost_sectors_active_idx ON public.cost_sectors(active);

-- 3. Chave estrangeira segura (sem cascata destrutiva para proteger histórico)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'process_steps_process_id_fkey'
  ) THEN
    ALTER TABLE public.process_steps
      ADD CONSTRAINT process_steps_process_id_fkey
      FOREIGN KEY (process_id) REFERENCES public.cost_sectors(id) ON DELETE SET NULL;
  END IF;
END $$;
