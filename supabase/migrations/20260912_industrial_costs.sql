-- Apuracao industrial integrada a OPs, roteiro, materiais e equipamentos

ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS power_kw NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS energy_tariff NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS maintenance_cost_per_hour NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS other_cost_per_hour NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS productive_hours_available NUMERIC NOT NULL DEFAULT 220;

ALTER TABLE public.production_entries ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.production_material_separations ADD COLUMN IF NOT EXISTS unit_cost_snapshot NUMERIC;
ALTER TABLE public.production_material_separations ADD COLUMN IF NOT EXISTS total_cost NUMERIC;
ALTER TABLE public.production_material_separations ADD COLUMN IF NOT EXISTS competence_date DATE;

ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS production_order_id TEXT REFERENCES public.production_orders(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS unit_cost NUMERIC;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS total_cost NUMERIC;

CREATE TABLE IF NOT EXISTS public.cost_employees (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    sector TEXT NOT NULL DEFAULT '',
    process_id TEXT REFERENCES public.production_processes(id) ON DELETE SET NULL,
    labor_type TEXT NOT NULL CHECK (labor_type IN ('DIRETA', 'INDIRETA')),
    base_salary NUMERIC NOT NULL DEFAULT 0,
    additions NUMERIC NOT NULL DEFAULT 0,
    benefits NUMERIC NOT NULL DEFAULT 0,
    charge_percent NUMERIC NOT NULL DEFAULT 0,
    monthly_hours NUMERIC NOT NULL DEFAULT 0,
    productive_hours NUMERIC NOT NULL DEFAULT 0,
    hourly_cost NUMERIC NOT NULL DEFAULT 0,
    valid_from DATE,
    valid_until DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_charges (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    percent NUMERIC NOT NULL DEFAULT 0,
    charge_type TEXT NOT NULL DEFAULT 'OUTROS',
    valid_from DATE,
    valid_until DATE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_drivers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    driver_type TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_indirect (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    process_id TEXT REFERENCES public.production_processes(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    competence DATE NOT NULL,
    classification TEXT NOT NULL CHECK (classification IN ('FIXO', 'VARIAVEL')),
    driver_id TEXT REFERENCES public.cost_drivers(id) ON DELETE SET NULL,
    observation TEXT NOT NULL DEFAULT '',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.equipment_maintenance (
    id TEXT PRIMARY KEY,
    equipment_id TEXT NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    process_id TEXT REFERENCES public.production_processes(id) ON DELETE SET NULL,
    maintenance_type TEXT NOT NULL,
    maintenance_date DATE NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    supplier TEXT NOT NULL DEFAULT '',
    observation TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_op (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'NAO_APURADO' CHECK (status IN ('NAO_APURADO', 'EM_CALCULO', 'APURADO', 'FECHADO', 'REABERTO')),
    planned_quantity NUMERIC NOT NULL DEFAULT 0,
    finished_quantity NUMERIC NOT NULL DEFAULT 0,
    yield_percent NUMERIC NOT NULL DEFAULT 0,
    loss_quantity NUMERIC NOT NULL DEFAULT 0,
    material_cost NUMERIC NOT NULL DEFAULT 0,
    direct_labor_cost NUMERIC NOT NULL DEFAULT 0,
    indirect_labor_cost NUMERIC NOT NULL DEFAULT 0,
    energy_cost NUMERIC NOT NULL DEFAULT 0,
    maintenance_cost NUMERIC NOT NULL DEFAULT 0,
    depreciation_cost NUMERIC NOT NULL DEFAULT 0,
    other_indirect_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    recalculation_reason TEXT NOT NULL DEFAULT '',
    calculated_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (order_id, version)
);

CREATE TABLE IF NOT EXISTS public.cost_op_items (
    id TEXT PRIMARY KEY,
    cost_op_id TEXT NOT NULL REFERENCES public.cost_op(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    source_id TEXT,
    description TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_op_steps (
    id TEXT PRIMARY KEY,
    cost_op_id TEXT NOT NULL REFERENCES public.cost_op(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    duration_hours NUMERIC NOT NULL DEFAULT 0,
    man_hours NUMERIC NOT NULL DEFAULT 0,
    labor_cost NUMERIC NOT NULL DEFAULT 0,
    equipment_cost NUMERIC NOT NULL DEFAULT 0,
    energy_cost NUMERIC NOT NULL DEFAULT 0,
    maintenance_cost NUMERIC NOT NULL DEFAULT 0,
    depreciation_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cost_op_versions (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    snapshot JSONB NOT NULL,
    reason TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (order_id, version)
);

DO $$
DECLARE table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['cost_employees','cost_charges','cost_drivers','cost_indirect','equipment_maintenance','cost_op','cost_op_items','cost_op_steps','cost_op_versions'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Public read/write access for %s" ON public.%I', table_name, table_name);
        EXECUTE format('CREATE POLICY "Public read/write access for %s" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_name, table_name);
    END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS stock_movements_production_order_source_idx
    ON public.stock_movements(production_order_id, source_type, source_id)
    WHERE production_order_id IS NOT NULL AND source_type IS NOT NULL AND source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cost_op_order_idx ON public.cost_op(order_id);
CREATE INDEX IF NOT EXISTS cost_op_items_cost_op_idx ON public.cost_op_items(cost_op_id);
CREATE INDEX IF NOT EXISTS cost_op_steps_cost_op_idx ON public.cost_op_steps(cost_op_id);
