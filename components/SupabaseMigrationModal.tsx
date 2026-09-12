'use client';

import React, { useState } from 'react';
import { 
  Database, 
  Copy, 
  Check, 
  X, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string) => void;
}

export const SupabaseMigrationModal: React.FC<SupabaseMigrationModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [copied, setCopied] = useState(false);
  const isConfigured = isSupabaseConfigured();

  if (!isOpen) return null;

  const sqlScript = `-- ==============================================================================
-- MaCarvalho ERP - Supabase PostgreSQL Migration Script
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. Produtos Acabados / Fórmulas
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

-- 2. Matérias-Primas da Fórmula (BOM)
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

-- 3. Roteiro de Produção Artesanal
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
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS labor_quantity NUMERIC DEFAULT 1;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS units_per_hour NUMERIC;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS cost_center_code TEXT;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS process_id TEXT;
ALTER TABLE public.process_steps ADD COLUMN IF NOT EXISTS equipment_id TEXT;

-- 4. Centros de Custo e Equipamentos
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'process_steps_equipment_id_fkey'
  ) THEN
    ALTER TABLE public.process_steps ADD CONSTRAINT process_steps_equipment_id_fkey
      FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Almoxarifado / Estoque de Insumos
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

-- 5. Movimentações de Estoque
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

-- 6. Ordens de Produção (OP)
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

-- 7. Vendas / Faturamento
CREATE TABLE IF NOT EXISTS public.sales_records (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    client TEXT NOT NULL,
    item TEXT,
    value NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Faturado' CHECK (status IN ('Faturado', 'Separando', 'Aguard. Pag.', 'Cancelado')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Row Level Security & Políticas de Acesso
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access products" ON public.products;
    CREATE POLICY "Public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access bom" ON public.bom_components;
    CREATE POLICY "Public access bom" ON public.bom_components FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access process" ON public.process_steps;
    CREATE POLICY "Public access process" ON public.process_steps FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access inventory" ON public.inventory_items;
    CREATE POLICY "Public access inventory" ON public.inventory_items FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access movements" ON public.stock_movements;
    CREATE POLICY "Public access movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access ops" ON public.production_orders;
    CREATE POLICY "Public access ops" ON public.production_orders FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access sales" ON public.sales_records;
    CREATE POLICY "Public access sales" ON public.sales_records FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access production processes" ON public.production_processes;
    CREATE POLICY "Public access production processes" ON public.production_processes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access equipment" ON public.equipment;
    CREATE POLICY "Public access equipment" ON public.equipment FOR ALL USING (true) WITH CHECK (true);
END $$;`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    onNotify('Script SQL da migration copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-[#dec1af] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#954a00] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Integração Supabase & Migration</h2>
              <p className="text-[11px] text-amber-100">Banco de Dados PostgreSQL MaCarvalho</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs text-[#1a1c1b]">
          {/* Status Indicator */}
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${
            isConfigured 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {isConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <div className="font-bold">
                {isConfigured ? 'Conexão Supabase Ativa' : 'Aguardando Credenciais do Supabase'}
              </div>
              <div className="text-[11px] opacity-90">
                {isConfigured 
                  ? 'O cliente Supabase está inicializado e sincronizando os registros em tempo real.' 
                  : 'Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) nas configurações do projeto para conectar o banco.'}
              </div>
            </div>
          </div>

          {/* Migration Instructions */}
          <div className="space-y-2">
            <h3 className="font-bold text-[#574335] flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-[#954a00]" />
              Como executar a Migration no seu Supabase:
            </h3>
            <ol className="list-decimal list-inside space-y-1 text-[#574335] text-[11px] pl-1">
              <li>Acesse o painel do seu projeto no <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#954a00] font-bold underline inline-flex items-center gap-0.5">Supabase <ExternalLink className="w-3 h-3" /></a></li>
              <li>Vá na aba <strong>SQL Editor</strong> no menu lateral esquerdo</li>
              <li>Clique em <strong>+ New Query</strong></li>
              <li>Copie o script SQL abaixo e cole no editor</li>
              <li>Clique no botão verde <strong>Run</strong> para criar as 7 tabelas com políticas RLS</li>
            </ol>
          </div>

          {/* SQL Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#574335] text-[11px]">
                Script SQL da Migration (20260902_initial_schema.sql)
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1 bg-[#954a00] hover:bg-[#713700] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Script SQL'}</span>
              </button>
            </div>

            <pre className="p-3 bg-[#1a1c1b] text-emerald-300 font-mono text-[10px] rounded-xl overflow-x-auto max-h-48 border border-[#dec1af]/40">
              {sqlScript}
            </pre>
          </div>

          {/* Security note */}
          <div className="p-3 bg-[#faf9f7] rounded-xl border border-[#dec1af]/50 flex items-start gap-2.5 text-[11px] text-[#574335]">
            <ShieldCheck className="w-4 h-4 text-[#954a00] shrink-0 mt-0.5" />
            <div>
              <strong>Segurança & Row Level Security:</strong> O script já inclui o comando <code className="font-mono bg-stone-200 px-1 rounded">ENABLE ROW LEVEL SECURITY</code> e políticas públicas para as 7 tabelas do ERP MaCarvalho (produtos, BOM, etapas, estoque, movimentações, OPs e vendas).
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#f4f3f1] border-t border-[#dec1af]/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#954a00] hover:bg-[#713700] text-white font-bold rounded-xl text-xs shadow-xs"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
