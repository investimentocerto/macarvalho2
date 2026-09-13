-- Migração para suporte a Apontamento de Mão de Obra Direta (MOD) na OP
ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS employee_name TEXT;
ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS hours_worked NUMERIC DEFAULT 0;
ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS hourly_cost_snapshot NUMERIC DEFAULT 0;
ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS mod_cost NUMERIC DEFAULT 0;
ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS notes TEXT;

-- Índice para consultas de apontamentos por colaborador e OP
CREATE INDEX IF NOT EXISTS production_entries_employee_id_idx ON public.production_entries(employee_id);
CREATE INDEX IF NOT EXISTS production_entries_order_step_idx ON public.production_entries(order_id, step_id);
