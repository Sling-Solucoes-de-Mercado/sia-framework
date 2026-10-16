---
id: db-seed
title: Popular dados de seed ou carregar CSV
agent: dev
hat: data
elicit: true
inputs:
  - 'arquivo (obrigatório): seed .sql ou arquivo .csv'
  - 'tabela (obrigatório para CSV): tabela de destino'
  - 'ambiente (obrigatório): local | staging | produção'
outputs:
  - 'Dados aplicados de forma idempotente'
  - 'Snapshot dos dados afetados em supabase/snapshots/ (fora do git)'
  - 'Entrada em supabase/docs/SEED_LOG.md'
depends_on:
  tasks: [db-migrate.md]
  templates: [sql/seed-data.sql, sql/staging-copy-merge.sql]
  data: [supabase-patterns.md]
next: [db-smoke-test]
source: [db-seed.md, db-load-csv.md]
---

# Popular dados de seed ou carregar CSV

## Objetivo
Aplicar dados de referência, de teste ou importados de CSV de forma idempotente, validada e registrada, sem sujar ambientes remotos.

## Quando usar
- Dados de referência (status, categorias, papéis) que a aplicação precisa para funcionar.
- Dados de teste para desenvolvimento local.
- Importação de CSV para uma tabela existente.
- Não use para mudar schema: isso é `*db-migrate`.

## Pré-condições
- [ ] Tabelas de destino existem (migrations aplicadas)
- [ ] `$SUPABASE_DB_URL` aponta para o ambiente alvo (mostre o alvo sem a senha)

## Passos

### 1. Identificar a entrada e o ambiente
**Ponto de elicitação:** confirme o arquivo, o tipo (seed SQL ou CSV), a tabela de destino (CSV) e o ambiente: 1. local 2. staging 3. produção.

| Tipo de dado | Onde vive | Ambientes |
|--------------|-----------|-----------|
| Referência (lookup) | `supabase/seed.sql` no local; migration de dados no remoto | todos |
| Teste (usuários e registros fictícios) | `supabase/seed.sql` | só local |
| Importação (CSV) | arquivo externo | conforme o pedido, com confirmação |

Regras: nunca semeie produção sem confirmação explícita; dado de teste nunca sai do local; seed SQL em ambiente remoto vira migration versionada (passo 4).

### 2. Validar o seed SQL
```bash
F={arquivo}
grep -niE 'truncate|delete[[:space:]]+from' "$F" && echo "⚠️ seed destrutivo: exige confirmação explícita"
grep -qiE 'on[[:space:]]+conflict|where[[:space:]]+not[[:space:]]+exists' "$F" \
  || echo "⚠️ sem ON CONFLICT nem WHERE NOT EXISTS: o seed pode não ser idempotente"
grep -nEi '^[[:space:]]*(BEGIN|COMMIT)[[:space:]]*;' "$F" && echo "⚠️ remova BEGIN/COMMIT: a aplicação usa transação única"
```
Cada aviso exige correção ou confirmação explícita. Nunca use TRUNCATE em seed de produção. Padrão idempotente: `INSERT ... ON CONFLICT (id) DO UPDATE SET ...` ou `INSERT ... SELECT ... WHERE NOT EXISTS (...)` (template `sql/seed-data.sql`).

### 3. Proteger os dados atuais
Seed muda dados, então o snapshot útil é o dos dados das tabelas afetadas (snapshot só de schema não desfaz seed):
```bash
TS=$(date +%Y%m%d%H%M%S)
pg_dump "$SUPABASE_DB_URL" --data-only --table=public.{tabela} > "supabase/snapshots/${TS}_before_seed_data.sql"
```
Opcional no local; obrigatório em staging e produção. Nunca versione esse arquivo.

### 4. Aplicar o seed SQL
| Ambiente | Como |
|----------|------|
| Local, arquivo `supabase/seed.sql` | `supabase db reset`: recria o banco local com migrations e seed (apaga os dados locais; confirme antes) |
| Local, outro arquivo | `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$F"` |
| Staging ou produção (Supabase) | converta em migration (`supabase migration new seed_{nome}` com o conteúdo do seed) e aplique pelo `*db-migrate` |
| Postgres puro | psql em transação única; fora do local, com confirmação explícita |

### 5. Carregar CSV
1. **Validar as entradas:**
```bash
CSV={arquivo}; T={tabela}
[ -f "$CSV" ] || { echo "❌ arquivo não encontrado: $CSV"; exit 1; }
psql "$SUPABASE_DB_URL" -tAc "SELECT to_regclass('public.$T') IS NOT NULL" | grep -q t \
  || { echo "❌ tabela $T não existe"; exit 1; }
echo "Linhas de dados: $(( $(wc -l < "$CSV") - 1 ))"
file "$CSV"          # precisa ser UTF-8
head -n 5 "$CSV"
```
**Ponto de elicitação:** mostre a prévia e confirme o mapeamento de colunas do CSV para a tabela.

2. **Fase de validação (uma só sessão psql):** monte `.sia/db/import-{tabela}-check.sql` a partir dos passos 1 a 4 de `sql/staging-copy-merge.sql`: tabela TEMP de staging com colunas `text`, `\copy` do CSV (lado do cliente; `COPY ... FROM '/caminho'` no servidor não funciona no Supabase), marcação de erros (obrigatórios nulos, duplicados, tipos inválidos) e relatório por status.
```bash
mkdir -p .sia/db
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f .sia/db/import-{tabela}-check.sql
```
Tudo roda numa execução só: a tabela TEMP some quando a sessão termina.

**Ponto de elicitação:** mostre o relatório (`insert`, `update`, `duplicate`, `error`) e pergunte se segue para o merge. Linhas com erro não entram.

3. **Fase de merge (nova sessão, transação única):** monte `.sia/db/import-{tabela}-merge.sql` com o template inteiro: staging, `\copy`, validações, trava de erros aceitos e merge (INSERT dos novos e UPDATE dos existentes, com cast explícito, ex.: `id::uuid`, `amount::numeric(10,2)`, `created_at::timestamptz`).
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f .sia/db/import-{tabela}-merge.sql
psql "$SUPABASE_DB_URL" -c "ANALYZE public.{tabela};"
```
- Ambiente remoto: confirmação explícita e snapshot de dados (passo 3) antes do merge.
- CSV pequeno (até cerca de mil linhas) e estável: prefira convertê-lo em migration de dados com `INSERT ... ON CONFLICT`.
- Arquivo grande (mais de 100 MB ou 1 milhão de linhas): divida (`split -l 100000`), mantendo o cabeçalho só na primeira parte ou usando `HEADER false` nas demais; ou faça `COPY ... FROM STDIN` em streaming.
- Carga inicial grande: staging `UNLOGGED` e índices recriados depois (`CREATE INDEX CONCURRENTLY`) aceleram. Desligar triggers (`ALTER TABLE ... DISABLE TRIGGER ALL`) só com aprovação: triggers podem conter regra de negócio.
- A carga feita pelo usuário `postgres` ignora RLS: valide explicitamente as colunas de dono (`user_id`, `tenant_id`).
- CSV de origem não confiável sempre passa por staging e validação.

### 6. Verificar e registrar
```sql
SELECT '{tabela}' AS table_name, count(*) AS row_count FROM public.{tabela};
```
Confira as contagens esperadas e registre em `supabase/docs/SEED_LOG.md`:
```markdown
## Seed {TS}
- Arquivo: {arquivo}
- Tabelas: {lista}
- Ambiente: {ambiente}
- Linhas: {inseridas} inseridas, {atualizadas} atualizadas, {descartadas} descartadas
- Aplicado por: {usuário} em {AAAA-MM-DD HH:MM UTC}
```
Versione os arquivos de seed SQL no git; o CSV importado, conforme a política de dados do projeto.

## Saída
```
✅ Seed concluído
Arquivo: {arquivo} | Ambiente: {ambiente}
Snapshot de dados: supabase/snapshots/{TS}_before_seed_data.sql
Linhas: {n} | Log: supabase/docs/SEED_LOG.md
```

## Critérios de conclusão
- [ ] Seed idempotente, ou risco aceito explicitamente pelo usuário
- [ ] Nenhum dado de teste fora do ambiente local
- [ ] Remoto: snapshot de dados gravado e confirmação explícita
- [ ] CSV: validação revisada antes do merge; merge em transação única
- [ ] Contagens conferidas e SEED_LOG atualizado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Seed falha | A transação foi desfeita; corrija e repita. Se algo foi aplicado fora de transação, restaure o snapshot de dados |
| `invalid byte sequence for encoding "UTF8"` | Converta: `iconv -f ISO-8859-1 -t UTF-8 entrada.csv > saida.csv` |
| `unterminated CSV quoted field` | Ajuste `DELIMITER`, `QUOTE` e `ESCAPE` no `\copy` |
| `null value in column ... violates not-null constraint` | Defina `NULL ''` ou `NULL 'NULL'` no `\copy` e trate na validação |
| Merge abortado pela trava de erros | Mais erros que os aceitos na validação: revise o CSV e refaça a fase de validação |

## Handoff
Próximo passo: `@dev *db-smoke-test`.
