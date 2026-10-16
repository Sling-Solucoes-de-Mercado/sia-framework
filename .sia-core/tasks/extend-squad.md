---
id: extend-squad
title: Estender um squad com novos componentes
agent: squad-creator
elicit: true
modes: [yolo, interactive]
inputs:
  - 'nome (obrigatório): squad em squads/'
  - '--add (opcional): agent, task, workflow, checklist, template, data ou script; sem isso, a task pergunta'
  - '--name (opcional): nome do componente em kebab-case'
  - '--agent (opcional): agente dono, obrigatório para task'
  - '--story (opcional): storyId para rastreabilidade'
  - '--force (opcional): sobrescreve um componente existente'
outputs:
  - 'squads/{nome}/{tipo}/{componente} criado a partir do template do tipo'
  - 'squad.yaml com o componente em components (backup em .sia/backups/)'
  - 'Resultado de sia validate --squad {nome}'
depends_on:
  templates: [agent-tmpl.md, task-tmpl.md, workflow-tmpl.yaml, checklist-tmpl.md]
  data: [sia-authoring-guide.md]
  schemas: [squad-schema.json]
next: [validate-squad, sync-ide]
source: [squad-creator-extend.md]
---

# Estender um squad com novos componentes

## Objetivo

Adicionar um componente a um squad existente, a partir do template do tipo, atualizando o manifest e validando o resultado, sem manipulação manual de arquivos.

## Quando usar

- Depois de `*analyze-squad`, para atender uma sugestão.
- Para crescer o squad aos poucos: um agente, uma task ou um workflow por vez.
- Para um agente completo (pesquisa, persona, quality gate), prefira `*create-agent` com alvo no squad; para task com elicitação guiada, `*create-task`.

## Pré-condições

- [ ] Squad existe em `squads/{nome}/` com manifest válido
- [ ] Nome do componente em kebab-case (`^[a-z][a-z0-9-]*[a-z0-9]$`), sem `/`, `\` ou `..`

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO (direto, com `--add` e `--name`) | 0 a 1 pergunta | Cria sem perguntar; só pergunta o agente dono de uma task se faltar |
| Interativo (padrão) | 4 a 6 perguntas | Elicita tipo, nome, agente, descrição e story |

## Passos

### 1. Verificar o squad

Pasta e `squad.yaml` existem. Senão, `SQUAD_NOT_FOUND`.

### 2. Coletar o componente

**Ponto de elicitação:** O que você quer adicionar?

1. Agente: nova persona com comandos
2. Task: nova capacidade de um agente
3. Workflow: sequência de tasks
4. Checklist: validação
5. Template: modelo de documento ou de arquivo
6. Data: base de conhecimento
7. Script: automação

Depois pergunte o nome, a descrição (opcional) e a story ligada (opcional). Para task, liste os agentes do squad numerados e pergunte o dono. Squad sem agentes: `AGENT_NOT_FOUND`.

### 3. Aplicar REUSE > ADAPT > CREATE

Procure componente parecido no squad e em `.sia-core/{tipo}/` (por nome, título e objetivo). Se existir:

**Ponto de elicitação:** Já existe `{arquivo}` com propósito parecido.

1. Reusar o existente (só referenciar)
2. Adaptar o existente (`*modify-task`, `*modify-agent` ou `*modify-workflow`)
3. Criar mesmo assim

Nome igual ao de um arquivo de `.sia-core/{tipo}/` faz a versão do squad ter precedência para os agentes do squad. Avise e prefira outro nome, salvo se a intenção for substituir.

### 4. Criar o arquivo

| Tipo | Destino | Base | O que preencher |
|------|---------|------|-----------------|
| agent | `agents/{nome}.md` | `templates/agent-tmpl.md` | persona, comandos e dependências (guia, seção 7), com a resolução de squad |
| task | `tasks/{nome}.md` | `templates/task-tmpl.md` | `agent:` igual ao dono, passos, saída e critérios (seção 8) |
| workflow | `workflows/{nome}.yaml` | `templates/workflow-tmpl.yaml` | `sequence` com tasks e agentes existentes (seção 11) |
| checklist | `checklists/{nome}.md` | `templates/checklist-tmpl.md` | itens verificáveis e regra de decisão (seção 10) |
| template | `templates/{nome}-tmpl.md` ou `.yaml` | comentário de uso com os placeholders (seção 9) | estrutura do documento |
| data | `data/{nome}.md` ou `.yaml` | cabeçalho com propósito e quem usa | conteúdo de referência |
| script | `scripts/{nome}.js` (ou outra linguagem) | cabeçalho com uso e opções `--help` e `--dry-run` | implementação pelo `@dev` |

Arquivo existente sem `--force`: `COMPONENT_EXISTS`.

**Ponto de elicitação (só se existir):**

1. Sobrescrever
2. Escolher outro nome
3. Cancelar

Com `--story`, registre o storyId no cabeçalho do componente.

### 5. Ligar o componente

- Task: acrescente o arquivo em `dependencies.tasks` do agente dono.

  **Ponto de elicitação:** Criar o comando `*{nome}` no agente {agente}, apontando para a task?

  1. Sim (recomendado)
  2. Não
- Template ou checklist usado por um comando: acrescente em `dependencies.templates` ou `dependencies.checklists` do agente.
- Atualize as tabelas de agentes e tasks do `README.md` do squad.

### 6. Atualizar o manifest

1. Copie o `squad.yaml` para `.sia/backups/{AAAAMMDD-HHmmss}/squads/{nome}/squad.yaml`.
2. Acrescente o nome do arquivo em `components.{tipo}` (crie a lista se faltar; não duplique).
3. Preserve a formatação e os comentários do arquivo.

### 7. Validar

```bash
sia validate --squad {nome}
# sem sia no PATH: node .sia-core/cli/sia.js validate --squad {nome}
```

Erro: mostre a correção sugerida. Se o erro vier da mudança e não houver correção simples, restaure o manifest do backup e remova o arquivo criado.

### 8. Mostrar o resultado

Arquivo criado, manifest atualizado, resultado da validação e o próximo passo do tipo: completar o arquivo, `*validate-squad {nome}` e `*sync-ide`. Para script, encaminhe a implementação ao `@dev`.

## Saída

```text
Adicionando task...
  Criado: squads/vendas-b2b/tasks/qualificar-lead.md
  Agente: closer (dependencies.tasks e comando *qualificar-lead)
  Atualizado: squad.yaml (components.tasks)
  Backup: .sia/backups/20261016-143000/squads/vendas-b2b/squad.yaml
  Validação: VALID

Próximos passos:
  1. Complete os passos, a saída e os critérios em tasks/qualificar-lead.md
  2. *validate-squad vendas-b2b
  3. *sync-ide
```

## Critérios de conclusão

- [ ] Arquivo criado na pasta do tipo, a partir do template do tipo
- [ ] Componente listado em `components` e ligado ao agente, quando for task, template ou checklist
- [ ] Backup do manifest feito antes da mudança
- [ ] `sia validate --squad {nome}` sem erros

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `SQUAD_NOT_FOUND` | Mostre `*list-squads`; sugira `*create-squad` |
| `INVALID_COMPONENT_NAME` | Mostre o padrão kebab-case e sugira um nome válido |
| Nome com `/`, `\` ou `..` | Rejeite: caminho fora da pasta do squad não é permitido |
| `COMPONENT_EXISTS` | Ponto de elicitação do passo 4, ou `--force` |
| `AGENT_NOT_FOUND` (task) | Liste os agentes; sugira `--add agent` primeiro |
| `MANIFEST_UPDATE_FAILED` | Restaure o `squad.yaml` do backup e informe a causa |

## Handoff

Próximo passo: `@squad-creator *validate-squad {nome}` e `*sync-ide`. Script novo: `@dev` implementa.
