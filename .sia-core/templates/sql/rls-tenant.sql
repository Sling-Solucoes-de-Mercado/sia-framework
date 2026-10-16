-- =============================================================================
-- Template RLS multi-tenant: dados isolados por organização (tenant)
-- Uso: *db-policy {{table_name}} no modo tenant. A PARTE 1 (infraestrutura de
--      tenants) entra uma vez no projeto; a PARTE 2 se repete por tabela. Copie para
--      a migration `supabase migration new rls_tenant_{{table_name}}` e aplique com
--      *db-migrate.
-- Placeholders: {{table_name}}
-- Funções auxiliares ficam no schema private (fora da API), com search_path vazio.
-- SECURITY DEFINER evita a recursão de RLS ao consultar tenant_members nas policies.
-- =============================================================================

-- =============================================================================
-- PARTE 1: INFRAESTRUTURA DE TENANTS (uma vez por projeto)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Quem pertence a qual tenant, e com qual papel
CREATE TABLE IF NOT EXISTS public.tenant_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)                     -- também indexa tenant_id
);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON public.tenant_members (user_id);

-- Tenants do usuário atual
CREATE OR REPLACE FUNCTION private.user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(tenant_id), '{}')
  FROM public.tenant_members
  WHERE user_id = (SELECT auth.uid());
$$;

-- Papel do usuário atual num tenant (NULL se não for membro)
CREATE OR REPLACE FUNCTION private.tenant_role(p_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.tenant_members
  WHERE tenant_id = p_tenant_id AND user_id = (SELECT auth.uid());
$$;

REVOKE EXECUTE ON FUNCTION private.user_tenant_ids(), private.tenant_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.user_tenant_ids(), private.tenant_role(uuid) TO authenticated;

-- RLS das tabelas de tenant: membros veem o próprio tenant e os colegas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenants_member_select ON public.tenants;
CREATE POLICY tenants_member_select ON public.tenants FOR SELECT TO authenticated
  USING (id = ANY ((SELECT private.user_tenant_ids())));

DROP POLICY IF EXISTS tenant_members_select ON public.tenant_members;
CREATE POLICY tenant_members_select ON public.tenant_members FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT private.user_tenant_ids())));

-- =============================================================================
-- PARTE 2: POLICIES DA TABELA COM tenant_id (por tabela)
-- =============================================================================
-- A tabela precisa da coluna (crie antes, por migration, se faltar):
-- ALTER TABLE public.{{table_name}} ADD COLUMN IF NOT EXISTS tenant_id uuid NOT NULL REFERENCES public.tenants (id);
CREATE INDEX IF NOT EXISTS idx_{{table_name}}_tenant_id ON public.{{table_name}} (tenant_id);

ALTER TABLE public.{{table_name}} ENABLE ROW LEVEL SECURITY;

-- SELECT: só linhas dos tenants do usuário
DROP POLICY IF EXISTS {{table_name}}_tenant_select ON public.{{table_name}};
CREATE POLICY {{table_name}}_tenant_select ON public.{{table_name}}
  FOR SELECT TO authenticated
  USING (tenant_id = ANY ((SELECT private.user_tenant_ids())));

-- INSERT: só em tenant do qual o usuário é membro
DROP POLICY IF EXISTS {{table_name}}_tenant_insert ON public.{{table_name}};
CREATE POLICY {{table_name}}_tenant_insert ON public.{{table_name}}
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = ANY ((SELECT private.user_tenant_ids())));

-- UPDATE: só owner e admin do tenant; a linha continua no tenant do usuário
DROP POLICY IF EXISTS {{table_name}}_tenant_update ON public.{{table_name}};
CREATE POLICY {{table_name}}_tenant_update ON public.{{table_name}}
  FOR UPDATE TO authenticated
  USING (
    tenant_id = ANY ((SELECT private.user_tenant_ids()))
    AND private.tenant_role(tenant_id) IN ('owner', 'admin')
  )
  WITH CHECK (tenant_id = ANY ((SELECT private.user_tenant_ids())));

-- DELETE: só owner do tenant
DROP POLICY IF EXISTS {{table_name}}_tenant_delete ON public.{{table_name}};
CREATE POLICY {{table_name}}_tenant_delete ON public.{{table_name}}
  FOR DELETE TO authenticated
  USING (private.tenant_role(tenant_id) = 'owner');

-- -----------------------------------------------------------------------------
-- Alternativa sem consulta extra: tenant numa claim de servidor (app_metadata),
-- gravada pela API admin do Auth ou por custom access token hook:
--   USING (tenant_id = ((SELECT auth.jwt()) -> 'app_metadata' ->> 'tenant_id')::uuid)
-- Teste o isolamento com *db-test-as-user: um usuário de cada tenant.
-- -----------------------------------------------------------------------------
