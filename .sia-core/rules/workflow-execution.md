---
description: Workflows do SIA (SDC, QA Loop, Spec Pipeline, Brownfield Discovery, orquestração de epic, greenfield e brownfield) e guia de seleção
---

# Execução de Workflows

## Task-first

Workflows encadeiam tasks, não agentes. Cada task define entradas, saídas, pré-condições e modos de execução; o agente indicado é o executor padrão, mas a sequência, as regras e as dependências vêm das tasks em `.sia-core/tasks/`. Uma task validada é lei: execute-a como está escrita, com todas as dependências, seja quem for o executor (agente, subagente ou pessoa).

**Como conduzir:** `@pm *run-workflow {workflow} [start|continue|status|skip|abort]` executa passo a passo, com estado em `.sia/workflows/`; `*next` sugere o próximo comando. Cada etapa concluída grava um handoff (regra `agent-handoff`), e a saudação do agente seguinte sugere o passo a partir de `data/workflow-chains.yaml`. Passos de correção ficam antes da etapa que os aciona, com `condition`: o primeiro passe os pula, e o `on_failure` (`goto`) os ativa.

## 1. Ciclo de Desenvolvimento de Story (SDC): principal

Workflow `story-development-cycle.yaml`. Toda story passa por ele.

| Fase | Agente | Comando | Task | Resultado |
|------|--------|---------|------|-----------|
| 1. Criar | `@pm` [Scrum] | `*create-story {epic}` | `create-story.md` | `Draft` |
| 2. Validar | `@pm` [Product Owner] | `*validate-story {storyId}` | `validate-story.md` | GO (≥ 7/10) → `Ready`; NO-GO → ajustes |
| 3. Executar | executor declarado | `@dev *develop {storyId}` (padrão), `@devops *develop {storyId}` (infraestrutura), `@pm *execute-research-story {storyId}` (pesquisa) | `develop-story.md` | `Ready → InProgress → InReview` |
| 4. Inspecionar | `@validator` | `*revisar-feature {storyId}` | `inspect.md` | relatório; não muda status (só stories com código ou configuração) |
| 5. QA gate | `@pm` [Qualidade] | `*qa-gate {storyId}` | `qa-gate.md` | PASS, CONCERNS, WAIVED → `Done`; FAIL → `InProgress` |
| 3b. Corrigir | `@dev` | `*apply-qa-fixes {storyId}` | `apply-qa-fixes.md` | volta para a inspeção |
| 6. Entregar | `@devops` | `*push`, `*create-pr {storyId}` | `push.md`, `create-pr.md` | só com `Done` |
| 7. Fechar | `@pm` [Product Owner] | `*close-story {storyId}` | `close-story.md` | status continua `Done` |

- Inspeção `reprovado` vai direto para a correção: a story continua em `InReview` e o `@dev` registra a correção no Change Log antes da nova inspeção. Gate `FAIL`: a story volta para `InProgress` e o `@dev` a devolve para `InReview` depois das correções.
- Story de pesquisa não passa por inspeção: vai direto ao gate.
- Modos do `*develop`: yolo, interactive (padrão) e preflight.
- Acompanhamento pela CLI: `sia sdc plan {storyId}`, `sia sdc next {storyId}`, `sia sdc verify {storyId} {fase}` (fases `create`, `validate`, `develop`, `inspect`, `qa-gate` e `push`) e `sia sdc status {storyId}`.

## 2. QA Loop: revisão iterativa

Workflow `qa-loop.yaml`, comando `@pm *qa-loop [start|resume|stop|escalate|status] {storyId}`, estado em `.sia/qa-loop/{storyId}.json`.

```text
@validator *revisar-feature → @pm *qa-gate (pelo loop) → (FAIL) @dev *apply-qa-fixes → @pm *qa-loop resume → nova inspeção
```

- Máximo de 5 iterações (`quality.qaLoop.maxIterations`). O gate grava a iteração no campo `iteration` e, da iteração 2 em diante, `### Revisão (iteração N)` em `## Resultado do QA`.
- No loop, o gate roda depois de toda inspeção, inclusive reprovada; o FAIL já grava o pedido de correção.
- Etapa de outro agente sem subagente: o `@pm` indica o comando e espera o `resume`.
- Termina com PASS, CONCERNS ou WAIVED.
- Escala para o usuário em: `max_iterations_reached`, `verdict_blocked` (o gate depende de decisão humana), `fix_failure` (correção não aplicada depois de 2 tentativas) e `manual_escalate`.

## 3. Spec Pipeline: antes da implementação

Workflow `spec-pipeline.yaml`. Saídas em `docs/stories/{storyId}/spec/`.

| Fase | Agente | Comando | Saída | Pula se |
|------|--------|---------|-------|---------|
| 1. Levantar | `@pm` [Produto] | `*gather-requirements {storyId}` | `requirements.json` | nunca |
| 2. Avaliar | `@dev` [Arquitetura] | `*assess-complexity {storyId}` | `complexity.json` | origem declarada simples |
| 3. Pesquisar | `@pm` [Análise] | `*research-deps {storyId}` | `research.json` | classe SIMPLE |
| 4. Escrever | `@pm` [Produto] | `*write-spec {storyId}` | `spec.md` | nunca |
| 5. Criticar | `@pm` [Qualidade] | `*critique-spec {storyId}` | `critique.json` | nunca |
| 6. Planejar | `@dev` [Arquitetura] | `*create-plan {storyId}` | `implementation.yaml` | só roda com APPROVED (STANDARD ou COMPLEX) |

**Classes** (5 dimensões de 1 a 5: escopo, integração, infraestrutura, conhecimento e risco):

| Pontuação | Classe | Fases |
|-----------|--------|-------|
| ≤ 8 | SIMPLE | levantar → escrever → criticar (3) |
| 9 a 15 | STANDARD | as 6 fases |
| ≥ 16 | COMPLEX | as 6 fases mais o ciclo de revisão (revisar e segunda crítica) |

**Vereditos da crítica:**

| Veredito | Média | Próximo passo |
|----------|-------|---------------|
| APPROVED | ≥ 4.0 | planejar (fase 6) |
| NEEDS_REVISION | 3.0 a 3.9 | revisar a spec (até 2 vezes) |
| BLOCKED | < 3.0 | parar e escalar para o `@dev` [Arquitetura] |

**Gate constitucional (Artigo IV):** toda afirmação da spec rastreia para FR-*, NFR-*, CON-* ou achado de pesquisa. Nada inventado. Depois do pipeline, a story segue no SDC.

## 4. Brownfield Discovery: avaliação de legado

Workflow `brownfield-discovery.yaml`, 10 fases.

| Fase | Agente | Saída |
|------|--------|-------|
| 1 | `@dev` [Arquitetura] `*document-project` | `docs/brownfield-architecture.md` |
| 2 | `@dev` [Dados] `*db-audit` (se houver banco) | `supabase/docs/SCHEMA.md`, `supabase/docs/DB-AUDIT.md` |
| 3 | `@dev` [UX/UI] `*create-front-end-spec` | `docs/front-end-spec.md` |
| 4 | `@dev` [Arquitetura] | `docs/prd/technical-debt-draft.md` |
| 5 | `@dev` [Dados] | `docs/reviews/db-specialist-review.md` |
| 6 | `@dev` [UX/UI] | `docs/reviews/ux-specialist-review.md` |
| 7 | `@validator` `*revisar-todo repositório` e `@pm` [Qualidade] | relatório de inspeção e `docs/reviews/qa-review.md` (APPROVED ou NEEDS WORK) |
| 8 | `@dev` [Arquitetura] | `docs/prd/technical-debt-assessment.md` |
| 9 | `@pm` [Análise] | `docs/reports/technical-debt-report.md` |
| 10 | `@pm` `*create-epic` e `*create-brownfield-story` | epic e stories em `Draft` |

Gate da fase 7: APPROVED (débitos validados, nenhuma lacuna crítica, dependências mapeadas) segue para a fase 8; NEEDS WORK volta para a fase 4. As fases 5 e 6 são do mesmo agente com outro chapéu: o chapéu é declarado e aplicado sem atalhos; a inspeção do `@validator` é a revisão independente.

## 5. Orquestração de Epic

Workflow `epic-orchestration.yaml`, comando `@pm *execute-epic {epic} [start|continue|status|skip-story {storyId}|abort] [--mode=interactive|yolo|preflight]`. Plano e estado em `docs/prd/epic-{n}-execution.yaml`.

- Ondas montadas por dependência; stories que mexem nos mesmos arquivos são serializadas; até 4 em paralelo por onda.
- Cada story pelo SDC (o `*execute-epic` cria as que faltam). No fim da onda, `@validator *revisar-feature epic-{epic}` revisa a integração (até 2 novas tentativas depois de reprovar) e o `@devops` integra as branches na ordem do plano.
- Entre ondas, checkpoint do `@pm`: GO, PAUSE, REVIEW ou ABORT (modo yolo: GO automático). Depois da última onda, gate final do `@validator` sobre o epic inteiro.
- Retomar: `@pm *execute-epic {epic} continue`.

## 6. Greenfield e Brownfield

- `greenfield.yaml`: produto novo, com `project_type` fullstack, service ou ui. Ambiente → brief → PRD → especificação de UI (fullstack e ui) → arquitetura do tipo → `*po-checklist` → fragmentação → SDC de cada story.
- `brownfield.yaml`: evolução de sistema existente, com o mesmo `project_type`. Classificação inicial: story única (`*create-brownfield-story`), funcionalidade pequena (`*create-epic`) ou evolução grande (análise, PRD brownfield, arquitetura, `*po-checklist`, fragmentação e SDC).

## Guia de seleção

| Situação | Workflow |
|----------|----------|
| Nova story de um epic | SDC |
| Inspeção reprovada ou gate FAIL que pede várias voltas | QA Loop |
| Feature complexa ou requisito informal | Spec Pipeline → SDC |
| Epic com 4 ou mais stories em ondas | Orquestração de Epic |
| Produto novo do zero | Greenfield |
| Evolução de sistema existente | Brownfield |
| Entrada em projeto existente ou avaliação de débito técnico | Brownfield Discovery |
| Bug simples ou hotfix | SDC em modo yolo |
| Pesquisa com entregável documental | SDC com `@pm *execute-research-story`, sem inspeção |
