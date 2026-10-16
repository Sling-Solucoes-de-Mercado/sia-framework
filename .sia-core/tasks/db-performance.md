---
id: db-performance
title: Analisar e otimizar o desempenho do banco
agent: dev
hat: data
elicit: true
inputs:
  - 'alvo (opcional): query SQL, arquivo .sql ou tabela; sem alvo, analisa os hot paths'
  - 'tipo (opcional): query | hotpaths | interactive'
outputs:
  - 'supabase/docs/performance-analysis-{AAAAMMDD-HHmm}.md com achados e recomendações'
  - 'docs/architecture/index-strategy.md (template index-strategy-tmpl.yaml) quando houver recomendação de índices'
  - 'Migration de índices pronta para o *db-migrate'
depends_on:
  tasks: [create-doc.md, db-migrate.md]
  templates: [index-strategy-tmpl.yaml]
  data: [postgres-tuning-guide.md, database-best-practices.md, migration-safety-guide.md]
next: [db-migrate]
source: [analyze-performance.md, db-explain.md, db-analyze-hotpaths.md]
---

# Analisar e otimizar o desempenho do banco

## Objetivo
Encontrar e resolver gargalos com evidência: planos de execução, consultas mais caras, uso de índices e de cache, e uma estratégia de índices aplicada por migration.

## Quando usar
- Query lenta reportada ou nova query crítica.
- Depois de migration que mexe em índice, tabela grande ou policy RLS.
- Revisão periódica de desempenho.

## Pré-condições
- [ ] `pg_stat_statements` ativa (padrão no Supabase; no Postgres puro, habilite por migration)
- [ ] Ambiente com volume de dados realista (sem dados, as estatísticas não servem)

## Passos

### 1. Escolher o tipo de análise
**Ponto de elicitação:**
1. query: plano de execução de uma query
2. hotpaths: gargalos do sistema
3. interactive: sessão guiada para otimizar uma query lenta

Para `query` e `interactive`, peça a SQL ou o caminho do arquivo.

### 2. Query (EXPLAIN)
1. SELECT e WITH rodam direto. INSERT, UPDATE e DELETE só dentro de `BEGIN; ... ROLLBACK;`, porque `EXPLAIN ANALYZE` executa a query.
2. Rode com o papel real: a RLS muda o plano. No Supabase, emule `authenticated` como no `*db-test-as-user`:
```sql
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"{user_id}","role":"authenticated"}', true);
EXPLAIN (ANALYZE, BUFFERS, VERBOSE) {query};
ROLLBACK;
```
3. Rode 2 ou 3 vezes (cache quente) e compare. Para visualizar, exporte em JSON (`psql -qAt` com `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`) e abra em explain.depesz.com ou explain.dalibo.com.
4. Interprete:

| Sinal no plano | Problema | Correção |
|----------------|----------|----------|
| `Seq Scan` em tabela grande com `Rows Removed by Filter` alto | falta índice no filtro | índice na coluna do WHERE |
| `Nested Loop` com `loops` acima de 10 mil | join sem índice | índice na FK do join |
| `Sort Method: external merge` ou `temp read/written` | memória insuficiente | índice na ordenação ou `SET work_mem` na sessão |
| linhas estimadas e reais diferem mais de 10 vezes | estatísticas velhas | `ANALYZE {tabela};` |
| filtro da RLS com `Seq Scan` | policy sem índice ou `auth.uid()` sem `(select ...)` | índice na coluna da policy (parcial, se houver soft delete) |
| `Planning Time` acima de 100 ms | query complexa ou estatísticas ruins | simplifique e rode `ANALYZE` |

Buffers: `shared hit` é cache (bom); `shared read` é disco (ruim se alto); `temp` indica que a operação transbordou para disco. Meta: maximizar hit, minimizar read, zero temp.
Nós: Index Only Scan é o melhor caso (depende do VACUUM em dia); Index Scan serve consultas seletivas; Bitmap Heap Scan, seletividade média; Hash Join, equi-joins grandes; Merge Join, entradas ordenadas; Nested Loop, resultados pequenos.

### 3. Hot paths
No Supabase, comece pelos relatórios prontos: `supabase inspect db outliers` (maior tempo total) e `supabase inspect db calls` (mais chamadas); `supabase inspect db --help` lista os demais. Compare com Dashboard → Advisors → Performance Advisor (ou `get_advisors` do MCP do Supabase em somente leitura).
Em qualquer Postgres:
```sql
-- 3.1 Consultas mais caras (troque a ordenação por mean_exec_time ou calls)
SELECT left(query, 80) AS query, calls,
  round(total_exec_time::numeric / 1000, 2) AS total_s,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round(max_exec_time::numeric, 2) AS max_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS pct_total
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC LIMIT 20;

-- 3.2 Tabelas com mais leitura sequencial
SELECT relname, seq_scan, seq_tup_read, idx_scan, n_live_tup,
  round(seq_tup_read::numeric / nullif(seq_scan, 0)) AS avg_rows_per_scan
FROM pg_stat_user_tables WHERE schemaname = 'public' AND seq_scan > 0
ORDER BY seq_tup_read DESC LIMIT 10;

-- 3.3 Tuplas mortas
SELECT relname, n_live_tup, n_dead_tup,
  round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_pct, last_autovacuum
FROM pg_stat_user_tables WHERE schemaname = 'public' AND n_dead_tup > 100
ORDER BY n_dead_tup DESC LIMIT 10;

-- 3.4 Uso dos índices
SELECT relname, indexrelname, idx_scan, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes WHERE schemaname = 'public'
ORDER BY idx_scan, pg_relation_size(indexrelid) DESC LIMIT 15;

-- 3.5 Cache hit (meta acima de 99%; abaixo de 95% é problema)
SELECT 'tables' AS kind,
  round(100.0 * sum(heap_blks_hit) / nullif(sum(heap_blks_hit + heap_blks_read), 0), 2) AS hit_pct
FROM pg_statio_user_tables
UNION ALL
SELECT 'indexes', round(100.0 * sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0), 2)
FROM pg_statio_user_indexes;

-- 3.6 Conexões por estado e a mais longa
SELECT state, count(*), max(now() - query_start) AS longest
FROM pg_stat_activity WHERE datname = current_database() GROUP BY state;
```
FKs sem índice: consulta 4.2 do `*db-audit`.
**Ponto de elicitação:** liste as consultas da 3.1 numeradas e pergunte quais analisar (ex.: `1,3,5` ou `todas`). Analise cada uma como no passo 2.
Sugestão de índice no Supabase: extensão `index_advisor`, habilitada por migration (`CREATE EXTENSION IF NOT EXISTS index_advisor CASCADE;`), e depois `SELECT * FROM index_advisor('{query}');`.

### 4. Otimização interativa
1. Linha de base: `\timing on` e `EXPLAIN (ANALYZE, BUFFERS)` da query.
2. Estatísticas das tabelas envolvidas (`pg_stat_user_tables`: linhas, scans, último vacuum e analyze).
3. Índices existentes: `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = '{tabela}';`
4. Hipótese: colunas de WHERE, JOIN e ORDER BY; nada de `SELECT *`; LIMIT ou paginação; materialized view para agregação pesada.
5. Teste a correção no banco local ou em staging (índice, reescrita, `ANALYZE`, `SET work_mem` na sessão).
6. Meça de novo e compare tempo, plano e custo. Repita até atingir a meta.

Metas de tempo: consulta interativa abaixo de 100 ms; relatório abaixo de 1 s; batch abaixo de 5 s.
Nunca crie índice direto em produção durante a sessão: a correção vira migration (passo 5).
Plano de chamadas da API (PostgREST), só no banco local: `alter role authenticator set pgrst.db_plan_enabled to 'true'; notify pgrst, 'reload config';` e `.explain()` no supabase-js; desfaça ao terminar.

### 5. Estratégia de índices e migration
- Consolide as recomendações com a task `create-doc` e o template `index-strategy-tmpl.yaml` em `docs/architecture/index-strategy.md` (padrão de acesso → índice → justificativa → custo de escrita).
- Gere a migration (`supabase migration new add_indexes_{contexto}`) com `CREATE INDEX IF NOT EXISTS`. Tabela grande em produção: crie com `CREATE INDEX CONCURRENTLY` fora da migration e mantenha o `IF NOT EXISTS` na migration (`migration-safety-guide.md`).
- Índice sem uso: remova só depois de confirmar que não sustenta constraint nem consulta rara importante.
- Aplique pela task `db-migrate` (`*db-migrate`) e meça de novo.

### 6. Relatório
Grave `supabase/docs/performance-analysis-{AAAAMMDD-HHmm}.md`:
```markdown
# Análise de desempenho: {AAAA-MM-DD}
- Ambiente: {ambiente} | Queries analisadas: {n} | Índices recomendados: {n}

## Query {n}: {rótulo}
- Tempo médio: {ms} | Chamadas: {n} | % do tempo total: {pct}
- Plano: (trecho relevante do EXPLAIN)
- Problemas: ...
- Índices recomendados: (SQL)
- Ganho esperado: ...

## Ações
- [ ] Migration de índices
- [ ] ANALYZE nas tabelas afetadas
- [ ] Nova medição depois da aplicação
```

## Saída
```
✅ Análise de desempenho concluída ({tipo})
Queries analisadas: {n} | Principais achados: 1. ... 2. ... 3. ...
Relatório: supabase/docs/performance-analysis-{AAAAMMDD-HHmm}.md
Índices recomendados: {lista CREATE INDEX}
Próximo: *db-migrate {migration de índices}
```

## Critérios de conclusão
- [ ] Planos analisados com `ANALYZE` e `BUFFERS`, no papel real quando há RLS
- [ ] Achados ligados a evidência (plano, estatística ou relatório)
- [ ] Recomendações de índice documentadas na estratégia de índices
- [ ] Nenhuma mudança aplicada em ambiente remoto fora de migration
- [ ] Relatório gravado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `relation "pg_stat_statements" does not exist` | Habilite a extensão por migration |
| Estatísticas vazias ou pouco representativas | Pouca atividade: gere carga realista ou analise a query específica |
| `EXPLAIN ANALYZE` de escrita | Envolva em `BEGIN; ... ROLLBACK;` |
| `permission denied` nas estatísticas | Use o usuário `postgres` do projeto |
| Plano muda entre execuções | Distribuição de dados, cache ou carga: meça várias vezes e compare médias |

## Handoff
Próximo passo: `@dev *db-migrate supabase/migrations/{versão}_add_indexes_{contexto}.sql`.
