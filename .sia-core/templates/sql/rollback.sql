-- =============================================================================
-- Template de script de rollback (chapéu Dados do @dev)
-- Uso: um script por migration aplicada em ambiente remoto, gravado em
--      supabase/rollback/{versão}_rollback_{{migration_name}}.sql e executado por
--      *db-rollback. No Supabase remoto, prefira aplicar este conteúdo como migration
--      nova (`supabase migration new revert_{{migration_name}}`) pelo *db-migrate.
-- Placeholders: {{migration_name}}, {{author}}, {{created_date}}, {{table_name}},
--      {{existing_table}}, {{new_column}}, {{column_name}}, {{view_name}},
--      {{policy_name}}, {{function_name}}
-- Regras:
--   - Sem BEGIN/COMMIT: *db-rollback executa em transação única (psql --single-transaction).
--   - Desfaça na ordem inversa da migration.
--   - Teste no ambiente local antes de usar em produção.
--   - Migração de dados pode não ser reversível: tenha o snapshot dos dados afetados.
-- =============================================================================
-- Rollback de: {{migration_name}} | Autor: {{author}} | Data: {{created_date}}

-- 1. VERIFICAÇÃO PRÉVIA -------------------------------------------------------
DO $$
BEGIN
  -- Confirme que a migration está aplicada antes de desfazer
  -- ASSERT to_regclass('public.{{table_name}}') IS NOT NULL, 'Nada a reverter: {{table_name}} não existe';
  RAISE NOTICE 'Iniciando rollback de {{migration_name}}';
END $$;

-- 2. REVERTER DADOS (se a migration transformou dados) ------------------------
-- Restaure a partir da tabela de backup criada antes da migration:
-- UPDATE public.{{existing_table}} t SET status = b.status
-- FROM private.{{existing_table}}_backup b WHERE t.id = b.id;

-- 3. REVERTER SCHEMA (ordem inversa da migration) -----------------------------
-- Views
-- DROP VIEW IF EXISTS public.{{view_name}};

-- Policies (recrie as anteriores, se havia)
-- DROP POLICY IF EXISTS {{policy_name}} ON public.{{table_name}};

-- Triggers e funções
DROP TRIGGER IF EXISTS trg_{{table_name}}_updated_at ON public.{{table_name}};
-- DROP FUNCTION IF EXISTS public.{{function_name}}();

-- Índices
-- DROP INDEX IF EXISTS public.idx_{{table_name}}_{{column_name}};

-- Colunas adicionadas
-- ALTER TABLE public.{{existing_table}} DROP COLUMN IF EXISTS {{new_column}};

-- Tabelas criadas (PERIGOSO: apaga os dados; confirme o snapshot de dados).
-- Sem CASCADE, de propósito: falha se houver objetos dependentes não previstos.
-- DROP TABLE IF EXISTS public.{{table_name}};

-- 4. VERIFICAÇÃO --------------------------------------------------------------
DO $$
BEGIN
  -- ASSERT to_regclass('public.{{table_name}}') IS NULL, 'Tabela {{table_name}} ainda existe';
  RAISE NOTICE 'Rollback de {{migration_name}} concluído';
END $$;

-- -----------------------------------------------------------------------------
-- Depois do rollback:
-- 1. *db-smoke-test e os fluxos críticos da aplicação
-- 2. Procure dados órfãos nas tabelas relacionadas
-- 3. Supabase revertido por psql: supabase migration repair {versão} --status reverted
-- 4. Registre o motivo em supabase/docs/migration-log.md (status ⏪)
-- -----------------------------------------------------------------------------
