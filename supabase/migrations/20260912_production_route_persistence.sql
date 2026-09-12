-- ============================================================================
-- Persistencia do roteiro de producao e equipamentos
-- Aplicar em bancos que ja executaram a migration inicial.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.production_processes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    hourly_rate NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    process_id TEXT NOT NULL REFERENCES public.production_processes(id) ON DELETE RESTRICT,
    acquisition_cost NUMERIC NOT NULL DEFAULT 0,
    residual_value NUMERIC NOT NULL DEFAULT 0,
    estimated_useful_life NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS process_id TEXT;

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS equipment_id TEXT REFERENCES public.equipment(id) ON DELETE SET NULL;

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS cost_center_code TEXT;

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS units_per_hour NUMERIC;

ALTER TABLE public.process_steps
    ADD COLUMN IF NOT EXISTS labor_quantity NUMERIC DEFAULT 1;

ALTER TABLE public.production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read/write access for production_processes" ON public.production_processes;
    CREATE POLICY "Public read/write access for production_processes" ON public.production_processes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for equipment" ON public.equipment;
    CREATE POLICY "Public read/write access for equipment" ON public.equipment FOR ALL USING (true) WITH CHECK (true);
END $$;

CREATE INDEX IF NOT EXISTS process_steps_product_id_idx ON public.process_steps(product_id);
CREATE INDEX IF NOT EXISTS process_steps_process_id_idx ON public.process_steps(process_id);
