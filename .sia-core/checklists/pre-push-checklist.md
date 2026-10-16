# Checklist: Pré-push

> Usado por: `@devops` em `*pre-push` (e no `*push`, que roda o pre-push antes de enviar).
> Modo: YOLO (relatório completo de uma vez, padrão dentro do `*push`) ou interativo (item a item, quando o `*pre-push` é chamado avulso).

[[LLM: INICIALIZAÇÃO
1. Antes de avaliar, execute os passos 1 a 5 de `tasks/pre-push.md` e tenha em mãos as evidências: saída de cada script, resultado da varredura de segredos, status da story, bloco `## Resultado do QA`, arquivo do gate e relatórios de inspeção.
2. Marque cada item como [x] cumprido, [ ] não cumprido ou [N/A] não se aplica. Todo item não cumprido ou N/A leva uma observação curta com o motivo.
3. Itens (BLOCK) reprovam o portão quando não cumpridos. Itens (WARN) viram CONCERNS.
4. Nunca marque um item como cumprido sem evidência (saída de comando ou arquivo lido).
5. Script ausente em `quality.scripts` não reprova: registre como AUSENTE.
6. Ao final, preencha a tabela de resultado e aplique a regra de decisão. Código quebrado no remoto afeta o time inteiro: na dúvida, não aprove.]]

## 1. Estado do git
- [ ] (BLOCK) Árvore de trabalho limpa: `git status --porcelain` sem saída
- [ ] (BLOCK) Sem marcadores de conflito nem erros de espaço no intervalo: `git diff --check` sem saída
- [ ] (BLOCK) Não é force push na branch de produção nem na branch padrão
- [ ] (WARN) Branch atualizada com a base (nenhum commit da base faltando)
- [ ] (WARN) Mensagens de commit no formato Conventional Commits

## 2. Qualidade (`quality.scripts` do core-config)
- [ ] (BLOCK) `lint` passa sem erros (ou AUSENTE)
- [ ] (BLOCK) `typecheck` passa sem erros (ou AUSENTE)
- [ ] (BLOCK) `test` passa sem falhas (ou AUSENTE)
- [ ] (BLOCK) `build` completa com sucesso (ou AUSENTE)
- [ ] (WARN) Nenhum teste pulado sem motivo documentado
- [ ] (WARN) Nenhum `console.log`, `debugger` ou bloco de código comentado novo no diff

## 3. Segurança
- [ ] (BLOCK) Varredura de segredos no diff sem achados (ou falsos positivos confirmados pelo usuário)
- [ ] (BLOCK) Nenhum `.env`, `.env.local` ou `.env.*.local` no diff ou rastreado pelo git
- [ ] (BLOCK) Nenhum segredo em variável pública (`NEXT_PUBLIC_*` ou prefixo público equivalente do bundler)
- [ ] (BLOCK) `npm audit` sem vulnerabilidade crítica
- [ ] (WARN) `npm audit` sem vulnerabilidade alta
- [ ] (WARN) Nenhum dado sensível em logs ou mensagens de erro novas

## 4. Story e QA gate (trabalho de story)
- [ ] (BLOCK) Story da branch identificada (ou N/A confirmado: diff sem código de produto)
- [ ] (BLOCK) Status da story `Done`
- [ ] (BLOCK) Última linha `- **Gate:**` de `## Resultado do QA` com `PASS`, `CONCERNS` ou `WAIVED`, coerente com o arquivo do gate
- [ ] (BLOCK) Linha `- **Inspeção:**` presente quando `quality.inspection.requiredBeforeGate` é `true`
- [ ] (BLOCK) Nenhum relatório de inspeção da story com `verdict: reprovado` posterior ao `updated` do gate
- [ ] (WARN) Nenhum commit fora de `docs/stories/` e `docs/qa/` depois da `Revisão` avaliada pelo gate
- [ ] (WARN) File List da story cobre os arquivos do diff (sem escopo extra)

## 5. Documentação
- [ ] (WARN) README e docs atualizados quando a mudança altera uso, configuração ou API
- [ ] (WARN) Breaking changes documentadas (e título de PR com `!` previsto)

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Estado do git | | |
| 2. Qualidade | | |
| 3. Segurança | | |
| 4. Story e QA gate | | |
| 5. Documentação | | |

[[LLM: RESUMO FINAL
1. Resuma o que será enviado (branch, commits, story).
2. Liste cada item não cumprido com a ação recomendada e o agente responsável (@dev para código, @pm para status e gate, @validator para inspeção).
3. Aplique a decisão abaixo e devolva o veredito para a task.]]

**Decisão:** `FAIL` se qualquer item (BLOCK) não for cumprido: o push fica bloqueado. `CONCERNS` se só itens (WARN) falharem: o push exige confirmação explícita do usuário. `PASS` se todos os itens forem cumpridos ou N/A com motivo.
