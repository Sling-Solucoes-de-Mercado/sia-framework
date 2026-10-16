-- =============================================================================
-- Template de seed idempotente (chapéu Dados do @dev)
-- Uso: base para supabase/seed.sql (aplicado só no banco local, por `supabase db reset`)
--      ou para uma migration de dados de referência (staging e produção, pelo
--      *db-migrate). Executado por *db-seed.
-- Placeholders: {{table_name}}
-- Regras:
--   - Tudo idempotente: rodar duas vezes dá o mesmo resultado (ON CONFLICT ou WHERE NOT EXISTS).
--   - Sem BEGIN/COMMIT: quem aplica usa transação única (psql --single-transaction ou o CLI).
--   - Sem TRUNCATE nem DELETE em seed que possa chegar a produção.
--   - Dados de teste (seções 3 e 4) só no seed local.
-- =============================================================================

-- Opcional, só em carga local volumosa: desliga triggers e checagem de FK nesta sessão.
-- SET session_replication_role = replica;

-- 1. DADOS DE REFERÊNCIA (lookup) ---------------------------------------------
INSERT INTO public.status_types (id, name, description, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111001', 'draft',     'Rascunho inicial',  1),
  ('11111111-1111-1111-1111-111111111002', 'pending',   'Aguardando ação',   2),
  ('11111111-1111-1111-1111-111111111003', 'active',    'Ativo',             3),
  ('11111111-1111-1111-1111-111111111004', 'completed', 'Concluído',         4),
  ('11111111-1111-1111-1111-111111111005', 'archived',  'Arquivado',         5)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- Hierarquia: pais antes dos filhos
INSERT INTO public.categories (id, name, slug, parent_id) VALUES
  ('22222222-2222-2222-2222-222222222001', 'Geral',          'geral',          NULL),
  ('22222222-2222-2222-2222-222222222002', 'Desenvolvimento', 'desenvolvimento', NULL),
  ('22222222-2222-2222-2222-222222222003', 'Frontend',       'frontend',       '22222222-2222-2222-2222-222222222002'),
  ('22222222-2222-2222-2222-222222222004', 'Backend',        'backend',        '22222222-2222-2222-2222-222222222002')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_id = EXCLUDED.parent_id;

-- 2. PAPÉIS E PERMISSÕES ------------------------------------------------------
INSERT INTO public.roles (id, name, description, permissions) VALUES
  ('33333333-3333-3333-3333-333333333001', 'admin',  'Acesso total',     '["*"]'),
  ('33333333-3333-3333-3333-333333333002', 'editor', 'Edita conteúdo',   '["read", "write", "update"]'),
  ('33333333-3333-3333-3333-333333333003', 'viewer', 'Somente leitura',  '["read"]')
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions;

-- Inserção condicional (quando não há chave para ON CONFLICT)
INSERT INTO public.settings (key, value)
SELECT 'default_language', '"pt-BR"'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'default_language');

-- 3. USUÁRIOS DE TESTE: SOMENTE NO SEED LOCAL ---------------------------------
-- Nunca inclua este bloco em seed ou migration que chegue a staging ou produção.
-- Para login real, prefira criar usuários de teste pelo Studio local ou pela API admin do Auth.
-- INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', 'admin@teste.local', crypt('senha-de-teste-123', gen_salt('bf')), now(), '{"full_name": "Admin de Teste"}'),
--   ('00000000-0000-0000-0000-000000000002', 'usuario@teste.local', crypt('senha-de-teste-123', gen_salt('bf')), now(), '{"full_name": "Usuário de Teste"}')
-- ON CONFLICT (id) DO NOTHING;

-- 4. DADOS DE EXEMPLO: SOMENTE NO SEED LOCAL ----------------------------------
-- INSERT INTO public.{{table_name}} (id, name, user_id, status) VALUES
--   ('44444444-4444-4444-4444-444444444001', 'Projeto de exemplo 1', '00000000-0000-0000-0000-000000000001', 'active'),
--   ('44444444-4444-4444-4444-444444444002', 'Projeto de exemplo 2', '00000000-0000-0000-0000-000000000002', 'draft')
-- ON CONFLICT (id) DO UPDATE SET
--   name = EXCLUDED.name,
--   status = EXCLUDED.status,
--   updated_at = now();

-- SET session_replication_role = DEFAULT;

-- 5. VERIFICAÇÃO --------------------------------------------------------------
SELECT 'status_types' AS table_name, count(*) AS row_count FROM public.status_types
UNION ALL SELECT 'categories', count(*) FROM public.categories
UNION ALL SELECT 'roles', count(*) FROM public.roles;
