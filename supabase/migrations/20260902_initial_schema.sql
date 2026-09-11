-- ==============================================================================
-- MaCarvalho ERP - Supabase PostgreSQL Migration Script
-- Schema & Tabelas de Cosméticos Artesanais
-- ==============================================================================

-- 1. Tabela de Produtos Acabados / Fórmulas
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    stock NUMERIC DEFAULT 0,
    min_stock NUMERIC DEFAULT 0,
    max_stock NUMERIC,
    price NUMERIC DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'UN',
    status TEXT NOT NULL DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
    description TEXT,
    bom_cost NUMERIC DEFAULT 0,
    labor_cost NUMERIC DEFAULT 0,
    image_url TEXT,
    sku TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Componentes da Fórmula (BOM - Bill of Materials)
CREATE TABLE IF NOT EXISTS public.bom_components (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    level TEXT NOT NULL DEFAULT '1',
    name TEXT NOT NULL,
    icon TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'KG',
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Roteiro de Produção Artesanal (Process Steps)
CREATE TABLE IF NOT EXISTS public.process_steps (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    cost NUMERIC DEFAULT 0,
    machine TEXT DEFAULT 'Bancada Artesanal',
    line TEXT DEFAULT 'Linha Geral',
    duration_minutes INTEGER DEFAULT 30,
    duration_formatted TEXT DEFAULT '30 min',
    hourly_rate_text TEXT DEFAULT 'Produção Artesanal',
    process_id TEXT,
    cost_center_code TEXT,
    hourly_rate NUMERIC,
    units_per_hour NUMERIC,
    labor_quantity NUMERIC DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Almoxarifado / Estoque de Insumos
CREATE TABLE IF NOT EXISTS public.inventory_items (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Matéria-Prima', 'Embalagens', 'Componentes', 'Produto Acabado', 'Insumos')),
    unit TEXT NOT NULL DEFAULT 'UN',
    balance NUMERIC NOT NULL DEFAULT 0,
    min_stock NUMERIC NOT NULL DEFAULT 0,
    max_stock NUMERIC NOT NULL DEFAULT 100,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Normal' CHECK (status IN ('Normal', 'Baixo', 'Crítico', 'Esgotado')),
    batch TEXT,
    image_url TEXT,
    lead_time_days INTEGER DEFAULT 5,
    last_purchase_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de Movimentações de Estoque
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'ajuste')),
    title TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_code TEXT,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Ordens de Produção (OP)
CREATE TABLE IF NOT EXISTS public.production_orders (
    id TEXT PRIMARY KEY,
    op_number TEXT NOT NULL UNIQUE,
    product_name TEXT NOT NULL,
    product_code TEXT NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    forecast TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Planejada' CHECK (status IN ('Em Andamento', 'Parada', 'Concluída', 'Planejada')),
    line TEXT NOT NULL DEFAULT 'Bancada Artesanal - Saboaria',
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'un',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tabela de Pedidos de Venda / Faturamento
CREATE TABLE IF NOT EXISTS public.sales_records (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    client TEXT NOT NULL,
    item TEXT,
    value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Faturado' CHECK (status IN ('Faturado', 'Separando', 'Aguard. Pag.', 'Cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Habilitar Row Level Security (RLS)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;

-- 9. Políticas de Acesso Livre para Leitura/Escrita da Aplicação
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read/write access for products" ON public.products;
    CREATE POLICY "Public read/write access for products" ON public.products FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for bom_components" ON public.bom_components;
    CREATE POLICY "Public read/write access for bom_components" ON public.bom_components FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for process_steps" ON public.process_steps;
    CREATE POLICY "Public read/write access for process_steps" ON public.process_steps FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for inventory_items" ON public.inventory_items;
    CREATE POLICY "Public read/write access for inventory_items" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for stock_movements" ON public.stock_movements;
    CREATE POLICY "Public read/write access for stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for production_orders" ON public.production_orders;
    CREATE POLICY "Public read/write access for production_orders" ON public.production_orders FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read/write access for sales_records" ON public.sales_records;
    CREATE POLICY "Public read/write access for sales_records" ON public.sales_records FOR ALL USING (true) WITH CHECK (true);
END $$;
