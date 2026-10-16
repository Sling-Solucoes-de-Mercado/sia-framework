-- =============================================================================
-- Template de smoke test do banco (chapéu Dados do @dev)
-- Uso: copie para supabase/smoke/smoke_test.sql (ou v_{versão}.sql), preencha as
--      expectativas e rode com *db-smoke-test, em transação somente leitura:
--        psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
--          -c "SET TRANSACTION READ ONLY;" -f supabase/smoke/smoke_test.sql
-- Placeholders: {{expected_tables}}, {{expected_functions}}, {{min_policies}},
--      {{sample_table}}, {{protected_table}}
-- Regras: somente leitura, menos de 5 segundos e falha rápida (cada verificação
--      levanta exceção quando a expectativa não confere).
-- Não guarde em supabase/tests/: ali o `supabase test db` espera testes pgTAP.
-- =============================================================================
SET client_min_messages = warning;

-- 1. Tabelas esperadas existem
DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(t) INTO v_missing
  FROM unnest(ARRAY[{{expected_tables}}]::text[]) AS t          -- ex.: 'profiles', 'posts'
  WHERE to_regclass('public.' || t) IS NULL;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas ausentes: %', v_missing;
  END IF;
END $$;

-- 2. RLS ativa em toda tabela exposta
DO $$
DECLARE
  v_without_rls text[];
BEGIN
  SELECT array_agg(c.relname) INTO v_without_rls
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity;
  IF v_without_rls IS NOT NULL THEN
    RAISE EXCEPTION 'Tabelas sem RLS: %', v_without_rls;
  END IF;
END $$;

-- 3. Quantidade mínima de policies instaladas
DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') < {{min_policies}} THEN
    RAISE EXCEPTION 'Menos policies que o esperado (mínimo: {{min_policies}})';
  END IF;
END $$;

-- 4. Funções esperadas existem
DO $$
DECLARE
  v_missing text[];
BEGIN
  SELECT array_agg(f) INTO v_missing
  FROM unnest(ARRAY[{{expected_functions}}]::text[]) AS f       -- ex.: 'set_updated_at'
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = f AND pronamespace = 'public'::regnamespace);
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'Funções ausentes: %', v_missing;
  END IF;
END $$;

-- 5. Toda FK tem índice
DO $$
DECLARE
  v_fks text[];
BEGIN
  SELECT array_agg(c.conname) INTO v_fks
  FROM pg_constraint c
  WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
    AND NOT EXISTS (
      SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]);
  IF v_fks IS NOT NULL THEN
    RAISE EXCEPTION 'FKs sem índice: %', v_fks;
  END IF;
END $$;

-- 6. Consulta de amostra (esperado: retorna sem erro e com o volume previsto)
-- SELECT count(*) FROM public.{{sample_table}} WHERE deleted_at IS NULL;

-- 7. Sanidade da RLS: consulta como authenticated não pode dar erro
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
SELECT count(*) AS visible_rows FROM public.{{protected_table}};
RESET ROLE;
