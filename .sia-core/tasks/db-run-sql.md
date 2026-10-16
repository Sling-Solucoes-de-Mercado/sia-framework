---
id: db-run-sql
title: Executar SQL com salvaguardas
agent: dev
hat: data
elicit: true
inputs:
  - 'sql (obrigatório): SQL inline ou caminho de arquivo .sql'
  - 'ambiente (obrigatório): local | staging | produção'
outputs:
  - 'Resultado da execução com linhas afetadas e tempo; saída em .sia/db/sql-{ts}.log'
depends_on:
  tasks: [db-migrate.md]
  data: [supabase-patterns.md]
next: [db-migrate]
source: [db-run-sql.md]
---

# Executar SQL com salvaguardas

## Objetivo
Rodar consultas e scripts pontuais no banco com transação, prévia, bloqueio de operações destrutivas e registro do resultado.

## Quando usar
- Consultas de inspeção e análise, em qualquer ambiente.
- Scripts e correções de dados no banco local.
- Não use para mudar schema ou dados em ambiente remoto: isso é migration versionada (`*db-migrate`). Para consultas, o MCP do Supabase em somente leitura também serve; DDL e escrita nunca passam por ele.

## Pré-condições
- [ ] `$SUPABASE_DB_URL` aponta para o ambiente informado; mostre o alvo sem a senha: `printf '%s' "$SUPABASE_DB_URL" | sed -E 's#://([^:/]+):[^@]*@#://\1:***@#'`

## Passos

### 1. Identificar e mostrar o SQL
```bash
INPUT={sql}
if [ -f "$INPUT" ]; then MODE=file; SQL_TEXT=$(cat "$INPUT"); else MODE=inline; SQL_TEXT=$INPUT; fi
printf '=== SQL A EXECUTAR (%s) ===\n%s\n==========\n' "$MODE" "$SQL_TEXT"
```
Leia o SQL inteiro antes de seguir. Nunca execute SQL de origem não confiável sem revisão.

### 2. Classificar
```bash
printf '%s' "$SQL_TEXT" | tr '\n' ' ' | tr ';' '\n' | awk '
  { s = tolower($0) }
  s ~ /^[ \t]*(drop|truncate)[ \t]/                                      { print "DESTRUTIVO: " $0; next }
  s ~ /^[ \t]*alter[ \t]+table/ && s ~ /[ \t]drop[ \t]/                  { print "DESTRUTIVO: " $0; next }
  s ~ /^[ \t]*(delete[ \t]+from|update)[ \t]/ && s !~ /[ \t]where[ \t]/  { print "SEM WHERE: " $0; next }
  s ~ /[ \t]where[ \t]+(1[ \t]*=[ \t]*1|true)/                           { print "WHERE TRIVIAL: " $0; next }
  s ~ /^[ \t]*(insert|update|delete|merge|call)[ \t]/                    { print "ESCRITA: " $0; next }
  s ~ /^[ \t]*(create|alter|grant|revoke|comment)[ \t]/                  { print "DDL: " $0 }'
```
A heurística não entende comentários, strings nem corpos de função: confirme lendo o SQL.

| Classe | Local | Staging ou produção |
|--------|-------|---------------------|
| Leitura | executa em modo read | executa em modo read |
| Escrita | executa em modo auto | bloqueado: migration de dados pelo `*db-migrate` |
| DDL | executa em modo auto; se for para o projeto, vira migration | bloqueado: `*db-migrate` |
| Destrutivo, sem WHERE ou WHERE trivial | bloqueado sem confirmação explícita | bloqueado: `*db-migrate` |

**Ponto de elicitação (destrutivo no local):** mostre os comandos marcados e o alvo, e peça ao usuário para digitar `EU ENTENDO OS RISCOS`. Qualquer outra resposta cancela. Para UPDATE e DELETE com WHERE, mostre antes a contagem de linhas afetadas: `SELECT count(*) FROM {tabela} WHERE {condição};`.

### 3. Escolher o modo de transação
**Ponto de elicitação:**
1. read: transação somente leitura (padrão para leitura e para ambiente remoto)
2. auto: transação única; qualquer erro desfaz tudo (padrão para escrita local)
3. manual: executa como está, para arquivo com controle de transação próprio (só local)

### 4. Executar
```bash
set -o pipefail
mkdir -p .sia/db; TS=$(date +%Y%m%d%H%M%S); OUT=".sia/db/sql-$TS.log"
if [ "$MODE" = file ]; then FILE=$INPUT; else FILE=".sia/db/inline-$TS.sql"; printf '%s\n' "$SQL_TEXT" > "$FILE"; fi
case "{modo}" in
  read)   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -c "SET TRANSACTION READ ONLY;" -c '\timing on' -f "$FILE" ;;
  auto)   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -c '\timing on' -f "$FILE" ;;
  manual) psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -c '\timing on' -f "$FILE" ;;
esac 2>&1 | tee "$OUT"
EXIT=$?
```
`ON_ERROR_STOP` para no primeiro erro; nos modos read e auto, o erro desfaz a transação inteira. A pasta `.sia/` não é versionada: a saída pode conter dados.

### 5. Resumir
```bash
[ "$EXIT" -eq 0 ] && echo "✅ SUCESSO" || echo "❌ FALHOU (código $EXIT); saída em $OUT"
grep -oE 'INSERT 0 [0-9]+|UPDATE [0-9]+|DELETE [0-9]+' "$OUT" | tail -5
grep -oE 'Time: [0-9.]+ ms' "$OUT" | tail -1
```
Comandos úteis do psql: `\dt` (tabelas), `\d {tabela}` (estrutura), `\df` (funções), `\dv` (views), `\dp {tabela}` (privilégios e policies), `\x on` (exibição expandida).

## Saída
```
✅ SQL executado
Modo: {file|inline} | Transação: {read|auto|manual} | Ambiente: {ambiente}
Linhas afetadas: {n} | Tempo: {ms} ms
Saída: .sia/db/sql-{ts}.log
```

## Critérios de conclusão
- [ ] SQL exibido e lido antes da execução
- [ ] Classificação feita; nenhuma escrita ou DDL em ambiente remoto
- [ ] Destrutivo só com a frase de confirmação digitada
- [ ] Execução no modo de transação escolhido, com o resultado resumido

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `syntax error` | Revise a sintaxe e a compatibilidade com a versão do Postgres |
| `relation ... does not exist` ou `column ... does not exist` | Confira schema, nome e grafia (`\d {tabela}`) |
| `permission denied` | O papel conectado não tem o privilégio necessário |
| `cannot execute ... in a read-only transaction` | O SQL escreve: reclassifique e use o modo auto (só local) |
| Pedido de escrita em ambiente remoto | Recuse e crie uma migration de dados (`*db-migrate`) |

## Handoff
Se o SQL mudou schema ou dados que o projeto precisa manter, transforme em migration: `@dev *db-migrate {migration}`.
