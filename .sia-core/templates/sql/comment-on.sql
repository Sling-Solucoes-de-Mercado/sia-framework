-- =============================================================================
-- Template de documentação no próprio banco (COMMENT ON)
-- Uso: seção "grants e comentários" das migrations (sql/migration.sql). Os
--      comentários aparecem no Studio, no psql (\d+) e nos tipos gerados.
-- Placeholders: {{table_name}}, {{column_name}}
-- Regra: comente o propósito e as regras de negócio, não o óbvio.
-- =============================================================================

-- TABELAS ------------------------------------------------------------------------
COMMENT ON TABLE public.{{table_name}} IS 'O que a tabela guarda e para que serve';

COMMENT ON TABLE public.profiles IS
'Perfil público do usuário (1:1 com auth.users).
RLS: o dono lê e altera o próprio perfil.
Relacionadas: user_roles, tenant_members';

-- COLUNAS --------------------------------------------------------------------------
COMMENT ON COLUMN public.{{table_name}}.id IS 'Identificador (UUID)';
COMMENT ON COLUMN public.{{table_name}}.created_at IS 'Momento da criação';
COMMENT ON COLUMN public.{{table_name}}.updated_at IS 'Última alteração (mantido por trigger)';
COMMENT ON COLUMN public.{{table_name}}.deleted_at IS 'Soft delete: NULL enquanto ativo';

-- Regra de negócio e unidade
COMMENT ON COLUMN public.orders.total_amount IS
'Total em centavos, calculado a partir dos itens. Constraint: >= 0';

-- Chave estrangeira e comportamento na exclusão
COMMENT ON COLUMN public.orders.user_id IS
'Dono do pedido (auth.users.id). ON DELETE CASCADE: excluir o usuário exclui os pedidos';

-- Estrutura esperada de JSONB
COMMENT ON COLUMN public.profiles.preferences IS
'Preferências em JSONB:
{ "theme": "dark" | "light",
  "notifications": { "email": boolean, "push": boolean },
  "language": "pt-BR" | "en" | "es" }';

-- ÍNDICES ----------------------------------------------------------------------------
COMMENT ON INDEX public.idx_orders_user_id IS 'FK: pedidos por usuário (e policy de RLS)';
COMMENT ON INDEX public.idx_orders_user_status IS
'Composto: WHERE user_id = ? AND status = ?';

-- CONSTRAINTS ------------------------------------------------------------------------
COMMENT ON CONSTRAINT orders_total_positive ON public.orders IS 'O total nunca é negativo';
COMMENT ON CONSTRAINT orders_user_id_fkey ON public.orders IS
'Liga o pedido ao usuário; CASCADE remove pedidos órfãos';

-- FUNÇÕES, TRIGGERS E POLICIES -------------------------------------------------------
COMMENT ON FUNCTION public.set_updated_at() IS
'Trigger BEFORE UPDATE FOR EACH ROW que atualiza updated_at. Usada por todas as tabelas com updated_at';

COMMENT ON TRIGGER trg_orders_updated_at ON public.orders IS 'Atualiza updated_at a cada alteração';

COMMENT ON POLICY orders_owner_all ON public.orders IS 'KISS: o dono acessa só os próprios pedidos';

-- VIEWS, TIPOS E SCHEMAS -------------------------------------------------------------
COMMENT ON VIEW public.user_dashboard IS
'Dados agregados do painel do usuário. security_invoker: respeita a RLS de quem consulta. Dados ao vivo';

-- COMMENT ON TYPE public.order_status IS 'Ciclo do pedido: pending, processing, shipped, delivered, cancelled';

COMMENT ON SCHEMA public IS 'Schema da aplicação, exposto pela API';
-- COMMENT ON SCHEMA private IS 'Funções auxiliares e tabelas internas, fora da API';

-- CONSULTAR OS COMENTÁRIOS -----------------------------------------------------------
SELECT c.relname AS table_name, obj_description(c.oid, 'pg_class') AS comment
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
ORDER BY c.relname;

SELECT c.table_name, c.column_name,
  col_description(format('%I.%I', c.table_schema, c.table_name)::regclass, c.ordinal_position) AS comment
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
