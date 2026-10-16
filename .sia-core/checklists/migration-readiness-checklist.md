# Checklist: Prontidão para Migration de Risco Alto

> Usado por: `@dev` [Dados] no passo 2 da task `db-migrate` (`*db-migrate`), depois do plano feito com `migration-plan-tmpl.yaml`.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: Use para migrations de risco alto: produção com dados e DROP, RENAME, troca de tipo, NOT NULL em coluna existente, backfill acima de 100 mil linhas ou mudança que exige expand/contract. Antes de começar, carregue o plano (supabase/docs/migration-plan-{nome}.md), a migration, o rollback e o resultado do dry-run. Marque cada item como ✅ feito, ❌ não feito ou N/A, com comentário curto em todo ❌ e N/A. Itens marcados como críticos bloqueiam o GO.]]

## 1. Plano da migration
- [ ] Estratégia em fases documentada (ex.: expand, backfill, validate, contract) (crítico)
- [ ] Mapa do schema antigo para o novo (colunas, tipos, tabelas)
- [ ] Procedimento de rollback definido para cada fase (crítico)
- [ ] Cronograma realista, com janela de execução e janela de rollback
- [ ] Aprovação dos envolvidos registrada (crítico)
- [ ] Sequência entre deploys da aplicação e migrations comunicada

## 2. Base técnica
- [ ] Migrations e scripts de rollback escritos e revisados (crítico)
- [ ] Dry-run sem erro no local (`supabase db reset`) e em staging com volume de produção (crítico)
- [ ] Ordem do DDL verificada; comandos fora de transação separados em script próprio
- [ ] Backfill em lotes testado (tamanho de lote, throttle, retomada)
- [ ] Smoke test atualizado para o schema novo
- [ ] Tipos da aplicação regenerados para o schema novo

## 3. Compatibilidade da aplicação
- [ ] Versão atual da aplicação funciona com o schema expandido (crítico)
- [ ] Versão nova pronta (escrita dupla quando há renomeação ou troca de tipo)
- [ ] Feature flags configuradas, se o plano usa
- [ ] Testes da aplicação passando contra o schema novo em staging

## 4. Time
- [ ] Time informado do plano e da janela
- [ ] Roteiro de execução distribuído (seção Roteiro de Execução do plano)
- [ ] Canal de suporte definido para a janela
- [ ] Migrations revisadas por outra pessoa

## 5. Mitigação de risco
- [ ] Snapshot de schema e dos dados afetados previsto antes de cada fase (crítico)
- [ ] Backup gerenciado ou PITR do Supabase disponível (crítico)
- [ ] Feature flags prontas para desligar a mudança, se usadas
- [ ] Monitoramento ativo (erros da aplicação, locks, tempo de consulta)
- [ ] Rollback ensaiado em staging
- [ ] Contatos de emergência definidos

## 6. Métricas
- [ ] Linha de base de desempenho dos hot paths afetados (`*db-performance`)
- [ ] Taxa de erro da aplicação acompanhada antes, durante e depois
- [ ] Tempo estimado do backfill medido em staging
- [ ] Monitoramento de locks durante a execução

## Resultado
| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Plano | | |
| 2. Base técnica | | |
| 3. Compatibilidade | | |
| 4. Time | | |
| 5. Mitigação de risco | | |
| 6. Métricas | | |

[[LLM: Resumo final: liste os bloqueios (itens críticos ❌), os riscos aceitos e quem aprovou.]]

**Decisão:** GO quando todos os itens críticos estão ✅ e os demais estão ✅ ou com risco aceito. NO-GO com qualquer item crítico ❌; liste os bloqueios. Registre: aprovado por {nome} em {AAAA-MM-DD}.
