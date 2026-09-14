-- ==============================================================================
-- MaCarvalho ERP - Supabase PostgreSQL Migration Script
-- Adequação de Mão de Obra (MOD/MOI), Setores, Centros de Custo e Encargos Detalhados
-- ==============================================================================

-- 1. Tabela de Setores industriais vinculados a Centros de Custo (production_processes)
CREATE TABLE IF NOT EXISTS public.cost_sectors (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    cost_center_id TEXT NOT NULL REFERENCES public.production_processes(id) ON DELETE CASCADE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Atualização da tabela de Colaboradores (cost_employees)
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS sector_id TEXT REFERENCES public.cost_sectors(id) ON DELETE SET NULL;
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS cost_center_id TEXT REFERENCES public.production_processes(id) ON DELETE SET NULL;
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS total_monthly_cost NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS total_charges_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS charges_detail JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS benefits_detail JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cost_employees ADD COLUMN IF NOT EXISTS selected_charge_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 3. Tabela de Relacionamento Colaborador <-> Encargos selecionados (N:N)
CREATE TABLE IF NOT EXISTS public.cost_employee_charges (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.cost_employees(id) ON DELETE CASCADE,
    charge_id TEXT NOT NULL REFERENCES public.cost_charges(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (employee_id, charge_id)
);

-- 4. Tabela de Histórico de Custo / Competência de Colaboradores
CREATE TABLE IF NOT EXISTS public.cost_employee_history (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.cost_employees(id) ON DELETE CASCADE,
    competence_date DATE NOT NULL,
    base_salary NUMERIC NOT NULL DEFAULT 0,
    benefits NUMERIC NOT NULL DEFAULT 0,
    total_charges_amount NUMERIC NOT NULL DEFAULT 0,
    total_monthly_cost NUMERIC NOT NULL DEFAULT 0,
    productive_hours NUMERIC NOT NULL DEFAULT 0,
    hourly_cost NUMERIC NOT NULL DEFAULT 0,
    labor_type TEXT NOT NULL CHECK (labor_type IN ('DIRETA', 'INDIRETA')),
    sector_id TEXT,
    process_id TEXT,
    charges_detail JSONB DEFAULT '[]'::jsonb,
    benefits_detail JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Atualização da tabela de Apuração de OP (cost_op) para suportar rateio detalhado de MOI
ALTER TABLE public.cost_op ADD COLUMN IF NOT EXISTS moi_allocations JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.cost_op ADD COLUMN IF NOT EXISTS good_bars_quantity NUMERIC DEFAULT 0;
ALTER TABLE public.cost_op ADD COLUMN IF NOT EXISTS mod_per_bar NUMERIC DEFAULT 0;
ALTER TABLE public.cost_op ADD COLUMN IF NOT EXISTS moi_per_bar NUMERIC DEFAULT 0;
ALTER TABLE public.cost_op ADD COLUMN IF NOT EXISTS total_labor_per_bar NUMERIC DEFAULT 0;

-- 6. Garantir Row Level Security e Políticas de Acesso
ALTER TABLE public.cost_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_employee_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_employee_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read/write access for cost_sectors" ON public.cost_sectors;
    CREATE POLICY "Public read/write access for cost_sectors" ON public.cost_sectors FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for cost_employee_charges" ON public.cost_employee_charges;
    CREATE POLICY "Public read/write access for cost_employee_charges" ON public.cost_employee_charges FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for cost_employee_history" ON public.cost_employee_history;
    CREATE POLICY "Public read/write access for cost_employee_history" ON public.cost_employee_history FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 7. Carga inicial de Centros de Custo (production_processes) caso não existam
INSERT INTO public.production_processes (id, code, description, hourly_rate)
VALUES
    ('proc-cc-001', 'CC-001', 'Produção Industrial & Manipulação', 0),
    ('proc-cc-002', 'CC-002', 'Envase, Rotulagem & Embalagem', 0),
    ('proc-cc-003', 'CC-003', 'Manutenção Industrial & Apoio', 0),
    ('proc-cc-004', 'CC-004', 'Almoxarifado & Controle de Qualidade', 0)
ON CONFLICT (code) DO NOTHING;

-- 8. Carga inicial de Setores vinculados aos Centros de Custo
INSERT INTO public.cost_sectors (id, code, name, cost_center_id)
VALUES
    ('sec-001', 'SET-PROD', 'Fabricação & Mistura Artesanal', 'proc-cc-001'),
    ('sec-002', 'SET-ENV', 'Envase & Linha de Embalagem', 'proc-cc-002'),
    ('sec-003', 'SET-MANUT', 'Manutenção & Engenharia de Fábrica', 'proc-cc-003'),
    ('sec-004', 'SET-ALMOX', 'Pesagem & Almoxarifado', 'proc-cc-004')
ON CONFLICT (code) DO NOTHING;

-- 9. Carga inicial de Encargos Trabalhistas Industriais Oficiais (CLT / Indústria)
INSERT INTO public.cost_charges (id, code, description, percent, charge_type, active)
VALUES
    ('chg-inss', 'INSS', 'INSS Patronal (Previdência)', 20.00, 'ENCARGO', true),
    ('chg-fgts', 'FGTS', 'FGTS (Fundo de Garantia)', 8.00, 'ENCARGO', true),
    ('chg-rat', 'RAT', 'RAT / Riscos Ambientais do Trabalho', 3.00, 'ENCARGO', true),
    ('chg-saledu', 'SAL-EDU', 'Salário-Educação', 2.50, 'ENCARGO', true),
    ('chg-senai', 'SENAI', 'SENAI (Serviço Nacional de Aprendizagem)', 1.00, 'ENCARGO', true),
    ('chg-sesi', 'SESI', 'SESI (Serviço Social da Indústria)', 1.50, 'ENCARGO', true),
    ('chg-sebrae', 'SEBRAE', 'SEBRAE', 0.60, 'ENCARGO', true),
    ('chg-incra', 'INCRA', 'INCRA', 0.20, 'ENCARGO', true),
    ('chg-13', '13-SAL', 'Provisão 13º Salário', 8.33, 'PROVISAO', true),
    ('chg-ferias', 'FERIAS', 'Provisão de Férias Constitucionais', 8.33, 'PROVISAO', true),
    ('chg-terco-ferias', '1/3-FERIAS', 'Provisão de 1/3 de Férias', 2.78, 'PROVISAO', true)
ON CONFLICT (code) DO NOTHING;

-- Índices de performance
CREATE INDEX IF NOT EXISTS cost_sectors_cost_center_id_idx ON public.cost_sectors(cost_center_id);
CREATE INDEX IF NOT EXISTS cost_employees_sector_id_idx ON public.cost_employees(sector_id);
CREATE INDEX IF NOT EXISTS cost_employees_cost_center_id_idx ON public.cost_employees(cost_center_id);
CREATE INDEX IF NOT EXISTS cost_employee_history_employee_id_idx ON public.cost_employee_history(employee_id);
