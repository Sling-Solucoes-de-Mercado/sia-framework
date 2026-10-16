---
id: optimize-performance
title: Otimizar o desempenho
agent: dev
hat: dev
elicit: true
inputs:
  - 'caminho (obrigatório): arquivo ou diretório a analisar'
  - 'opções (opcional): --patterns, --focus {categoria}, --threshold low|medium|high, --profile, --apply {id}, --recursive, --exclude, --report {arquivo}'
outputs:
  - 'Análise de desempenho por categoria, com nota por arquivo e recomendações priorizadas'
  - 'Otimização aplicada, testada e medida (antes e depois), em commit local perf: ... [Story {storyId}]'
  - 'Relatório opcional no arquivo indicado em --report'
next: [run-tests, tech-debt]
source: [dev-optimize-performance.md]
---

# Otimizar o desempenho

## Objetivo

Encontrar gargalos de tempo de execução, memória e escala, propor otimizações com melhoria estimada e aplicá-las de forma segura, medindo antes e depois.

## Quando usar

- Lentidão percebida, critério de desempenho numa story ou achado de desempenho do QA.
- Revisão de rotas quentes antes de uma entrega com carga maior.
- Não use para: análise de query e índices no banco em profundidade (`@dev` [Dados] `*db-performance`), refatoração sem objetivo de desempenho (`*improve-code`).

## Parâmetros

| Parâmetro | Padrão | Uso |
|-----------|--------|-----|
| `{caminho}` | obrigatório | Arquivo ou diretório |
| `--patterns a,b` | todos | Padrões a verificar (tabela abaixo) |
| `--focus {categoria}` | todas | `algorithm`, `memory`, `async`, `database`, `bundle`, `react` |
| `--threshold` | `low` | Impacto mínimo: `low` (todos), `medium` (medium, high, critical), `high` (high, critical) |
| `--profile` | desligado | Medição em execução, quando o projeto permitir |
| `--apply {id}` | | Aplica uma otimização específica, após confirmação |
| `--recursive` / `--exclude a,b` | | Escopo de diretórios e arquivos ignorados |
| `--report {arquivo}` | | Grava o relatório |

| Padrão | Categoria | O que procura |
|--------|-----------|---------------|
| `algorithm_complexity` | algorithm | Algoritmos O(n²) ou piores |
| `loop_optimization` | algorithm | Laços aninhados e iterações redundantes |
| `memory_usage` | memory | Alocações excessivas e vazamentos |
| `async_operations` | async | `await` em sequência que poderia ser paralelo |
| `caching` | caching | Cálculos caros repetidos (memoização) |
| `database_queries` | database | N+1 e consultas dentro de laços |
| `bundle_size` | bundle | Imports pesados, falta de tree-shaking e de carga sob demanda |
| `react_performance` | react | Re-render desnecessário, falta de memoização |
| `string_operations` | other | Manipulação de string custosa |
| `object_operations` | other | Criação e cópia de objetos em excesso |

## Pré-condições

- [ ] O caminho existe e contém arquivos elegíveis (ignore testes, `node_modules`, `dist/`, `build/` e `.min.`).
- [ ] Para aplicar: story associada em `InProgress` (Artigo III). Sem story, emita WARN e aplique só com confirmação explícita, registrando a decisão.
- [ ] Testes do trecho afetado existentes ou criados antes da otimização (sem teste, não há como provar que o comportamento ficou igual).

## Passos

### 1. Detectar

1. Leia o código e localize as rotas quentes (endpoints, laços principais, renderizações frequentes, jobs).
2. Rode os detectores dos padrões selecionados e calcule métricas de complexidade.
3. Com `--profile`, meça em execução (tempo, memória, número de consultas) com a ferramenta disponível no projeto.
4. Classifique cada problema por impacto: `critical`, `high`, `medium` ou `low`. Aplique `--threshold` e `--focus`.

### 2. Analisar e recomendar

1. Agrupe os problemas por categoria e por arquivo.
2. Dê a cada arquivo uma nota de desempenho de 0 a 100 (80 ou mais: bom; 60 a 79: atenção; abaixo de 60: crítico).
3. Para cada problema, proponha a otimização com exemplo de código e a melhoria estimada.
4. Monte as recomendações principais (até 5), em ordem `critical` > `high` > `medium` > `low`:

| Situação encontrada | Recomendação | Prioridade |
|---------------------|--------------|------------|
| Funções O(n²) ou piores marcadas como críticas | Trocar por algoritmo ou estrutura de dados mais eficiente | critical |
| Consultas ao banco dentro de laço (N+1) | Usar JOIN ou carga em lote | critical |
| `await` independentes em sequência | Paralelizar com `Promise.all` | high |
| Alocações altas ou vazamento | Revisar alocações e estruturas de dados | medium |
| Cálculo caro repetido | Memoizar ou usar cache | medium |

### 3. Apresentar

```text
Análise de desempenho: 3 arquivos, 6 oportunidades

🗄️ Consultas ao banco
  src/orders/order.service.ts · Nota 54/100
  [CRITICAL] Consulta de itens dentro do laço de pedidos (N+1) · linha 88
  💡 Carregar os itens de todos os pedidos numa consulta (IN) e agrupar em memória
     Melhoria estimada: de 101 para 2 consultas por página

⚡ Operações assíncronas
  src/dashboard/loader.ts · Nota 71/100
  [HIGH] 3 await independentes em sequência · linhas 12-20
  💡 Promise.all([...]) · Melhoria estimada: ~60% menos latência

Resumo: média 68/100 · critical 1 · high 2 · medium 3
Recomendações: 1. Corrigir N+1  2. Paralelizar operações assíncronas  3. Memoizar cálculo de totais
```

Sem `--apply`, termine com os próximos passos: revisar os críticos primeiro, aplicar de forma incremental, testar e medir cada otimização.

### 4. Aplicar (com `--apply {id}` ou escolha numerada)

1. Mostre a otimização (arquivo, tipo, mudanças) e peça confirmação (1. Aplicar, 2. Cancelar).
2. Meça antes (tempo, memória, consultas ou tamanho do bundle) com o mesmo método que usará depois.
3. Aplique uma otimização por vez, preservando a legibilidade; documente no código a otimização não óbvia.
4. Rode os testes do trecho e confira os casos de borda. Quebrou: reverta e marque como falha.
5. Meça depois e registre a diferença. Sem ganho mensurável: reverta (evite otimização prematura).

### 5. Validar e registrar

1. Rode os `quality.scripts` do core-config (ausentes são registrados).
2. Commit local `perf: {resumo} [Story {storyId}]`; atualize a File List e o `### Log de debug` da story com as medições.
3. Com `--report`: grave por arquivo a nota, os problemas, os críticos, as sugestões e as otimizações aplicadas com antes e depois.
4. Oportunidade relevante não aplicada: ofereça registrar com `*tech-debt`.

## Saída

- Análise por categoria, notas por arquivo e recomendações principais.
- Otimizações aplicadas com medição antes e depois, testes passando e commit local.
- Relatório, quando pedido.

## Critérios de conclusão

- [ ] Problemas classificados por impacto e filtrados por `--threshold` e `--focus`
- [ ] Recomendações principais em ordem de prioridade
- [ ] Cada otimização aplicada com confirmação, medição antes e depois e testes passando
- [ ] Otimizações sem ganho ou que quebraram algo foram revertidas
- [ ] Commit local com `[Story {storyId}]` e File List atualizada (quando houve mudança)

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nenhum problema encontrado | Informe que o código analisado não tem oportunidades acima do limiar |
| `--threshold` inválido | Erro: use `low`, `medium` ou `high` |
| Id de otimização não encontrado | Refaça a análise; persistindo, informe o erro |
| Sem testes no trecho | Crie os testes antes de otimizar (`*generate-tests`) |
| Otimização quebra teste ou não melhora a medição | Reverta e registre |
| Problema exige mudança de schema ou índice | Encaminhe ao `@dev` [Dados] (`*db-performance`) |

## Handoff

Próximo passo: `*run-tests`. Oportunidades não aplicadas: `*tech-debt`.
