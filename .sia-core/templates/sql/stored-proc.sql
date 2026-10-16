-- =============================================================================
-- Template de funções (stored procedures e RPC do Supabase)
-- Uso: seção "funções" das migrations (sql/migration.sql). Função em schema exposto
--      (public) vira endpoint RPC: supabase.rpc('{{function_name}}', { p_param1: valor }).
-- Placeholders: {{function_name}}, {{table_name}}, {{param1_type}}, {{param2_type}},
--      {{return_type}}, {{filter_type}}, {{description}}
-- Regras:
--   - SECURITY INVOKER por padrão: roda com os privilégios e a RLS de quem chama.
--   - SECURITY DEFINER só com motivo, no schema private, com search_path vazio,
--     checagem explícita de auth.uid() e EXECUTE revogado de PUBLIC e anon.
--   - Volatilidade correta: IMMUTABLE (mesmo resultado sempre; pode ir em índice),
--     STABLE (não altera o banco; mesmo resultado na transação), VOLATILE (altera ou varia).
-- =============================================================================

-- 1. FUNÇÃO BÁSICA (leitura) ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.{{function_name}}(
  p_param1 {{param1_type}},
  p_param2 {{param2_type}} DEFAULT NULL
)
RETURNS {{return_type}}
LANGUAGE plpgsql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
DECLARE
  v_result {{return_type}};
BEGIN
  IF p_param1 IS NULL THEN
    RAISE EXCEPTION 'p_param1 é obrigatório';
  END IF;

  SELECT t.name INTO STRICT v_result          -- STRICT: erro se não houver exatamente uma linha
  FROM public.{{table_name}} t
  WHERE t.id = p_param1;

  RETURN v_result;
EXCEPTION
  WHEN no_data_found THEN
    RAISE EXCEPTION 'Nenhum registro para o id %', p_param1;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.{{function_name}}({{param1_type}}, {{param2_type}}) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.{{function_name}}({{param1_type}}, {{param2_type}}) TO authenticated;
COMMENT ON FUNCTION public.{{function_name}}({{param1_type}}, {{param2_type}}) IS '{{description}}';

-- 2. FUNÇÃO QUE RETORNA TABELA ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.{{function_name}}_list(
  p_filter {{filter_type}} DEFAULT NULL
)
RETURNS TABLE (id uuid, name text, created_at timestamptz)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
  SELECT t.id, t.name, t.created_at
  FROM public.{{table_name}} t
  WHERE (p_filter IS NULL OR t.filter_column = p_filter)   -- a RLS da tabela também se aplica
  ORDER BY t.created_at DESC;
$$;

-- 3. FUNÇÃO DE ESCRITA (transação única, junto com a chamada) -------------------------
CREATE OR REPLACE FUNCTION public.{{function_name}}_create(p_input jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
VOLATILE
SET search_path = ''
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  IF NOT (p_input ? 'name') THEN
    RAISE EXCEPTION 'Campo name ausente na entrada';
  END IF;

  INSERT INTO public.{{table_name}} (name, data, user_id)
  VALUES (p_input ->> 'name', p_input -> 'data', auth.uid())
  RETURNING id INTO v_new_id;

  RETURN v_new_id;     -- trilha de auditoria: trigger de sql/trigger.sql na tabela
END;
$$;

-- 4. SECURITY DEFINER (quando precisa ignorar a RLS de forma controlada) -------------
CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.{{function_name}}_admin(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória';
  END IF;
  IF coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '') <> 'admin' THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  UPDATE public.{{table_name}} SET status = 'archived' WHERE id = p_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.{{function_name}}_admin(uuid) FROM PUBLIC, anon;
-- Para expor como RPC, crie um wrapper SECURITY INVOKER em public que chama esta função
-- e conceda GRANT USAGE ON SCHEMA private + GRANT EXECUTE ao papel que pode usá-la.

-- -----------------------------------------------------------------------------
-- RPC no Supabase:
-- 1. A função fica num schema exposto (public) e recebe os argumentos por nome.
-- 2. EXECUTE concedido só aos papéis certos (por padrão, todos podem executar).
-- 3. Regenere os tipos (supabase gen types typescript) depois de criar ou mudar a assinatura.
-- -----------------------------------------------------------------------------
