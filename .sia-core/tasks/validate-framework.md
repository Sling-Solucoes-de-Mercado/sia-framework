---
id: validate-framework
title: Validar o framework
agent: squad-creator
elicit: false
inputs:
  - 'escopo (opcional): all (padrão), agents, tasks, templates, checklists, workflows, skills ou o id de um artefato'
  - '--squad (opcional): nome de um squad, validado junto'
  - '--strict (opcional): avisos viram erros'
  - '--detailed (opcional): mostra cada verificação, não só o resumo'
outputs:
  - 'Relatório no chat com os achados agrupados por tipo e por arquivo, a correção de cada um e o resultado'
depends_on:
  data: [sia-authoring-guide.md, workflow-chains.yaml]
next: [sync-ide, modify-agent, modify-task, modify-workflow]
source: [validate-agents.md, validate-workflow.md]
---

# Validar o framework

## Objetivo

Rodar `sia validate`, agrupar os achados e sugerir a correção de cada um, cobrindo agentes, tasks, templates, checklists, workflows, skills e referências cruzadas.

## Quando usar

- Depois de criar ou modificar componentes do framework ou de um squad.
- Antes de `*sync-ide` e antes de entregar mudanças no `.sia-core/`.
- Quando um agente ou workflow se comporta de forma estranha (dependência quebrada, comando sem task).

## Pré-condições

- [ ] Nenhuma bloqueante. Sem CLI, a task faz as verificações manuais do passo 3.

## Passos

### 1. Rodar a CLI

```bash
sia validate
sia validate --squad {nome}       # quando houver --squad
# sem sia no PATH: node .sia-core/cli/sia.js validate
```

Com `--strict`, repasse a flag à CLI (`sia validate --strict`). Guarde a saída e o código de retorno.

### 2. Agrupar os achados

Agrupe por tipo (agentes, tasks, templates, checklists, workflows, skills, referências cruzadas, squad) e depois por arquivo, separando erro de aviso. Aplique o filtro de escopo. Não pare no primeiro erro: valide tudo.

### 3. Verificações complementares

Sem CLI, faça todas. Com CLI, use-as para explicar os achados e cobrir o que ela não verificar.

**Agentes** (`.sia-core/agents/*.md`, guia, seção 7)

- Bloco YAML legível (erro, com a linha do problema)
- `agent.id` igual ao nome do arquivo, `agent.name`, `persona.role`, `persona_profile.communication.greeting_levels` (minimal, named, archetypal), `commands` em lista e `activation-instructions` com os PASSOS 1 a 5 (erro)
- Cada item de `dependencies` existe em `.sia-core/{tipo}/` (erro); tipos aceitos: tasks, templates, checklists, data, workflows e schemas
- Cada comando com `name` (erro), `description` e `visibility` (aviso)
- Todo `task:`, `template:` e `checklist:` de comando consta em `dependencies` (erro)
- Todo comando com `hat:` aponta para chapéu existente, e todo comando listado num chapéu existe (erro)
- Entre agentes: ids sem duplicidade; os 5 agentes presentes (pm, dev, devops, validator, squad-creator); `help` e `exit` em todos (aviso)

**Tasks** (`.sia-core/tasks/*.md`, seção 8)

- Frontmatter com `id` igual ao nome do arquivo, `title`, `agent` entre os 5 ou `any`, `hat` válido quando `agent` é `pm` ou `dev`, e `elicit` booleano (erro)
- `depends_on` existe (erro); cada item de `next` é comando de algum agente (aviso)
- Seções `## Objetivo`, `## Passos`, `## Saída` e `## Critérios de conclusão` (erro)

**Workflows** (`.sia-core/workflows/*.yaml`, seção 11)

- `workflow.id` e `workflow.name` (erro); `sequence` com pelo menos um passo (erro; só `phases` sem `sequence`: aviso); `description` e `type` (aviso)
- Cada passo com `agent` (aviso), que é um dos 5 do SIA ou, em workflow de squad, um agente do squad (erro); o mesmo id no squad e no SIA gera aviso de ambiguidade
- Cada passo com uma ação: `task`, `creates`, `updates`, `validates` ou `action` (aviso); `task:` existe (erro); `hat` válido para pm e dev (erro)
- `requires` só cita ids de passos anteriores (aviso: cadeia quebrada); ciclo em `requires` (erro)
- `condition`, quando houver, é um identificador descritivo não vazio (aviso)
- Troca de agente entre passos sem `handoff_prompts` (aviso)
- `flow_diagram` com `flowchart` ou `graph` e colchetes balanceados (aviso)

**Templates, checklists e skills**

- Template YAML legível; template de arquivo começa com o comentário de uso e os placeholders (seção 9)
- Checklist com `# Checklist:`, tabela em `## Resultado` e `**Decisão:**` (seção 10)
- Skill com `name`, `description` e `agent` no frontmatter e a task fonte da verdade existente (seção 13)

**Referências cruzadas**

- Entradas de `data/workflow-chains.yaml` apontam para agentes, comandos e tasks existentes
- Nenhum resíduo da seção 14.1 do guia; textos com acentuação correta (seção 2)

### 4. Sugerir as correções

| Achado | Correção |
|--------|----------|
| YAML inválido no agente | Corrija indentação ou aspas na linha indicada (`*modify-agent {id}`) |
| Dependência inexistente | Crie o artefato (`*create-task`, `*create-workflow`) ou remova a referência |
| Comando com task fora de `dependencies` | Acrescente o arquivo em `dependencies.tasks` |
| `id` diferente do nome do arquivo | Corrija o `id`; renomear o arquivo exige atualizar quem o referencia (`*modify-task {id}`) |
| Task de `pm` ou `dev` sem `hat` | Acrescente o chapéu do comando que a executa |
| `next` com comando inexistente | Corrija o nome ou remova a sugestão |
| Workflow com task ou agente inexistente | Corrija o nome ou crie o artefato |
| Ciclo em `requires` | Quebre o ciclo (`*modify-workflow {id}`) |
| Troca de agente sem `handoff_prompts` | Acrescente a entrada `{de}_to_{para}` |
| Resíduo ou texto sem acento | Corrija conforme as seções 2 e 14.1 do guia |

### 5. Montar o relatório

Uma linha por arquivo com `[PASS]`, `[WARN]` ou `[FAIL]`, os achados com a correção e o resumo. Resultado `VALID` sem erros (avisos permitidos, salvo `--strict`); `INVALID` com qualquer erro.

## Saída

```text
=== Validação do framework ===

Agentes
  [PASS] pm.md: 52 comandos, 29 tasks
  [WARN] devops.md: 2 comandos sem visibility
Tasks
  [FAIL] create-epic.md: depends_on.templates "epic-tmpl.md" não existe
         Correção: crie o template ou remova a referência
Workflows
  [WARN] brownfield.yaml: 3 trocas de agente sem handoff_prompts

Resumo: 108 arquivos | 106 PASS | 1 WARN | 1 FAIL
Resultado: INVALID
```

Com `--detailed`, liste também cada verificação aprovada.

## Critérios de conclusão

- [ ] `sia validate` executado (ou verificação manual completa, registrada no relatório)
- [ ] Achados agrupados por tipo e por arquivo
- [ ] Cada erro com a correção sugerida
- [ ] Resultado declarado: VALID ou INVALID

## Tratamento de erros

| Situação | Ação |
|----------|------|
| CLI indisponível | Verificação manual do passo 3; avise que o resultado não passou pela CLI |
| Arquivo ilegível | Registre como erro daquele arquivo e siga com os demais |
| Escopo com id inexistente | Liste os ids parecidos e peça confirmação |

## Handoff

Com erros: `@squad-creator *modify-agent {id}`, `*modify-task {id}` ou `*modify-workflow {id}`, conforme o achado. Sem erros: `@squad-creator *sync-ide`.
