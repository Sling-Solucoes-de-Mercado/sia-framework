---
id: risk-profile
title: Perfil de risco da story
agent: pm
hat: quality
elicit: false
inputs:
  - 'storyId: id da story (ex.: 2.1); título e slug saem do arquivo da story'
outputs:
  - 'docs/qa/assessments/{storyId}-risk-{AAAAMMDD}.md com a matriz de risco, as mitigações e o bloco risk_summary para o gate'
depends_on:
  tasks: []
next: [test-design, qa-gate]
source: [qa-risk-profile.md]
---

# Perfil de risco da story

## Objetivo

Identificar, pontuar (probabilidade × impacto) e priorizar os riscos da implementação de uma story, com mitigação e foco de teste para cada um. O resultado inclui o bloco `risk_summary` que o `*qa-gate` usa.

## Quando usar

- Antes ou durante a implementação de story com integração, dado sensível ou mudança estrutural.
- Antes do `*test-design`, para orientar a prioridade dos testes.
- Quando o gate pede revisão profunda.

## Pré-condições

- [ ] Story em `docs/stories/{storyId}-*.story.md`

## Passos

### 1. Ler o contexto

Declare `[Chapéu: Qualidade]`. Leia a story (critérios, Dev Notes, Riscos, File List quando houver), a arquitetura citada, o diff (se a story já foi implementada) e o relatório de inspeção (se existir).

### 2. Identificar os riscos por categoria

| Prefixo | Categoria | O que procurar |
|---------|-----------|----------------|
| `TECH` | técnico | complexidade de arquitetura, integração, débito técnico, escalabilidade, dependências de sistema |
| `SEC` | segurança | falha de autenticação ou autorização, exposição de dados, injeção, sessão, criptografia fraca |
| `PERF` | desempenho | tempo de resposta, gargalo de vazão, esgotamento de recursos, consultas ao banco, falha de cache |
| `DATA` | dados | perda, corrupção, privacidade, conformidade, backup e recuperação |
| `BUS` | negócio | não atende o usuário, impacto em receita, reputação, regulação, momento de mercado |
| `OPS` | operação | falha de deploy, lacuna de monitoramento, resposta a incidente, documentação, transferência de conhecimento |

Registre cada risco:

```yaml
risk:
  id: SEC-001
  category: security
  title: Validação insuficiente nos formulários de usuário
  description: Entradas sem sanitização podem permitir XSS
  affected_components: [UserRegistrationForm, ProfileUpdateForm]
  detection_method: Revisão de código mostrou validação ausente
```

### 3. Pontuar

| Nível | Probabilidade | Impacto |
|-------|---------------|---------|
| Alto (3) | provável, acima de 70% | grave: vazamento de dados, sistema fora do ar, perda financeira grande |
| Médio (2) | possível, de 30% a 70% | moderado: desempenho degradado, problema pequeno de dados |
| Baixo (1) | improvável, abaixo de 30% | pequeno: cosmético, incômodo leve |

Nota = probabilidade × impacto: 9 crítico · 6 alto · 4 médio · 2 ou 3 baixo · 1 mínimo.

```markdown
| Risco | Descrição | Probabilidade | Impacto | Nota | Prioridade |
|-------|-----------|---------------|---------|------|------------|
| SEC-001 | XSS no formulário de perfil | Alta (3) | Alto (3) | 9 | Crítico |
| PERF-001 | Consulta lenta no painel | Média (2) | Médio (2) | 4 | Médio |
| DATA-001 | Falha de backup | Baixa (1) | Alto (3) | 3 | Baixo |
```

### 4. Definir a mitigação

Para cada risco:

```yaml
mitigation:
  risk_id: SEC-001
  strategy: preventive          # preventive | detective | corrective
  actions:
    - Validar todas as entradas antes de gravar
    - Adicionar cabeçalhos CSP
    - Escapar as saídas nos templates
  testing_requirements:
    - Teste de segurança dos formulários
    - Testes unitários das funções de validação
  residual_risk: Baixo
  owner: '@dev'
  timeline: Antes do deploy
```

### 5. Calcular a nota geral

Comece em 100 e desconte por risco: crítico (9) −20; alto (6) −10; médio (4) −5; baixo (2 ou 3) −2. Mínimo 0 (risco extremo), máximo 100 (risco mínimo).

### 6. Gerar o bloco para o gate

Regras: só os riscos avaliados, sem placeholders; ordem por nota decrescente; sem riscos, totais zerados, sem `highest` e recomendações vazias.

```yaml
risk_summary:
  totals: { critical: 1, high: 0, medium: 1, low: 1 }
  highest: { id: SEC-001, score: 9, title: 'XSS no formulário de perfil' }
  recommendations:
    must_fix: ['Sanitizar as entradas e adicionar CSP']
    monitor: ['Alertas de segurança nos endpoints de autenticação']
```

Efeito no gate: algum risco com nota ≥ 9 → `FAIL` (salvo `WAIVED`); ≥ 6 → `CONCERNS`; senão, `PASS`. Risco sem mitigação fica documentado no gate.

### 7. Gravar o relatório

Grave em `docs/qa/assessments/{storyId}-risk-{AAAAMMDD}.md`:

````markdown
# Perfil de risco: story {storyId}

Data: {AAAA-MM-DD}
Revisor: @pm (Mira) [Qualidade]

## Resumo executivo
- Riscos identificados: 3 · Críticos: 1 · Altos: 0
- Nota de risco: 73/100

## Riscos críticos que pedem ação imediata
### 1. SEC-001: XSS no formulário de perfil
**Nota: 9 (crítico)** · Probabilidade: Alta, {motivo} · Impacto: Alto, {consequência}
**Mitigação:** {ações imediatas}
**Foco de teste:** {cenários necessários}

## Distribuição
- Por categoria: segurança 1 (1 crítico), desempenho 1, dados 1
- Por componente: front-end 1, back-end 1, banco 1

## Registro completo
{tabela com todos os riscos, notas e mitigações, por nota decrescente}

## Estratégia de testes por risco
1. Riscos críticos: cenários, tipos de teste (segurança, carga, caos) e dados de teste
2. Riscos altos: cenários de integração e casos de borda
3. Riscos médios e baixos: testes funcionais e suíte de regressão

## Critérios de aceitação de risco
- Corrigir antes de produção: todo risco crítico e os altos de segurança ou de dados
- Pode ir com mitigação: médios com controle compensatório; baixos com monitoramento
- Riscos aceitos: listados com o aceite de quem tem autoridade

## Monitoramento
Métricas de desempenho (PERF), alertas de segurança (SEC), taxa de erro (OPS), indicadores de negócio (BUS).

## Gatilhos de revisão
Mudança relevante de arquitetura, nova integração, vulnerabilidade descoberta, problema de desempenho relatado, mudança regulatória.

## Bloco para o gate
```yaml
risk_summary:
  totals: { critical: 1, high: 0, medium: 1, low: 1 }
  highest: { id: SEC-001, score: 9, title: 'XSS no formulário de perfil' }
  recommendations:
    must_fix: ['Sanitizar as entradas e adicionar CSP']
    monitor: ['Alertas de segurança nos endpoints de autenticação']
```
````

### 8. Recomendar e informar

Inclua no resumo as recomendações pelo perfil de risco:

| Frente | Recomendação |
|--------|--------------|
| Testes | quais rodar primeiro, tipos extras necessários, ambiente de teste |
| Desenvolvimento | ênfase da revisão de código, validações adicionais, controles de segurança |
| Deploy | rollout em fases para mudança de alto risco, feature flag, procedimento de rollback |
| Monitoramento | métricas a acompanhar, alertas, painéis |

Imprima:

```text
Perfil de risco: docs/qa/assessments/{storyId}-risk-{AAAAMMDD}.md
```

## Saída

- Relatório em `docs/qa/assessments/{storyId}-risk-{AAAAMMDD}.md`, com a matriz, as mitigações e o bloco `risk_summary`.
- Linha do passo 8 na resposta.

## Critérios de conclusão

- [ ] Todas as seis categorias consideradas
- [ ] Cada risco com id, probabilidade, impacto, nota e mitigação
- [ ] Nota geral calculada pelo passo 5
- [ ] Bloco `risk_summary` só com riscos avaliados, por nota decrescente
- [ ] Riscos ligados a requisitos de teste

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story não encontrada | PARE; peça o storyId correto |
| Nenhum risco identificado | grave o relatório com totais zerados e diga por quê |
| Probabilidade ou impacto sem base | use o nível mais alto plausível e registre a incerteza |

## Handoff

Próximo passo: `@pm *test-design {storyId}` para ligar testes aos riscos, ou `@pm *qa-gate {storyId}` se a story já está em revisão.
