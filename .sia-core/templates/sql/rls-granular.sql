-- =============================================================================
-- Template RLS granular com papéis (RBAC)
-- Uso: *db-policy {{table_name}} no modo granular. A PARTE 1 (fundação de papéis)
--      entra uma vez no projeto; a PARTE 2 se repete por tabela. Copie para a
--      migration `supabase migration new rls_granular_{{table_name}}` e aplique com
--      *db-migrate.
-- Placeholders: {{table_name}}, {{owner_column}} (padrão: user_id)
-- Funções auxiliares ficam no schema private (fora da API), com search_path vazio.
-- =============================================================================

-- =============================================================================
-- PARTE 1: FUNDAÇÃO DE PAPÉIS (uma vez por projeto)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (name, description, permissions) VALUES
  ('admin',   'Acesso total',             '["*"]'),
  ('editor',  'Lê e altera conteúdo',     '["read", "write", "update"]'),
  ('creator', 'Cria conteúdo',            '["read", "write"]'),
  ('viewer',  'Somente leitura',          '["read"]')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,                         -- NULL: não expira
  UNIQUE (user_id, role_id)                       -- também indexa user_id
);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON public.user_roles (role_id);

-- O usuário atual tem algum destes papéis? (has_role(x) = has_any_role(ARRAY[x]))
CREATE OR REPLACE FUNCTION private.has_any_role(role_names text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (SELECT auth.uid())
      AND r.name = ANY (role_names)
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

-- O usuário atual tem esta permissão?
CREATE OR REPLACE FUNCTION private.has_permission(permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (SELECT auth.uid())
      AND (r.permissions @> '["*"]'::jsonb OR r.permissions @> to_jsonb(permission))
      AND (ur.expires_at IS NULL OR ur.expires_at > now())
  );
$$;

REVOKE EXECUTE ON FUNCTION private.has_any_role(text[]), private.has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_any_role(text[]), private.has_permission(text) TO authenticated;

-- RLS das tabelas de papéis: todos leem os papéis; só admin altera
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roles_select ON public.roles;
CREATE POLICY roles_select ON public.roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS roles_admin ON public.roles;
CREATE POLICY roles_admin ON public.roles FOR ALL TO authenticated
  USING ((SELECT private.has_any_role(ARRAY['admin'])))
  WITH CHECK ((SELECT private.has_any_role(ARRAY['admin'])));

DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.has_any_role(ARRAY['admin'])));
DROP POLICY IF EXISTS user_roles_admin ON public.user_roles;
CREATE POLICY user_roles_admin ON public.user_roles FOR ALL TO authenticated
  USING ((SELECT private.has_any_role(ARRAY['admin'])))
  WITH CHECK ((SELECT private.has_any_role(ARRAY['admin'])));

-- =============================================================================
-- PARTE 2: POLICIES POR OPERAÇÃO (por tabela)
-- =============================================================================
ALTER TABLE public.{{table_name}} ENABLE ROW LEVEL SECURITY;
-- Opcional: aplica a RLS também ao dono da tabela (papéis com BYPASSRLS continuam ignorando).
-- Confira antes se migrations de dados do dono continuam funcionando.
-- ALTER TABLE public.{{table_name}} FORCE ROW LEVEL SECURITY;

-- SELECT: o dono ou papéis de leitura
DROP POLICY IF EXISTS {{table_name}}_select ON public.{{table_name}};
CREATE POLICY {{table_name}}_select ON public.{{table_name}}
  FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = {{owner_column}}
    OR (SELECT private.has_any_role(ARRAY['admin', 'viewer']))
  );

-- INSERT: só em nome próprio, ou papéis de criação
DROP POLICY IF EXISTS {{table_name}}_insert ON public.{{table_name}};
CREATE POLICY {{table_name}}_insert ON public.{{table_name}}
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = {{owner_column}}
    OR (SELECT private.has_any_role(ARRAY['admin', 'creator']))
  );

-- UPDATE: o dono ou editores; WITH CHECK valida o estado novo da linha
DROP POLICY IF EXISTS {{table_name}}_update ON public.{{table_name}};
CREATE POLICY {{table_name}}_update ON public.{{table_name}}
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = {{owner_column}}
    OR (SELECT private.has_any_role(ARRAY['admin', 'editor']))
  )
  WITH CHECK (
    (SELECT auth.uid()) = {{owner_column}}
    OR (SELECT private.has_any_role(ARRAY['admin', 'editor']))
  );

-- DELETE: o dono ou admin
DROP POLICY IF EXISTS {{table_name}}_delete ON public.{{table_name}};
CREATE POLICY {{table_name}}_delete ON public.{{table_name}}
  FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = {{owner_column}}
    OR (SELECT private.has_any_role(ARRAY['admin']))
  );

CREATE INDEX IF NOT EXISTS idx_{{table_name}}_{{owner_column}} ON public.{{table_name}} ({{owner_column}});

-- -----------------------------------------------------------------------------
-- Uso em outras tabelas: USING ({{owner_column}} = (SELECT auth.uid())
--                                OR (SELECT private.has_permission('read')))
-- Teste com *db-test-as-user (um usuário por papel e um sem papel).
-- -----------------------------------------------------------------------------
