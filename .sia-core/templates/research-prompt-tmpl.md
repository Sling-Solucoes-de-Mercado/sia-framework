<!--
Template de prompt de pesquisa aprofundada do SIA.
Usado por: task create-deep-research-prompt, em @pm [Análise] *research {tema} e @dev [Arquitetura] *research {tema}.
Gera um prompt estruturado para ferramentas de pesquisa aprofundada (deep research), sobre a metodologia real de
um especialista ou sobre um tema. Serve para embasar decisões e para criar agentes de squad.

Como usar:
1. Substitua cada {{variavel}} pelo valor real.
2. Escolha os 4 a 6 ângulos de escopo mais relevantes nos modelos por domínio (ou crie os seus).
3. Adapte os subpontos ao propósito específico.
4. Ajuste o modo de pesquisa ao material local existente (abrangente ou complementar).
5. No modo YOLO, pule as perguntas de esclarecimento.
6. Pesquisa por tema, sem especialista: use o título "Prompt de Pesquisa Aprofundada: {{topic}}" e escreva o Tópico Refinado a partir do tema.
Linhas marcadas com "repita" se repetem para cada item.
-->

# Template de Prompt de Pesquisa Aprofundada

## Variáveis

| Variável | Tipo | Descrição | Exemplo |
|----------|------|-----------|---------|
| `{{specialist_name}}` | texto | Nome do especialista humano | "Gary Halbert" |
| `{{specialist_slug}}` | texto | Nome em formato slug | "gary_halbert" |
| `{{topic}}` | texto | Tema da pesquisa, quando não há especialista | "Autenticação passwordless em SaaS B2B" |
| `{{activity}}` | texto | Atividade específica | "sales-page" |
| `{{activity_expanded}}` | texto | Descrição expandida da atividade | "Criação de Página de Vendas" |
| `{{domain}}` | texto | Área de domínio | "copywriting" |
| `{{time_period}}` | texto | Período relevante | "1970-2007" |
| `{{topic_description}}` | texto | Recorte do tópico refinado | "os 5 níveis de consciência aplicados a títulos" |
| `{{context_paragraph}}` | texto | Por que a pesquisa existe e o que já se tem | parágrafo curto |
| `{{research_objective}}` | texto | Decisão ou entrega que a pesquisa vai embasar | "Definir o processo de criação de títulos do agente" |
| `{{agent_purpose}}` | texto | O que o agente ou a entrega vai fazer | "Criar páginas de vendas de alta conversão" |
| `{{primary_questions}}` | lista | Perguntas obrigatórias, por prioridade | 3 a 5 perguntas |
| `{{secondary_questions}}` | lista | Perguntas desejáveis | contexto, olhar para o futuro |
| `{{scope_items}}` | lista | 4 a 6 ângulos de pesquisa | ver modelos de escopo |
| `{{requirements}}` | lista | 3 a 4 parâmetros de pesquisa | ver modelos de requisitos |
| `{{data_requirements}}` | texto | Qualidade, recência e credibilidade dos dados | "fontes primárias; exemplos documentados" |
| `{{analysis_frameworks}}` | texto | Frameworks de análise e critérios de comparação | "classificar por nível de consciência" |
| `{{sources}}` | lista | 3 a 4 tipos de fonte | ver modelos de fontes |
| `{{deliverables}}` | lista | 3 a 5 resultados esperados | ver modelos de entregáveis |
| `{{success_criteria}}` | lista | Como saber que a pesquisa cumpriu o objetivo | "5 exemplos reais por nível" |
| `{{timeline_priority}}` | texto | Prazo e prioridade (opcional) | "até sexta; prioridade alta" |
| `{{local_knowledge_note}}` | texto | Material já disponível | "Já temos 3.520 linhas..." |
| `{{clarifying_questions}}` | lista | Perguntas de esclarecimento ao usuário (opcional) | — |

---

## Template do Prompt

```markdown
# Prompt de Pesquisa Aprofundada: Metodologia de {{activity_expanded}} de {{specialist_name}}

---

## TÓPICO REFINADO

"A Engenharia de {{activity_expanded}} de {{specialist_name}}: {{topic_description}} ({{time_period}})"

---

## CONTEXTO E OBJETIVO

{{context_paragraph}}

**Objetivo da pesquisa:** {{research_objective}}

---

## PERGUNTAS DA PESQUISA

### Primárias (obrigatórias)

<!-- repita, em ordem de prioridade; indique as dependências entre perguntas -->
{{question_number}}. {{primary_question}}

### Secundárias (desejáveis)

<!-- repita -->
- {{secondary_question}}

---

## ESCOPO

<!-- repita para cada ângulo (4 a 6) -->
### {{scope_number}}. {{scope_title}}

<!-- repita para cada subponto -->
- {{scope_sub_point}}

---

## REQUISITOS

<!-- repita -->
{{requirement_number}}. {{requirement_text}}

---

## METODOLOGIA

- **Requisitos dos dados:** {{data_requirements}}
- **Frameworks de análise e critérios de comparação:** {{analysis_frameworks}}

---

## FONTES RECOMENDADAS

<!-- repita -->
- {{source}}

---

## RESULTADOS ESPERADOS

**Resumo executivo:** principais achados, implicações e ações recomendadas.

<!-- repita -->
{{deliverable_number}}. "{{deliverable_name}}": {{deliverable_description}}

**Materiais de apoio:** tabelas, matrizes de comparação e lista de fontes.

---

## CRITÉRIOS DE SUCESSO

<!-- repita -->
- {{success_criterion}}

---

## PRAZO E PRIORIDADE (opcional)

{{timeline_priority}}

---

## PERGUNTAS DE ESCLARECIMENTO (opcional)

<!-- repita; omita no modo YOLO -->
{{question_number}}. {{clarifying_question}}

---

## NOTAS DE PESQUISA

**Material existente:** {{local_knowledge_note}}
**Modo de pesquisa:** Complementar (foco nas lacunas)
<!-- Sem material local: "**Material existente:** Nenhum encontrado" e "**Modo de pesquisa:** Abrangente" -->
```

---

## Modelos de Escopo por Domínio

### Copywriting (baseado em especialista)

```yaml
scope_templates:
  copywriting:
    - title: "A METODOLOGIA CENTRAL DE {{SPECIALIST_NAME}}"
      sub_points:
        - 'Princípios e regras fundamentais (declarações explícitas)'
        - 'Processo do início ao fim'
        - 'Critérios de qualidade usados para avaliar o trabalho'
        - 'O que considerava erros e antipadrões'

    - title: 'ANATOMIA E ESTRUTURA DE {{OUTPUT_TYPE}}'
      sub_points:
        - 'Quebra seção a seção'
        - 'Propósito de cada seção'
        - 'Transições entre seções'
        - 'Diretrizes de tamanho e proporção'

    - title: 'EXEMPLOS REAIS ANALISADOS'
      sub_points:
        - 'Os trabalhos mais conhecidos de {{specialist_name}}'
        - 'Análise linha a linha ou seção a seção'
        - 'O que os tornou eficazes'
        - 'Padrões comuns entre os vencedores'

    - title: 'PROCESSO DE CRIAÇÃO'
      sub_points:
        - 'Fase de pesquisa antes de escrever'
        - 'Metodologia de rascunho'
        - 'Processo de revisão e edição'
        - 'Teste e iteração'

    - title: 'ADAPTAÇÃO MODERNA ({{current_year}})'
      sub_points:
        - 'Equivalentes digitais das técnicas originais'
        - 'Quais princípios continuam atemporais'
        - 'O que precisa de ajuste para o contexto atual'
        - 'Considerações específicas de cada plataforma'

    - title: 'CRITÉRIOS DE QUALIDADE E CHECKLISTS'
      sub_points:
        - 'Como {{specialist_name}} avaliava o próprio trabalho'
        - 'Sinais de alerta'
        - 'Critérios de aprovação antes de publicar'
        - 'Comparação entre exemplos excelentes e fracos'
```

### Gestão de Produto (genérico)

```yaml
scope_templates:
  product_management:
    - title: 'COMPARAÇÃO DE FRAMEWORKS'
      sub_points:
        - 'Principais frameworks da área'
        - 'Quando usar cada abordagem'
        - 'Prós e contras de cada um'
        - 'Possibilidades de integração'

    - title: 'PROCESSO E METODOLOGIA'
      sub_points:
        - 'Fluxo passo a passo'
        - 'Pontos-chave de decisão'
        - 'Entradas e saídas de cada etapa'
        - 'Diretrizes de alocação de tempo'

    - title: 'TÉCNICAS E FERRAMENTAS'
      sub_points:
        - 'Técnicas específicas, com o passo a passo'
        - 'Ferramentas que apoiam o processo'
        - 'Templates e artefatos'
        - 'Abordagens de facilitação'

    - title: 'ESTUDOS DE CASO'
      sub_points:
        - 'Exemplos reais'
        - 'O que funcionou e por quê'
        - 'O que falhou e as lições aprendidas'
        - 'Métricas e resultados'

    - title: 'ERROS COMUNS'
      sub_points:
        - 'Antipadrões a evitar'
        - 'Sinais de alerta de problemas'
        - 'Estratégias de recuperação'
        - 'Técnicas de prevenção'
```

### Vendas (baseado em especialista)

```yaml
scope_templates:
  sales:
    - title: 'A FILOSOFIA DE VENDAS DE {{SPECIALIST_NAME}}'
      sub_points:
        - 'Crenças centrais sobre vender'
        - 'Mentalidade e abordagem'
        - 'Relação com o cliente'
        - 'Ética e limites'

    - title: 'ESTRUTURA DE {{OUTPUT_TYPE}}'
      sub_points:
        - 'Metodologia de abertura e gancho'
        - 'Processo de descoberta e qualificação'
        - 'Framework de apresentação'
        - 'Tratamento de objeções'
        - 'Técnicas de fechamento'

    - title: 'ROTEIROS E LINGUAGEM'
      sub_points:
        - 'Frases exatas que funcionam'
        - 'Perguntas a fazer'
        - 'Transições entre as fases'
        - 'Linguagem a evitar'

    - title: 'EXEMPLOS REAIS'
      sub_points:
        - 'Vendas e negociações documentadas'
        - 'O que as fez funcionar'
        - 'Variações para contextos diferentes'

    - title: 'MÉTRICAS E OTIMIZAÇÃO'
      sub_points:
        - 'Indicadores-chave de desempenho'
        - 'Como medir a eficácia'
        - 'Metodologia de iteração'
```

---

## Modelos de Requisitos por Modo de Pesquisa

### Abrangente (sem material local)

```yaml
requirements_comprehensive:
  - 'Priorizar fontes primárias (palavras do próprio especialista, obras originais)'
  - 'Incluir a análise detalhada de pelo menos 3 exemplos reais'
  - 'Extrair processos operacionais, não só teoria'
  - 'Documentar o que FAZER e o que NÃO fazer'
```

### Complementar (com material local)

```yaml
requirements_complementary:
  - 'Focar nas lacunas do material existente: {{gaps_list}}'
  - 'Cruzar com as fontes locais para manter a consistência'
  - 'Priorizar exemplos novos, ainda não documentados'
  - 'Acrescentar contexto atual e adaptação digital'
```

---

## Modelos de Fontes por Domínio

### Copywriting

```yaml
sources_copywriting:
  specialist_based:
    - '"{{book_title}}", de {{specialist_name}} (em especial {{chapters}})'
    - 'Arquivo de newsletters e cartas de {{specialist_name}}'
    - 'Seminários e entrevistas com {{specialist_name}}'
    - 'Análises de profissionais que estudaram {{specialist_name}}'

  generic:
    - 'Livros clássicos de copywriting (Ogilvy, Hopkins, Schwartz)'
    - 'AWAI e materiais de treinamento do setor'
    - 'Estudos de caso de campanhas bem-sucedidas'
    - 'Pesquisa acadêmica sobre persuasão'
```

### Gestão de Produto

```yaml
sources_product:
  - '"The Mom Test", de Rob Fitzpatrick'
  - '"Continuous Discovery Habits", de Teresa Torres'
  - '"Inspired", de Marty Cagan'
  - 'Blogs de gestão de produto (Lenny''s Newsletter etc.)'
```

### Vendas

```yaml
sources_sales:
  specialist_based:
    - 'Livros de {{specialist_name}}'
    - 'Programas de treinamento e cursos'
    - 'Participações em podcasts e entrevistas'
    - 'Depoimentos de profissionais e estudos de caso'

  generic:
    - 'SPIN Selling, The Challenger Sale etc.'
    - 'Comparações entre metodologias de vendas'
    - 'Pesquisas sobre CRM e sales enablement'
```

---

## Modelos de Entregáveis

### Conjunto padrão

```yaml
deliverables_standard:
  - name: 'Template de Estrutura de {{Activity}}'
    description: 'Anatomia completa, com todas as seções e seus propósitos'

  - name: 'Fluxo do Processo de {{Specialist}}'
    description: 'Metodologia passo a passo, da pesquisa à conclusão'

  - name: 'Checklist de Qualidade'
    description: 'Critérios de validação derivados dos padrões do especialista'

  - name: 'Base de Exemplos'
    description: '{{N}}+ exemplos reais com análise estrutural'

  - name: 'Guia de Antipadrões'
    description: 'Erros comuns e como evitá-los'
```

### Conjunto estendido (pesquisa aprofundada)

```yaml
deliverables_extended:
  - name: 'Blueprint de {{Activity}}'
    description: 'Template mestre com todas as seções, propósitos e exemplos'

  - name: 'Banco de Frases e Linguagem'
    description: '{{N}}+ frases comprovadas: aberturas, transições e fechamentos'

  - name: 'Framework de Decisão'
    description: 'Quando usar cada abordagem ou variação'

  - name: 'Guia de Adaptação'
    description: 'Como ajustar para contextos e públicos diferentes'

  - name: 'Framework de Medição'
    description: 'Como avaliar a eficácia'
```

---

## Exemplo: Prompt Renderizado

### Variáveis de entrada

```yaml
specialist_name: 'Eugene Schwartz'
specialist_slug: 'eugene_schwartz'
activity: 'headlines'
activity_expanded: 'Criação de Títulos'
domain: 'copywriting'
time_period: '1950-1995'
agent_purpose: 'Criar títulos que capturam a atenção e qualificam o público'
local_knowledge_note: 'Temos trechos de "Breakthrough Advertising" (450 linhas)'
```

### Saída renderizada

```markdown
# Prompt de Pesquisa Aprofundada: Metodologia de Criação de Títulos de Eugene Schwartz

---

## TÓPICO REFINADO

"A Engenharia de Títulos de Eugene Schwartz: os 5 Níveis de Consciência aplicados à construção
de títulos que capturam a atenção e qualificam o público (1950-1995)"

---

## CONTEXTO E OBJETIVO

Construção de um agente de IA para criar títulos que capturam a atenção e qualificam o público,
seguindo a metodologia REAL de Eugene Schwartz. Já temos 450 linhas de trechos de
"Breakthrough Advertising". É preciso extrair frameworks operacionais de criação de títulos para
todos os níveis de consciência, com exemplos reais e a metodologia de teste.

**Objetivo da pesquisa:** definir o processo de criação de títulos do agente, nível a nível.

---

## PERGUNTAS DA PESQUISA

### Primárias (obrigatórias)

1. Como Schwartz diagnosticava o nível de consciência do mercado antes de escrever um título?
2. Que estruturas de título ele usava em cada nível de consciência?
3. Como ele criava, testava e escolhia o título vencedor? (depende da 2)

### Secundárias (desejáveis)

- Como a sofisticação do mercado mudava o título?
- O que continua válido para anúncios digitais atuais?

---

## ESCOPO

### 1. OS 5 NÍVEIS DE CONSCIÊNCIA NA PRÁTICA (não na teoria)

- Inconsciente: títulos que funcionaram, estrutura comum
- Consciente do problema: títulos que funcionaram, estrutura comum
- Consciente da solução: títulos que funcionaram, estrutura comum
- Consciente do produto: títulos que funcionaram, estrutura comum
- Totalmente consciente: títulos que funcionaram, estrutura comum
- Como DIAGNOSTICAR em que nível o mercado está

### 2. MECANISMO DE CRIAÇÃO DE TÍTULOS

- O processo de Schwartz em blocos de trabalho de 33 minutos
- Quantos títulos criava antes de escolher
- Critérios de seleção: o que tornava um título "vencedor"
- Uso do swipe file: como usava referências

### 3. ESTRUTURAS RECORRENTES

- Padrões identificáveis nos títulos de Schwartz
- "Palavras de poder" usadas com frequência
- Fórmulas de título (se existiam)
- Tamanho ideal por contexto

### 4. SOFISTICAÇÃO DO MERCADO (diferente de consciência)

- Os 5 níveis de sofisticação
- Como isso afetava o título
- Quando usar "novo", "melhorado" ou "diferente"
- Mercados saturados versus mercados virgens

### 5. CASOS DOCUMENTADOS

- Títulos de "Breakthrough Advertising"
- Títulos de venda por correspondência que escreveu
- Resultados documentados de testes A/B
- Títulos rejeitados versus aprovados (se documentados)

---

## REQUISITOS

1. Priorizar "Breakthrough Advertising" como fonte primária
2. Incluir títulos REAIS com análise estrutural
3. Diferenciar a teoria (livro) da prática (campanhas reais)
4. Extrair checklists operacionais e critérios de decisão

---

## METODOLOGIA

- **Requisitos dos dados:** fontes primárias e exemplos documentados; separar o que é do livro do que veio de campanhas reais
- **Frameworks de análise e critérios de comparação:** classificar cada título por nível de consciência e de sofisticação; comparar estruturas entre níveis

---

## FONTES RECOMENDADAS

- "Breakthrough Advertising" (completo, com foco nos exemplos)
- Anúncios de venda por correspondência de Schwartz (Rodale, Boardroom)
- Entrevistas com Schwartz (raras, mas existem)
- Análises de Brian Kurtz sobre Schwartz
- Arquivos da Boardroom Inc.

---

## RESULTADOS ESPERADOS

**Resumo executivo:** principais achados, implicações e ações recomendadas.

1. "Diagnóstico do Nível de Consciência": como identificar o nível do mercado
2. "Templates de Título por Nível": de 5 a 10 estruturas para cada nível
3. "Processo de Criação de Títulos de Schwartz": fluxo documentado
4. "Matriz de Avaliação de Sofisticação": diagrama de decisão
5. "50 Títulos Analisados": base com estrutura, nível e resultado

**Materiais de apoio:** tabelas, matrizes de comparação e lista de fontes.

---

## CRITÉRIOS DE SUCESSO

- Cada nível de consciência com pelo menos 5 títulos reais analisados
- Processo de criação documentado passo a passo, com a fonte de cada passo

---

## NOTAS DE PESQUISA

**Material existente:** 450 linhas de trechos de "Breakthrough Advertising"
**Modo de pesquisa:** Complementar (foco em exemplos reais e detalhes do processo)
**Lacunas a preencher:** metodologia de teste, mais exemplos reais de títulos, framework de sofisticação
```

---

## Notas de Uso

1. **Substituição de variáveis:** troque todas as `{{variaveis}}` pelos valores reais.
2. **Seleção de escopo:** escolha os 4 a 6 ângulos mais relevantes nos modelos.
3. **Adaptação:** ajuste os subpontos ao propósito específico.
4. **Material local:** defina o modo de pesquisa conforme o material existente.
5. **Modo YOLO:** pule as perguntas de esclarecimento na execução autônoma.
