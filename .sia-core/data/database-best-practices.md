# Boas Práticas de Banco de Dados (Postgres e Supabase)

> Referência do chapéu Dados do `@dev`. Consultada em `*db-model`, `*db-audit`, `*db-performance`, `*db-seed` e `*db-checklist`.
> Padrão: Postgres e Supabase prontos para produção.

---

## 1. Desenho do schema

### Convenções de nome
| Objeto | Padrão | Exemplo |
|--------|--------|---------|
| Tabela | snake_case, plural | `user_profiles` |
| Coluna | snake_case, descritiva | `created_at`, `is_active` |
| Chave primária | `id` (UUID de preferência) | `id uuid` |
| Chave estrangeira | `{tabela referenciada no singular}_id` | `user_id` |
| Índice | `idx_{tabela}_{colunas}` | `idx_orders_user_id` |
| Constraint | `{tabela}_{coluna}_{tipo}` | `users_email_unique` |
| Policy | `{tabela}_{regra ou operação}` | `posts_owner_all` |

### Tipos
- UUID nas chaves primárias (`gen_random_uuid()`): boa distribuição e não revela volume.
- `timestamptz` para data e hora (com fuso).
- `jsonb` (não `json`) para dado flexível ou aninhado.
- ENUM ou tabela de referência para conjuntos fixos; prefira tabela quando os valores mudam.
- `text` em vez de `varchar(n)`: mesmo desempenho no Postgres; limite com CHECK quando for regra.
- Valores monetários em `numeric` ou em centavos (inteiro), nunca em ponto flutuante.

---

## 2. Índices

### Quando indexar
- Chave primária (automático)
- Chave estrangeira (manual e crítico)
- Colunas de WHERE, JOIN e ORDER BY frequentes
- Colunas usadas em policies RLS
- Índice composto para consultas com vários filtros

### Tipos
| Tipo | Uso |
|------|-----|
| B-tree | Padrão: igualdade e faixa |
| GIN | JSONB, busca textual, arrays |
| GiST | Dados geométricos e range types |
| BRIN | Tabelas grandes com ordem natural (ex.: logs por data) |

### Antipadrões
- Índice isolado em coluna de baixa cardinalidade
- Índice redundante (coberto por um composto que começa pela mesma coluna)
- Indexar coluna muito atualizada sem necessidade
- Não acompanhar o uso (`pg_stat_user_indexes`)

---

## 3. Consultas

### Regras gerais
- `EXPLAIN ANALYZE` antes de otimizar.
- Nada de `SELECT *` em código de produção: só as colunas necessárias.
- Pagine os resultados.
- `EXISTS` em vez de `COUNT` para checar existência.

### Joins
- FK sempre indexada.
- Tipo de join adequado (INNER, LEFT etc.).
- CTE quando deixa um join complexo mais claro.

### Subconsulta ou JOIN
- JOIN para trazer dados relacionados.
- Subconsulta para valor escalar.
- CTE para consultas em várias etapas.
- Evite subconsulta correlacionada quando houver alternativa.

---

## 4. Integridade
- Chave primária em toda tabela.
- FK com ON DELETE e ON UPDATE definidos.
- NOT NULL onde o dado é obrigatório.
- CHECK para faixas de valor válidas.
- UNIQUE para regras de negócio.

```sql
ON DELETE CASCADE    -- dados dependentes acompanham o pai
ON DELETE RESTRICT   -- protege contra exclusão acidental do pai
ON DELETE SET NULL   -- o filho sobrevive sem o pai
```

---

## 5. Migrations

### Boas práticas
- Uma preocupação por migration.
- Rollback para toda migration aplicada fora do local (`supabase/rollback/`).
- Teste em cópia com volume de produção.
- Nunca altere uma migration já aplicada: crie outra.
- Transação por arquivo (o Supabase CLI já envolve cada arquivo).
- Migration de dados separada da migration de schema.

### Operações seguras
```sql
ALTER TABLE users ADD COLUMN bio text;                              -- coluna anulável
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);         -- sem lock de escrita (fora da migration)
DROP INDEX IF EXISTS idx_old_index;                                 -- idempotente
```

### Operações perigosas
- DROP de coluna com dados
- Troca de tipo de coluna
- NOT NULL sem default nem backfill
- UPDATE em tabela grande sem lotes

Detalhes e alternativas seguras: `migration-safety-guide.md`.

---

## 6. Monitoramento

### Métricas
- Tempo das consultas (`pg_stat_statements`)
- Uso dos índices (`pg_stat_user_indexes`)
- Bloat (`n_dead_tup` em `pg_stat_user_tables`; extensão `pgstattuple` para medir)
- Uso de conexões
- Cache hit ratio

### Ferramentas
- `EXPLAIN ANALYZE` para planos de execução
- `pg_stat_statements` para estatísticas de consultas
- pgBadger para análise de logs (self-hosted)
- Supabase: Dashboard (Advisors, Query Performance) e `supabase inspect db`

---

## 7. Backup e recuperação

### Estratégia
- Backup automático diário
- Point-in-time recovery (PITR)
- Cópia fora do servidor principal
- Teste de restauração periódico
- Procedimento de recuperação documentado

### Supabase
- Backup diário automático nos planos pagos; PITR como complemento.
- Download e restauração pelo Dashboard (Database → Backups).
- Cópias manuais com `pg_dump` ou `supabase db dump`.

---

## 8. Segurança

### Controle de acesso
- Menor privilégio possível.
- Acesso por papel, não por usuário.
- RLS em toda tabela exposta pela API (detalhes em `rls-security-patterns.md`).
- Nunca exponha credenciais de superusuário nem a chave secreta do Supabase.
- Rotacione credenciais periodicamente.

### Proteção de dados
- Criptografia em repouso e nos campos sensíveis.
- SSL/TLS nas conexões (`sslmode=require`).
- Trilha de auditoria nas tabelas sensíveis.
- Dados sensíveis mascarados nos logs e fora de produção.
