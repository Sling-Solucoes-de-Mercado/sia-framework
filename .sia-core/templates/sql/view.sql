-- =============================================================================
-- Template de views e materialized views (chapéu Dados do @dev)
-- Uso: seção "views" das migrations (sql/migration.sql). Escolha os blocos necessários.
-- Placeholders: {{view_name}}, {{mview_name}}, {{base_table}}, {{child_table}},
--      {{detail_table}}, {{related_table}}, {{description}}
-- Regras:
--   - View em schema exposto sempre com security_invoker = true. Sem isso, a view roda
--     como o dono e ignora a RLS das tabelas: vazamento de dados pela API.
--   - Nunca exponha auth.users numa view: dados do usuário vêm de public.profiles.
--   - Materialized view não tem RLS: fica fora do schema exposto (private).
-- =============================================================================

-- 1. VIEW BÁSICA (dados ao vivo) ------------------------------------------------------
CREATE OR REPLACE VIEW public.{{view_name}}
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.name,
  t.status,
  t.created_at,
  t.updated_at,
  p.full_name AS owner_name,
  CASE t.status
    WHEN 'active'   THEN 'Ativo'
    WHEN 'pending'  THEN 'Pendente'
    WHEN 'archived' THEN 'Arquivado'
    ELSE 'Desconhecido'
  END AS status_label,
  (now()::date - t.created_at::date) AS days_old
FROM public.{{base_table}} t
LEFT JOIN public.profiles p ON p.id = t.user_id
WHERE t.deleted_at IS NULL;

-- CREATE OR REPLACE VIEW não remove nem renomeia colunas: para isso, DROP VIEW (sem CASCADE)
-- e CREATE de novo na mesma migration.

-- 2. VIEW COM AGREGAÇÃO ---------------------------------------------------------------
CREATE OR REPLACE VIEW public.{{view_name}}_summary
WITH (security_invoker = true) AS
SELECT
  t.category,
  count(*) AS total_count,
  count(*) FILTER (WHERE t.status = 'active')  AS active_count,
  count(*) FILTER (WHERE t.status = 'pending') AS pending_count,
  min(t.created_at) AS earliest,
  max(t.created_at) AS latest,
  avg(t.value)::numeric(10, 2) AS avg_value
FROM public.{{base_table}} t
WHERE t.deleted_at IS NULL
GROUP BY t.category;

-- 3. VIEW COM DADOS RELACIONADOS ------------------------------------------------------
CREATE OR REPLACE VIEW public.{{view_name}}_detailed
WITH (security_invoker = true) AS
SELECT
  t.id,
  t.name,
  t.status,
  d.detail_field,                                         -- 1:1
  (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'created_at', c.created_at))
     FROM public.{{child_table}} c WHERE c.parent_id = t.id) AS children,      -- 1:N
  (SELECT count(*) FROM public.{{child_table}} c WHERE c.parent_id = t.id) AS children_count,
  t.created_at,
  t.updated_at
FROM public.{{base_table}} t
LEFT JOIN public.{{detail_table}} d ON d.id = t.detail_id
WHERE t.deleted_at IS NULL;

-- 4. VIEW ATUALIZÁVEL ------------------------------------------------------------------
-- View simples (uma tabela, sem agregação) aceita INSERT, UPDATE e DELETE direto;
-- com security_invoker, a RLS da tabela vale para a escrita pela view.
CREATE OR REPLACE VIEW public.{{view_name}}_editable
WITH (security_invoker = true) AS
SELECT id, name, description, status, updated_at
FROM public.{{base_table}}
WHERE deleted_at IS NULL;
-- View complexa: trigger INSTEAD OF UPDATE, sem SECURITY DEFINER (mantém a RLS).

-- 5. MATERIALIZED VIEW (dados em cache; refresh periódico) ---------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE MATERIALIZED VIEW IF NOT EXISTS private.{{mview_name}} AS
SELECT
  t.id,
  t.name,
  t.category,
  t.created_at,
  count(r.id) AS related_count,
  sum(r.amount) AS total_amount,
  avg(r.rating) AS avg_rating,
  (t.status = 'active') AS is_active
FROM public.{{base_table}} t
LEFT JOIN public.{{related_table}} r ON r.parent_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, t.category, t.created_at, t.status
WITH DATA;

-- Índice único: exigido pelo REFRESH ... CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_{{mview_name}}_id ON private.{{mview_name}} (id);
CREATE INDEX IF NOT EXISTS idx_{{mview_name}}_category ON private.{{mview_name}} (category);
CREATE INDEX IF NOT EXISTS idx_{{mview_name}}_created_at ON private.{{mview_name}} (created_at DESC);

CREATE OR REPLACE FUNCTION private.refresh_{{mview_name}}()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY private.{{mview_name}};   -- consultas continuam durante o refresh
END;
$$;
REVOKE EXECUTE ON FUNCTION private.refresh_{{mview_name}}() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.refresh_{{mview_name}}() TO service_role;

-- Refresh agendado com pg_cron (habilite a extensão pelo Dashboard ou por migration):
-- SELECT cron.schedule('refresh-{{mview_name}}', '0 * * * *', $$SELECT private.refresh_{{mview_name}}()$$);
-- SELECT cron.unschedule('refresh-{{mview_name}}');
-- Refresh por trigger na tabela base existe, mas fica lento com escrita frequente: evite.

-- 6. METADADOS E PERMISSÕES -----------------------------------------------------------
COMMENT ON VIEW public.{{view_name}} IS '{{description}}';
COMMENT ON MATERIALIZED VIEW private.{{mview_name}} IS '{{description}}. Refresh: de hora em hora ou sob demanda';

-- A view herda a RLS da tabela (security_invoker); o grant só libera o acesso à view.
GRANT SELECT ON public.{{view_name}} TO authenticated;
-- GRANT UPDATE ON public.{{view_name}}_editable TO authenticated;
-- No Supabase, os grants padrão do schema public também alcançam anon: revogue se a view não for pública.
-- REVOKE ALL ON public.{{view_name}} FROM anon;
