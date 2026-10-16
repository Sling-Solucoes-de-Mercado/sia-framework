# Guia de Ajuste de Desempenho do Postgres

> Referência do chapéu Dados do `@dev`. Consultada em `*db-performance`.
> Padrão: configurações de Postgres prontas para produção.

**Supabase gerenciado:** `postgresql.conf` não é editável. Os parâmetros de memória acompanham o tamanho do compute (ajuste o compute no Dashboard); ajustes finos valem por sessão (`SET`) ou por papel (`ALTER ROLE ... SET`, por migration). As seções 1 e 2.2 valem por inteiro para Postgres self-hosted.

---

## 1. Memória

### shared_buffers
- Memória compartilhada de cache. Recomendação: 25% da RAM (até cerca de 8 GB na maioria das cargas).
```sql
SHOW shared_buffers;
-- postgresql.conf, servidor com 8 GB de RAM:
-- shared_buffers = 2GB
```

### effective_cache_size
- Estimativa do cache disponível usada pelo planejador. Recomendação: 50% a 75% da RAM.
```sql
-- servidor com 8 GB de RAM:
-- effective_cache_size = 6GB
```

### work_mem
- Memória por operação (ordenação, hash). Recomendação: RAM ÷ max_connections ÷ 4. Alto demais esgota a memória.
```sql
-- 8 GB de RAM e 100 conexões: work_mem = 20MB
-- Para uma consulta pesada, só na sessão:
SET work_mem = '256MB';
-- consulta
RESET work_mem;
```

### maintenance_work_mem
- Memória de manutenção (VACUUM, CREATE INDEX). Recomendação: 256 MB a 1 GB, conforme a RAM.
```sql
-- maintenance_work_mem = 512MB
```

---

## 2. Conexões

### Por que usar pooler
- O Postgres cria um processo por conexão (cerca de 10 MB cada).
- Conexões demais esgotam a memória, e abrir conexão custa caro.

### 2.1 Supabase (Supavisor)
| Modo | Porta | Uso |
|------|-------|-----|
| Sessão | 5432 (host do pooler) | migrations, pg_dump, psql; IPv4 |
| Transação | 6543 | aplicações serverless e edge |
| Direta | 5432 (`db.{ref}.supabase.co`) | administração; IPv6 |

### 2.2 PgBouncer (self-hosted)
```ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
```

### Modos de pool
- **session:** a conexão fica com o cliente até ele desconectar.
- **transaction:** a conexão volta ao pool no fim de cada transação (recomendado para aplicação).
- **statement:** volta a cada comando (raro).

---

## 3. Consultas

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE customer_id = 123 ORDER BY created_at DESC LIMIT 10;
```

### O que observar
- **Seq Scan:** varredura completa (pode indicar índice faltando).
- **Rows Removed by Filter:** alto indica consulta ineficiente.
- **Buffers:** `shared hit` (cache) × `read` (disco).
- **Actual Time:** tempo até a primeira linha × tempo total.

### Otimizações comuns
```sql
-- Índice faltando: Seq Scan vira Index Scan
CREATE INDEX idx_orders_customer_id ON orders (customer_id);

-- Índice coberto: a consulta lê só o índice
-- SELECT email, name FROM users WHERE email = ?
CREATE INDEX idx_users_email_covering ON users (email) INCLUDE (name);

-- Índice parcial: só o subconjunto consultado
CREATE INDEX idx_users_active ON users (email) WHERE is_active = true;
```
Em produção, crie índices por migration (`*db-migrate`); tabela grande, com CONCURRENTLY fora da migration.

---

## 4. Vacuum e manutenção

### Autovacuum
```sql
-- Tuplas mortas e último autovacuum
SELECT schemaname, relname, n_dead_tup, last_autovacuum
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;

-- Tabela com muita escrita: autovacuum mais frequente
ALTER TABLE high_churn_table SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);
```

### Manutenção manual
```sql
ANALYZE table_name;           -- atualiza as estatísticas
VACUUM table_name;            -- recupera espaço reutilizável
VACUUM ANALYZE table_name;    -- os dois
VACUUM FULL table_name;       -- reescreve a tabela com lock exclusivo: use com muito cuidado
```

### Reindex
```sql
REINDEX INDEX CONCURRENTLY idx_name;      -- refaz um índice inchado sem bloquear
REINDEX TABLE CONCURRENTLY table_name;    -- todos os índices da tabela
```

---

## 5. Consultas de monitoramento

### Consultas lentas
```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;   -- por migration; já ativa no Supabase

SELECT calls,
  round(total_exec_time::numeric, 2) AS total_ms,
  round(mean_exec_time::numeric, 2) AS avg_ms,
  query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Índices sem uso
```sql
SELECT schemaname, relname, indexrelname, idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND schemaname NOT IN ('pg_catalog', 'pg_toast')
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Bloat
```sql
SELECT schemaname, relname, n_live_tup, n_dead_tup,
  round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 2) AS dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY n_dead_tup DESC;
```

### Cache hit ratio (meta: acima de 99%)
```sql
SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit + blks_read), 0), 2) AS cache_hit_ratio
FROM pg_stat_database;
```

---

## 6. Locks e concorrência

### Locks esperando
```sql
SELECT l.pid, l.mode, l.granted, a.usename, a.query, a.state
FROM pg_locks l JOIN pg_stat_activity a ON l.pid = a.pid
WHERE NOT l.granted;
```

### Consultas longas
```sql
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state <> 'idle' AND now() - query_start > interval '5 minutes';

SELECT pg_cancel_backend({pid});      -- cancela a consulta (gentil)
SELECT pg_terminate_backend({pid});   -- encerra a conexão (forçado)
```

---

## 7. Timeouts

```sql
-- Na sessão (scripts, migrations)
SET statement_timeout = '30s';     -- consulta descontrolada
SET lock_timeout = '10s';          -- espera longa por lock

-- Por papel, no Supabase (por migration): limita as consultas vindas da API
ALTER ROLE authenticated SET statement_timeout = '15s';
ALTER ROLE anon SET statement_timeout = '5s';
```
`idle_in_transaction_session_timeout` encerra sessões esquecidas com transação aberta.

---

## 8. Checklist de produção

### Antes de entrar no ar
- [ ] `shared_buffers` configurado (25% da RAM) ou compute dimensionado (Supabase)
- [ ] `effective_cache_size` configurado (50% a 75% da RAM)
- [ ] `work_mem` ajustado para a carga
- [ ] Pooler configurado
- [ ] Autovacuum ajustado nas tabelas com muita escrita
- [ ] `pg_stat_statements` ativa
- [ ] Log de consultas lentas ativo
- [ ] Estratégia de backup testada
- [ ] Estratégia de índices revisada

### Manutenção regular
- [ ] Cache hit ratio acima de 99%
- [ ] Índices sem uso revisados todo mês
- [ ] Consultas lentas revisadas toda semana
- [ ] `ANALYZE` depois de cargas grandes
- [ ] Bloat acompanhado
- [ ] Restauração de backup testada a cada trimestre
