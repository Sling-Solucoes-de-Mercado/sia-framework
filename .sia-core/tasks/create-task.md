---
id: create-task
title: Criar uma task
agent: squad-creator
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'propósito (obrigatório): o que a task produz e para quem'
  - 'agente (obrigatório): dono da task (um dos 5 agentes, any ou agente de squad)'
  - 'alvo (obrigatório): framework (.sia-core/tasks/) ou squad (squads/{nome}/tasks/)'
  - 'modo (opcional): yolo, interactive ou preflight (padrão: interactive)'
outputs:
  - '.sia-core/tasks/{id}.md ou squads/{nome}/tasks/{id}.md no formato de task do SIA'
  - 'Agente dono com a task em dependencies e o comando que a executa'
depends_on:
  templates: [task-tmpl.md]
  data: [sia-authoring-guide.md, decision-heuristics-framework.md]
next: [validate-framework, sync-ide]
source: [create-task.md]
---

# Criar uma task

## Objetivo

Criar uma task executável no formato do guia de autoria (seção 8), ligada ao agente que a executa, validada e projetada nas IDEs.

## Quando usar

- Capacidade nova de um agente do framework ou de um squad.
- Comando operacional de um agente que ainda não tem task.
- Não use para mudar uma task existente: `*modify-task {id}`.

## Pré-condições

- [ ] Propósito claro: o que a task produz
- [ ] Agente dono existe (ou será criado antes com `*create-agent`)

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO | 0 a 1 pergunta | Gera a task a partir do propósito e do agente; decisões listadas no resumo |
| Interativo (padrão) | os blocos de elicitação, um por vez | Confirma cada bloco e o rascunho |
| Pre-Flight | todas as perguntas antes | Os blocos dos passos 1, 3, 4 e 5 de uma vez; rascunho só depois das respostas |

## Passos

### 1. Definir a task

**Ponto de elicitação:**

1. Que agente executa a task? (um dos 5, `any` para task compartilhada, ou um agente de squad)
2. Qual o propósito? (o que produz e por quê)
3. Quais as pré-condições?
4. Onde a task vai viver? 1. framework (`.sia-core/tasks/`) 2. squad (`squads/{nome}/tasks/`)

Regra de alvo: componente de projeto vai em `squads/{nome}/`; componente do framework vai em `.sia-core/`. Com `boundary.frameworkProtection: true` no core-config, `.sia-core/tasks/` é protegido: tasks de projeto vão para um squad. Mudança no framework é de quem contribui com o SIA (`frameworkProtection: false`) e, se for grande, nasce numa story do `@pm`.

Nome: `id` em inglês, kebab-case, verbo + objeto (ex.: `generate-proposal`), sem prefixo de agente (o dono vem em `agent:`). Agente `pm` ou `dev`: escolha o chapéu (`hat`) do comando que vai executar a task.

### 2. Aplicar REUSE > ADAPT > CREATE

Procure tasks parecidas:

```bash
grep -il "{termo}" .sia-core/tasks/*.md squads/*/tasks/*.md
```

Compare `title`, `## Objetivo` e `source:`.

| Achado | Decisão |
|--------|---------|
| Task existente cobre o propósito | REUSE: aponte um comando do agente para ela |
| Cobre a maior parte, sem quebrar quem a usa | ADAPT: `*modify-task {id}` |
| Nada serve | CREATE |

**Ponto de elicitação:** 1. Reusar 2. Adaptar 3. Criar

### 3. Desenhar o fluxo

**Ponto de elicitação:**

1. A task exige interação com o usuário? (define `elicit`)
2. Quais os passos principais? (lista numerada)
3. Quais as entradas? (nome, obrigatória ou opcional, descrição)
4. Quais as saídas? (o que é gravado, onde e em que formato, nos caminhos do guia, seção 5.2)
5. Há pontos de decisão do usuário?
6. A task suporta modos (YOLO, Interativo, Pre-Flight)?

### 4. Definir a elicitação (quando `elicit: true`)

**Ponto de elicitação:**

1. Que informação coletar do usuário?
2. Como apresentar as opções? (sempre lista numerada)
3. Que validação aplicar a cada resposta?
4. Há valores padrão ou sugestões?

### 5. Mapear as dependências

**Ponto de elicitação:**

1. A task chama outras tasks?
2. Usa templates?
3. Consulta checklists ou dados?
4. Usa arquivos do projeto ou comandos `sia`?

Cada dependência precisa existir (em squad: no squad primeiro, depois no `.sia-core/`). Defina `next` com os comandos que fazem sentido depois. Defina pelo menos uma condição que para a execução (pré-condição bloqueante ou linha de tratamento de erros que aborta): task sem veto deixa trabalho incompleto passar (`data/decision-heuristics-framework.md`).

### 6. Escrever a task

Use `templates/task-tmpl.md`: frontmatter da seção 8.1, seções fixas da 8.2, tabela de modos da 8.3 e regras de elicitação da 8.4. Alvo de 80 a 300 linhas, imperativo, frases curtas.

Segurança na task:

- Valide entradas: nomes sem `/`, `\` ou `..`
- Grave só no destino previsto
- Não monte comando de shell com entrada não validada
- Não exponha segredos na saída

Task que produz formato lido pela CLI (status da story, Resultado do QA, arquivo do gate, relatório de inspeção, handoff) segue exatamente a seção 6.2 do guia.

**Ponto de elicitação:** mostre o rascunho.

1. Aprovar
2. Ajustar

### 7. Ligar ao agente

Acrescente `{id}.md` em `dependencies.tasks` do agente dono e um comando que a execute:

```yaml
  - name: {comando}
    hat: {chapéu}               # só pm e dev
    args: '{args}'
    visibility: [full, quick]
    task: {id}.md
    description: '{descrição curta}'
```

Em squad, registre a task em `components.tasks` do `squad.yaml` (backup em `.sia/backups/{AAAAMMDD-HHmmss}/`). Task compartilhada (`agent: any`) entra nas `dependencies` de cada agente que a usa.

### 8. Validar e projetar

```bash
sia validate                    # ou sia validate --squad {nome}
sia sync
# sem sia no PATH: node .sia-core/cli/sia.js {comando}
```

Sem CLI, confira manualmente o checklist do autor (guia, seção 17).

### 9. Mostrar o resultado

Caminho, agente e comando, trecho de integração e o resultado da validação (ver Saída).

## Saída

```text
✅ Task criada: squads/vendas-b2b/tasks/generate-proposal.md
Agente: closer, comando *proposta
Integração no agente:
  dependencies:
    tasks:
      - generate-proposal.md
Validação: sia validate --squad vendas-b2b sem erros
Projeção: sia sync concluído
```

## Critérios de conclusão

- [ ] `id` igual ao nome do arquivo, em kebab-case, sem prefixo de agente
- [ ] Frontmatter completo: `hat` quando o agente é pm ou dev, `elicit` booleano, `depends_on` existente, `next` com comandos existentes
- [ ] Seções fixas, passos numerados e elicitação com opções numeradas
- [ ] Pelo menos uma condição de parada e a tabela de tratamento de erros
- [ ] Task ligada ao agente (dependencies e comando)
- [ ] `sia validate` sem erros e `sia sync` executado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Task com o mesmo id já existe | Ofereça `*modify-task {id}` ou um nome de variante |
| Dependência inexistente | Liste e ofereça criar (`*create-task`, template) ou remover |
| Agente inexistente | Sugira `*create-agent` ou `*extend-squad {nome} --add agent` |
| Alvo protegido pelo `boundary` | Explique a regra de alvo e sugira um squad |
| Falha de escrita | Verifique a permissão da pasta |
| Validação falha | Mostre os problemas, corrija e valide de novo |

## Handoff

Próximo passo: `@squad-creator *validate-framework` (ou `*validate-squad {nome}`) e `*sync-ide`.
