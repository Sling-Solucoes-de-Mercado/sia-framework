---
id: analyze-squad
title: Analisar um squad
agent: squad-creator
elicit: true
inputs:
  - 'nome (obrigatório): squad em squads/; sem nome, a task pergunta'
  - '--format (opcional): console (padrão), markdown ou json'
  - '--verbose (opcional): inclui o detalhe de cada arquivo'
  - '--no-suggestions (opcional): omite as sugestões de melhoria'
outputs:
  - 'Relatório com visão geral, inventário, cobertura e sugestões (console, squads/{nome}/ANALYSIS.md ou JSON)'
depends_on:
  data: [sia-authoring-guide.md, quality-dimensions-framework.md, tier-system-framework.md]
  schemas: [squad-schema.json]
next: [extend-squad, validate-squad]
source: [squad-creator-analyze.md]
---

# Analisar um squad

## Objetivo

Inventariar os componentes de um squad, medir a cobertura e sugerir melhorias priorizadas, para orientar o `*extend-squad`.

## Quando usar

- Para entender o que um squad contém (próprio, baixado ou migrado).
- Antes de estender um squad, para saber onde faltam tasks, workflows ou checklists.
- Não use para checar conformidade com o schema: use `*validate-squad`.

## Pré-condições

- [ ] Squad existe em `squads/{nome}/` com manifest legível

## Passos

### 1. Coletar as opções

**Ponto de elicitação:** sem nome, liste os squads (`sia squad list`) numerados e pergunte qual analisar. Depois:

Formato do relatório?

1. console (padrão): no chat
2. markdown: grava `squads/{nome}/ANALYSIS.md`
3. json: legível por máquina

Incluir sugestões de melhoria?

1. Sim (padrão)
2. Não

### 2. Verificar o squad

Pasta e manifest existem. Senão, `SQUAD_NOT_FOUND`.

### 3. Carregar a visão geral

Do `squad.yaml`: nome, versão, autor, licença, `sia.minVersion` e descrição. Campo ausente aparece como "não informado".

### 4. Inventariar os componentes

Liste os arquivos de cada pasta (ignore `.gitkeep`): `agents/`, `tasks/`, `workflows/`, `checklists/`, `templates/`, `data/` e `scripts/`. Para cada agente, anote o tier registrado em `## Colaboração` (ver `data/tier-system-framework.md`). Com `--verbose`, inclua tamanho e título de cada arquivo.

### 5. Calcular a cobertura

| Métrica | Cálculo |
|---------|---------|
| Agentes | agentes com pelo menos 1 task ÷ total de agentes (a task pertence ao agente indicado em `agent:` no frontmatter) |
| Tasks | tasks ÷ (2 × agentes), limitado a 100% (expectativa: 2 tasks por agente) |
| Pastas | pastas com arquivos ÷ 7 |
| Config | itens presentes ÷ 4: `README.md` e os três documentos de `config` (locais ou referenciados no `squad.yaml`) |

Barra de progresso com 10 posições: `█` por 10% e `░` no restante.

### 6. Gerar as sugestões

Salvo com `--no-suggestions`, aplique as regras na ordem:

| Prioridade | Condição | Sugestão | Ação |
|------------|----------|----------|------|
| alta | agente sem task | Criar tasks para os {n} agentes sem task | `*extend-squad {nome} --add task` |
| média | nenhum workflow e 3 tasks ou mais | Criar workflows que encadeiem as tasks relacionadas | `*extend-squad {nome} --add workflow` |
| média | nenhum checklist | Criar checklists de validação | `*extend-squad {nome} --add checklist` |
| baixa | item de config ausente | Criar os arquivos de config que faltam: {lista} | criar em `config/` |
| baixa | nenhum script e 5 tasks ou mais | Avaliar scripts de automação (implementados pelo `@dev`) | `*extend-squad {nome} --add script` |
| baixa | nenhum template | Criar templates para padronizar as saídas | `*extend-squad {nome} --add template` |

Se o usuário pedir avaliação da qualidade das entregas, aplique `data/quality-dimensions-framework.md` e anexe a nota ao relatório.

### 7. Formatar e entregar

- console: mostre o relatório (ver Saída)
- markdown: grave `squads/{nome}/ANALYSIS.md` com as mesmas seções em tabelas e informe o caminho
- json: objeto com `overview`, `inventory`, `coverage` e `suggestions`

## Saída

```text
=== Análise do squad: vendas-b2b ===

Visão geral
  Nome: vendas-b2b | Versão: 1.0.0 | Autor: Time Comercial | Licença: MIT | SIA mínimo: 1.0.0

Componentes
  Agentes (2): closer.md (tier 1), prospector.md (tier 0)
  Tasks (3): gerar-proposta.md, qualificar-lead.md, follow-up.md
  Workflows (0), Checklists (0), Data (0), Scripts (0): vazios
  Templates (1): proposta-tmpl.md

Cobertura
  Agentes: ██████████ 100% (2/2 com tasks)
  Tasks:   ████████░░  75% (3 de 4 esperadas)
  Pastas:  ████░░░░░░  43% (3/7 com arquivos)
  Config:  ██████████ 100% (4/4)

Sugestões
  1. [MÉDIA] Criar workflows que encadeiem as tasks relacionadas → *extend-squad vendas-b2b --add workflow
  2. [MÉDIA] Criar checklists de validação → *extend-squad vendas-b2b --add checklist

Próximo: *extend-squad vendas-b2b
```

## Critérios de conclusão

- [ ] Todas as 7 pastas inventariadas
- [ ] As 4 métricas de cobertura calculadas
- [ ] Sugestões priorizadas, com a ação de cada uma (salvo `--no-suggestions`)
- [ ] Relatório entregue no formato pedido

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `SQUAD_NOT_FOUND` | Mostre `*list-squads`; sugira `*create-squad` |
| `MANIFEST_PARSE_ERROR`: YAML inválido no `squad.yaml` | Pare; indique a linha e sugira `*validate-squad {nome}` |
| `PERMISSION_DENIED` | Informe o arquivo sem permissão de leitura |
| Inventário incompleto | Liste o que não foi lido e marque o relatório como parcial |

## Handoff

Próximo passo: `@squad-creator *extend-squad {nome}` com a sugestão de maior prioridade.
