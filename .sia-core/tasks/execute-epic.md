---
id: execute-epic
title: Executar epic em ondas
agent: pm
hat: product
elicit: true
modes: [interactive, yolo, preflight]
inputs:
  - 'epic: número do epic (docs/prd/epic-{n}-{slug}.md)'
  - 'ação (opcional): start | continue | status | skip-story {storyId} | abort; padrão: continue se houver plano ativo, senão start'
  - 'mode (opcional): interactive (padrão), yolo ou preflight'
outputs:
  - 'docs/prd/epic-{n}-execution.yaml: plano de ondas e estado da execução, gerenciado pelo @pm'
  - 'Relatório de cada onda e do epic, com o próximo comando'
depends_on:
  workflows: [epic-orchestration.yaml, story-development-cycle.yaml]
next: [status, next]
source: [execute-epic-plan.md, waves.md]
---

# Executar epic em ondas

## Objetivo
Levar todas as stories de um epic pelo ciclo completo, em ondas: stories independentes andam juntas, dependentes esperam e stories que mexem nos mesmos arquivos são serializadas. O estado fica no plano de execução, para retomar em outra sessão.

## Quando usar
- Epic com 4 ou mais stories agrupáveis em ondas, com dependências claras e gates entre os grupos.
- Não use para epic de 1 a 3 stories nem para stories estritamente sequenciais: rode o ciclo da story (`story-development-cycle`) em cada uma.

## Regras
- **Orquestre sem simular.** O `@pm` executa só os próprios comandos (`*create-story`, `*validate-story`, `*qa-gate`), com o chapéu declarado. Os passos de outros agentes são disparados como subagente, quando a IDE suporta, ou indicados ao usuário com o comando exato.
- Push, PR e merge são exclusivos do `@devops` (Constitution, Artigo II).
- Todo trabalho disparado está ligado a uma story válida. Limites (Artigo VIII): QA Loop até `quality.qaLoop.maxIterations` (5) por story; gate da onda até 2 novas tentativas; no máximo 4 stories em paralelo (`max_parallel`).
- Em YOLO com subagentes, registre no plano um teto de orçamento (`budget`) antes do primeiro disparo.

## Pré-condições
- [ ] Epic em `docs/prd/epic-{n}-*.md` com a lista de stories
- [ ] Árvore git limpa (`git status --porcelain` sem alterações rastreadas); senão, peça commit ou stash
- [ ] Para `continue`, `status`, `skip-story` e `abort`: plano existente em `docs/prd/epic-{n}-execution.yaml`

## Formato do plano
```yaml
execution:
  epic: 2
  epic_file: docs/prd/epic-2-login-social.md
  mode: interactive          # interactive | yolo | preflight
  status: planned            # planned | active | completed | aborted
  started_at: ''
  updated_at: ''
  budget: ''                 # teto de orçamento (YOLO com subagentes)
  max_parallel: 4
  current_wave: 1
  critical_path: ['2.1', '2.3', '2.5']
  stories:
    '2.1':
      file: docs/stories/2.1-login-google.story.md   # vazio até a story existir
      title: Login com Google
      depends_on: []
      files: [src/auth/google.ts]                     # File List real ou prevista
      priority: normal       # critical | normal
      branch: feat/2.1-login-google
      phase: create          # create | validate | develop | inspect | qa-gate | push | done
      status: pending        # pending | in_progress | completed | failed | blocked | skipped
      notes: ''
  waves:
    - number: 1
      stories: ['2.1', '2.2']
      parallel: true
      reason: sem dependências entre si; arquivos disjuntos
      status: pending        # pending | in_progress | gate_review | completed | failed
      merge_order: ['2.1', '2.2']
      gate: { verdict: '', report: '', at: '' }
  final_gate: { verdict: '', report: '', at: '' }
  bug_verification: []       # opcional: [{bug, fixed_by, verify, verified}]
```

## Passos

### 1. Ação `start`: montar o plano
1. Liste as stories do epic (seção de stories do epic e arquivos `docs/stories/{n}.*.story.md`). Story prevista sem arquivo entra com `phase: create`.
2. **Dependências:** leia `## Dependências` de cada story (ou a sequência descrita no epic). Dependência de fora do epic precisa estar `Done`; senão, a story fica `blocked`.
3. **Arquivos:** use a `### File List` do Registro do Dev; sem ela, os arquivos previstos nas Dev Notes ou na spec (`docs/stories/{storyId}/spec/spec.md`). Sem informação, a lista fica vazia e conta como sem conflito (com alerta no modo preflight).
4. **DAG:** monte o grafo e procure ciclos. Ciclo encontrado: mostre-o (`2.1 → 2.3 → 2.1`), sugira qual dependência remover e pare.
5. **Ondas por nível:** cada story entra na primeira onda em que todas as dependências já estão em ondas anteriores.
6. **Serialização por arquivos:** dentro de cada onda, em ordem de prioridade e de storyId, mantenha a story se os arquivos dela não se sobrepõem aos das já mantidas; as outras descem para a onda seguinte. Respeite `max_parallel`.
7. **Caminho crítico:** a maior cadeia de dependências. Grave o plano com `status: planned`.
8. Mostre o plano:
```text
=== Plano do Epic 2: Login social ===
Stories: 5 em 3 ondas · Modo: interactive
Onda 1 (paralela): 2.1, 2.2
Onda 2 (paralela): 2.3 (depende de 2.1), 2.4 (movida: divide src/auth/session.ts com 2.2)
Onda 3: 2.5 (depende de 2.3)
Caminho crítico: 2.1 → 2.3 → 2.5
```
9. **Preflight:** liste os arquivos por onda, as sobreposições, as stories sem File List e a cadeia de dependências antes de perguntar.
10. **Ponto de elicitação** (interactive e preflight): 1. Executar o plano; 2. Ajustar ordem, dependências ou prioridade; 3. Só gravar o plano. YOLO segue direto.
11. Marque `status: active` e `started_at` e execute a onda 1 (passo 3).

### 2. Ação `continue`: retomar
1. Carregue o plano; ele precisa estar `active`.
2. Releia o status de cada story no arquivo (fonte da verdade) e corrija `phase` e `status` no plano, avisando das divergências.
3. Retome:

| Estado encontrado | Retomada |
|-------------------|----------|
| onda `in_progress` | continue as stories não concluídas (passo 3) |
| onda `gate_review` | conclua o gate da onda (passo 4) |
| onda `completed` | avance para a próxima onda |
| todas as ondas concluídas | gate final (passo 6) |

### 3. Executar a onda
Marque a onda `in_progress`. Rode as stories em paralelo (até `max_parallel`) quando `parallel: true` e a IDE suportar subagentes; senão, uma de cada vez. Cada story passa pelo ciclo completo:

| Fase | Agente | Comando | Concluída quando |
|------|--------|---------|------------------|
| create | `@pm` [Scrum] | `*create-story {n}` | story criada em `Draft` |
| validate | `@pm` [Product Owner] | `*validate-story {storyId}` | GO; status `Ready` |
| develop | `@dev` | `*develop {storyId}` (modo do plano) | status `InReview` |
| inspect | `@validator` | `*revisar-feature {storyId}` | relatório gravado em `docs/qa/inspections/` |
| qa-gate | `@pm` [Qualidade] | `*qa-gate {storyId}` | `PASS`, `CONCERNS` ou `WAIVED`; status `Done` |
| push | `@devops` | `*push` e `*create-pr {storyId}` | branch e PR no remoto |

- Com a CLI: `sia sdc plan {storyId} --mode {modo}`, `sia sdc next {storyId}` e `sia sdc verify {storyId} {fase} --mark` para conferir cada fase.
- NO-GO na validação: ajuste a story (chapéu Scrum) e valide de novo.
- Gate `FAIL`: `@dev *apply-qa-fixes {storyId}` → nova inspeção → novo gate, até o limite do QA Loop. No limite, a story vira `failed`.
- Stories paralelas trabalham cada uma na própria branch. Peça worktrees isoladas ao `@devops` (`*worktree create {storyId}`); sem isolamento possível, execute em sequência.
- Atualize `phase`, `status` e `updated_at` no plano depois de cada fase.

Prompt do subagente:
```text
Ative o agente definido em .sia-core/agents/{agente}.md e execute: *{comando} {args}
Story: {arquivo} · Epic {n}, onda {N} de {total} · Branch: {branch}
Não faça git push nem PR (exclusivos do @devops), a menos que você seja o @devops.
Ao terminar, informe: status da story, arquivos alterados, testes executados e o caminho do relatório ou do gate.
```
Sem subagentes: mostre o comando ao usuário e pare com "Quando concluir, rode `@pm *execute-epic {n} continue`".

**Falhas:** a story com falha vira `failed` e as que dependem dela, em ondas seguintes, viram `blocked`. **Ponto de elicitação:** 1. Tentar de novo as stories com falha; 2. Seguir para o gate da onda com resultado parcial; 3. Abortar o epic.

### 4. Gate da onda
1. Marque a onda `gate_review`.
2. Inspeção de integração pelo `@validator`: `*revisar-feature epic-{n}`, com as stories da onda como escopo. Foco: compatibilidade entre as stories, conflitos de arquivos entre branches, suíte completa de testes com tudo junto, regressões das mudanças paralelas e consistência de arquitetura.
3. Veredito: `aprovado` ou `aprovado com ressalvas` → APPROVED; `reprovado` → REJECTED. Registre `gate` na onda.
4. APPROVED: o `@devops` integra as branches ou PRs na ordem de `merge_order`, resolve conflitos e roda a suíte completa no resultado.
5. REJECTED: mostre os problemas e pergunte: 1. Corrigir (`@dev *apply-qa-fixes` nas stories afetadas) e repetir o gate, até 2 vezes; 2. Aceitar com justificativa registrada no plano; 3. Abortar. Esgotadas as tentativas, escale ao usuário.
6. Desvio de arquitetura apontado na inspeção: `@dev` [Arquitetura] decide e registra ADR.

### 5. Checkpoint entre ondas
Marque a onda `completed` e grave o plano.
- **Interativo:**
```text
=== Onda 1 concluída ===
Stories: 2/2 · Gate: APPROVED (docs/qa/inspections/2026-10-16-1530-revisar-feature-epic-2.md)
Próxima: onda 2 com 2.3 e 2.4
```
Pergunte: 1. GO: seguir para a próxima onda; 2. PAUSE: gravar e parar; 3. REVIEW: ver o resumo detalhado da onda e decidir depois; 4. ABORT: encerrar o epic.
- **YOLO:** segue direto para a próxima onda; para só em falha ou gate reprovado.

### 6. Gate final do epic
1. `@validator *revisar-feature epic-{n}` sobre o epic inteiro.
2. Com `bug_verification` no plano, confira cada bug (corrigido por qual story, como verificar) e registre o resultado.
3. Aprovado: `status: completed` no plano e status concluído no arquivo do epic. Ofereça uma retrospectiva curta, se o usuário quiser.
4. Mostre o relatório final (ondas, stories, gates, branches, pendências).

### 7. Ação `status`
Mostre o andamento sem executar nada, relendo o status das stories nos arquivos:
```text
=== Epic 2: status ===
Plano: docs/prd/epic-2-execution.yaml · Modo: interactive · Status: active
Progresso: onda 2 de 3

[x] Onda 1: 2/2 stories · Gate: APPROVED
    [x] 2.1 Login com Google (feat/2.1-login-google)
    [x] 2.2 Tela de login (feat/2.2-tela-login)
[>] Onda 2: 1/2 stories  ← atual
    [x] 2.3 Vincular contas
    [>] 2.4 Sessão persistente: develop
[ ] Onda 3: 0/1 stories

Próximo: @pm *execute-epic 2 continue
```

### 8. Ação `skip-story {storyId}`
Só para story da onda atual com `priority` diferente de `critical`. Marque `skipped` com o motivo; as dependentes viram `blocked`. Se o resto da onda estiver concluído, siga para o gate da onda.

### 9. Ação `abort`
Marque `status: aborted`, grave o plano e mostre:
```text
=== Epic 2 abortado ===
Progresso: onda 2 de 3 · Concluídas: onda 1 (2 stories)
Em andamento: 2.4 na branch feat/2.4-sessao (pode haver trabalho não commitado)
Branches criadas: feat/2.1-login-google, feat/2.2-tela-login, feat/2.4-sessao
Plano preservado em docs/prd/epic-2-execution.yaml
Para retomar: @pm *execute-epic 2 continue
```

## Saída
`docs/prd/epic-{n}-execution.yaml` atualizado depois de cada ação significativa (início de onda, fase concluída, gate, checkpoint), mais o relatório da ação no chat com o próximo comando.

## Critérios de conclusão
- [ ] Plano gravado com DAG sem ciclos e serialização por arquivos aplicada
- [ ] Cada story concluída passou por create → validate → develop → inspect → qa-gate → push
- [ ] Gate de integração registrado em cada onda e gate final no epic
- [ ] Plano permite retomar em outra sessão com `continue`
- [ ] Nenhum push, PR ou merge feito fora do `@devops`

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Ciclo de dependências | Pare, mostre o ciclo e sugira a correção |
| Árvore git com alterações | Peça commit ou stash antes de começar |
| Story falha | `failed`, dependentes `blocked` e opções do passo 3 |
| Gate da onda reprovado | Correção e novo gate (até 2 vezes), depois escalar |
| Conflito de merge | Siga `merge_order`; o `@devops` resolve e roda os testes de novo |
| Plano diverge do status real das stories | Vale o arquivo da story; atualize o plano e avise |
| IDE sem subagentes | Execute em sequência, indicando cada comando ao usuário |

## Handoff
- Durante a execução: o comando da fase seguinte de cada story (passo 3) ou `@pm *execute-epic {n} continue`.
- Ao final: `@pm *status` para o panorama do projeto.
