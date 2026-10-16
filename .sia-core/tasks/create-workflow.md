---
id: create-workflow
title: Criar um workflow
agent: squad-creator
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'nome (obrigatório): id em kebab-case'
  - 'alvo (obrigatório): core (.sia-core/workflows/), squad ou hybrid (squads/{nome}/workflows/)'
  - 'squad (obrigatório em squad e hybrid): nome do squad'
  - 'modo (opcional): yolo, interactive ou preflight (padrão: interactive)'
outputs:
  - '.sia-core/workflows/{id}.yaml ou squads/{nome}/workflows/{id}.yaml no formato do guia (seção 11)'
  - 'squad.yaml atualizado (squad e hybrid) ou cadeia em data/workflow-chains.yaml (core)'
depends_on:
  templates: [workflow-tmpl.yaml]
  data: [sia-authoring-guide.md, workflow-chains.yaml, decision-heuristics-framework.md]
next: [validate-framework, sync-ide]
source: [create-workflow.md]
---

# Criar um workflow

## Objetivo

Criar um workflow que encadeia tasks existentes entre agentes, com sequência, handoffs, critérios de sucesso e diagrama, no formato do guia de autoria (seção 11).

## Quando usar

- Processo de várias etapas que se repete (ex.: produção de conteúdo, onboarding de cliente).
- Não use para uma etapa única: `*create-task`.
- Não use para mudar um workflow existente: `*modify-workflow {id}`.

## Pré-condições

- [ ] As tasks das etapas existem ou serão criadas antes (`*create-task`)
- [ ] Alvo squad ou hybrid: `squads/{nome}/` existe com `squad.yaml` válido

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO | 0 a 1 pergunta | Desenha a partir do objetivo e das tasks existentes; decisões listadas no resumo |
| Interativo (padrão) | um bloco de elicitação por passo | Confirma alvo, visão geral, sequência, agentes, recursos e o YAML |
| Pre-Flight | todas as perguntas antes | Os blocos dos passos 1, 2, 4, 5 e 6 de uma vez; YAML só depois das respostas |

## Passos

### 1. Definir o alvo

**Ponto de elicitação:** Onde o workflow vai viver?

1. core: `.sia-core/workflows/{id}.yaml` (só agentes do SIA)
2. squad: `squads/{nome}/workflows/{id}.yaml` (agentes do squad)
3. hybrid: `squads/{nome}/workflows/{id}.yaml`, com agentes do squad e do SIA (resolução: squad primeiro, depois o SIA)

Regra de alvo: processo do projeto vai num squad; processo do framework vai em `.sia-core/`. Com `boundary.frameworkProtection: true`, `.sia-core/workflows/` é protegido: use um squad. Mudança grande no framework nasce numa story do `@pm`.

### 2. Descrever o workflow

**Ponto de elicitação:**

1. Nome (id em kebab-case) e nome de exibição
2. Objetivo principal
3. Tipo de projeto: generic, greenfield ou brownfield (e o escopo, UI, serviço ou full stack, quando fizer diferença)
4. Resultado esperado

### 3. Aplicar REUSE > ADAPT > CREATE

Compare com `.sia-core/workflows/`, `squads/*/workflows/` e `data/workflow-chains.yaml`:

| Achado | Decisão |
|--------|---------|
| Workflow existente cobre o objetivo | REUSE: use o existente |
| Cobre quase todo | ADAPT: `*modify-workflow {id}` |
| Nada serve | CREATE |

### 4. Desenhar a sequência

**Ponto de elicitação:**

1. Quais as fases e as etapas?
2. Qual a ordem exata (`sequence`)?
3. Há etapas que podem rodar em paralelo?
4. Há decisões ou fluxos condicionais (`condition`, `on_failure`)?
5. Qual o critério de saída de cada etapa (`success_criteria`)?

### 5. Atribuir os agentes

**Ponto de elicitação (por etapa):**

1. Que agente executa? (e o chapéu, quando `pm` ou `dev`)
2. Que task executa e que artefato cria (`creates`)?
3. Como o trabalho passa para a etapa seguinte (`handoff_prompts`)?
4. Há aprovação humana nesta etapa?

Regras: push, PR, release e deploy de produção só com `devops` (Constitution, Artigo II); transições de status da story conforme o guia, seção 6 (ex.: só o `@pm` [Qualidade] decide o QA gate); o `@validator` só inspeciona.

### 6. Levantar os recursos

**Ponto de elicitação:**

1. Que templates as etapas usam?
2. Que dados consultam?
3. Há dependências externas (serviços, MCPs)?
4. Quais as entradas exigidas para começar?
5. Que saídas o workflow produz?

Cada recurso existe ou entra na lista do que criar antes.

### 7. Validar o desenho

- Tasks existem (em squad e hybrid: no squad primeiro)
- Agentes existem: os 5 do SIA e, em squad e hybrid, os do squad; o mesmo id nos dois contextos é ambíguo (renomeie)
- `requires` só cita etapas anteriores, sem ciclos
- Progressão lógica: toda etapa recebe o que precisa de uma etapa anterior
- Pontos de decisão com critério de aprovação, revisão ou veto (`data/decision-heuristics-framework.md`)

Problema encontrado: mostre e proponha a correção antes de gerar.

### 8. Gerar o arquivo

Use `templates/workflow-tmpl.yaml`: `id`, `name`, `version`, `description`, `type`, `project_types`, `execution_modes`, `sequence`, `flow_diagram` (Mermaid), `decision_guidance` e `handoff_prompts` para toda troca de agente. Grave no destino do passo 1.

**Ponto de elicitação:** mostre o YAML e o diagrama.

1. Aprovar
2. Ajustar

### 9. Registrar

- squad e hybrid: acrescente o arquivo em `components.workflows` do `squad.yaml` (backup em `.sia/backups/{AAAAMMDD-HHmmss}/`; crie a lista se faltar; não duplique).
- core: para a saudação dos agentes sugerir a próxima etapa, registre a cadeia em `data/workflow-chains.yaml` (agente, comando e task de cada etapa) e acrescente o workflow em `dependencies.workflows` do `@pm`, que conduz workflows com `*run-workflow`.

### 10. Validar e projetar

```bash
sia validate                    # ou sia validate --squad {nome}
sia sync
# sem sia no PATH: node .sia-core/cli/sia.js {comando}
```

### 11. Mostrar o resumo

Caminho, contexto, etapas, agentes, tipo e como usar (ver Saída).

## Saída

```text
✅ Workflow criado: squads/conteudo/workflows/article-production.yaml
Contexto: hybrid (squad conteudo)
Etapas: 4 | Agentes: pauteiro, redator, validator, pm
Tipo: generic
Diagrama: flowchart com 4 nós e 1 retorno em caso de reprovação
Para usar: conduza as etapas na ordem; workflows do .sia-core rodam com @pm *run-workflow {id}
```

## Critérios de conclusão

- [ ] Arquivo no formato da seção 11, com YAML válido
- [ ] Todo `task:` existe e todo `agent:` é válido no contexto
- [ ] Nenhum ciclo em `requires`; `handoff_prompts` cobre toda troca de agente
- [ ] Exclusividades do Artigo II e transições de status da seção 6 respeitadas
- [ ] Registro feito (manifest do squad ou cadeia e dependências no core)
- [ ] `sia validate` sem erros e `sia sync` executado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Workflow com o mesmo id já existe | Ofereça `*modify-workflow {id}` ou uma versão nova com outro id |
| Agente inexistente | Liste os agentes necessários; sugira `*create-agent` |
| Task inexistente | Liste as tasks necessárias; sugira `*create-task` |
| Ciclo em `requires` | Mostre o ciclo e sugira onde quebrá-lo |
| Squad inexistente (squad e hybrid) | Sugira `*create-squad` |
| Recurso ausente | Liste e ofereça criar antes |

## Handoff

Próximo passo: `@squad-creator *validate-framework` (ou `*validate-squad {nome}`) e `*sync-ide`.
