---
id: db-security-audit
title: Auditar a segurança e documentar o schema do banco
agent: dev
hat: data
elicit: true
inputs:
  - 'escopo (opcional): rls | schema | full (padrão: full; é o escopo da fase 2 do brownfield-discovery)'
  - 'schemas expostos (opcional): public e os listados em [api] schemas do supabase/config.toml'
outputs:
  - 'supabase/docs/DB-AUDIT.md (todo escopo): achados de segurança, RLS, integridade e índices, com severidade, nota de 0 a 100 e plano de ação'
  - 'supabase/docs/SCHEMA.md (escopos schema e full): tabelas, colunas, relações, índices, policies, views e funções do banco atual'
depends_on:
  templates: [sql/trigger.sql]
  data: [rls-security-patterns.md, database-best-practices.md]
next: [db-policy, db-migrate, db-test-as-user]
source: [security-audit.md, db-rls-audit.md, db-schema-audit.md]
---

# Auditar a segurança e documentar o schema do banco

## Objetivo
Encontrar brechas e fragilidades do banco antes que cheguem à produção (RLS em toda tabela exposta, policies corretas, grants mínimos, funções SECURITY DEFINER seguras, integridade e índices em FKs) e documentar o schema como ele está.

## Quando usar
- Depois de toda migration que cria ou altera tabela, policy, grant, view ou função.
- Antes de deploy de produção: o dba-predeploy-checklist exige zero achado crítico.
- Ao assumir um projeto existente (fase 2 do `brownfield-discovery`, escopo full) e em revisões periódicas.
- Não substitui a inspeção independente do `@validator` (`*revisar-seguranca`).

| Arquivo (Postgres puro: `database/docs/`) | Quando é gerado |
|---------|-----------------|
| `supabase/docs/DB-AUDIT.md` | Em todo escopo; cada execução substitui a anterior (o histórico fica no git) |
| `supabase/docs/SCHEMA.md` | Nos escopos schema e full; regenerado a cada execução desses escopos |

## Pré-condições
- [ ] `$SUPABASE_DB_URL` aponta para o ambiente a auditar (acesso de leitura basta)

## Passos

### 1. Definir o escopo
**Ponto de elicitação:**
1. rls: RLS, policies, grants, views e funções (rápido; gera só o DB-AUDIT.md)
2. schema: qualidade e integridade (gera DB-AUDIT.md e SCHEMA.md)
3. full: tudo, mais dados sensíveis e débitos de dados (padrão; gera os dois)

Schemas expostos: `public` e os de `[api] schemas` no `supabase/config.toml`; acrescente-os nos filtros `IN ('public')`. Rode as consultas em transação somente leitura (`psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -c "SET TRANSACTION READ ONLY;" -f {arquivo}`) ou pelo MCP do Supabase em somente leitura. No Postgres puro, troque `anon` e `authenticated` pelos papéis da aplicação.

### 2. RLS e policies (escopos rls e full)
```sql
-- 2.1 Tabela exposta sem RLS (CRÍTICO)
SELECT n.nspname AS schema, c.relname AS table_name
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname IN ('public') AND NOT c.relrowsecurity;

-- 2.2 RLS ativa sem nenhuma policy: inacessível pela API (ok só para tabela interna)
SELECT c.relname AS table_name
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND n.nspname IN ('public') AND c.relrowsecurity
  AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = n.nspname AND p.tablename = c.relname);

-- 2.3 Cobertura por operação
SELECT tablename,
  count(*) FILTER (WHERE cmd = 'ALL') AS all_ops, count(*) FILTER (WHERE cmd = 'SELECT') AS select_ops,
  count(*) FILTER (WHERE cmd = 'INSERT') AS insert_ops, count(*) FILTER (WHERE cmd = 'UPDATE') AS update_ops,
  count(*) FILTER (WHERE cmd = 'DELETE') AS delete_ops
FROM pg_policies WHERE schemaname IN ('public') GROUP BY tablename ORDER BY tablename;

-- 2.4 Policies suspeitas
SELECT * FROM (
  SELECT tablename, policyname, cmd, roles,
    CASE
      WHEN coalesce(qual, '') || coalesce(with_check, '') ~* 'user_metadata'
        THEN 'ALTO: usa user_metadata, que o usuário edita'
      WHEN cmd <> 'SELECT' AND (qual = 'true' OR with_check = 'true') THEN 'ALTO: escrita liberada com true'
      WHEN cmd <> 'SELECT' AND 'public' = ANY (roles) THEN 'REVISAR: escrita sem TO authenticated (vale para anon)'
      WHEN qual = 'true' THEN 'REVISAR: leitura pública'
      WHEN coalesce(qual, '') || coalesce(with_check, '') ~ 'auth\.(uid|jwt)\(\)'
       AND coalesce(qual, '') || coalesce(with_check, '') !~* 'select auth\.(uid|jwt)\(\)'
        THEN 'MÉDIO: auth.uid()/auth.jwt() sem (select ...)'
    END AS finding
  FROM pg_policies WHERE schemaname IN ('public')
) s WHERE finding IS NOT NULL ORDER BY tablename;
```
Cobertura boa: uma policy `ALL` (modelo KISS) ou as quatro operações (modelo granular); no granular, operação sem policy fica bloqueada. Policies permissivas se somam com OR: uma policy frouxa anula as demais.

### 3. Grants, views e funções (escopos rls e full)
```sql
-- 3.1 Grant para anon/authenticated em tabela sem RLS (CRÍTICO: dados abertos pela API)
SELECT g.table_schema, g.table_name, g.grantee, string_agg(g.privilege_type, ', ') AS privileges
FROM information_schema.role_table_grants g
JOIN pg_namespace n ON n.nspname = g.table_schema
JOIN pg_class c ON c.relnamespace = n.oid AND c.relname = g.table_name
WHERE g.table_schema IN ('public') AND g.grantee IN ('anon', 'authenticated')
  AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
GROUP BY 1, 2, 3;

-- 3.2 View sem security_invoker: roda como o dono e ignora a RLS das tabelas (ALTO)
SELECT c.relname AS view_name FROM pg_class c
WHERE c.relkind = 'v' AND c.relnamespace = 'public'::regnamespace
  AND NOT coalesce(array_to_string(c.reloptions, ',') ~* 'security_invoker=(true|on|1)', false);

-- 3.3 Materialized view exposta: não tem RLS (ALTO)
SELECT schemaname, matviewname FROM pg_matviews
WHERE schemaname IN ('public')
  AND (has_table_privilege('anon', format('%I.%I', schemaname, matviewname), 'SELECT')
    OR has_table_privilege('authenticated', format('%I.%I', schemaname, matviewname), 'SELECT'));

-- 3.4 Funções SECURITY DEFINER e funções sem search_path fixo
SELECT n.nspname AS schema, p.proname AS function_name, p.prosecdef AS security_definer,
  coalesce(array_to_string(p.proconfig, ','), '') ~ 'search_path' AS has_search_path,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'private')
  AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')  -- ignora extensões
  AND (p.prosecdef OR coalesce(array_to_string(p.proconfig, ','), '') !~ 'search_path')
ORDER BY p.prosecdef DESC, n.nspname, p.proname;
```
SECURITY DEFINER em schema exposto e executável por `anon`, ou sem `search_path` fixo: ALTO. Função comum sem `search_path` fixo: MÉDIO. Correção: `ALTER FUNCTION ... SET search_path = ''` com nomes qualificados; helpers SECURITY DEFINER no schema `private`; `REVOKE EXECUTE ON FUNCTION ... FROM PUBLIC, anon`.

### 4. Qualidade e integridade (escopos schema e full)
```sql
-- 4.1 Tabela sem PK (CRÍTICO)
SELECT c.relname FROM pg_class c
WHERE c.relkind IN ('r', 'p') AND c.relnamespace = 'public'::regnamespace
  AND NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = c.oid AND k.contype = 'p');

-- 4.2 FK sem índice na primeira coluna (ALTO: JOIN e ON DELETE CASCADE lentos)
SELECT r.relname AS table_name, a.attname AS column_name,
  format('CREATE INDEX IF NOT EXISTS idx_%s_%s ON public.%I (%I);', r.relname, a.attname, r.relname, a.attname) AS fix
FROM pg_constraint c
JOIN pg_class r ON r.oid = c.conrelid
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]);

-- 4.3 Coluna *_id sem FK (ALTO)
SELECT c.table_name, c.column_name
FROM information_schema.columns c
JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
  AND c.column_name LIKE '%\_id' AND c.column_name <> 'id'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.key_column_usage k
    JOIN information_schema.table_constraints tc
      ON tc.constraint_name = k.constraint_name AND tc.table_schema = k.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND k.table_schema = c.table_schema
      AND k.table_name = c.table_name AND k.column_name = c.column_name);

-- 4.4 Coluna obrigatória que aceita NULL (ALTO) e tabela sem timestamps (MÉDIO)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public' AND is_nullable = 'YES'
  AND (column_name IN ('id', 'email', 'created_at', 'status') OR column_name LIKE '%\_id');
SELECT t.table_name FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
HAVING NOT (bool_or(c.column_name = 'created_at') AND bool_or(c.column_name = 'updated_at'));

-- 4.5 Índices sem uso (mais de 1 MB, fora PK e unique) e duplicados (MÉDIO)
SELECT s.relname AS table_name, s.indexrelname AS index_name, pg_size_pretty(pg_relation_size(s.indexrelid)) AS size
FROM pg_stat_user_indexes s JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.schemaname = 'public' AND s.idx_scan = 0 AND NOT i.indisunique
  AND pg_relation_size(s.indexrelid) > 1024 * 1024;
SELECT a.indrelid::regclass AS table_name, a.indexrelid::regclass AS index_1, b.indexrelid::regclass AS index_2
FROM pg_index a
JOIN pg_index b ON b.indrelid = a.indrelid AND a.indexrelid < b.indexrelid
  AND a.indkey = b.indkey AND a.indclass = b.indclass
  AND coalesce(a.indexprs::text, '') = coalesce(b.indexprs::text, '')
  AND coalesce(a.indpred::text, '') = coalesce(b.indpred::text, '')
JOIN pg_class t ON t.oid = a.indrelid
WHERE t.relnamespace = 'public'::regnamespace;

-- 4.6 Tabela acima de 1 GB (INFO: candidata a particionamento) e constraint com nome automático (BAIXO)
SELECT c.relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS size FROM pg_class c
WHERE c.relkind = 'r' AND c.relnamespace = 'public'::regnamespace
  AND pg_total_relation_size(c.oid) > 1024::bigint * 1024 * 1024;
SELECT conname, conrelid::regclass AS table_name FROM pg_constraint
WHERE connamespace = 'public'::regnamespace AND conname ~ '_(pkey|key|fkey|check|not_null)$';
```

### 5. Dados sensíveis e débitos de dados (escopo full)
```sql
SELECT table_name, column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name ~* '(password|passwd|token|secret|api_key|ssn|cpf|cnpj|passport|tax_id|credit_card|card_number)';
```
Cada coluna sensível precisa de RLS restritiva, nenhum grant para `anon`, hash (senha) ou criptografia (segredo) e mascaramento fora de produção. No Supabase, segredos da aplicação vão para o Vault, não para tabela comum.
Débitos de dados:
- Migration não versionada: `supabase migration list` (versão aplicada no remoto sem arquivo local) e `supabase db diff --linked` (mudança feita fora das migrations). Postgres puro: compare um dump de schema com as migrations.
- Queries lentas conhecidas: consulta 3.1 do `*db-performance` (ou `supabase inspect db outliers`), as 10 maiores por tempo médio.
- Dado órfão (onde falta FK): `SELECT count(*) FROM public.{filha} f WHERE NOT EXISTS (SELECT 1 FROM public.{pai} p WHERE p.id = f.{pai}_id);`
- Normalização inadequada: listas em texto separado por vírgula, a mesma informação repetida em várias tabelas, JSONB guardando dado relacional consultado com frequência (revisão manual).

### 6. Comparar com os Advisors do Supabase
Confira Dashboard → Advisors (Security Advisor e Performance Advisor) ou a ferramenta `get_advisors` do MCP do Supabase em somente leitura. Achado do advisor que não apareceu nas consultas entra no DB-AUDIT.md.

### 7. Documentar o schema: SCHEMA.md (escopos schema e full)
```sql
SELECT table_name, column_name, data_type, is_nullable, column_default,
  col_description(format('%I.%I', table_schema, table_name)::regclass, ordinal_position) AS comment
FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;
SELECT conrelid::regclass AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY 1, 3, 2;     -- PK, FK, unique, check
SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1, 2;
SELECT tablename, policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;
SELECT c.relname, c.relkind, c.relrowsecurity, c.reloptions, obj_description(c.oid, 'pg_class') AS comment
FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'p', 'v', 'm') ORDER BY 1;
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS returns,
  l.lanname, p.prosecdef, p.proconfig
FROM pg_proc p JOIN pg_language l ON l.oid = p.prolang
WHERE p.pronamespace IN ('public'::regnamespace) AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e');
SELECT tgrelid::regclass AS table_name, tgname, pg_get_triggerdef(oid) AS definition FROM pg_trigger
WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace = 'public'::regnamespace);
SELECT extname, extversion, extnamespace::regnamespace AS schema FROM pg_extension ORDER BY 1;
```
Grave `supabase/docs/SCHEMA.md`, substituindo a versão anterior:
```markdown
# Schema do banco
> Gerado por @dev [Dados] (*db-audit) em {AAAA-MM-DD}, a partir de {ambiente}. Não edite à mão: rode *db-audit de novo.

## Visão geral
Postgres {versão} | Schemas expostos: {lista} | Extensões: {lista}
Tabelas: {n} | Views: {n} | Funções: {n} | Policies: {n} | Migrations versionadas: {n}

## Diagrama ER
(Mermaid erDiagram a partir das FKs)

## Tabelas
### public.{tabela}
{comentário da tabela}
| Coluna | Tipo | Nulo | Default | Comentário |
- PK, FKs (coluna → tabela.coluna, ON DELETE), unique e check
- Índices
- RLS: habilitada ou não; policies (nome, operação, papéis, USING, WITH CHECK)
- Triggers

## Views e materialized views
| Nome | Tipo | security_invoker | Propósito |

## Funções
| Função | Argumentos | Retorno | Linguagem | SECURITY DEFINER | search_path fixo |
```

### 8. Classificar, pontuar e gravar o DB-AUDIT.md (todo escopo)
| Severidade | Achados |
|------------|---------|
| CRÍTICO | tabela exposta sem RLS; grant para anon/authenticated em tabela sem RLS; tabela sem PK; dado sensível exposto sem RLS |
| ALTO | FK sem índice; coluna `_id` sem FK; NOT NULL ausente em coluna obrigatória; policy com `user_metadata` ou escrita com `true`; view sem `security_invoker`; materialized view exposta; SECURITY DEFINER exposta ou sem `search_path`; migration não versionada |
| MÉDIO | timestamps ausentes; `auth.uid()` sem `(select ...)`; função sem `search_path` fixo; índice sem uso ou duplicado; dado órfão; query lenta conhecida; normalização inadequada |
| BAIXO | nomes fora do padrão; constraint sem nome descritivo |

Nota de 0 a 100: 100 perfeito; 90 a 99 excelente; 80 a 89 bom; 70 a 79 regular; 60 a 69 precisa de trabalho; abaixo de 60 não está pronto para produção. Achado CRÍTICO em aberto coloca a nota abaixo de 60.

Grave `supabase/docs/DB-AUDIT.md`, substituindo a versão anterior:
```markdown
# Auditoria do banco
> @dev [Dados] (*db-audit) em {AAAA-MM-DD HH:mm} | Ambiente: {ambiente} | Escopo: {escopo} | Nota: {n}/100
Tabelas auditadas: {n} | Críticos: {n} | Altos: {n} | Médios: {n} | Baixos: {n}

## Achados
| ID | Severidade | Área (RLS, grants, funções, integridade, índices, dados) | Objeto | Achado | Correção |

## Plano de ação
| Prioridade | Ação | Comando |
| P0 | Habilitar RLS e criar policies em {tabelas} | *db-policy {tabela} |
| P0 | Indexar FKs | migration + *db-migrate |
| P1 | Fixar search_path e revogar EXECUTE de funções | migration + *db-migrate |

## Saída das consultas
(resultado bruto de cada verificação)
```

### 9. Corrigir
Toda correção vai por migration: RLS e policies com `*db-policy {tabela}`; PK, FK, índices, NOT NULL, `search_path` e grants em migration nova aplicada pelo `*db-migrate`. Índice em tabela grande de produção: `CREATE INDEX CONCURRENTLY` fora da migration (`migration-safety-guide.md`). Depois, rode a auditoria de novo e teste as policies com `*db-test-as-user`. Complementos: trilha de auditoria por trigger (`sql/trigger.sql`), extensão pgaudit e testes pgTAP (`supabase test db`) para fixar o que a auditoria encontrou.

## Saída
`✅ Auditoria ({escopo}) | Nota {n}/100 | Críticos {n} | Altos {n} | Médios {n}`, os três principais achados e os arquivos gerados (DB-AUDIT.md e, nos escopos schema e full, SCHEMA.md). Em story, liste os arquivos na File List e registre no Change Log uma linha `@dev [Dados]` com o escopo e a nota.

## Critérios de conclusão
- [ ] Consultas do escopo executadas em modo somente leitura
- [ ] Advisors do Supabase comparados (quando Supabase)
- [ ] DB-AUDIT.md gravado, com severidade e correção por achado, nota e plano de ação
- [ ] SCHEMA.md gravado nos escopos schema e full
- [ ] Nenhuma correção aplicada fora de migration

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `role "anon" does not exist` | Postgres puro: troque pelos papéis da aplicação |
| `permission denied` em catálogos ou estatísticas | Use o usuário `postgres` do projeto |
| Tabela sem RLS de propósito (interna) | Registre a justificativa no DB-AUDIT.md e garanta que não há grant para `anon` ou `authenticated` |
| Estatísticas zeradas | Banco recém-criado ou estatísticas reiniciadas: índice sem uso não é conclusivo |
| Projeto sem banco | Não há o que auditar; no brownfield-discovery, siga para a fase 3 |

## Handoff
Próximo passo: `@dev *db-policy {tabela}` para os achados de RLS; demais correções por migration com `@dev *db-migrate {migration}`. No brownfield-discovery: fase 3 (`@dev [UX/UI] *create-front-end-spec`) ou fase 4 (rascunho de débitos).
