-- =============================================================================
-- Template RLS simples (KISS): o dono acessa só as próprias linhas
-- Uso: *db-policy {{table_name}} no modo kiss. Copie para a migration criada com
--      `supabase migration new rls_kiss_{{table_name}}` e aplique com *db-migrate.
-- Placeholders: {{table_name}}, {{owner_column}} (padrão: user_id), {{user_uuid}}
-- Requisito da tabela:
--   {{owner_column}} uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE
-- =============================================================================

ALTER TABLE public.{{table_name}} ENABLE ROW LEVEL SECURITY;

-- Policy única para SELECT, INSERT, UPDATE e DELETE.
-- (SELECT auth.uid()) é avaliado uma vez por statement, não por linha.
-- O IS NOT NULL deixa explícito que anônimo nunca passa.
DROP POLICY IF EXISTS {{table_name}}_owner_all ON public.{{table_name}};
CREATE POLICY {{table_name}}_owner_all ON public.{{table_name}}
  FOR ALL
  TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = {{owner_column}})
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = {{owner_column}});

COMMENT ON POLICY {{table_name}}_owner_all ON public.{{table_name}} IS
  'KISS: o dono acessa só as próprias linhas';

-- Índice da coluna usada na policy (essencial para o desempenho)
CREATE INDEX IF NOT EXISTS idx_{{table_name}}_{{owner_column}} ON public.{{table_name}} ({{owner_column}});

-- -----------------------------------------------------------------------------
-- VARIAÇÃO: leitura pública, escrita só do dono
-- Substitua a policy FOR ALL acima por estas quatro.
-- -----------------------------------------------------------------------------
-- DROP POLICY IF EXISTS {{table_name}}_owner_all ON public.{{table_name}};
-- CREATE POLICY {{table_name}}_public_read ON public.{{table_name}}
--   FOR SELECT TO anon, authenticated
--   USING (is_public = true);
-- CREATE POLICY {{table_name}}_owner_insert ON public.{{table_name}}
--   FOR INSERT TO authenticated
--   WITH CHECK ((SELECT auth.uid()) = {{owner_column}});
-- CREATE POLICY {{table_name}}_owner_update ON public.{{table_name}}
--   FOR UPDATE TO authenticated
--   USING ((SELECT auth.uid()) = {{owner_column}})
--   WITH CHECK ((SELECT auth.uid()) = {{owner_column}});
-- CREATE POLICY {{table_name}}_owner_delete ON public.{{table_name}}
--   FOR DELETE TO authenticated
--   USING ((SELECT auth.uid()) = {{owner_column}});

-- -----------------------------------------------------------------------------
-- NOTAS
-- - A service_role ignora RLS (BYPASSRLS): não crie policy para ela e nunca a use no cliente.
-- - Teste com *db-test-as-user, sempre numa transação desfeita no fim:
--     BEGIN;
--     SET LOCAL ROLE authenticated;
--     SELECT set_config('request.jwt.claims', '{"sub":"{{user_uuid}}","role":"authenticated"}', true);
--     SELECT * FROM public.{{table_name}};      -- só as linhas do usuário
--     ROLLBACK;
--   Anônimo (SET LOCAL ROLE anon): 0 linhas, salvo a variação de leitura pública.
-- -----------------------------------------------------------------------------
