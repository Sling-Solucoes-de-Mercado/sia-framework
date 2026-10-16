---
id: apply-qa-fixes
title: Aplicar correções do QA
agent: dev
hat: dev
elicit: false
inputs:
  - 'storyId (obrigatório): id da story, ex.: 2.1'
  - 'gate (opcional): caminho do arquivo do gate; se ausente, usa o campo "Arquivo do gate" da story'
outputs:
  - 'Correções com testes, em commits locais fix: ... [Story {storyId}]'
  - 'Story com "Correções do QA (iteração N)" nas Notas de conclusão, File List, Log de debug e linha no Change Log'
  - 'Status InReview (a story volta de InProgress quando o gate foi FAIL)'
  - 'Handoff em .sia/handoffs/ para @validator *revisar-feature {storyId}'
depends_on:
  templates: [agent-handoff-tmpl.yaml]
next: [revisar-feature, qa-gate]
source: [apply-qa-fixes.md, dev-apply-qa-fixes.md, qa-fix-issues.md]
---

# Aplicar correções do QA

## Objetivo

Corrigir, com testes e de forma mínima, os achados do QA gate e da inspeção do `@validator`, e devolver a story para nova inspeção e novo gate, sem nunca se autoaprovar.

## Quando usar

- Gate `FAIL`: o `@pm` [Qualidade] devolveu a story para `InProgress` com `### Pedido de correção (iteração N)` em `## Resultado do QA`.
- Inspeção `reprovado` do `@validator` antes do gate: a story continua em `InReview` e o handoff do `@validator` aponta para cá.
- Não use para: gate `CONCERNS` ou `WAIVED` (a story já está `Done`; não a reabra: registre os itens com `*tech-debt` ou peça uma story de follow-up ao `@pm`), mudança de escopo ou achado fora do pedido.

## Regras

- Corrija SÓ o que está na lista de correções (passo 2). Nada de refatorar "aproveitando", adicionar funcionalidade ou corrigir achado não listado.
- Mudança mínima, na causa raiz e não no sintoma. Siga os padrões do código; comente a correção quando ela não for óbvia.
- Toda correção vem com teste que reproduz o defeito (falha antes, passa depois) ou com o ajuste do teste, quando o defeito estava no próprio teste.
- Não edite `## Resultado do QA` (é do `@pm` [Qualidade]), o arquivo do gate nem o relatório de inspeção.
- Nunca se autoaprove: não mude o status para `Done`, não declare o gate aprovado e não dispense a nova inspeção.

Tipos comuns de achado:

| Tipo | Exemplos | Como corrigir |
|------|----------|---------------|
| Qualidade de código | erro de lint, tratamento de erro ausente, import ou variável sem uso, função complexa | Corrija no ponto citado; refatore só se o pedido mandar |
| Testes | caso ausente, teste falhando, cobertura insuficiente, teste instável | Escreva ou ajuste o teste; estabilize sem `.skip` |
| Documentação | comentário ausente, documentação ou README desatualizado, story incompleta | Atualize o trecho citado |
| Arquitetura | desvio de padrão, dependência indevida, desempenho, vulnerabilidade | Correção mínima; se for estrutural, escale ao `@pm` (e ADR com `*create-adr`) |

## Pré-condições

- [ ] Story encontrada em `docs/stories/{storyId}-*.story.md` com status `InProgress` (gate FAIL) ou `InReview` (inspeção reprovada).
- [ ] Ao menos uma fonte de achados: `### Pedido de correção (iteração N)`, arquivo do gate em `docs/qa/gates/` ou relatório em `docs/qa/inspections/`.
- [ ] Trabalho na branch da story, nunca em `main`/`master`.

## Passos

### 1. Carregar o contexto

1. **Story:** em `## Resultado do QA`, leia os campos Gate, Arquivo do gate e Inspeção, e a última subseção `### Pedido de correção (iteração N)` (a de maior N vale).
2. **Gate:** `docs/qa/gates/{storyId}-{slug}.yml`, pelo argumento, pelo campo "Arquivo do gate" ou por `docs/qa/gates/{storyId}-*.yml`. Use `gate`, `status_reason`, `iteration`, `top_issues` (`id`, `severity`, `category`, `finding`, `suggested_action`), `nfr_validation` e `recommendations`. Não encontrado por nenhum caminho: pergunte o caminho ao usuário.
3. **Inspeção:** o relatório mais recente em `docs/qa/inspections/` com `story: '{storyId}'` no frontmatter (ou o do campo Inspeção). Use `verdict`, `findings` e a lista de achados (id, severidade, arquivo e linha, evidência, correção sugerida).
4. Defina o cenário:

| Cenário | Status na entrada | Fonte principal | Status ao final |
|---------|-------------------|-----------------|-----------------|
| A. Gate FAIL | `InProgress` | Pedido de correção (iteração N) e `top_issues` | `InReview` |
| B. Inspeção reprovada, sem gate | `InReview` | Relatório do `@validator` | `InReview` (mantido) |

### 2. Montar a lista de correções

1. Para cada item, registre: id (do pedido, de `top_issues` ou do achado), descrição, severidade, arquivo e local, critério de aceite afetado, verificação pedida, abordagem e status (`pendente` → `corrigido` → `verificado`).
2. Junte num item só o mesmo defeito citado em mais de uma fonte.
3. Escopo obrigatório:
   - Cenário A: todos os itens do pedido de correção. O que estiver só no gate ou no relatório fica de fora.
   - Cenário B: achados `bloqueante` e `alto`; `medio` entra se a correção for local e mínima; `baixo` e `nota` ficam de fora.
4. Ordene do mais grave para o menos grave na escala de cada fonte (pedido: CRITICAL > MAJOR > MINOR, ou a escala que ele usar; gate: `high` > `medium` > `low`; inspeção: `bloqueante` > `alto` > `medio`). Agrupe itens que se corrigem juntos.
5. Nenhum item extraído: PARE com `Nada a corrigir: a story pode já estar passando.`

### 3. Preparar o ambiente

1. Confirme a branch da story (`feat/{storyId}-{slug}` ou `fix/{storyId}-{slug}`). Em `main`/`master`, troque antes de qualquer mudança.
2. `git status` limpo ou só com mudanças esperadas; caso contrário, pergunte como seguir.
3. Registre no `### Log de debug`: commit de partida, iteração e caminhos do gate e do relatório.

### 4. Corrigir em ordem de prioridade

Para cada item da lista:

1. Leia o arquivo e localize o defeito.
2. Escreva ou ajuste o teste que reproduz o defeito.
3. Aplique a correção mínima e marque o item como `corrigido` (`Corrigido {id}: {descrição}`).

- Defeito não localizado: registre "não localizado (talvez já corrigido)" e siga para o próximo.
- Correção exige mudança além do mínimo (refatoração ampla, mudança de escopo ou de critério): não corrija; marque `não corrigido: exige escopo maior` e leve ao `@pm` (expandir o escopo ou criar story de follow-up).

### 5. Rodar os gates

Rode todos os `quality.scripts` do core-config: `lint`, `typecheck`, `test` (suíte completa, não só os testes afetados) e `build`. Script ausente: registre, não invente. Falha: volte ao passo 4. Na terceira rodada com falha, PARE e escale: "as correções quebraram testes; revise a abordagem".

### 6. Autoverificação

Execute TODAS as verificações pedidas (no pedido de correção, nas `suggested_action` do gate e nas correções sugeridas do relatório) e registre o resultado de cada uma:

| Tipo | Exemplo |
|------|---------|
| `command` | `npm run lint -- --quiet` |
| `api` | `curl -X GET http://localhost:3000/api/health` |
| `browser` | conferir com Playwright que o formulário de login renderiza |
| `e2e` | `npm run test:e2e -- --grep "auth"` |
| `manual` | conferir o alinhamento do botão e anotar o observado |

Verificação falhou: volte ao passo 4 (no máximo 3 rodadas; depois, PARE e reporte). Item verificado: marque `verificado`.

### 7. Commit

`git add` só dos arquivos das correções e da story. Nunca faça push.

```text
fix: corrige achados do QA, iteração {N} [Story {storyId}]

- {id}: {descrição}
- {id}: {descrição}
```

### 8. Atualizar a story e sinalizar

1. Em `### Notas de conclusão`, acrescente o bloco `#### Correções do QA (iteração N)`:

   ```markdown
   #### Correções do QA (iteração 1)
   Fontes: docs/qa/gates/2.1-login-social.yml; docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md
   - [x] 1 (CRITICAL) Validação ausente em parseStoryId (commit 7b2d9e0)
   - [x] 2 (MAJOR) Mensagem de erro sem contexto (commit 7b2d9e0)
   - [ ] 3 (MAJOR) Regressão de desempenho: exige refatorar a camada de dados, fora do escopo mínimo → @pm
   Verificações: ✅ npm test; ✅ entrada nula retorna erro tratado
   ```

2. Atualize `### File List` e `### Log de debug`.
3. Status e `## Change Log`:
   - Cenário A: `InProgress` → `InReview`, com `| {AAAA-MM-DD} | @dev | Status: InProgress → InReview. Correções do QA aplicadas (iteração {N}). |`
   - Cenário B: status mantido, com `| {AAAA-MM-DD} | @dev | Correções da inspeção aplicadas ({relatório}); status mantido em InReview. |`
4. Grave o handoff `.sia/handoffs/handoff-dev-para-validator-{AAAAMMDD-HHmmss}.yaml` com os campos de `templates/agent-handoff-tmpl.yaml`, `last_command: apply-qa-fixes`, `consumed: false` e `next_action: @validator *revisar-feature {storyId}`.
5. Apresente o resumo e PARE.

A iteração vem do pedido ou do campo `iteration` do gate. O limite do QA Loop (`quality.qaLoop.maxIterations`, padrão 5) e a escalação são do `@pm`; se esta for a última iteração permitida e restar item não corrigido, deixe isso explícito no resumo.

## Saída

- Correções e testes em commits locais `fix: ... [Story {storyId}]`.
- Story com o bloco `Correções do QA (iteração N)`, File List e Log de debug atualizados, linha no Change Log e status conforme o cenário.
- Handoff para o `@validator`.
- Resumo:

```text
Correções do QA: story 2.1, iteração 1
Itens corrigidos: 2/3 · Commit: 7b2d9e0 · Status: InReview
- ✅ 1 (CRITICAL) validação ausente em parseStoryId
- ✅ 2 (MAJOR) mensagem de erro sem contexto
- ⚠️ 3 (MAJOR) exige escopo maior → decisão do @pm
Verificações: ✅ npm test · ✅ entrada nula tratada
Próximo: @validator *revisar-feature 2.1 → @pm *qa-gate 2.1
```

## Critérios de conclusão

- [ ] Todos os itens obrigatórios corrigidos e verificados, ou marcados "não corrigido" com motivo e escalados ao `@pm`
- [ ] Teste para cada correção
- [ ] Scripts existentes de `quality.scripts` passando; ausentes registrados
- [ ] Nenhuma mudança fora da lista de correções
- [ ] Commits locais `fix: ... [Story {storyId}]`, sem push
- [ ] Story com `Correções do QA (iteração N)`, File List e Change Log; status conforme o cenário
- [ ] `## Resultado do QA`, gate e relatório intocados
- [ ] Handoff gravado para o `@validator`

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nenhuma fonte de achados | PARE: rode antes `@validator *revisar-feature {storyId}` ou `@pm *qa-gate {storyId}` |
| Arquivo do gate não encontrado | Pergunte o caminho ao usuário |
| Pedido sem itens | PARE: nada a corrigir |
| Story `Done` (gate CONCERNS ou WAIVED) | Não reabra; use `*tech-debt` ou peça story de follow-up ao `@pm` |
| Status diferente de `InProgress`/`InReview` | PARE e informe o status encontrado |
| Defeito não localizado | Registre e siga |
| Correção exige escopo maior | Não corrija; marque e escale ao `@pm` |
| Mudança fora da lista detectada | Desfaça a mudança extra (sem scope creep) |
| Testes falham após as correções (3 rodadas) | PARE e escale com o diagnóstico |
| Verificação continua falhando (3 rodadas) | PARE e reporte |

## Handoff

Próximo passo: `@validator *revisar-feature {storyId}` (nova inspeção) e, com o relatório, `@pm *qa-gate {storyId}` (novo gate). Item escalado: o `@pm` decide entre expandir o escopo e criar uma story de follow-up.
