---
id: create-deep-research-prompt
title: Criar prompt de pesquisa aprofundada
agent: any
elicit: true
inputs:
  - 'tema: assunto da pesquisa (argumento do *research)'
  - 'entradas (opcional): project brief, resultado de brainstorming, pesquisa de mercado, PRD, arquitetura'
outputs:
  - 'Prompt de pesquisa em Markdown no formato de templates/research-prompt-tmpl.md, apresentado ao usuário e gravado em arquivo quando ele pedir'
depends_on:
  templates: [research-prompt-tmpl.md]
next: [create-project-brief, market-research, create-adr]
source: [create-deep-research-prompt.md]
---

# Criar prompt de pesquisa aprofundada

## Objetivo
Montar, junto com o usuário, um prompt de pesquisa bem estruturado (objetivos, perguntas, metodologia e entregáveis) para uma investigação profunda feita por um assistente de IA com pesquisa, por pessoas ou pelos dois.

## Quando usar
- `@pm *research {tema}` (chapéu Análise): validação de produto, mercado, usuários, concorrência, estratégia.
- `@dev *research {tema}` (chapéu Arquitetura): tecnologias, abordagens técnicas, construir, comprar ou integrar.
- Não use para pesquisar dependências de uma story no Spec Pipeline: isso é `research-dependencies` (`@pm *research-deps`).

## Pré-condições
- [ ] Tema informado ou obtido na primeira pergunta
- [ ] Documentos de entrada citados pelo usuário localizados

## Passos

### 1. Escolher o foco da pesquisa
Com base no tema e nos documentos de entrada, apresente as opções e peça a escolha pelo número:

1. **Validação de produto:** hipóteses e encaixe no mercado, suposições sobre necessidades, viabilidade técnica e de negócio, riscos e mitigação.
2. **Oportunidade de mercado:** tamanho e crescimento, segmentos e dinâmica, estratégias de entrada, momento e prontidão do mercado.
3. **Usuários e clientes:** personas e comportamentos, jobs-to-be-done e dores, jornada e pontos de contato, disposição a pagar.
4. **Inteligência competitiva:** posicionamento dos concorrentes, comparação de funcionalidades, modelos de negócio, vantagens e lacunas.
5. **Tecnologia e inovação:** tendências, abordagens técnicas e arquiteturas, tecnologias emergentes, construir, comprar ou firmar parceria.
6. **Setor e ecossistema:** cadeia de valor, principais atores e relações, fatores regulatórios, oportunidades de parceria.
7. **Opções estratégicas:** direções estratégicas, modelos de negócio alternativos, go-to-market, caminhos de expansão.
8. **Risco e viabilidade:** fatores de risco, desafios de implementação, recursos necessários, implicações legais.
9. **Foco personalizado:** objetivos definidos pelo usuário, domínio específico, necessidades transversais.

### 2. Processar as entradas
| Entrada | O que extrair |
|---------|---------------|
| Project brief | conceitos e objetivos do produto, usuários e casos de uso, restrições e preferências técnicas, incertezas e suposições |
| Resultado de brainstorming | ideias e temas principais, áreas a validar, hipóteses a testar, direções criativas a explorar |
| Pesquisa de mercado | oportunidades identificadas, insights a aprofundar, achados a validar, possibilidades adjacentes |
| Nenhuma (do zero) | contexto essencial por perguntas, espaço do problema, objetivos da pesquisa, critérios de sucesso |

Se já existe material local sobre o tema, a pesquisa é **complementar** (foco nas lacunas); sem material, é **abrangente**.

### 3. Construir os componentes com o usuário
Desenvolva cada componente em colaboração, uma parte por vez.

**A. Objetivos:** objetivo principal e propósito; decisões que a pesquisa vai apoiar; critérios de sucesso; restrições e limites.

**B. Perguntas:**
- principais (obrigatórias): perguntas centrais, com prioridade e dependências entre elas;
- secundárias (desejáveis): contexto adicional, insights complementares, olhar para o futuro.

**C. Metodologia:**
- coleta: fontes secundárias, abordagens primárias (se couber), requisitos de qualidade dos dados, critérios de credibilidade das fontes;
- análise: frameworks a aplicar, critérios de comparação, métodos de avaliação, forma de síntese.

**D. Saída esperada:**
- formato: resumo executivo, estrutura dos achados, tabelas e visuais, documentação de apoio;
- entregáveis: seções e insights obrigatórios, elementos de apoio à decisão, recomendações acionáveis, registro de riscos e incertezas.

**Ponto de elicitação:** em cada componente, proponha um rascunho a partir do contexto e peça ajustes antes de seguir.

### 4. Gerar o prompt
Preencha `templates/research-prompt-tmpl.md` com os componentes. Seja qual for a nomenclatura das seções do template, o prompt final precisa conter:
- objetivo da pesquisa e contexto (vindo das entradas);
- perguntas primárias (numeradas) e secundárias;
- metodologia: fontes, frameworks de análise e requisitos de dados (qualidade, recência, credibilidade);
- entregáveis esperados: resumo executivo (achados, implicações, ações recomendadas), análise detalhada conforme o foco escolhido e materiais de apoio (tabelas, matrizes de comparação, fontes);
- critérios de sucesso;
- prazo e prioridade, se houver;
- modo da pesquisa (abrangente ou complementar) e o material local já disponível.

### 5. Revisar e refinar
1. Apresente o prompt completo, explique os elementos principais e a lógica, e destaque as suposições feitas.
2. Peça retorno sobre:
   1. Os objetivos estão claros e corretos?
   2. As perguntas cobrem todas as preocupações?
   3. O escopo está adequado?
   4. Os requisitos de saída bastam?
3. Incorpore o retorno: ajuste escopo ou foco, acrescente o que falta, elimine ambiguidades. Repita até o usuário aprovar.

### 6. Orientar os próximos passos
Opções de execução:
1. Usar o prompt com um assistente de IA com capacidade de pesquisa
2. Guiar uma pesquisa feita por pessoas
3. Abordagem híbrida (IA e pessoas, na mesma estrutura)

Pontos de integração: como os achados alimentam as próximas fases, quem revisa os resultados, como validar os achados e quando revisitar ou ampliar a pesquisa.

### Boas práticas
- A qualidade do prompt define a qualidade dos insights.
- Perguntas específicas valem mais que perguntas gerais.
- Considere o estado atual e as implicações futuras.
- Equilibre abrangência e foco.
- Documente suposições e limitações.
- Planeje refinamentos a partir dos primeiros achados.

## Saída
Prompt de pesquisa em Markdown, no formato do `research-prompt-tmpl.md`, apresentado no chat. Grave em arquivo só se o usuário pedir, no caminho que ele indicar (sugestão: `docs/research/{AAAA-MM-DD}-{slug}/research-prompt.md`).

## Critérios de conclusão
- [ ] Foco da pesquisa escolhido pelo usuário
- [ ] Objetivos, perguntas primárias e secundárias, metodologia, entregáveis e critérios de sucesso presentes
- [ ] Suposições destacadas na revisão
- [ ] Prompt aprovado pelo usuário

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Tema vago | Faça as perguntas de contexto do "do zero" (passo 2) antes de escolher o foco |
| Escopo amplo demais | Proponha dividir em mais de um prompt, por foco |
| Documento de entrada não encontrado | Peça o caminho ou siga sem ele, registrando a lacuna no contexto do prompt |

## Handoff
- Chapéu Análise: com os resultados da pesquisa, `@pm *create-project-brief` ou `@pm *market-research`.
- Chapéu Arquitetura: decisões vindas da pesquisa viram ADR (`@dev *create-adr {título}`).
