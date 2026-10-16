---
id: db-migrate
title: Aplicar migration com segurança
agent: dev
hat: data
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'migration (obrigatório): caminho em supabase/migrations/ ou nome de uma migration nova'
  - 'ambiente (obrigatório): local | staging | produção'
outputs:
  - 'Migration aplicada e registrada no histórico (supabase_migrations.schema_migrations ou migration-log)'
  - 'supabase/snapshots/{ts}_before.sql, {ts}_after.sql e {ts}_diff.patch'
  - 'Entrada em supabase/docs/migration-log.md'
depends_on:
  tasks: [execute-checklist.md, create-doc.md, db-smoke-test.md]
  templates: [sql/migration.sql, sql/rollback.sql, migration-plan-tmpl.yaml]
  checklists: [dba-predeploy-checklist.md, migration-readiness-checklist.md]
  data: [migration-safety-guide.md, supabase-patterns.md]
next: [db-smoke-test, db-audit, db-performance]
source: [db-apply-migration.md, db-dry-run.md, db-snapshot.md, db-verify-order.md]
---

# Aplicar migration com segurança

## Objetivo
Levar uma migration versionada ao banco sem surpresa: ordem de dependências verificada, dry-run, snapshot antes e depois, aplicação atômica e verificação do resultado.

## Quando usar
- Toda mudança de schema ou de dado, em qualquer ambiente, inclusive as geradas por `*db-model`, `*db-policy` e `*db-performance`.
- Em ambiente remoto, é o único caminho para DDL e mudança de dado: nada de SQL ad hoc, nem pelo MCP do Supabase (que fica em somente leitura).
- Para reverter, use `*db-rollback`.

## Modos de execução
| Modo | Comportamento |
|------|---------------|
| YOLO | Só em ambiente local: executa os passos sem pausas e registra o resultado |
| Interativo (padrão) | Confirma ambiente, resultado do dry-run e aplicação |
| Pre-Flight | Coleta antes ambiente, plano, estratégia de rollback e janela; depois executa |

Em staging e produção, a confirmação explícita do passo 6 vale em qualquer modo.

## Pré-condições
- [ ] `*db-setup` concluído; `$SUPABASE_DB_URL` aponta para o ambiente alvo
- [ ] Ambiente remoto: projeto linkado (`supabase link`) ou URL do alvo em mãos
- [ ] Migration ligada a uma story (Artigo III)

Caminhos: `supabase/` no Supabase; `database/` no Postgres puro, que usa os comandos `psql` em vez dos comandos `supabase`.

## Passos

### 1. Identificar a migration e o ambiente
Se a migration ainda não existe, crie:
```bash
supabase migration new {nome}     # arquivo vazio, preenchido a partir de sql/migration.sql
supabase db diff -f {nome}        # ou: gera a migration a partir de mudanças feitas no banco local
```
Ambiente remoto exige o script de rollback `supabase/rollback/{versão}_rollback_{nome}.sql`, escrito a partir de `sql/rollback.sql`.

**Ponto de elicitação:** confirme com o usuário:
- Arquivo `{migration}`, propósito e mudanças esperadas (tabelas, funções, policies)
- Ambiente: 1. local 2. staging 3. produção
- Alvo da conexão, sem a senha: `printf '%s' "$SUPABASE_DB_URL" | sed -E 's#://([^:/]+):[^@]*@#://\1:***@#'`

### 2. Classificar o risco
Risco alto é produção com dados e pelo menos um destes itens:
- DROP de tabela ou coluna, RENAME, troca de tipo, NOT NULL em coluna existente
- backfill acima de 100 mil linhas
- mudança que quebra a versão atual da aplicação (exige expand/contract)

Risco alto exige plano e GO antes de seguir: gere o plano com a task `create-doc` e o template `migration-plan-tmpl.yaml` (`supabase/docs/migration-plan-{nome}.md`) e rode `execute-checklist` com `migration-readiness-checklist.md`. NO-GO interrompe a task. Os padrões seguros (expand/contract, backfill em lotes, índices concorrentes) estão em `migration-safety-guide.md`.

### 3. Verificar o arquivo e a ordem do DDL
```bash
MIG={migration}
# Controle de transação no arquivo quebra o dry-run: um COMMIT interno efetivaria a mudança
grep -nEi '^[[:space:]]*(BEGIN|START[[:space:]]+TRANSACTION|COMMIT|ROLLBACK)([[:space:]]+(WORK|TRANSACTION))?[[:space:]]*;' "$MIG" \
  && echo "❌ remova o controle de transação: quem aplica já envolve o arquivo numa transação"
# Comandos que não rodam dentro de transação
grep -nEi 'concurrently|^[[:space:]]*vacuum|alter[[:space:]]+system' "$MIG" \
  && echo "⚠️ mova esses comandos para um script executado fora da migration"
# Operações destrutivas
grep -nEi 'drop[[:space:]]+(table|column|schema)|truncate|delete[[:space:]]+from' "$MIG" \
  && echo "⚠️ operação destrutiva: confirme o snapshot de dados e o rollback"
# Ordem do DDL (heurística, sem conexão)
ORDER=$(awk '{ l = tolower($0) }
  l ~ /create extension|alter extension/            { print "EXT", NR }
  l ~ /create (unlogged )?table/                     { print "TAB", NR }
  l ~ /create (or replace )?function/                { print "FUN", NR }
  l ~ /create (or replace )?(constraint )?trigger/   { print "TRG", NR }
  l ~ /enable row level security|create policy/      { print "RLS", NR }
  l ~ /create (or replace )?(materialized )?view/    { print "VIEW", NR }' "$MIG")
echo "$ORDER"
first() { echo "$ORDER" | awk -v k="$1" '$1 == k { print $2; exit }'; }
TAB=$(first TAB); FUN=$(first FUN); TRG=$(first TRG); RLS=$(first RLS)
[ -n "$FUN" ] && [ -n "$TAB" ] && [ "$FUN" -lt "$TAB" ] && echo "❌ funções antes das tabelas: reordene"
[ -n "$RLS" ] && [ -n "$TAB" ] && [ "$RLS" -lt "$TAB" ] && echo "❌ RLS antes da criação das tabelas: reordene"
[ -n "$TRG" ] && [ -n "$FUN" ] && [ "$TRG" -lt "$FUN" ] && echo "⚠️ triggers antes das funções: falha se o trigger chamar função ainda não criada"
```
Ordem recomendada: 1. extensões 2. tabelas e constraints (referenciadas antes das que referenciam) 3. funções (base antes das compostas) 4. triggers 5. RLS (enable e policies; policies que usam funções vêm depois delas) 6. views (base antes das derivadas). A heurística não cobre dependências entre arquivos nem SQL dinâmico; o dry-run cobre.

### 4. Dry-run
1. **Local (Supabase):** `supabase db reset` recria o banco local com todas as migrations e o seed, validando a migration a partir do zero. Somente local: nunca use `--linked` nem `--db-url` remoto com `db reset`.
2. **No ambiente alvo:** executa e desfaz.
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL lock_timeout = '10s';
\echo 'Dry-run: executando'
\i $MIG
\echo 'Dry-run sem erros: desfazendo'
ROLLBACK;
SQL
```
Em produção, o dry-run executa o DDL de verdade e segura locks até o ROLLBACK: rode em horário de baixo tráfego.
3. **Remoto (Supabase):** `supabase db push --dry-run` (outro ambiente: `--db-url "$SUPABASE_DB_URL"`) lista as migrations pendentes. Só a migration esperada pode aparecer.

O dry-run valida sintaxe, dependências, ordem e constraints contra os dados atuais. Não valida a correção dos dados nem o desempenho.
Erros comuns: `relation ... does not exist` (dependência ausente ou fora de ordem); `function ... does not exist` (reordene: tabelas → funções → triggers); `syntax error` (confira a compatibilidade com a versão do Postgres).

### 5. Gate antes do ambiente remoto
Staging e produção: rode `execute-checklist` com `dba-predeploy-checklist.md` e siga a decisão do checklist. Em produção, confirme também que o backup gerenciado ou o PITR do Supabase está disponível (Dashboard → Database → Backups).

### 6. Confirmar
Mostre: ambiente, alvo sem senha, migrations pendentes, resultado do dry-run e caminho do rollback. Peça confirmação explícita para staging e produção.

### 7. Snapshot antes
```bash
TS=$(date +%Y%m%d%H%M%S)
mkdir -p supabase/snapshots
pg_dump "$SUPABASE_DB_URL" --schema-only --clean --if-exists --no-owner --schema=public \
  > "supabase/snapshots/${TS}_before.sql" || { echo "❌ snapshot falhou: abortando"; exit 1; }
[ -s "supabase/snapshots/${TS}_before.sql" ] || { echo "❌ snapshot vazio: abortando"; exit 1; }
for k in "CREATE TABLE" "CREATE FUNCTION" "CREATE POLICY"; do
  printf '%s: %s\n' "$k" "$(grep -c "$k" "supabase/snapshots/${TS}_before.sql")"
done
```
- Inclua os demais schemas da aplicação (ex.: `--schema=private`). No Supabase, nunca inclua os schemas gerenciados (`auth`, `storage`, `realtime` e afins). Alternativa que já os exclui: `supabase db dump -f supabase/snapshots/${TS}_before.sql`.
- Se a migration altera dados, salve também os dados das tabelas afetadas: `pg_dump "$SUPABASE_DB_URL" --data-only --table=public.{tabela} > supabase/snapshots/${TS}_before_data.sql` (nunca vai para o git).
- Grave `supabase/snapshots/${TS}_before.meta` com: label, propósito, alvo sem senha, arquivo, tamanho e como restaurar (`*db-rollback supabase/snapshots/${TS}_before.sql`).

### 8. Aplicar
| Ambiente | Comando |
|----------|---------|
| Local (Supabase) | `supabase migration up` |
| Remoto (Supabase) | `supabase db push` (projeto linkado) ou `supabase db push --db-url "$SUPABASE_DB_URL"` |
| Postgres puro | psql em transação única com lock consultivo (abaixo) |

O Supabase CLI aplica cada arquivo pendente numa transação, em ordem, e registra a versão em `supabase_migrations.schema_migrations`. Não aplique por psql uma migration que o CLI gerencia: o histórico diverge (para alinhar: `supabase migration repair {versão} --status applied`). Evite execuções concorrentes: um operador ou o pipeline por vez.

Postgres puro:
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -c "SET LOCAL lock_timeout = '10s';" \
  -c "DO \$\$ BEGIN IF NOT pg_try_advisory_xact_lock(hashtext('sia:migrate')) THEN RAISE EXCEPTION 'Outra migration em andamento'; END IF; END \$\$;" \
  -f "$MIG"
```
O lock consultivo impede execuções concorrentes e é liberado no fim da transação. Em caso de falha, a transação inteira é desfeita: o banco fica como estava e o snapshot continua disponível. Corrija e volte ao passo 4.

### 9. Snapshot depois e diff
```bash
pg_dump "$SUPABASE_DB_URL" --schema-only --clean --if-exists --no-owner --schema=public \
  > "supabase/snapshots/${TS}_after.sql"
diff -u "supabase/snapshots/${TS}_before.sql" "supabase/snapshots/${TS}_after.sql" \
  > "supabase/snapshots/${TS}_diff.patch" || true
```
Confira se o diff contém só as mudanças esperadas.

### 10. Verificar
1. Histórico: `supabase migration list` (local × remoto). Postgres puro: confira o registro do passo 6 abaixo.
2. Smoke test: execute a task `db-smoke-test` (`*db-smoke-test`).
3. Mudou tabela, policy, grant, view ou função: `*db-audit` (escopo rls ou full).
4. Mudou índice ou tabela grande: `*db-performance` nos hot paths.
5. Tipos: `supabase gen types typescript --linked > src/types/database.ts` (local: `--local`).
6. Registre em `supabase/docs/migration-log.md` (versão, arquivo, ambiente, status, mudanças, rollback) e atualize a File List e as Dev Notes da story. Linha no Change Log da story, quando houver, no formato `@dev [Dados]`.

**Ponto de elicitação:** ofereça: 1. smoke test 2. auditoria de RLS 3. análise de desempenho 4. encerrar.

## Saída
```
✅ Migration aplicada
Ambiente: {ambiente} ({alvo sem senha})
Migration: {arquivo}
Snapshots: supabase/snapshots/{TS}_before.sql | {TS}_after.sql | {TS}_diff.patch
Rollback: supabase/rollback/{versão}_rollback_{nome}.sql
Próximo: *db-smoke-test
```

## Critérios de conclusão
- [ ] Arquivo sem controle de transação e com a ordem do DDL verificada
- [ ] Dry-run sem erro no local e no alvo
- [ ] Remoto: dba-predeploy-checklist com GO e confirmação explícita do usuário
- [ ] Snapshot antes e depois gravados e não vazios
- [ ] Migration registrada no histórico e no migration-log
- [ ] Smoke test passou

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `Outra migration em andamento` | Aguarde; para investigar: `SELECT * FROM pg_locks WHERE locktype = 'advisory';` |
| Falha no meio da aplicação | A transação foi desfeita; corrija o arquivo e volte ao dry-run |
| `cannot run inside a transaction block` | Mova o comando (ex.: `CREATE INDEX CONCURRENTLY`) para um script executado fora de transação |
| `canceling statement due to lock timeout` | Tabela ocupada: tente em horário de menor tráfego |
| Snapshot falha | Confira espaço em disco, versão do pg_dump (igual ou maior que a do servidor) e permissões |
| Histórico local e remoto divergentes | `supabase migration list`; alinhe com `supabase migration repair` |
| Conexão direta falha (rede sem IPv6) | Use o pooler em modo sessão (porta 5432) |
| Migration aplicada quebrou a aplicação | `*db-rollback {snapshot|migration}` |

## Handoff
Próximo passo: `@dev *db-smoke-test`; se a migration mexeu em RLS, depois `@dev *db-test-as-user {usuário}`.
