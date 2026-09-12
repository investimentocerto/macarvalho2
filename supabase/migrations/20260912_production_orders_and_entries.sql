-- Persistencia de OPs, lancamentos por etapa e vinculo com produtos
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS opening_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS production_start TIMESTAMPTZ;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS production_end TIMESTAMPTZ;
ALTER TABLE public.production_orders ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.production_orders ALTER COLUMN forecast DROP NOT NULL;
ALTER TABLE public.production_orders ALTER COLUMN line DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.production_entries (
    id TEXT PRIMARY KEY,
    order_id TEXT NOT NULL REFERENCES public.production_orders(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL REFERENCES public.process_steps(id) ON DELETE CASCADE,
    quantity_produced NUMERIC NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    entry_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.production_entries ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read/write access for production_entries" ON public.production_entries;
    CREATE POLICY "Public read/write access for production_entries" ON public.production_entries FOR ALL USING (true) WITH CHECK (true);
END $$;

CREATE INDEX IF NOT EXISTS production_orders_product_id_idx ON public.production_orders(product_id);
CREATE INDEX IF NOT EXISTS production_entries_order_id_idx ON public.production_entries(order_id);
