-- Vinculo entre Processos de Fabricacao cadastrados em Custos Industriais e o Roteiro de Producao
-- Os registros continuam em cost_sectors; process_steps.process_id passa a apontar para esse cadastro.

ALTER TABLE public.cost_sectors
    ADD COLUMN IF NOT EXISTS operation_type TEXT DEFAULT 'Semiautomática';

ALTER TABLE public.cost_sectors
    ADD COLUMN IF NOT EXISTS standard_time_minutes NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE public.cost_sectors
    ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';

ALTER TABLE public.process_steps
    DROP CONSTRAINT IF EXISTS process_steps_process_id_fkey;

-- Versoes antigas usavam process_id para guardar o ID do Centro de Custo.
-- Esses valores nao sao Processos de Fabricacao e nao podem permanecer antes da FK.
UPDATE public.process_steps ps
SET process_id = NULL
WHERE ps.process_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.cost_sectors cs WHERE cs.id = ps.process_id);

ALTER TABLE public.process_steps
    ADD CONSTRAINT process_steps_process_id_fkey
    FOREIGN KEY (process_id) REFERENCES public.cost_sectors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS process_steps_process_id_idx ON public.process_steps(process_id);

ALTER TABLE public.cost_sectors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read/write access for cost_sectors" ON public.cost_sectors;
CREATE POLICY "Public read/write access for cost_sectors" ON public.cost_sectors
    FOR ALL USING (true) WITH CHECK (true);
