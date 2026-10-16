# Padrões de Segurança com RLS (Row Level Security)

> Referência do chapéu Dados do `@dev`. Consultada em `*db-model`, `*db-policy`, `*db-test-as-user` e `*db-audit`.
> Plataforma: Postgres e Supabase. Foco: isolamento de dados por usuário e por tenant.

---

## 1. Fundamentos

```sql
-- Liga a RLS (sem policy, ninguém além do dono e dos papéis com BYPASSRLS acessa)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Opcional: aplica a RLS também ao dono da tabela (papéis com BYPASSRLS continuam ignorando)
ALTER TABLE public.posts FORCE ROW LEVEL SECURITY;
```

```sql
CREATE POLICY {nome}
ON {tabela}
[AS PERMISSIVE | AS RESTRICTIVE]   -- permissivas somam com OR; restritivas, com AND
FOR {ALL | SELECT | INSERT | UPDATE | DELETE}
TO {papel}                         -- authenticated, anon, papel próprio
USING ({expressão})                -- filtra linhas existentes: SELECT, UPDATE, DELETE
WITH CHECK ({expressão});          -- valida linhas novas: INSERT, UPDATE
```

| Operação | USING | WITH CHECK |
|----------|-------|------------|
| SELECT | sim | não |
| INSERT | não | sim |
| UPDATE | sim (linha antiga) | sim (linha nova) |
| DELETE | sim | não |

---

## 2. Padrões comuns

### 2.1 Dono da linha
```sql
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id) WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY profiles_delete_own ON public.profiles FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);
```
Equivalente KISS: uma policy `FOR ALL` com USING e WITH CHECK iguais (`sql/rls-simple.sql`).

### 2.2 Organização ou time
```sql
CREATE POLICY projects_team_select ON public.projects FOR SELECT TO authenticated
  USING (organization_id = ANY ((select private.user_org_ids())));
-- private.user_org_ids(): SECURITY DEFINER que lê organization_members (sql/rls-tenant.sql)
```

### 2.3 Papéis
```sql
-- Papel pela tabela de papéis (sql/rls-granular.sql)
CREATE POLICY sensitive_data_admin ON public.sensitive_data FOR ALL TO authenticated
  USING ((select private.has_any_role(ARRAY['admin'])))
  WITH CHECK ((select private.has_any_role(ARRAY['admin'])));

-- Papel por claim de servidor (sem consulta)
CREATE POLICY sensitive_data_read ON public.sensitive_data FOR SELECT TO authenticated
  USING (((select auth.jwt()) -> 'app_metadata' ->> 'role') IN ('admin', 'analyst'));
```

### 2.4 Leitura pública, escrita autenticada
```sql
CREATE POLICY content_public_read ON public.public_content FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY content_author_insert ON public.public_content FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = author_id);
```

### 2.5 Acesso por tempo
```sql
CREATE POLICY trial_content_select ON public.trial_content FOR SELECT TO authenticated
  USING (trial_expires_at > now() AND user_id = (select auth.uid()));
```

---

## 3. Particularidades do Supabase

### auth.uid() e auth.jwt()
```sql
SELECT auth.uid();                              -- id do usuário autenticado (NULL para anônimo)
SELECT auth.jwt() ->> 'email';                  -- claim do token
SELECT auth.jwt() -> 'app_metadata' ->> 'role'; -- claim de servidor
SELECT auth.jwt() ->> 'aal';                    -- aal1 (um fator) ou aal2 (MFA)
```

| Fonte da claim | Quem altera | Uso em policy |
|----------------|-------------|---------------|
| `app_metadata` | só o servidor (API admin do Auth, hooks) | seguro |
| `user_metadata` (`raw_user_meta_data`) | o próprio usuário, pelo cliente | **nunca** |
| claim `role` | o Auth (é o papel do Postgres usado pela API) | não sobrescreva; use `user_role` ou `app_metadata.role` |

### Papéis do banco
| Papel | Quem | RLS |
|-------|------|-----|
| `anon` | requisição sem login | aplica |
| `authenticated` | usuário logado | aplica |
| `service_role` (chave secreta) | servidor | ignora (BYPASSRLS): não crie policy para ele |

```sql
CREATE POLICY content_anon_read ON public.content FOR SELECT TO anon USING (is_public = true);
CREATE POLICY content_auth_read ON public.content FOR SELECT TO authenticated USING (true);
```

---

## 4. Desempenho

1. **Envolva as funções de auth em SELECT:** `(select auth.uid())` é avaliado uma vez por statement; `auth.uid()` puro, uma vez por linha.
2. **Indexe as colunas das policies:**
```sql
CREATE INDEX idx_posts_user_id ON public.posts (user_id);
CREATE INDEX idx_org_members_user_org ON public.organization_members (user_id, organization_id);
```
3. **Declare o papel** (`TO authenticated`): a policy nem é avaliada para os outros.
4. **Evite subconsulta cara em toda linha:** use função SECURITY DEFINER no schema `private`.
```sql
-- ❌ Subconsulta complexa avaliada a cada linha
CREATE POLICY documents_expensive ON public.documents FOR SELECT
  USING (owner_id IN (SELECT user_id FROM public.complex_permissions_view WHERE can_read));

-- ✅ Função auxiliar
CREATE OR REPLACE FUNCTION private.accessible_document_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT document_id FROM public.user_document_access WHERE user_id = (SELECT auth.uid());
$$;
CREATE POLICY documents_optimized ON public.documents FOR SELECT TO authenticated
  USING (id IN (SELECT private.accessible_document_ids()));
```
5. **Prefira claims do JWT a joins** com a tabela de origem na policy.
6. **Permissões pré-calculadas** para regras complexas:
```sql
CREATE TABLE public.user_document_access (
  user_id uuid REFERENCES auth.users,
  document_id uuid REFERENCES public.documents,
  PRIMARY KEY (user_id, document_id)        -- já indexa user_id
);
CREATE POLICY documents_precomputed ON public.documents FOR SELECT TO authenticated
  USING (id IN (SELECT document_id FROM public.user_document_access WHERE user_id = (select auth.uid())));
```

---

## 5. Boas práticas de segurança

### Sempre ligue a RLS
```sql
-- Tabelas expostas sem RLS (corrija todas)
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
-- RLS ligada sem nenhuma policy (inacessíveis pela API)
SELECT t.tablename FROM pg_tables t
WHERE t.schemaname = 'public' AND t.rowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tablename);
```

### Negar por padrão
RLS ligada nega tudo; cada policy libera um caso explícito.

### Evite USING (true) em tabela sensível
```sql
-- ❌ Abre tudo
CREATE POLICY users_too_permissive ON public.users FOR ALL USING (true);
-- ✅ Condição explícita
CREATE POLICY users_proper ON public.users FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR is_public = true);
```

### Uma policy por operação ou KISS
- KISS (`FOR ALL`): tabela de dono único com a mesma regra para tudo; mais fácil de auditar.
- Granular (uma por operação): regras diferentes por operação ou tabela sensível; controle fino.
- Policies permissivas se somam com OR: uma policy frouxa anula as outras. Para exigir uma condição a mais (ex.: MFA), use `AS RESTRICTIVE`.

### Outras camadas
- Views em schema exposto: `WITH (security_invoker = true)`; sem isso, a view ignora a RLS.
- Materialized views não têm RLS: mantenha fora do schema exposto.
- GRANT e RLS são camadas diferentes: revogue privilégios desnecessários (`REVOKE ... FROM anon`).
- SECURITY DEFINER: só no schema `private`, com `SET search_path = ''`, nomes qualificados e EXECUTE revogado de PUBLIC e anon.
- Storage: policies em `storage.objects`, sempre filtrando `bucket_id` e a pasta do dono.

---

## 6. Diagnóstico e testes

```sql
-- Policies de uma tabela
SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'posts';

-- Teste como usuário (sempre em transação desfeita no fim)
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"{user_uuid}","role":"authenticated"}', true);
SELECT * FROM public.posts;
ROLLBACK;
```
Roteiro completo: `*db-test-as-user`.

| Sintoma | Causa provável |
|---------|----------------|
| Nenhuma linha retornada | condição do USING |
| INSERT recusado | condição do WITH CHECK |
| Consulta lenta | falta índice na coluna da policy ou `auth.uid()` sem SELECT |
| Vê tudo | teste sem `SET LOCAL ROLE`, RLS desligada ou policy permissiva frouxa |
| Precisa ignorar RLS | só no servidor, com a chave secreta, e documentado |

---

## 7. Checklist de testes

- [ ] RLS ligada em toda tabela exposta
- [ ] Policies cobrem todas as operações previstas
- [ ] Índice em toda coluna usada em policy
- [ ] Testado com papéis diferentes e com usuário sem permissão
- [ ] Casos de borda testados (sem organização, período expirado, valores nulos)
- [ ] Desempenho testado com volume realista
- [ ] Chave secreta restrita ao servidor
- [ ] Nenhum `USING (true)` em tabela sensível
- [ ] Nenhuma policy com `user_metadata`
