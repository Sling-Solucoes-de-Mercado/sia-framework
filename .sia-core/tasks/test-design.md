---
id: test-design
title: Desenhar os cenários de teste
agent: pm
hat: quality
elicit: false
inputs:
  - 'storyId: id da story (ex.: 2.1)'
  - 'perfil de risco (opcional): docs/qa/assessments/{storyId}-risk-*.md'
outputs:
  - 'docs/qa/assessments/{storyId}-test-design-{AAAAMMDD}.md com os cenários por nível e prioridade e o resumo para o gate'
depends_on:
  data: [test-levels-framework.md, test-priorities-matrix.md]
next: [trace, generate-tests]
source: [qa-test-design.md]
---

# Desenhar os cenários de teste

## Objetivo

Definir o que testar, em que nível (unitário, integração, e2e) e com que prioridade (P0 a P3), para cada critério de aceite da story, com cobertura eficiente e sem redundância entre níveis.

## Quando usar

- Depois da validação da story, antes ou durante a implementação. O `@dev *generate-tests` usa o resultado.
- Depois do `*risk-profile`, para ligar os testes aos riscos.

## Pré-condições

- [ ] Story com critérios de aceite numerados

## Passos

### 1. Analisar os critérios de aceite

Declare `[Chapéu: Qualidade]`. Para cada critério, identifique: a funcionalidade central a testar, as variações de dados, as condições de erro e os casos de borda.

### 2. Escolher o nível

Carregue `data/test-levels-framework.md`. Regras rápidas:

- **Unitário:** lógica pura, algoritmos, cálculos.
- **Integração:** interação entre componentes, operações de banco.
- **E2E:** jornadas críticas do usuário, conformidade.

### 3. Atribuir a prioridade

Carregue `data/test-priorities-matrix.md`. Regras rápidas:

- **P0:** crítico para receita, segurança, conformidade.
- **P1:** jornadas principais, uso frequente.
- **P2:** funcionalidades secundárias, administração.
- **P3:** desejável, pouco usado.

### 4. Escrever os cenários

```yaml
test_scenario:
  id: '2.1-UNIT-001'          # {storyId}-{NÍVEL}-{SEQ}; NÍVEL = UNIT, INT ou E2E
  requirement: 'CA 1'
  priority: P0
  level: unit
  description: Valida o formato do e-mail
  justification: Lógica pura de validação
  mitigates_risks: [SEC-001]  # quando houver perfil de risco
```

### 5. Validar a cobertura

- Todo critério tem ao menos um teste.
- Nenhuma cobertura duplicada entre níveis.
- Caminhos críticos têm mais de um nível.
- Mitigações de risco estão cobertas.

Checklist de qualidade: níveis adequados, sem excesso de teste; prioridades alinhadas ao risco de negócio; ids no padrão; cenários atômicos e independentes.

Princípios: prefira unitário a integração e integração a e2e (shift left); foque no que pode dar errado; teste uma vez, no nível certo; pense na manutenção de longo prazo; rode primeiro os testes rápidos.

### 6. Gravar o documento

Grave em `docs/qa/assessments/{storyId}-test-design-{AAAAMMDD}.md`:

````markdown
# Test design: story {storyId}

Data: {AAAA-MM-DD}
Autor: @pm (Mira) [Qualidade]

## Visão geral
- Cenários: 3 (unitário 1, 33% · integração 1, 33% · e2e 1, 33%)
- Prioridades: P0 2 · P1 1 · P2 0

## Cenários por critério de aceite
### CA 1: {descrição do critério}
| Id | Nível | Prioridade | Teste | Justificativa |
|----|-------|------------|-------|---------------|
| 2.1-UNIT-001 | Unitário | P0 | Valida o formato da entrada | Lógica pura de validação |
| 2.1-INT-001 | Integração | P0 | Serviço processa a requisição | Fluxo entre componentes |
| 2.1-E2E-001 | E2E | P1 | Usuário conclui a jornada | Validação do caminho crítico |

## Cobertura de riscos
{cenários ligados aos riscos do perfil, quando houver}

## Ordem de execução
1. P0 unitários (falha rápida)
2. P0 integração
3. P0 e2e
4. P1 em ordem
5. P2 e P3 conforme o tempo

## Resumo para o gate
```yaml
test_design:
  scenarios_total: 3
  by_level: { unit: 1, integration: 1, e2e: 1 }
  by_priority: { p0: 2, p1: 1, p2: 0 }
  coverage_gaps: []          # critérios sem teste
```
````

### 7. Informar

```text
Matriz de test design: docs/qa/assessments/{storyId}-test-design-{AAAAMMDD}.md
Testes P0 identificados: {n}
```

O `*trace` usa esta matriz como referência de planejamento, e o `*qa-gate` usa os P0 na regra de cobertura.

## Saída

- Documento em `docs/qa/assessments/{storyId}-test-design-{AAAAMMDD}.md`, com o resumo para o gate.
- As duas linhas do passo 7 na resposta.

## Critérios de conclusão

- [ ] Todo critério de aceite com ao menos um cenário
- [ ] Cada cenário com id, nível, prioridade e justificativa
- [ ] Nenhuma cobertura duplicada sem motivo
- [ ] Riscos do perfil cobertos, quando houver perfil
- [ ] `coverage_gaps` preenchido com os critérios sem teste

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story sem critérios de aceite | PARE; a story precisa de `*validate-story` |
| Critério não testável | registre em `coverage_gaps` e avise o `@pm [Scrum]` |
| Perfil de risco ausente | siga sem `mitigates_risks` |

## Handoff

- Rastreabilidade depois da implementação: `@pm *trace {storyId}`.
- Geração dos testes: `@dev *generate-tests {storyId}`.
