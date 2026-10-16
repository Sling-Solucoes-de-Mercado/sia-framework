---
id: create-agent
title: Criar um agente
agent: squad-creator
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'propósito (obrigatório): o que o agente faz'
  - 'domínio (obrigatório): área de especialidade (ex.: copywriting, jurídico, vendas)'
  - 'alvo (obrigatório): squad existente (squads/{nome}/) ou framework (.sia-core/)'
  - 'especialista (opcional): pessoa de referência cujo método o agente segue'
  - 'material (opcional): arquivos com fontes do especialista ou do domínio'
  - 'modo (opcional): yolo, interactive ou preflight (padrão: interactive)'
outputs:
  - 'Agente em squads/{nome}/agents/{id}.md (ou .sia-core/agents/{id}.md)'
  - 'Tasks, templates, checklist operacional e pesquisa do agente'
  - 'Relatório do quality gate (agent-quality-gate.md) com a nota de maturidade'
depends_on:
  tasks: [create-task.md, create-deep-research-prompt.md, execute-checklist.md]
  templates: [agent-tmpl.md, task-tmpl.md, checklist-tmpl.md, research-prompt-tmpl.md]
  checklists: [agent-quality-gate.md]
  data: [sia-authoring-guide.md, tier-system-framework.md, quality-dimensions-framework.md, decision-heuristics-framework.md]
next: [validate-squad, sync-ide, create-workflow]
source: [create-agent.md]
---

# Criar um agente

## Objetivo

Criar um agente de domínio completo e operacional: pesquisado, com persona, comandos ligados a tasks, templates, checklist e quality gate aprovado, no formato de agente do SIA (guia de autoria, seção 7).

Agente criado sem pesquisa é fraco e genérico. Agente sem infraestrutura operacional é uma persona sem processo: sabe quem é, mas não sabe fazer nada de forma determinística. Se o processo de criação permite agente incompleto, agente incompleto vai ser criado.

## Quando usar

- Um squad precisa de um especialista novo (ex.: copywriter, revisor jurídico, analista de churn).
- Não use quando um agente ou chapéu existente resolve (passo 2).
- Não use para criar só o esqueleto de um agente: `*extend-squad {nome} --add agent`.

## Pré-condições

- [ ] Alvo definido: squad existente em `squads/{nome}/` ou framework (`.sia-core/`)
- [ ] Propósito e domínio informados

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO | 0 a 1 pergunta (o alvo, se faltar) | Pesquisa, cria e valida sem checkpoints; decisões listadas no resumo final |
| Interativo (padrão) | checkpoints nos passos 2, 3, 4, 5 e 7 | Confirma reuso, pesquisa, extração, rascunho e decisões do gate |
| Pre-Flight | todas as perguntas antes | Questionário (propósito, alvo, especialista, material, comandos, saídas esperadas); depois execução sem perguntas |

## Passos

### 1. Definir o contexto e o alvo

**Ponto de elicitação:** Onde o agente vai viver?

1. Squad existente (liste com `sia squad list`, numerados)
2. Squad novo: rode `*create-squad {nome}` primeiro e volte
3. Framework (`.sia-core/agents/`)

Regra de alvo: componente de projeto vai em `squads/{nome}/`; componente do framework vai em `.sia-core/`. Agente novo no framework muda a arquitetura de 5 agentes do SIA (guia, seções 1 e 4): exige story do `@pm` (`*create-story`), atualização do guia e da CLI e `boundary.frameworkProtection: false` no core-config. O caminho padrão é um chapéu novo num agente existente (`*modify-agent`) ou um agente de squad.

Classifique o agente:

- baseado em especialista (uma pessoa de referência): pesquisa obrigatória
- genérico: avise que agentes genéricos ficam mais fracos e sugira pesquisar especialistas de referência do domínio

Derive o `id` em kebab-case (ex.: Gary Halbert → `gary-halbert`; papel de fechamento → `closer`). Confira que o id não existe no alvo nem em `.sia-core/agents/`.

### 2. Aplicar REUSE > ADAPT > CREATE

Procure agentes que já cobrem o propósito:

```bash
grep -il "{termo do domínio}" .sia-core/agents/*.md squads/*/agents/*.md
```

Compare `whenToUse`, `persona.role`, comandos e chapéus (o `@pm` e o `@dev` têm vários).

| Achado | Decisão |
|--------|---------|
| Agente existente atende praticamente todo o propósito | REUSE: use o agente; nada é criado |
| Atende a maior parte, e a mudança não quebra quem o usa | ADAPT: `*modify-agent {id}` (comando ou chapéu novo) |
| Nada serve | CREATE: siga, registrando a justificativa |

Justificativa do CREATE: agentes avaliados, motivo técnico da rejeição de cada um e a capacidade nova que o agente traz.

**Ponto de elicitação:** mostre os candidatos e a recomendação.

1. Reusar {agente}
2. Adaptar {agente}
3. Criar um agente novo

### 3. Pesquisar

Material local primeiro: arquivos indicados pelo usuário, `squads/{nome}/data/` e documentos do projeto. Estime a cobertura do material frente ao propósito:

| Cobertura | Modo de pesquisa |
|-----------|------------------|
| 70% ou mais | complementar: só as lacunas |
| 30% a 69% | moderada |
| menos de 30% | completa |

Gere o prompt com a task `create-deep-research-prompt.md` (template `research-prompt-tmpl.md`): especialista, domínio, propósito, cobertura atual e lacunas, com 3 a 5 consultas específicas, o que extrair e o critério de suficiência. Execute as consultas com a busca na web (sem ela, use só o material local e registre a limitação), priorize fontes primárias e cite cada uma.

Grave em `squads/{nome}/data/{id}-research.md` (agente do framework: `.sia-core/data/{id}-research.md`) com: fontes usadas, metodologia extraída, frameworks principais e lacunas restantes.

**Gate SC_RES_002 (bloqueante):**

| Critério | Mínimo |
|----------|--------|
| fontes distintas | 5 |
| conteúdo extraído | 500 linhas |
| fontes primárias | sim |
| metodologia extraída | sim |
| afirmações citadas | 80% (inferência até 20%) |

Veto: menos de 3 fontes ("fontes insuficientes") ou nenhuma metodologia ("não existe agente sem metodologia"). Com veto, repita com outras consultas e escopo maior; se ainda faltar, ofereça criar o agente genérico com as lacunas como pendência.

**Ponto de elicitação:** resumo da pesquisa (fontes, cobertura, lacunas).

1. Seguir
2. Pesquisar mais
3. Cancelar

### 4. Extrair

Da pesquisa, extraia:

| Elemento | Mínimo | Destino |
|----------|--------|---------|
| Princípios | 5 a 12 | `persona.core_principles` |
| Framework operacional: passos, critérios de decisão, checagens de qualidade, padrões | 1 framework com 3 passos ou mais | tasks dos comandos e `data/` |
| Voz: tom, vocabulário, termos que nunca usa, expressões típicas, metáforas, estados de comportamento | 5 a 10 termos; especialista: 3 proibidos, 5 expressões, 3 metáforas, 2 estados | `persona_profile.communication` e, para especialista, uma seção de apoio `## Voz` |
| Armadilhas: o que nunca fazer e o que sempre fazer | 5 e 5 | `### Armadilhas comuns` e princípios |
| Exemplos de saída (entrada → saída) reais | 3 | `## Saída` das tasks e templates |
| Credibilidade do especialista: conquistas, obras, casos | 3 conquistas | `data/{id}-research.md` |

Classifique o tier pela árvore de `data/tier-system-framework.md` (seção 3), com a justificativa. Defina a persona: `role` (da pesquisa), `style` (da voz), `identity` (a essência), `focus` (o objetivo principal), arquétipo, saudações e assinatura.

Liste os comandos: cada comando operacional terá uma task; utilitários (`help`, `guide`, `yolo`, `exit`) não têm.

**Ponto de elicitação:** mostre princípios, persona, tier e comandos.

1. Aprovar
2. Ajustar
3. Pesquisar mais

### 5. Escrever o agente

Copie `templates/agent-tmpl.md` para `squads/{nome}/agents/{id}.md` (ou `.sia-core/agents/{id}.md`), preencha todos os placeholders e remova o comentário de cabeçalho. Siga o guia, seção 7:

- `IDE-FILE-RESOLUTION` do squad: `squads/{nome}/{type}/` primeiro, depois `.sia-core/{type}/`
- Todo comando operacional com `task:` listada em `dependencies.tasks`; `template:` e `checklist:` de comando também em `dependencies`
- `whenToUse` com exemplos e "NÃO use para", apontando o agente certo
- Saudação sem adjetivo com gênero
- `### Armadilhas comuns` com 5 itens ou mais; `## Colaboração` com a posição no fluxo (tier) e pelo menos 1 handoff de saída
- Voz coerente: exemplos e saudações usam o vocabulário do agente e nunca os termos proibidos

**Ponto de elicitação:** mostre o bloco YAML e as seções de apoio.

1. Aprovar
2. Ajustar

### 6. Criar a infraestrutura operacional

Para cada comando operacional:

1. **Task:** crie `tasks/{comando}.md` seguindo a task `create-task.md` (template `task-tmpl.md`), com `agent: {id}`, 3 passos ou mais, pelo menos 1 condição que para a execução, `## Saída` exemplificada e 2 critérios de conclusão ou mais. Conteúdo: o framework operacional do passo 4 e a pesquisa.
2. **Template:** comando que produz documento, relatório ou análise ganha `templates/{saída}-tmpl.md`, com título e data, resumo de 1 a 3 frases, corpo estruturado e recomendações. Comandos com a mesma forma de saída compartilham o template. Saída conversacional ou lista simples dispensa template.
3. **Checklist:** crie `checklists/{id}-quality-gate.md` a partir de `templates/checklist-tmpl.md`, derivado dos critérios de conclusão e das armadilhas: 3 itens bloqueantes ou mais, 2 recomendados ou mais e a regra "100% dos bloqueantes e 80% dos recomendados aprovam".
4. **Dados:** a pesquisa (`data/{id}-research.md`) e as bases que as tasks consultam.

Atualize `dependencies` do agente com tudo o que foi criado. Em squad, registre os arquivos em `components` do `squad.yaml` (backup em `.sia/backups/{AAAAMMDD-HHmmss}/`) e acrescente o agente, com o tier, à tabela do `README.md`.

### 7. Rodar o quality gate

Rode a task `execute-checklist.md` com `checklists/agent-quality-gate.md` (heurísticas SC_AGT_001 e SC_AGT_004) e calcule a maturidade (seção 10 do checklist). Use `data/quality-dimensions-framework.md` para avaliar os exemplos de saída e `data/decision-heuristics-framework.md` para a decisão:

| Resultado | Ação |
|-----------|------|
| FAIL: bloqueante falhou ou maturidade abaixo de 4,0 | Corrija e reavalie, no máximo 2 iterações; depois, salve como rascunho e peça revisão humana |
| CONDICIONAL: maturidade de 4,0 a 6,9 ou poucos recomendados | Ponto de elicitação abaixo |
| PASS: maturidade de 7,0 ou mais | Siga |

Correções típicas: princípios rasos → detalhar a partir da pesquisa; voz incompleta → completar vocabulário e saudações; poucos exemplos → extrair do material ou montar a partir da metodologia; comando sem task → criar a task.

**Ponto de elicitação (CONDICIONAL):** maturidade {nota}; lacunas: {lista}.

1. Corrigir agora (recomendado)
2. Seguir com as lacunas documentadas
3. Abortar a criação

### 8. Validar e projetar

```bash
sia validate --squad {nome}     # agente de squad
sia validate                    # agente do framework
sia sync
# sem sia no PATH: node .sia-core/cli/sia.js {comando}
```

Erros: corrija e valide de novo. Sem CLI, confira manualmente as seções 1 e 2 do quality gate e avise que a projeção nas IDEs fica pendente até o `sia sync` rodar.

### 9. Entregar o resumo

Mostre: nome, id, tier, arquivo, comandos, fontes da pesquisa, resultado do gate e maturidade, arquivos criados, justificativa do CREATE e, no modo YOLO, as decisões tomadas. Próximos passos: testar o agente com uma tarefa real na IDE (ativação conforme o resumo do `sia sync`), conferir que cada comando carrega a sua task, criar workflows que usem o agente (`*create-workflow`) e enriquecer as tasks com mais detalhe da pesquisa.

## Saída

| Artefato | Local |
|----------|-------|
| Agente | `squads/{nome}/agents/{id}.md` (ou `.sia-core/agents/{id}.md`) |
| Tasks | `squads/{nome}/tasks/{comando}.md` |
| Templates | `squads/{nome}/templates/{saída}-tmpl.md` |
| Checklist | `squads/{nome}/checklists/{id}-quality-gate.md` |
| Pesquisa | `squads/{nome}/data/{id}-research.md` |
| Manifest e README | `squads/{nome}/squad.yaml` e `README.md` atualizados |

```text
✅ Agente criado: closer (Rita), tier 1
Arquivo: squads/vendas-b2b/agents/closer.md
Comandos: *proposta, *objecoes, *fechamento
Pesquisa: 8 fontes, cobertura de 92%
Quality gate: PASS (EXCELENTE), maturidade 8,5/10, Nível 3
Criados: 3 tasks, 2 templates, 1 checklist, 1 base de dados
Justificativa: nenhum agente existente cobre negociação e fechamento B2B
Próximo: *validate-squad vendas-b2b, *sync-ide
```

## Critérios de conclusão

- [ ] REUSE > ADAPT > CREATE aplicado, com justificativa quando houve criação
- [ ] Gate SC_RES_002 aprovado (ou pendências aceitas pelo usuário)
- [ ] Agente no formato da seção 7 do guia, com tier e posição no fluxo
- [ ] Task para cada comando operacional, com passos, condição de parada, saída exemplificada e critérios
- [ ] Pelo menos 1 checklist operacional com itens bloqueantes
- [ ] Quality gate em PASS (ou CONDICIONAL aceito pelo usuário), com a maturidade registrada
- [ ] `sia validate` sem erros e `sia sync` executado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Squad do alvo não existe | Sugira `*create-squad` primeiro |
| id já existe no alvo ou no `.sia-core` | Sugira outro id ou `*modify-agent {id}` |
| Pesquisa insuficiente | Repita com outras consultas e escopo maior; se persistir, agente genérico com pendências, com o acordo do usuário |
| Quality gate falha após 2 iterações | Salve como rascunho, liste as falhas e peça revisão humana |
| Alvo no framework com `frameworkProtection: true` | Pare; explique a regra de alvo e ofereça squad ou chapéu novo |
| `sia validate` com erros | Corrija e valide de novo antes do `sia sync` |

## Handoff

Próximo passo: `@squad-creator *validate-squad {nome}` e `*sync-ide`; para encadear o agente com outros, `*create-workflow`.
