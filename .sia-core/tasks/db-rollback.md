---
id: db-rollback
title: Reverter migration do banco
agent: dev
hat: data
elicit: true
inputs:
  - 'alvo (obrigatório): script de rollback (supabase/rollback/*.sql), snapshot (supabase/snapshots/*.sql) ou versão da migration'
  - 'ambiente (obrigatório): local | staging | produção'
outputs:
  - 'Banco revertido ao estado anterior à migration'
  - 'supabase/snapshots/{ts}_emergency_before_rollback.sql e {ts}_post_rollback.sql'
  - 'Entrada ⏪ em supabase/docs/migration-log.md e linha em supabase/rollback/rollback.log'
depends_on:
  tasks: [execute-checklist.md, db-smoke-test.md, db-migrate.md]
  templates: [sql/rollback.sql]
  checklists: [dba-rollback-checklist.md]
  data: [migration-safety-guide.md]
next: [db-smoke-test, db-audit]
source: [db-rollback.md]
---

# Reverter migration do banco

## Objetivo
Desfazer uma migration de forma controlada: escolher a estratégia certa, proteger o estado atual com um snapshot de emergência, executar de forma atômica e validar o resultado.

## Quando usar
- A migration aplicada quebrou a aplicação ou foi aplicada por engano.
- Não use quando a migration falhou no meio: a transação já foi desfeita e o banco está inalterado. Corrija e rode `*db-migrate` de novo.
- Corrupção de dados não se resolve com rollback de schema: faça forward fix.

## Pré-condições
- [ ] Problema identificado e impacto avaliado
- [ ] Decisão de reverter confirmada pelo responsável (dba-rollback-checklist, seção 1)
- [ ] `$SUPABASE_DB_URL` aponta para o ambiente afetado (mostre o alvo sem a senha)

## Passos

### 1. Avaliar e escolher a estratégia
Rode `execute-checklist` com `dba-rollback-checklist.md`, seções 1 e 2 (avaliação e preparação).

| Situação | Estratégia |
|----------|------------|
| Migration falhou no meio | Nenhuma: a transação já foi desfeita |
| Schema quebrou a aplicação | Script de rollback (ou snapshot, fora de produção) |
| Migration errada aplicada | Script de rollback até o último estado bom |
| Bug pequeno em função | Forward fix |
| Risco de corrupção de dados | Forward fix; não reverta schema |
| Produção com usuários ativos | Forward fix sempre que possível |

**Ponto de elicitação:** apresente as opções:
1. Script de rollback explícito (`supabase/rollback/{versão}_rollback_{nome}.sql`): cirúrgico, preserva os dados das tabelas não afetadas. Recomendado com dados.
2. Restaurar snapshot de schema: recria os objetos do snapshot. **As tabelas recriadas voltam vazias.** Use só em local ou dev, em objetos sem dados (funções, views, policies) ou junto com o snapshot de dados.
3. Forward fix: nova migration corretiva pelo `*db-migrate`.
4. Restauração gerenciada (backup diário ou PITR do Supabase, Dashboard → Database → Backups): para desastre; feita pelo dono do projeto.

No Supabase remoto, prefira transformar o script de rollback numa migration nova (`supabase migration new revert_{nome}`) aplicada pelo `*db-migrate`: o histórico fica consistente. O caminho por psql (passo 5) é para emergência.

### 2. Avisar e confirmar
```
⚠️ ROLLBACK DE BANCO
Alvo: {arquivo}
Ambiente: {ambiente} ({alvo sem senha})
Efeitos: mudanças de schema posteriores ao alvo são perdidas; tabelas recriadas por snapshot
voltam vazias; a aplicação pode quebrar se depender do schema novo.
```
Peça ao usuário para digitar `ROLLBACK`. Qualquer outra resposta cancela.
Em produção: aplicação em manutenção ou parada, time avisado e horário de baixo tráfego (dba-rollback-checklist, seção 2).

### 3. Snapshot de emergência
```bash
TS=$(date +%Y%m%d%H%M%S)
EMERGENCY="supabase/snapshots/${TS}_emergency_before_rollback.sql"
pg_dump "$SUPABASE_DB_URL" --schema-only --clean --if-exists --no-owner --schema=public > "$EMERGENCY" \
  && [ -s "$EMERGENCY" ] || { echo "❌ snapshot de emergência falhou: rollback ABORTADO"; exit 1; }
```
Se o rollback remove ou altera dados, salve também os dados das tabelas afetadas (`pg_dump --data-only --table=public.{tabela}`). Sem snapshot de emergência, não há rollback.

### 4. Validar o alvo
```bash
TARGET={alvo}
[ -f "$TARGET" ] || { echo "❌ alvo não encontrado: $TARGET"; exit 1; }
grep -qiE 'create|drop|alter' "$TARGET" || { echo "❌ o arquivo não parece SQL de schema"; exit 1; }
grep -nEi '^[[:space:]]*(BEGIN|START[[:space:]]+TRANSACTION|COMMIT|ROLLBACK)([[:space:]]+(WORK|TRANSACTION))?[[:space:]]*;' "$TARGET" \
  && { echo "❌ remova o controle de transação do script"; exit 1; }
ls -lh "$TARGET"
```
- Snapshot: confira se foi gerado com `--clean --if-exists` (`grep -c "IF EXISTS" "$TARGET"`) e revise os DROPs do início do arquivo.
- Script de rollback: confira se desfaz na ordem inversa da migration.
- Versão de migration informada: localize `supabase/rollback/{versão}_rollback_*.sql`. Se não existir, escreva a partir de `sql/rollback.sql` e do diff `supabase/snapshots/*_diff.patch` e teste em local antes.

### 5. Executar
```bash
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction \
  -c "SET LOCAL lock_timeout = '10s';" \
  -c "DO \$\$ BEGIN IF NOT pg_try_advisory_xact_lock(hashtext('sia:migrate')) THEN RAISE EXCEPTION 'Outra operação de schema em andamento'; END IF; END \$\$;" \
  -f "$TARGET"
```
- Transação única: se qualquer comando falhar, nada é aplicado e o banco fica como estava; o snapshot de emergência continua disponível.
- O lock consultivo é o mesmo do `*db-migrate`: rollback e migration nunca rodam ao mesmo tempo.
- Supabase: depois de reverter por psql, alinhe o histórico com `supabase migration repair {versão} --status reverted` e remova ou corrija o arquivo da migration revertida; senão o próximo `supabase db push` a reaplica.

### 6. Validar
```bash
psql "$SUPABASE_DB_URL" -tAc "SELECT
  (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') AS tables,
  (SELECT count(*) FROM pg_policies WHERE schemaname = 'public') AS policies,
  (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace) AS functions;"
```
Compare com as contagens do estado alvo. Depois: execute `db-smoke-test`, rode `*db-audit` (escopo rls) e teste os fluxos críticos da aplicação (dba-rollback-checklist, seção 4).

### 7. Snapshot pós-rollback e registro
```bash
pg_dump "$SUPABASE_DB_URL" --schema-only --clean --if-exists --no-owner --schema=public \
  > "supabase/snapshots/${TS}_post_rollback.sql"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) | ROLLBACK | $TARGET | {ambiente} | {motivo}" >> supabase/rollback/rollback.log
```
Registre a entrada ⏪ em `supabase/docs/migration-log.md`, com o motivo. Conclua as seções 3 a 6 do `dba-rollback-checklist.md` (execução, validação, comunicação e pós-morte).

## Cuidados por ambiente
| Ambiente | Cuidados |
|----------|----------|
| Local ou dev | Execução direta; snapshot pode ser restaurado |
| Staging | Ensaie aqui o rollback de produção, com smoke test e testes da aplicação |
| Produção | Checklist completo: avisar, manutenção, snapshot de emergência, rollback, smoke test, `*db-audit`, fluxos críticos, sair da manutenção, monitorar |

Alternativas sem downtime, preferíveis em produção: migrations compatíveis com a versão anterior da aplicação, feature flags e expand/contract (`migration-safety-guide.md`).

## Saída
```
✅ Rollback concluído
Revertido para: {alvo}
Snapshots: emergência {EMERGENCY} | pós-rollback supabase/snapshots/{TS}_post_rollback.sql
Se surgir problema: *db-rollback {EMERGENCY}
```

## Critérios de conclusão
- [ ] Estratégia escolhida pela matriz e confirmada (`ROLLBACK` digitado)
- [ ] Snapshot de emergência gravado antes de qualquer mudança
- [ ] Execução em transação única, sem erro
- [ ] Contagens de objetos, smoke test e auditoria de RLS conferidos
- [ ] Histórico do Supabase alinhado (quando aplicável) e migration-log atualizado
- [ ] dba-rollback-checklist concluído

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Snapshot de emergência falhou | Aborte; confira conexão, espaço em disco e versão do pg_dump |
| `relation ... already exists` ao restaurar snapshot | Snapshot sem `--clean --if-exists`: gere de novo ou use script de rollback |
| Rollback falhou | Nada foi aplicado (transação única); revise o script e repita |
| Rollback ok, aplicação quebrada | Volte a versão anterior da aplicação com o `@devops` ou faça forward fix |
| Falha crítica sem saída | Restaure pelo backup gerenciado ou PITR do Supabase; documente estado, logs e erros |

## Handoff
Próximo passo: `@dev *db-smoke-test`; depois corrija a causa com uma nova migration (`*db-migrate`).
