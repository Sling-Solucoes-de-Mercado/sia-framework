# Checklist: Rollback de Banco

> Usado por: `@dev` [Dados] na task `db-rollback` (`*db-rollback`): seções 1 e 2 antes de executar; 3 a 6 durante e depois.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: Rollback mal feito causa perda de dados: siga este checklist com precisão. Antes de começar, carregue o alvo do rollback (script ou snapshot), o migration-log e o diff da migration (supabase/snapshots/*_diff.patch). Mantenha a calma: pressa piora o incidente. Percorra as seções em ordem e marque cada item como ✅ feito, ❌ não feito ou N/A, com comentário curto em todo ❌ e N/A. Documente tudo para o pós-morte e mantenha os envolvidos informados.]]

## 1. Avaliação da situação
[[LLM: Entenda o problema antes de agir.]]
- [ ] Problema identificado e documentado
- [ ] Impacto avaliado (usuários, dados e funcionalidades afetados)
- [ ] Decisão de reverter confirmada pelo responsável
- [ ] Estado atual do banco capturado (snapshot de emergência)
- [ ] Migration(s) afetada(s) identificada(s)

## 2. Preparação
[[LLM: Prepare tudo antes de executar.]]
- [ ] Script de rollback localizado e revisado (ordem inversa da migration)
- [ ] Dependências entre migrations entendidas
- [ ] Instâncias da aplicação avisadas ou paradas, se necessário
- [ ] Modo de manutenção ativo, se disponível
- [ ] Time avisado do rollback em andamento

## 3. Execução
[[LLM: Execute com cuidado e acompanhe.]]
- [ ] Conexão estabelecida com os privilégios adequados
- [ ] Rollback executado em transação única (`psql --single-transaction`)
- [ ] Nenhum erro na execução
- [ ] Transação confirmada (ou desfeita por inteiro em caso de erro)
- [ ] Histórico do Supabase alinhado (`supabase migration repair {versão} --status reverted`), quando revertido por psql

## 4. Validação
[[LLM: Confirme que o rollback funcionou.]]
- [ ] Schema igual ao estado esperado de antes da migration (contagem de objetos, smoke test)
- [ ] Funcionalidades da aplicação restabelecidas
- [ ] Nenhuma corrupção de dados detectada
- [ ] Policies RLS funcionando (`*db-audit`, escopo rls)
- [ ] Consultas críticas com o desempenho esperado

## 5. Recuperação e comunicação
[[LLM: Conclua a recuperação.]]
- [ ] Instâncias da aplicação reiniciadas, se foram paradas
- [ ] Modo de manutenção desativado
- [ ] Envolvidos avisados da conclusão
- [ ] Usuários finais avisados, se necessário
- [ ] Monitoramento confirma operação normal

## 6. Documentação e pós-morte
[[LLM: Aprenda com o incidente.]]
- [ ] Linha do tempo do incidente documentada
- [ ] Causa raiz identificada (se conhecida)
- [ ] Eficácia do procedimento de rollback registrada
- [ ] Melhorias para os próximos rollbacks documentadas
- [ ] Pós-morte agendado, se o incidente foi relevante

## Resultado
| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Avaliação | | |
| 2. Preparação | | |
| 3. Execução | | |
| 4. Validação | | |
| 5. Recuperação e comunicação | | |
| 6. Documentação e pós-morte | | |

[[LLM: Resumo final: o que foi revertido e por quê, estado atual do banco, impacto nos dados, ações de acompanhamento e confirmação de que o sistema está operacional.]]

**Decisão:** seções 1 e 2 sem ❌ liberam a execução. Rollback CONCLUÍDO quando as seções 3 e 4 estão ✅; seções 5 e 6 com ❌ viram pendências registradas no migration-log.
