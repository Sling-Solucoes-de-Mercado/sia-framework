---
id: run-workflow
title: Conduzir workflow
agent: pm
hat: product
elicit: true
modes: [interactive, yolo]
inputs:
  - 'workflow: id do workflow em .sia-core/workflows/ (ou em squads/{nome}/workflows/ com --squad={nome})'
  - 'ação (opcional): start | continue | status | skip | abort; padrão: continue se houver instância ativa, senão start'
  - 'mode (opcional): interactive (padrão) ou yolo'
  - 'contexto (opcional): entradas do workflow (ex.: storyId, project_type)'
outputs:
  - '.sia/workflows/{workflow-id}-{AAAAMMDD-HHmm}.yaml com o estado da instância'
  - 'Instruções do passo atual: agente, comando, notas e critérios de sucesso'
depends_on: {}
next: [next, status]
source: [run-workflow.md]
---

# Conduzir workflow

## Objetivo
Conduzir um workflow passo a passo, com estado em arquivo: acompanhar o progresso entre sessões, indicar a próxima ação concreta (agente e comando) e verificar os critérios de sucesso de cada passo. É automação guiada, não um motor de execução: cada passo é executado pelo agente dono, e o `@pm` orquestra sem simular outros agentes.

## Quando usar
- `@pm *run-workflow {workflow}` para `story-development-cycle`, `spec-pipeline`, `greenfield`, `brownfield`, `brownfield-discovery` ou workflows de squads.
- Para executar um epic inteiro em ondas, prefira `@pm *execute-epic {n}`.

## Pré-condições
- [ ] Arquivo do workflow existe (`.sia-core/workflows/{id}.yaml` ou `squads/{nome}/workflows/{id}.yaml`)
- [ ] Para `continue`, `status`, `skip` e `abort`: instância ativa em `.sia/workflows/`
- [ ] `.sia/` gravável

## Formato do estado
```yaml
workflow_state:
  workflow: story-development-cycle
  instance: story-development-cycle-20261016-1430
  source: .sia-core/workflows/story-development-cycle.yaml
  mode: interactive          # interactive | yolo
  status: active             # active | completed | aborted
  started_at: '2026-10-16T14:30:00-03:00'
  updated_at: '2026-10-16T15:05:00-03:00'
  context: { storyId: '2.1' }
  current_step: validate
  steps:
    - id: create
      agent: pm
      command: '*create-story 2'
      status: completed      # pending | in_progress | completed | skipped | failed
      artifacts: [docs/stories/2.1-login-google.story.md]
      completed_at: '2026-10-16T14:50:00-03:00'
    - id: validate
      agent: pm
      command: '*validate-story 2.1'
      status: in_progress
  decisions:
    - '2026-10-16 14:52 NO-GO na validação; volta para create (on_failure)'
```

## Passos

### 1. Resolver e validar o workflow
1. Resolva o arquivo: núcleo em `.sia-core/workflows/{id}.yaml`; squad em `squads/{nome}/workflows/{id}.yaml`. Não encontrado: liste os disponíveis em lista numerada.
2. Valide antes de começar: `workflow.sequence` existe; todo `agent` é um dos 5 agentes; todo `task` existe em `.sia-core/tasks/` (ou nas tasks do squad); todo `requires` aponta para um passo existente. Mostre os avisos. Com a CLI: `sia validate` (ou `sia validate --squad {nome}`).
3. Pergunte as entradas que os passos precisam e o contexto não traz (ex.: `storyId`, `project_type`), em lista numerada.

### 2. Ação `start`
1. Crie o estado com `instance` = `{workflow-id}-{AAAAMMDD-HHmm}`, todos os passos de `sequence` como `pending` e `status: active`.
2. Para cada passo, encontre o comando: em `.sia-core/agents/{agent}.md`, o comando cujo `task:` é a task do passo (e cujo `hat` coincide). Se houver mais de um (ex.: vários usam `create-doc.md`), desempate pelo template ou pelas notas do passo. Preencha os argumentos com o contexto.
3. Mostre o passo 1 (passo 4).

### 3. Ação `continue` (padrão)
1. Carregue a instância ativa do workflow. Mais de uma: pergunte qual, em lista numerada.
2. Passo atual `pending` ou `in_progress`: verifique se foi concluído fora daqui (passo 5).
   - **Interativo:** confirme com o usuário: 1. Concluí o passo; 2. Ainda não; 3. O passo falhou.
   - **YOLO:** avance sozinho quando os critérios de sucesso forem verificados; pare em falha ou quando a task do passo exigir elicitação.
3. Concluído: marque `completed`, registre os artefatos e avance. Não concluído: mostre de novo as instruções.
4. Próximo passo: o seguinte em `sequence` cujos `requires` estão todos `completed`. Avalie a `condition` do passo; se não se aplica, marque `skipped` com o motivo (ex.: no Spec Pipeline, a pesquisa é pulada em SIMPLE).
5. Mostre o passo e grave o estado.

### 4. Mostrar o passo
```text
=== Workflow: story-development-cycle (instância story-development-cycle-20261016-1430) ===
Passo 2/6: validate_story (fase 2)
Agente: @pm [Product Owner]
Comando: *validate-story 2.1
Notas: {notes do passo}
Critérios de sucesso:
- Story com status Ready
- Nota do checklist ≥ 7/10

Como executar:
1. Ative o agente indicado (ou dispare o subagente correspondente, se a IDE suportar)
2. Rode *validate-story 2.1
Quando concluir: *run-workflow story-development-cycle continue
```
- Se `handoff_prompts` tiver a transição (ex.: `create_to_validate`), mostre a mensagem.
- Passo do próprio `@pm`: o `@pm` pode executá-lo direto, declarando o chapéu do passo.
- Passo de outro agente: dispare o subagente (a IDE carrega `.sia-core/agents/{agente}.md` e o comando) ou indique o comando ao usuário. Nunca execute no lugar do outro agente.

### 5. Verificar os critérios de sucesso
1. Confira cada item de `success_criteria` nos artefatos: status da story (primeira linha depois de `## Status`), arquivos de `creates`, gate em `docs/qa/gates/`, relatório em `docs/qa/inspections/`, veredito registrado.
2. No ciclo da story, com a CLI: `sia sdc verify {storyId} {fase}`.
3. Critério não atendido ou passo com falha: aplique `on_failure` (`goto` e `reason`): o passo alvo e os seguintes voltam para `pending`, e a decisão vai para `decisions`. Sem `on_failure`, marque `failed` e pergunte: 1. Tentar de novo; 2. Pular (só passo opcional); 3. Abortar.
4. Respeite os limites declarados pelo workflow (ex.: QA Loop com no máximo 5 iterações). Limite atingido: pare e escale ao usuário (Artigo VIII).

### 6. Ação `status`
Mostre o progresso, a lista de passos com ícones, os artefatos e as decisões:
```text
=== story-development-cycle · 1/6 concluídos ===
[██░░░░░░░░░░] 17%
✅ create     @pm *create-story 2        docs/stories/2.1-login-google.story.md
🔄 validate   @pm *validate-story 2.1
⏳ develop    @dev *develop 2.1
⏳ inspect    @validator *revisar-feature 2.1
⏳ qa-gate    @pm *qa-gate 2.1
⏳ push       @devops *push
Decisões: 14:52 NO-GO → volta para create
```

### 7. Ação `skip`
Só para passo marcado como opcional no workflow. Passo obrigatório: recuse e mostre quais passos são opcionais. Marque `skipped`, avance, mostre o próximo passo e grave o estado.

### 8. Ação `abort`
Marque `status: aborted`, grave e mostre:
```text
=== Workflow abortado: story-development-cycle ===
Instância: story-development-cycle-20261016-1430
Progresso: 2/6 passos concluídos
Artefatos criados:
- docs/stories/2.1-login-google.story.md
Estado preservado em .sia/workflows/story-development-cycle-20261016-1430.yaml (apague quando não precisar mais)
```

### 9. Continuidade entre sessões
O estado fica em disco. Numa sessão nova: ative o `@pm` e rode `*run-workflow {id} continue`. O passo pode ser executado na sessão de outro agente; depois, volte e rode `continue` de novo. Ao concluir o último passo, marque `status: completed` e mostre o resumo final com os artefatos.

## Saída
Arquivo de estado em `.sia/workflows/{workflow-id}-{AAAAMMDD-HHmm}.yaml`, atualizado a cada ação, e no chat o passo atual com agente, comando, notas e critérios de sucesso.

## Critérios de conclusão
- [ ] Workflow validado antes do início
- [ ] Estado gravado depois de cada ação
- [ ] Todo passo concluído teve os critérios de sucesso verificados
- [ ] Nenhum passo de outro agente executado pelo `@pm`
- [ ] Próximo passo exibido com agente e comando

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Workflow não encontrado | Liste os workflows disponíveis |
| Nenhuma instância ativa | Ofereça `start` e mostre os estados existentes em `.sia/workflows/` |
| Pular passo obrigatório | Recuse e mostre os passos opcionais |
| Task de um passo inexistente | Pare e aponte o erro; correção do workflow → `@squad-creator *modify-workflow {id}` |
| Comando do passo não encontrado no agente | Mostre a task do passo e peça ao usuário para executá-la com o agente indicado |

## Handoff
O próximo passo é sempre o indicado no passo 4. Ao concluir o workflow: `@pm *status` para o panorama, ou `*next` para a sugestão seguinte.
