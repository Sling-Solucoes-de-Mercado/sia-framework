---
id: db-smoke-test
title: Rodar o smoke test do banco
agent: dev
hat: data
elicit: false
inputs:
  - 'arquivo (opcional): smoke test a rodar; padrão supabase/smoke/v_current.sql'
outputs:
  - 'Resultado (passou ou falhou) com as verificações executadas'
depends_on:
  templates: [sql/smoke-test.sql]
next: [db-audit, db-performance, db-rollback]
source: [db-smoke-test.md]
---

# Rodar o smoke test do banco

## Objetivo
Validar em segundos, sem efeitos colaterais, que o schema está como esperado depois de uma migration, de um rollback ou de um seed.

## Quando usar
- Sempre depois de `*db-migrate`, `*db-rollback` e `*db-seed`.
- Antes de liberar um ambiente para uso.

## Pré-condições
- [ ] `$SUPABASE_DB_URL` aponta para o ambiente a validar

## Passos

### 1. Localizar o smoke test
Ordem de busca:
1. `supabase/smoke/v_current.sql` (versão atual do schema)
2. `supabase/smoke/smoke_test.sql`
3. Template `sql/smoke-test.sql`: copie para `supabase/smoke/smoke_test.sql` e preencha as expectativas (tabelas, funções, quantidade mínima de policies, tabela protegida) a partir da migration e do design do schema. O template com placeholders não roda.

Os smoke tests ficam em `supabase/smoke/`, e não em `supabase/tests/`: o `supabase test db` executa tudo o que está em `supabase/tests/` como teste pgTAP. No Postgres puro, use `database/smoke/`.

### 2. Rodar em transação somente leitura
```bash
SMOKE=supabase/smoke/v_current.sql
[ -f "$SMOKE" ] || SMOKE=supabase/smoke/smoke_test.sql
[ -f "$SMOKE" ] || { echo "❌ nenhum smoke test encontrado: crie a partir de sql/smoke-test.sql"; exit 1; }
echo "Smoke test: $SMOKE"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -c "SET TRANSACTION READ ONLY;" -f "$SMOKE" \
  && echo "✅ smoke test passou" || echo "❌ smoke test falhou"
```
A transação somente leitura garante que o teste não altera nada; `ON_ERROR_STOP` para no primeiro erro.

### 3. Interpretar
| Área | Verificação |
|------|-------------|
| Objetos | Tabelas, views, funções e triggers esperados existem |
| RLS | RLS ativa em toda tabela exposta; policies instaladas; consulta como `authenticated` não dá erro |
| Integridade | FKs e checks válidos; consultas de amostra retornam o esperado |
| Desempenho | Consultas básicas rápidas; FKs com índice |

Falhou:
1. Confira se a migration foi aplicada inteira (`supabase migration list`).
2. Confira se as policies e as funções foram criadas.
3. Problema crítico: considere `*db-rollback {snapshot}`.

### 4. Manter os smoke tests
- Um arquivo por versão do schema (`supabase/smoke/v_{versão}.sql`); `v_current.sql` é a cópia da versão atual.
- Rápido (menos de 5 segundos), somente leitura, com as expectativas comentadas e falha rápida: cada verificação levanta exceção quando o resultado não bate.
- Atualize o smoke test na mesma story que muda o schema.

## Saída
```
✅ Smoke test passou (supabase/smoke/{arquivo})
  ✓ objetos esperados  ✓ RLS e policies  ✓ funções  ✓ consultas de amostra
```
Se falhar: a verificação que falhou e a mensagem de erro. Depois de uma migration, registre o resultado no `supabase/docs/migration-log.md`.

## Critérios de conclusão
- [ ] Smoke test do projeto executado (não o template cru)
- [ ] Execução em transação somente leitura, sem erro
- [ ] Resultado registrado no migration-log, quando o teste seguiu uma migration

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Nenhum arquivo encontrado | Crie a partir de `sql/smoke-test.sql` |
| `cannot execute ... in a read-only transaction` | O smoke test tem escrita: remova, smoke test é só leitura |
| Expectativa não confere | Compare com a migration; corrija com nova migration ou reverta |
| `permission denied to set role` | Conecte com o usuário `postgres` do projeto |

## Handoff
Passou: `@dev *db-audit` (e `@dev *db-performance` se a migration mexeu em índice). Falhou: `@dev *db-rollback {snapshot}` ou correção pelo `*db-migrate`.
