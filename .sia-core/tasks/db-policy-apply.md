---
id: db-policy-apply
title: Criar ou ajustar políticas RLS de uma tabela
agent: dev
hat: data
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'tabela (obrigatório): tabela alvo, no schema public por padrão'
  - 'modo (opcional): kiss | granular | tenant; se ausente, pergunta'
outputs:
  - 'supabase/migrations/{AAAAMMDDHHMMSS}_rls_{modo}_{tabela}.sql com RLS, policies, índices e comentários'
  - 'supabase/rollback/{versão}_rollback_rls_{modo}_{tabela}.sql'
  - 'docs/architecture/rls-policies.md atualizado (template rls-policies-tmpl.yaml)'
depends_on:
  tasks: [create-doc.md, db-migrate.md, db-test-as-user.md]
  templates: [rls-policies-tmpl.yaml, sql/rls-simple.sql, sql/rls-granular.sql, sql/rls-tenant.sql, sql/rollback.sql]
  data: [rls-security-patterns.md]
next: [db-migrate, db-test-as-user, db-audit]
source: [db-policy-apply.md]
---

# Criar ou ajustar políticas RLS de uma tabela

## Objetivo
Proteger uma tabela com RLS e policies corretas e rápidas, entregues como migration versionada e testadas com usuários reais.

## Quando usar
- Tabela nova exposta pela API ou achado de RLS do `*db-audit`.
- Mudança na regra de acesso de uma tabela.
- Não use para testar acesso: isso é `*db-test-as-user`.

## Modos de execução
| Modo | Comportamento |
|------|---------------|
| YOLO | Escolhe o modo da policy pelas colunas da tabela (`tenant_id` → tenant; `user_id` → kiss) e registra a decisão |
| Interativo (padrão) | Mostra o estado atual, explica as opções e confirma antes de gerar |
| Pre-Flight | Coleta antes as regras por operação e os papéis; depois gera a migration sem pausas |

## Pré-condições
- [ ] Tabela existe
- [ ] Coluna de dono (`user_id uuid`) ou de tenant (`tenant_id uuid`), conforme o modo

## Passos

### 1. Validar a tabela
```bash
T={tabela}
psql "$SUPABASE_DB_URL" -tAc "SELECT to_regclass('public.$T') IS NOT NULL" | grep -q t \
  || { echo "❌ tabela $T não existe"; exit 1; }
psql "$SUPABASE_DB_URL" -tAc "SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = '$T' AND column_name IN ('user_id', 'tenant_id', 'organization_id')"
```

### 2. Ler o estado atual
```sql
SELECT relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class WHERE oid = 'public.{tabela}'::regclass;
SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = '{tabela}';
SELECT grantee, string_agg(privilege_type, ', ') AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = '{tabela}' AND grantee IN ('anon', 'authenticated')
GROUP BY grantee;
SELECT indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = '{tabela}';
```

### 3. Escolher o modo
**Ponto de elicitação:**
1. kiss: uma policy `FOR ALL`; o dono acessa só as próprias linhas (`sql/rls-simple.sql`). Simples e fácil de auditar.
2. granular: uma policy por operação, com papéis (`sql/rls-granular.sql`). Para regras diferentes por operação ou tabelas sensíveis.
3. tenant: isolamento por organização, com papel no tenant (`sql/rls-tenant.sql`).

Variação: leitura pública com escrita só do dono (seção opcional de `sql/rls-simple.sql`).
Mostre o SQL que será gerado e confirme. Regras aplicadas em todos os modos:
- `auth.uid()` sempre como `(select auth.uid())`: o Postgres avalia uma vez por statement, não por linha.
- `(select auth.uid()) IS NOT NULL` explícito nas policies de dono: anônimo nunca passa.
- Índice em toda coluna usada na policy (`user_id`, `tenant_id`).
- Papel explícito (`TO authenticated`); `anon` só em leitura pública.

### 4. Gerar a migration
```bash
supabase migration new rls_{modo}_{tabela}
```
Preencha com o template do modo, substituindo os placeholders. A migration:
- habilita a RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`);
- remove as policies que serão substituídas (`DROP POLICY IF EXISTS`), para ser idempotente;
- cria as policies e os índices das colunas de policy (`CREATE INDEX IF NOT EXISTS`);
- comenta cada policy (`COMMENT ON POLICY ... IS '...'`);
- tem rollback em `supabase/rollback/{versão}_rollback_rls_{modo}_{tabela}.sql` (`sql/rollback.sql`), que remove as policies novas e recria as anteriores.

Funções auxiliares SECURITY DEFINER (modos granular e tenant) ficam no schema `private`, com `SET search_path = ''`.

Exemplo do modo kiss:
```sql
ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS {tabela}_owner_all ON public.{tabela};
CREATE POLICY {tabela}_owner_all ON public.{tabela}
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);
CREATE INDEX IF NOT EXISTS idx_{tabela}_user_id ON public.{tabela} (user_id);
COMMENT ON POLICY {tabela}_owner_all ON public.{tabela} IS 'KISS: o dono acessa só as próprias linhas';
```

### 5. Documentar
Atualize `docs/architecture/rls-policies.md` com a task `create-doc` e o template `rls-policies-tmpl.yaml`: seção da tabela com o propósito de cada policy, a regra de negócio e os índices de apoio. Na primeira tabela do projeto, preencha também a visão geral e os padrões.

### 6. Aplicar
Aplique pela task `db-migrate` (`*db-migrate`): dry-run, snapshot, aplicação e verificação. Nunca aplique policy por SQL ad hoc nem pelo MCP.

### 7. Testar
1. Anônimo não vê linhas protegidas:
```sql
BEGIN; SET LOCAL ROLE anon; SELECT count(*) FROM public.{tabela}; ROLLBACK;   -- esperado: 0 ou permission denied
```
2. Casos positivos e negativos de cada operação pela task `db-test-as-user` (`*db-test-as-user {usuário}`): o dono lê, insere, altera e exclui o que é seu; não vê nem altera o que é de outro.
3. Rode `*db-audit` (escopo rls) e confira a tabela.

## Alertas de segurança
- Nunca use `user_metadata` (`raw_user_meta_data`) em policy: o usuário altera pelo cliente. Use `app_metadata`, que só o servidor altera: `((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'`.
- A service role ignora RLS: não crie policy para ela e nunca a use no cliente.
- Desligar a RLS para depurar (`DISABLE ROW LEVEL SECURITY`) só no banco local, nunca por migration.
- RLS e GRANT são camadas diferentes: a policy não substitui a revogação de privilégios desnecessários.

## Saída
```
✅ Policies geradas para {tabela}
Modo: {modo} | Policies: {lista}
Migration: supabase/migrations/{versão}_rls_{modo}_{tabela}.sql
Rollback: supabase/rollback/{versão}_rollback_rls_{modo}_{tabela}.sql
Próximo: *db-migrate e *db-test-as-user
```

## Critérios de conclusão
- [ ] RLS habilitada e policies cobrindo todas as operações previstas
- [ ] `auth.uid()` dentro de `(select ...)`; papéis explícitos
- [ ] Colunas de policy indexadas
- [ ] Nenhuma policy com `user_metadata`
- [ ] Migration e rollback gerados e aplicados pelo `*db-migrate`
- [ ] Testes positivos e negativos executados e documentação atualizada

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Tabela sem `user_id` ou `tenant_id` | Crie a coluna por migration antes (com índice) ou escolha outro modo |
| `policy ... already exists` | Faltou `DROP POLICY IF EXISTS` na migration |
| `function auth.uid() does not exist` | Banco sem Supabase Auth: adapte a regra ao mecanismo de identidade do projeto |
| Usuário perdeu acesso depois de aplicar | Policy restritiva demais ou falta de GRANT; teste com `*db-test-as-user` e corrija com nova migration |

## Handoff
Próximo passo: `@dev *db-migrate supabase/migrations/{versão}_rls_{modo}_{tabela}.sql` e, em seguida, `@dev *db-test-as-user {usuário}`.
