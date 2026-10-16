---
id: ux-research
title: Pesquisa com usuários e análise de necessidades
agent: dev
hat: ux
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'objetivo (opcional): o que a pesquisa precisa responder; se ausente, é elicitado no passo 1'
  - 'contexto (opcional): PRD, project brief, analytics, tickets de suporte, pesquisas anteriores'
outputs:
  - 'docs/ux/research/research-summary.md: resumo executivo dos achados'
  - 'docs/ux/research/personas.md: 2 a 4 personas com evidências'
  - 'docs/ux/research/user-journeys.md: jornadas dos cenários principais'
  - 'docs/ux/research/insights.md: 5 a 10 insights acionáveis, priorizados por impacto'
  - 'docs/ux/research/raw-data/: transcrições, respostas e dados brutos'
depends_on: {}
next: [ux-wireframe, create-front-end-spec]
source: [ux-user-research.md]
---

# Pesquisa com usuários e análise de necessidades

## Objetivo

Entender quem são os usuários, o que querem, o que os frustra e como trabalham hoje, e transformar essas evidências em personas, jornadas e insights acionáveis que orientam as decisões de design.

## Quando usar

- Início de produto ou feature com público pouco conhecido (primeira etapa do fluxo de UX).
- Antes de `*ux-wireframe` e `*create-front-end-spec`, para basear as decisões em evidência.
- Para validar um conceito, melhorar a UX de um produto existente ou comparar padrões de UX com concorrentes.
- Não use para pesquisa de mercado ou análise competitiva de negócio: isso é do `@pm` [Análise] (`*market-research`, `*competitor-analysis`).

O agente planeja a pesquisa, prepara os materiais e sintetiza os dados. Entrevistas, surveys e observações são conduzidos pelo time com os usuários reais.

## Modos de execução

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Usa só fontes existentes (PRD, brief, analytics, pesquisas anteriores). Propõe objetivos e métodos sem perguntar, marca personas e insights como hipóteses e registra as premissas no `research-summary.md`. |
| Interativo (padrão) | Checkpoints nos passos 1, 2, 4 e 6. |
| Pre-Flight | Faz todas as perguntas dos passos 1 e 2 de uma vez; depois prepara os materiais e sintetiza sem novas perguntas. |

## Pré-condições

- [ ] Objetivo do produto ou da feature conhecido (PRD, brief ou descrição do usuário).
- [ ] Pelo menos uma fonte de dados acessível: usuários para entrevistar, base para survey, analytics ou material de pesquisas anteriores.

## Passos

### 1. Definir os objetivos

**Ponto de elicitação:** apresente as opções e peça de 1 a 3 números (ou texto livre).

```text
Quais são os objetivos da pesquisa? (escolha de 1 a 3)
1. Entender necessidades e dores dos usuários
2. Validar um conceito de produto ou de feature
3. Melhorar a UX de um produto existente
4. Identificar novas oportunidades
5. Comparar com concorrentes
6. Criar personas
7. Outro (descreva)
```

Perguntas de acompanhamento:

- Quem são os usuários-alvo? (perfil, papéis, familiaridade com tecnologia)
- Qual é o prazo? (dias ou semanas disponíveis)
- Que recursos existem? (orçamento, acesso a usuários)
- O que já se sabe? (dados existentes, hipóteses)

### 2. Selecionar os métodos

Recomende métodos a partir dos objetivos e peça a escolha por número.

| # | Método | Quando usar | Participantes e duração | Saída |
|---|--------|-------------|-------------------------|-------|
| 1 | Entrevistas | insights qualitativos profundos, perguntas de "por quê", descoberta inicial | 5 a 10 pessoas, 30 a 60 min cada; 2 a 3 semanas | transcrições, citações, temas |
| 2 | Survey | validação quantitativa com amostra grande | 50+ respostas, 10 a 15 min; 1 a 2 semanas (Google Forms, Typeform) | dados estatísticos, padrões de uso, preferências |
| 3 | Análise de analytics | comportamento em produto existente | 3 a 5 dias (Google Analytics, Mixpanel, Hotjar) | padrões de uso, pontos de abandono, features mais usadas |
| 4 | Análise de concorrentes | contexto e boas práticas de UX | 3 a 5 concorrentes | comparação de features, padrões de UX, oportunidades |
| 5 | Investigação contextual | observar o usuário no ambiente real | 2 a 4 h por sessão | observações de fluxo e de ambiente |

Combine métodos declarativos (entrevista, survey) com observação de comportamento real (investigação contextual ou analytics): o que o usuário diz nem sempre é o que ele faz.

### 3. Preparar os materiais

- **Entrevistas:** roteiro com 10 a 15 perguntas abertas, termo de consentimento, gravação com permissão e agenda das sessões. Grave em `docs/ux/research/interview-script.md`.
- **Survey:** no máximo 20 perguntas, mistura de fechadas e abertas, perguntas de triagem, piloto com 2 ou 3 pessoas e canais de distribuição. Tipos: perfil (triagem), múltipla escolha (preferências), Likert de 1 a 5 (sentimento), ranking (prioridade de features) e abertas (achados inesperados). Grave em `docs/ux/research/survey-questions.md`.
- **Analytics:** métricas-chave, período de análise e painéis.

Roteiro inicial de entrevista (troque `[tarefa X]` pela atividade estudada):

```text
1. Fale sobre o seu papel e como você faz [tarefa X] hoje.
2. Quais são os seus principais objetivos ao fazer [tarefa X]?
3. Descreva o seu fluxo típico para [tarefa X].
4. Qual é a parte mais frustrante de [tarefa X]?
5. Se tivesse uma varinha mágica, o que mudaria em [tarefa X]?
6. Que ferramentas você usa hoje para [tarefa X]?
7. Como você mede o sucesso em [tarefa X]?
8. Conte uma vez em que [tarefa X] deu muito certo.
9. Conte uma vez em que [tarefa X] deu errado.
10. Há algo mais que eu deveria saber sobre [tarefa X]?
```

Evite perguntas indutoras: em vez de "Você não acha X melhor?", pergunte "Como você compara X e Y?".

### 4. Conduzir a pesquisa (time)

Oriente o time:

- **Entrevista:** crie rapport (5 min), use perguntas abertas ("Me conte sobre..."), aprofunde ("Por que isso é importante?"), observe tom e linguagem corporal, mantenha neutralidade e anote citações literais.
- **Survey:** curto (até 15 min), perguntas claras e sem viés, triagem no início, teste com 2 ou 3 pessoas antes de distribuir.
- Inclua usuários frustrados ou que abandonaram o produto, não só os satisfeitos (viés de confirmação).

Os dados brutos ficam em `docs/ux/research/raw-data/`.

**Ponto de elicitação:** confirme que os dados foram coletados e se a amostra mínima foi atingida (5+ entrevistas ou 50+ respostas). Se não foi, registre a limitação antes de seguir.

### 5. Analisar e sintetizar

1. Revise todos os dados (transcrições, respostas, analytics).
2. Extraia os achados e as citações-chave.
3. Identifique temas e padrões.
4. Agrupe achados semelhantes (mapa de afinidade: um achado por nota, grupos nomeados por tema, relações entre temas).
5. Priorize por frequência e impacto.

Não pule a síntese: coletar dados sem encontrar padrões não gera insight.

### 6. Criar as personas

Crie de 2 a 4 personas (primárias e secundárias), cada uma apoiada em evidências da pesquisa.

```markdown
## Persona: {nome}

### Perfil
- Faixa etária: {faixa}
- Papel: {cargo}
- Familiaridade com tecnologia: {iniciante | intermediária | avançada}
- Localização: {região}

### Objetivos
- {objetivo principal}
- {objetivo secundário}
- {objetivo aspiracional}

### Dores
- {frustração 1}
- {frustração 2}

### Comportamentos
- {como resolve o problema hoje}
- {ferramentas que usa}
- {fluxo típico}

### Citação
> "{citação marcante da pesquisa}"

### O que precisa do produto
- {necessidade 1}
- {necessidade 2}
```

**Ponto de elicitação:** apresente as personas e peça: 1. aprovar, 2. ajustar uma persona, 3. fundir ou separar personas.

### 7. Mapear as jornadas

Para cada cenário principal, documente as etapas (ex.: Descoberta → Consideração → Adoção → Uso → Fidelização) com:

```text
Etapa: {nome}
Ações: {o que o usuário faz}
Pensamentos: "{o que está pensando, ex.: Isso vai funcionar para mim?}"
Emoção: {positiva | neutra | negativa}
Dores: {atritos e frustrações}
Oportunidades: {onde o produto pode melhorar}
```

### 8. Gerar insights acionáveis

Gere de 5 a 10 insights, ordenados por impacto.

```markdown
## Insight {n}: {insight em uma frase}

**Evidências:**
- {dado}
- "{citação}"

**Impacto:** {ALTO | MÉDIO | BAIXO}

**Implicações para o design:**
- {implicação}

**Ações recomendadas:**
1. {ação}
```

## Saída

Em `docs/ux/research/`:

| Arquivo | Conteúdo | Obrigatório |
|---------|----------|-------------|
| `research-summary.md` | objetivos, métodos, amostra, limitações, premissas e principais achados | sim |
| `personas.md` | 2 a 4 personas | sim |
| `user-journeys.md` | jornadas dos cenários principais | sim |
| `insights.md` | 5 a 10 insights priorizados | sim |
| `raw-data/` | transcrições, respostas, exportações | sim |
| `interview-script.md`, `survey-questions.md` | instrumentos usados | quando aplicável |
| `analytics-summary.md` | achados de analytics | quando aplicável |

## Critérios de conclusão

- [ ] Objetivos da pesquisa definidos.
- [ ] Métodos adequados escolhidos e executados.
- [ ] Amostra mínima atingida (5+ entrevistas ou 50+ respostas) ou limitação registrada no resumo.
- [ ] Dados analisados e sintetizados em temas.
- [ ] 2 a 4 personas criadas, cada uma com evidências.
- [ ] Jornadas cobrem os fluxos completos dos cenários principais.
- [ ] 5 a 10 insights acionáveis, priorizados por impacto.
- [ ] Arquivos gravados em `docs/ux/research/`.

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Amostra abaixo do mínimo (ex.: 1 ou 2 entrevistas) | Registre a limitação, marque os achados como preliminares e recomende nova rodada |
| Sem acesso a usuários | Use analytics, suporte e concorrentes; marque as personas como hipóteses a validar |
| Roteiro com perguntas indutoras | Reescreva as perguntas em formato aberto e neutro antes de aplicar |
| Amostra só com usuários satisfeitos | Recrute usuários frustrados ou que abandonaram antes de sintetizar |
| Pesquisa anterior em `docs/ux/research/` | Pergunte se atualiza a existente ou cria nova rodada em `docs/ux/research/{AAAA-MM-DD}/` |

## Handoff

Próximo passo: `@dev *ux-wireframe {fluxo}`, desenhando para as personas e insights gerados. Alternativa: `@dev *create-front-end-spec`, que usa as personas e as metas de usabilidade. Os insights também orientam os componentes em `*ux-build-component`.
