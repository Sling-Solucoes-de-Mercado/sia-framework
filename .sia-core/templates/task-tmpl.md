---
id: '{{TASK_ID}}'
title: '{{TASK_TITLE}}'
agent: '{{AGENT_ID}}'
hat: '{{HAT_ID}}'
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - '{{INPUT_NAME}} ({{INPUT_REQUIRED}}): {{INPUT_DESCRIPTION}}'
outputs:
  - '{{OUTPUT_PATH}}: {{OUTPUT_DESCRIPTION}}'
depends_on:
  tasks: []
  templates: []
  checklists: []
  data: []
next: ['{{NEXT_COMMAND}}']
source: []
---

<!--
Template de task do SIA (guia de autoria, seção 8). Usado por @squad-creator em *create-task e *extend-squad --add task.
Destino: .sia-core/tasks/{{TASK_ID}}.md (framework) ou squads/{nome}/tasks/{{TASK_ID}}.md (squad). Remova este comentário ao gerar.

Frontmatter:
- id: igual ao nome do arquivo, sem .md; inglês, kebab-case, sem prefixo de agente (o dono vem em agent:)
- agent: pm | dev | devops | validator | squad-creator | any (task compartilhada) | id de um agente do squad
- hat: obrigatório quando agent é pm (product, analyst, scrum, owner, quality) ou dev (dev, architect, data, ux); remova nos demais
- elicit: true quando a task exige interação com o usuário; false nos demais casos
- modes: só quando a task suporta modos; descreva cada um na seção ## Modos (remova a seção quando não houver)
- depends_on: só artefatos que existem (em squad: squads/{nome}/{tipo}/ primeiro, depois .sia-core/{tipo}/)
- next: comandos sugeridos depois da task; cada um existe em algum agente
- source: origens quando a task deriva de outras; lista vazia ou ausente em task nova
- {{INPUT_REQUIRED}}: obrigatório | opcional

Corpo: seções fixas, nesta ordem. Imperativo, frases curtas, tabelas para decisões, listas numeradas para passos.
Tamanho: 80 a 300 linhas. Uma informação, um lugar: regra que já está na constitution ou em rules/ é referenciada, não copiada.
Elicitação: opções sempre numeradas; nunca pule a elicitação por eficiência.
Tratamento de erros, por estratégia: repetir (erro transitório, ex.: rede), alternativa (erro recuperável, ex.: template ausente
usa o padrão), abortar (erro crítico, ex.: entrada obrigatória ausente). Toda task tem pelo menos uma condição que para a execução.
Segurança: valide entradas (nomes sem /, \ ou ..), não grave fora do destino previsto, não exponha segredos na saída.
-->

# {{TASK_TITLE}}

## Objetivo

{{OBJECTIVE}}

## Quando usar

- {{WHEN_TO_USE}}
- Não use quando {{WHEN_NOT_TO_USE}}: use `*{{ALTERNATIVE_COMMAND}}`.

## Pré-condições

- [ ] {{PRECONDITION_1}}
- [ ] {{PRECONDITION_2}}

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO | 0 a 1 pergunta | {{YOLO_BEHAVIOR}}. Decisões registradas na saída (ou na story, em `### Decisões (modo YOLO)`) |
| Interativo (padrão) | 5 a 10 checkpoints | {{INTERACTIVE_BEHAVIOR}} |
| Pre-Flight | todas as perguntas antes | {{PREFLIGHT_BEHAVIOR}} |

## Passos

### 1. {{STEP_1_NAME}}

{{STEP_1_INSTRUCTIONS}}

**Ponto de elicitação:** {{ELICITATION_QUESTION}}

1. {{OPTION_1}}
2. {{OPTION_2}}
3. Cancelar

### 2. {{STEP_2_NAME}}

{{STEP_2_INSTRUCTIONS}}

### 3. {{STEP_3_NAME}}

{{STEP_3_INSTRUCTIONS}}

### 4. Validar e entregar

Confira os critérios de conclusão. Se algum falhar, corrija antes de entregar.

## Saída

{{OUTPUT_DESCRIPTION}}, em `{{OUTPUT_PATH}}`:

```text
{{OUTPUT_EXAMPLE}}
```

## Critérios de conclusão

- [ ] {{COMPLETION_CRITERION_1}}
- [ ] {{COMPLETION_CRITERION_2}}

## Tratamento de erros

| Situação | Ação |
|----------|------|
| {{ERROR_CASE_1}} | {{ERROR_ACTION_1}} |
| {{ERROR_CASE_2}} | {{ERROR_ACTION_2}} |

## Handoff

Próximo passo: `@{{NEXT_AGENT}} *{{NEXT_COMMAND}} {{NEXT_ARGS}}`.
