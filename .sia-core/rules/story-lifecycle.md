---
description: Ciclo de vida da story no SIA (transições de status, executor declarado, validação de 10 pontos, inspeção, 7 verificações do QA gate e quem edita cada seção)
embed: full   # embutida por inteiro no AGENTS.md, GEMINI.md e .grok/rules (as demais entram como resumo)
paths:
  - "docs/stories/**"
  - "docs/qa/**"
---

# Ciclo de Vida da Story

```text
Draft → Ready → InProgress → InReview → Done
```

## Transições

| Transição | Quem | Comando | Condição |
|-----------|------|---------|----------|
| (criação) → `Draft` | `@pm` [Scrum] | `*create-story {epic}` | story criada a partir do epic |
| `Draft` → `Ready` | `@pm` [Product Owner] | `*validate-story {storyId}` | GO (nota ≥ 7/10) |
| `Ready` → `InProgress` | executor declarado | `@dev *develop {storyId}` (padrão), `@devops *develop {storyId}` (infraestrutura) ou `@pm *execute-research-story {storyId}` (pesquisa) | início da execução |
| `InProgress` → `InReview` | executor declarado | o mesmo comando; depois de gate `FAIL`, `@dev *apply-qa-fixes {storyId}` | tasks concluídas; testes e lint passando quando há código |
| (inspeção) | `@validator` | `*revisar-feature {storyId}` | stories que alteram código ou configuração; não muda status |
| `InReview` → `Done` | `@pm` [Qualidade] | `*qa-gate {storyId}` | `PASS`, `CONCERNS` ou `WAIVED` |
| `InReview` → `InProgress` | `@pm` [Qualidade] | `*qa-gate {storyId}` | `FAIL`: volta para correção com pedido de correção |
| (entrega) | `@devops` | `*push`, `*create-pr {storyId}` | só com a story em `Done` |
| (fechamento) | `@pm` [Product Owner] | `*close-story {storyId}` | não muda status |

**Regras críticas:**

- O executor declarado em `## Executor` é o `@dev` [chapéu] por padrão, o `@devops` em stories de infraestrutura (CI/CD, deploy) e o `@pm` [Análise] em stories de pesquisa. Só ele faz `Ready → InProgress → InReview`.
- `Draft → Ready` é do `@pm` [Product Owner] no `*validate-story`. Com GO, inclusive GO condicional depois de correções aplicadas, o status DEVE mudar para `Ready` e a transição DEVE ir para o Change Log. Story em `Draft` depois de GO é violação de processo.
- `InReview → Done` e `InReview → InProgress` são do `@pm` [Qualidade] no `*qa-gate`: status e Change Log atualizados antes de reportar o gate.
- Inspeção `reprovado` antes do gate: o `@dev` corrige com `*apply-qa-fixes`, mantém a story em `InReview` (sem mudar status), acrescenta uma linha no Change Log e pede nova inspeção.
- Gate `FAIL`: a story volta para `InProgress`; depois das correções, o `@dev` a devolve para `InReview`.
- Story de pesquisa (entregável documental) não passa por inspeção: vai direto ao `*qa-gate`.
- O `@validator` nunca muda status. O `@devops` só muda status como executor declarado de story de infraestrutura; push, PR e release começam com a story refletindo o gate.
- Toda transição vai para o `## Change Log`, no formato `| AAAA-MM-DD | @agente [Chapéu] | Status: De → Para. Motivo. |`.
- A primeira linha não vazia depois de `## Status` contém só o valor do status (formato lido pela CLI; guia de autoria, seção 6.2).

## Fase 1: Criar (@pm [Scrum])

Task `create-story.md` (ou `create-brownfield-story.md` em projeto existente sem PRD fragmentado). Entrada: PRD fragmentado e contexto do epic. Saída: `docs/stories/{epic}.{story}-{slug}.story.md` com as seções canônicas (guia de autoria, seção 6.1), o executor declarado e status `Draft`.

## Fase 2: Validar (@pm [Product Owner])

Task `validate-story.md`. Checklist de 10 pontos:

1. Título claro e objetivo
2. Descrição completa (problema ou necessidade explicados)
3. Critérios de aceite testáveis (de preferência Dado/Quando/Então)
4. Escopo bem definido (Dentro e Fora)
5. Dependências mapeadas (stories e recursos pré-requisito)
6. Estimativa de complexidade (pontos ou tamanho)
7. Valor de negócio claro (benefício para o usuário ou para o negócio)
8. Riscos documentados
9. Definição de Pronto clara
10. Alinhamento com o PRD e o epic

**Decisão:** GO com nota ≥ 7/10 (`quality.storyValidation.minScore`); NO-GO abaixo disso, com as correções obrigatórias. Story criada pelo próprio `@pm` [Scrum] passa pelo checklist completo do chapéu Product Owner, sem atalhos.

## Fase 3: Executar (executor declarado)

Task `develop-story.md` (`*develop` do `@dev` ou do `@devops`; `*execute-research-story` do `@pm` [Análise]).

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | 0 a 1 pergunta; decisões em `### Decisões (modo YOLO)` da story | tarefa simples e determinística |
| Interativo (padrão) | 5 a 10 checkpoints de decisão | decisões relevantes, aprendizado |
| Pre-Flight | todas as perguntas antes (10 a 15), plano e execução sem ambiguidade | requisitos ambíguos, trabalho crítico |

Conclusão: todas as tasks `[x]`; com código, testes, lint, typecheck e build passando; File List completa; Definição de Pronto conferida; status `InReview`.

## Fase 4: Inspecionar (@validator)

Para stories que alteram código ou configuração: `*revisar-feature {storyId}` (task `inspect.md`), 7 lentes e relatório em `docs/qa/inspections/` com veredito `aprovado`, `aprovado com ressalvas` ou `reprovado`. Não muda status.

- `aprovado` ou `aprovado com ressalvas` → `@pm *qa-gate {storyId}`
- `reprovado` → `@dev *apply-qa-fixes {storyId}` (story continua em `InReview`) e nova inspeção

Com `quality.inspection.requiredBeforeGate: true`, o gate não sai `PASS` sem o relatório.

## Fase 5: QA gate (@pm [Qualidade])

Task `qa-gate.md`. Sete verificações:

1. **Revisão de código:** padrões, legibilidade, manutenibilidade
2. **Testes unitários:** cobertura adequada, todos passando
3. **Critérios de aceite:** todos atendidos
4. **Sem regressões:** funcionalidade existente preservada
5. **Desempenho:** dentro de limites aceitáveis
6. **Segurança:** básico do OWASP verificado
7. **Documentação:** atualizada quando necessário

O relatório do `@validator` sustenta as verificações 1 (falhas, lógica, arquitetura, código morto), 3 (gaps), 4 (regressão) e 6 (segurança). Conversão de severidade da inspeção para o gate: `bloqueante` e `alto` → `high`; `medio` → `medium`; `baixo` → `low`; `nota` fica fora de `top_issues`.

| Veredito | Quando | Efeito |
|----------|--------|--------|
| `PASS` | todas as verificações OK | `InReview → Done`; segue para o `@devops` |
| `CONCERNS` | problemas menores | `Done`, com as observações registradas |
| `FAIL` | problema de severidade alta, ou achado `bloqueante` da inspeção em aberto | `InReview → InProgress`; pedido de correção |
| `WAIVED` | problemas aceitos conscientemente | `Done`, com o waiver documentado (raro); nunca para achado `bloqueante` |

Formatos do arquivo do gate (`docs/qa/gates/{storyId}-{slug}.yml`) e do bloco `## Resultado do QA`: guia de autoria, seção 6.2. Da iteração 2 em diante, o gate acrescenta `### Revisão (iteração N)` dentro de `## Resultado do QA`; vale a última ocorrência de cada campo.

## QA Loop

`inspeção → gate → correção → nova inspeção`, até 5 iterações (`quality.qaLoop.maxIterations`). Comando: `@pm *qa-loop [start|resume|stop|escalate|status] {storyId}`. Estado em `.sia/qa-loop/{storyId}.json`; o gate registra a iteração no campo `iteration`. Escala para o usuário em `max_iterations_reached`, `verdict_blocked`, `fix_failure` e `manual_escalate`. Detalhes no workflow `qa-loop.yaml`.

## Fases 6 e 7: Entregar e fechar

- `@devops *push` (portão de qualidade e confirmação) e `@devops *create-pr {storyId}`, só com a story em `Done`.
- `@pm *close-story {storyId}`: fechamento administrativo; o status continua `Done`.

## Quem edita cada seção da story

| Seção | Pode editar |
|-------|-------------|
| Título, Story, Critérios de Aceite, Escopo, Dependências, Riscos, Definição de Pronto | `@pm` |
| Status | conforme a tabela de transições |
| Tasks / Subtasks (checkboxes), Dev Notes, Testes, Registro do Dev (inclui a File List) | executor declarado (`@dev` por padrão) |
| Resultado do QA | `@pm` [Qualidade] |
| Change Log | qualquer agente, exceto o `@validator`, só acrescentando linhas |
