# Framework de Dimensões de Qualidade

> Avalia entregas de squads e componentes do framework com uma nota em 10 dimensões ponderadas.
> Usado por: `@squad-creator` em `*create-agent` (validação), `*analyze-squad` (avaliação qualitativa) e nos gates de workflows de squad.
> Não substitui o QA gate de stories (`PASS`, `CONCERNS`, `FAIL`, `WAIVED`), que é do `@pm` [Qualidade]. Os status daqui (`PASS`, `REVIEW`, `FAIL`) valem para as entregas avaliadas por este framework.

---

## 1. Visão geral

Cada dimensão tem:

- **Peso:** importância relativa (0,0 a 1,0)
- **Limite:** nota mínima aceitável (0 a 10)
- **Poder de veto:** se nota abaixo do limite bloqueia o avanço

Configuração padrão:

```yaml
quality_dimensions:
  reference: .sia-core/data/quality-dimensions-framework.md
  total_dimensions: 10
  scoring:
    overall_threshold: 7.0      # nota geral mínima
    minimum_per_dimension: 6.0  # nenhuma dimensão abaixo disso
    veto_on_failure: false      # padrão: REVIEW, não VETO
```

---

## 2. As 10 dimensões

| # | id | Dimensão | Peso | Limite | Veto | O que mede |
|---|----|----------|------|--------|------|------------|
| 1 | `accuracy` | Exatidão | 1,0 | 7,0 | sim | Correção verificada por dados ou evidência |
| 2 | `coherence` | Coerência | 0,9 | 6,0 | não | Consistência e alinhamento internos |
| 3 | `strategic_alignment` | Alinhamento estratégico | 0,9 | 6,0 | não | Ligação com objetivos e visão |
| 4 | `operational_excellence` | Excelência operacional | 0,8 | 6,0 | não | Qualidade e eficiência do processo |
| 5 | `innovation_capacity` | Capacidade de inovação | 0,7 | 5,0 | não | Capacidade de criar soluções novas |
| 6 | `risk_management` | Gestão de risco | 0,8 | 6,0 | não | Identificação e mitigação de riscos |
| 7 | `resource_optimization` | Otimização de recursos | 0,8 | 6,0 | não | Uso eficiente de tempo, dinheiro e pessoas |
| 8 | `stakeholder_value` | Valor para as partes | 0,7 | 6,0 | não | Valor entregue a todos os envolvidos |
| 9 | `sustainability` | Sustentabilidade | 0,7 | 6,0 | não | Viabilidade de longo prazo |
| 10 | `adaptability` | Adaptabilidade | 0,6 | 5,0 | não | Capacidade de responder a mudanças |

---

## 3. Critérios de nota e sinais de alerta

Escala comum: 9-10 excelente, 7-8 bom com ajustes menores, 5-6 aceitável com revisão, 3-4 problemas sérios, 1-2 inaceitável.

| Dimensão | 9-10 | 7-8 | 5-6 | 3-4 | 1-2 | Sinais de alerta |
|----------|------|-----|-----|-----|-----|------------------|
| Exatidão | tudo verificado, zero erro | imprecisões menores, fáceis de corrigir | afirmações não verificadas, precisa revisão | erros ou contradições relevantes | fundamentalmente incorreto | afirmação sem evidência; contradição interna; dado desatualizado |
| Coerência | consistência perfeita | inconsistências menores, conciliáveis | lacunas de lógica | contradições relevantes | incoerente | afirmações que se contradizem; saltos de raciocínio; seções desconectadas |
| Alinhamento estratégico | habilita diretamente os objetivos | apoia claramente a estratégia | neutro | alinhamento questionável | contradiz a direção | sem ligação com os objetivos; trabalha contra metas; curto prazo às custas do longo |
| Excelência operacional | processo ótimo, boas práticas | bem desenhado, melhorias menores | funciona, mas ineficiente | problemas de processo relevantes | processo quebrado ou ausente | trabalho manual que deveria ser automatizado; documentação ausente; execução inconsistente |
| Capacidade de inovação | inovação de ruptura | melhorias criativas | soluções padrão | abordagens ultrapassadas | nenhuma inovação | copiar e colar sem adaptar; ignorar ferramentas novas; resistência a melhorar |
| Gestão de risco | todos os riscos tratados | riscos principais tratados | parte dos riscos, mitigação parcial | pontos cegos relevantes | nenhuma consideração de risco | sem plano de contingência; risco conhecido ignorado; ponto único de falha |
| Otimização de recursos | alocação ótima | eficiente, pouco desperdício | eficiência aceitável | desperdício relevante | grosseiramente ineficiente | trabalho redundante; excesso de engenharia; recurso disponível subutilizado |
| Valor para as partes | valor excepcional para todos | bom valor, atende expectativas | valor mínimo viável | parte dos envolvidos mal atendida | sem valor claro | necessidade de um envolvido ignorada; valor desequilibrado; benefício não explicado |
| Sustentabilidade | feito para durar | sustentável com manutenção | viável a médio prazo | solução de curto prazo | insustentável | débito técnico acumulando; dependência de recurso instável; sem plano de manutenção |
| Adaptabilidade | muito flexível, fácil de mudar | adaptável com esforço razoável | alguma flexibilidade | rígido, difícil de mudar | travado | premissas fixas no código; sem pontos de extensão; componentes acoplados |

---

## 4. Cálculo da nota

```text
nota_geral = Σ(nota_da_dimensão × peso) / Σ(pesos)
```

```text
SE nota_geral >= 7,0 E nenhuma dimensão < 6,0
  ENTÃO status = PASS
SENÃO SE alguma dimensão com veto ficou abaixo do limite
  ENTÃO status = FAIL
SENÃO
  status = REVIEW
```

Dimensões não aplicáveis à entrega ficam fora da soma dos pesos; registre o motivo na avaliação.

---

## 5. Modelo de avaliação

```yaml
quality_assessment:
  subject: 'o que foi avaliado (ex.: squads/vendas-b2b/agents/closer.md)'
  assessment_date: 'AAAA-MM-DD'
  assessor: '@squad-creator'
  dimensions:
    - name: accuracy
      score: 0-10
      evidence: 'observações que sustentam a nota'
      recommendations: ['melhorias']
    # ... repita para as 10 dimensões
  overall_score: 0.0           # média ponderada
  pass_threshold: 7.0
  status: PASS | REVIEW | FAIL
  summary:
    strengths: ['o que funciona bem']
    weaknesses: ['o que precisa melhorar']
    critical_issues: ['itens bloqueantes']
    recommendations: ['ações priorizadas']
```

---

## 6. Pesos por domínio

Ajuste os pesos ao domínio do squad e registre o ajuste na avaliação.

| Domínio | Ajustes |
|---------|---------|
| Desenvolvimento de software | exatidão 1,0 (o código precisa funcionar); excelência operacional 0,9; gestão de risco 0,9; sustentabilidade 0,8 |
| Marketing e copy | valor para as partes 1,0 (precisa ressoar com o público); capacidade de inovação 0,9; coerência 0,9 |
| Operações e processos | excelência operacional 1,0; otimização de recursos 0,9; gestão de risco 0,9 |

---

## 7. Uso como checkpoint de workflow

```yaml
checkpoint:
  id: quality-gate
  type: quality_dimensions
  phase: final
  dimensions_to_evaluate: all     # ou lista de ids
  thresholds:
    overall: 7.0
    per_dimension: 6.0
  veto_dimensions:
    - accuracy
  pass_action: 'Aprovar e seguir'
  fail_action: 'Voltar para revisão'
  review_action: 'Escalar para decisão humana'
```

---

## 8. Melhoria contínua

Acompanhe as notas ao longo do tempo (por mês ou trimestre): média geral, média por dimensão, taxa de `FAIL` e taxa de veto. Média geral abaixo de 7,0 indica que o processo de criação precisa de revisão (ex.: tasks sem critérios de conclusão ou checklists fracos).
