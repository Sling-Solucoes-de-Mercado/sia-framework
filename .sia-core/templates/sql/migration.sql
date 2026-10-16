-- =============================================================================
-- Template de migration (chapéu Dados do @dev)
-- Uso: crie o arquivo com `supabase migration new {{migration_name}}`, preencha a
--      partir deste template e aplique com *db-migrate (dry-run, snapshot, aplicação
--      e verificação).
-- Placeholders: {{migration_name}}, {{story_id}}, {{author}}, {{created_date}},
--      {{description}}, {{parent_table}}, {{table_name}}, {{column_name}},
--      {{column_type}}, {{constraints}}, {{table_description}}, {{column_description}}
-- Regras:
--   - Sem BEGIN/COMMIT: o Supabase CLI (ou o psql --single-transaction) envolve o
--     arquivo numa transação. Um COMMIT aqui efetivaria a mudança até no dry-run.
--   - Nada que não rode em transação (CREATE INDEX CONCURRENTLY, VACUUM): isso vai
--     em script separado, executado fora da migration.
--   - Ordem: extensões > tabelas e constraints > funções > triggers > RLS > views >
--     grants e comentários.
--   - Rollback: supabase/rollback/{versão}_rollback_{{migration_name}}.sql (sql/rollback.sql).
-- =============================================================================
-- Migration: {{migration_name}}
-- Story: {{story_id}} | Autor: {{author}} | Data: {{created_date}}
-- Descrição: {{description}}

-- 0. PRÉ-CONDIÇÕES ------------------------------------------------------------
DO $$
BEGIN
  -- Exemplo: exige a tabela pai
  -- ASSERT to_regclass('public.{{parent_table}}') IS NOT NULL, 'Tabela {{parent_table}} ausente';
  RAISE NOTICE 'Pré-condições conferidas';
END $$;

-- 1. EXTENSÕES ----------------------------------------------------------------
-- CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- 2. TABELAS E CONSTRAINTS ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.{{table_name}} (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  {{column_name}} {{column_type}} {{constraints}},
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Coluna em tabela existente:
-- ALTER TABLE public.{{existing_table}} ADD COLUMN IF NOT EXISTS {{new_column}} {{column_type}};

-- Índice (tabela nova ou pequena; tabela grande em produção: CONCURRENTLY em script separado):
-- CREATE INDEX IF NOT EXISTS idx_{{table_name}}_{{column_name}} ON public.{{table_name}} ({{column_name}});

-- 3. FUNÇÕES ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. TRIGGERS -----------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_{{table_name}}_updated_at ON public.{{table_name}};
CREATE TRIGGER trg_{{table_name}}_updated_at
  BEFORE UPDATE ON public.{{table_name}}
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. RLS ----------------------------------------------------------------------
ALTER TABLE public.{{table_name}} ENABLE ROW LEVEL SECURITY;
-- Policies: sql/rls-simple.sql, sql/rls-granular.sql ou sql/rls-tenant.sql (*db-policy)

-- 6. VIEWS --------------------------------------------------------------------
-- Views expostas sempre com security_invoker = true (sql/view.sql).

-- 7. GRANTS E COMENTÁRIOS -----------------------------------------------------
COMMENT ON TABLE public.{{table_name}} IS '{{table_description}}';
COMMENT ON COLUMN public.{{table_name}}.{{column_name}} IS '{{column_description}}';

-- 8. MIGRAÇÃO DE DADOS --------------------------------------------------------
-- Só volume pequeno; backfill grande vai em script em lotes (migration-plan-tmpl.yaml).
-- INSERT INTO public.{{new_table}} (col1, col2) SELECT old_col1, old_col2 FROM public.{{old_table}};

-- 9. VERIFICAÇÃO --------------------------------------------------------------
DO $$
BEGIN
  ASSERT to_regclass('public.{{table_name}}') IS NOT NULL, 'Tabela {{table_name}} não foi criada';
  ASSERT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.{{table_name}}'::regclass),
    'RLS não está habilitada em {{table_name}}';
  RAISE NOTICE 'Migration {{migration_name}} verificada';
END $$;
