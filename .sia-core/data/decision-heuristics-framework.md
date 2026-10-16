# Framework de Heurísticas de Decisão

> Como criar heurísticas que validam decisões nos checkpoints de tasks e workflows.
> Usado por: `@squad-creator` em `*design-squad` (gate de escopo), `*create-agent` (gates de pesquisa e de qualidade), `*create-task` e `*create-workflow` (condições de veto e checkpoints).

---

## 1. Anatomia de uma heurística

Toda heurística de decisão tem esta estrutura (chaves em inglês, textos em português):

```yaml
heuristic:
  id: '{PREFIXO}_{ÁREA}_{NÚMERO}'   # ex.: SC_AGT_001
  name: 'Nome legível'
  type: 'Decision Heuristic'
  phase: 1                          # fase do workflow ou passo da task
  agent: 'squad-creator'            # agente que aplica (ou {squad}/{agente})

  weights:                          # critérios ponderados, de 0,0 a 1,0
    criterion_1: 0.9
    criterion_2: 0.8
    criterion_3: 0.7

  thresholds:                       # mínimo para passar
    criterion_1: 0.8
    criterion_2: 0.7
    criterion_3: null               # depende do contexto

  veto_conditions:                  # condições que BLOQUEIAM o avanço
    - condition: 'criterion_1 < 0.7'
      action: 'VETO - voltar à fase anterior'

  feedback_on_failure:              # o que fazer quando o veto dispara
    - 'Passo de correção 1'
    - 'Passo de correção 2'

  output:
    type: 'decision'
    values: ['APPROVE', 'REVIEW', 'VETO']
```

---

## 2. Árvore de decisão

Toda heurística tem uma árvore de decisão explícita:

```text
RAMO PRIMÁRIO (maior prioridade):
  SE (condição crítica violada)
    ENTÃO VETO → ação imediata
RAMO SECUNDÁRIO:
  SENÃO SE (condição importante < limite)
    ENTÃO REVIEW → exige justificativa
RAMO TERCIÁRIO:
  SENÃO SE (condição opcional < limite)
    ENTÃO APPROVE com condições
TÉRMINO: quando parar de avaliar
ALTERNATIVA: o que fazer nos casos de borda
```

---

## 3. Heurísticas padrão

### 3.1 Alinhamento estratégico (`{PREFIXO}_STR_001`)

Valida se a ação serve à visão e aos objetivos. Fase: cedo (arquitetura, planejamento).

| Critério | Peso | Limite | Veto |
|----------|------|--------|------|
| clareza da visão | 0,9 | ≥ 0,8 | sim, abaixo de 0,7: volta para a descoberta |
| alinhamento com objetivos | 0,8 | ≥ 0,7 | não |
| eficiência de recursos | 0,7 | ≥ 0,5 | não |

```text
SE a ação habilita diretamente a visão → prioridade ALTA → APPROVE
SENÃO SE cria opções na direção da visão → prioridade MÉDIA → APPROVE com condições
SENÃO SE não serve à visão → REVIEW, exige justificativa
TÉRMINO: a ação contradiz a visão
```

### 3.2 Coerência (`{PREFIXO}_COH_001`)

Valida o encaixe entre executor e trabalho. Fase: meio (atribuição de executor).

| Critério | Peso | Limite | Veto |
|----------|------|--------|------|
| consistência | 1,0 | ≥ 0,7 | sim: reatribuir executor; incoerência detectada é quebra de confiança |
| encaixe no sistema | 0,8 | ≥ 0,7 | não |
| capacidade | 0,3 | depende do contexto | não |

```text
PRIMÁRIO: SE incoerente → rejeitar na hora → VETO
SECUNDÁRIO: SENÃO SE encaixe no sistema < 0,7 → observar → REVIEW
TERCIÁRIO: SENÃO SE capacidade < exigida → considerar capacitação → REVIEW com condições
```

### 3.3 Decisão de automação (`{PREFIXO}_AUT_001`)

Decide quando automatizar e quando manter manual. Fase: meio (desenho do workflow).

| Critério | Peso | Limite | Veto |
|----------|------|--------|------|
| frequência | 0,7 | 2 vezes por mês | não |
| impacto | 0,9 | ≥ 0,6 | não |
| automatizabilidade | 0,8 | ≥ 0,5 | não |
| salvaguardas presentes | 1,0 | obrigatório | sim: defina salvaguardas antes |

```text
SE automatizabilidade > 0,5 E salvaguardas presentes → AUTOMATIZAR
SENÃO SE impacto > 0,6 → MANTER MANUAL (precisa de julgamento humano)
SENÃO SE frequência < 1 vez por mês E impacto < 0,5 → ELIMINAR
RESTRIÇÃO: NUNCA automatizar sem salvaguardas
```

Regras de automação:

- Tarefa repetida 2 ou mais vezes: documentar e automatizar.
- Tarefa repetida 3 ou mais vezes sem automação: falha de desenho, corrigir já.
- Toda automação tem salvaguardas, registro e saída manual. Loops automatizados declaram limite de iterações (Constitution, Artigo VIII).

---

## 4. Tabela de critérios

Formato padrão para documentar os critérios de uma heurística:

| Critério | Peso | Limite | Veto | O que mede |
|----------|------|--------|------|------------|
| criterion_1 | 0,9 | ≥ 0,8 | SIM | ... |
| criterion_2 | 0,8 | ≥ 0,7 | NÃO | ... |
| criterion_3 | 0,7 | contexto | NÃO | ... |

---

## 5. Modos de falha

Toda heurística documenta como pode errar:

```yaml
failure_modes:
  - name: 'Falso positivo'
    trigger: 'o que causa uma aprovação indevida'
    manifestation: 'o que acontece quando falha'
    detection: 'como perceber'
    recovery: 'como corrigir'
    prevention: 'como evitar'
  - name: 'Falso negativo'
    trigger: 'o que causa uma rejeição indevida'
    manifestation: '...'
    detection: '...'
    recovery: '...'
    prevention: '...'
```

---

## 6. Integração com checkpoints

```yaml
checkpoint:
  id: 'nome-do-checkpoint'
  heuristic: '{PREFIXO}_{ÁREA}_{NÚMERO}'
  phase: 3
  criteria:
    - metric: 'nome_da_metrica'
      threshold: 0.8
      operator: '>='
  veto_conditions:
    - condition: 'expressão'
      action: 'HALT - motivo'
  validation_questions:
    - 'Pergunta que verifica o critério 1?'
  pass_action: 'Seguir para a fase seguinte'
  fail_action: 'Voltar à fase anterior com o feedback'
```

Em tasks do SIA, o checkpoint vira um passo com **Ponto de elicitação** (quando há decisão humana) ou uma linha em `## Tratamento de erros` (quando é veto automático).

---

## 7. Desempenho da heurística

Acompanhe: tempo de decisão, taxa de acerto, nível de confiança, eficiência de recursos (0 a 10) e sensibilidade ao contexto (0 a 10). Heurística com muitos falsos positivos ou negativos é revisada.

---

## 8. Criando uma heurística

1. **Ponto de decisão:** que decisão, em que fase, quem decide.
2. **Critérios:** que fatores importam, com que peso, qual o mínimo aceitável.
3. **Vetos:** o que não pode acontecer de jeito nenhum; o que rejeita na hora.
4. **Árvore de decisão:** ramo primário, secundários, término e alternativa.
5. **Modos de falha:** o que pode dar errado, como detectar e corrigir.
6. **Checkpoint:** onde a heurística roda e com que perguntas de validação.

---

## 9. Padrão de quality gate

```text
┌──────────────────────────────────────────┐
│  QUALITY GATE                            │
│  1. Avaliar critérios contra os limites  │
│  2. Checar condições de veto             │
│  3. Aplicar a árvore de decisão          │
│  4. Saída: APPROVE | REVIEW | VETO       │
└──────────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│  APPROVE: segue para a próxima fase      │
│  REVIEW: precisa de decisão humana       │
│  VETO: volta para a fase anterior        │
└──────────────────────────────────────────┘
```

---

## 10. Gate de escopo (`SC_SCP_001`)

Decide se o escopo é grande demais para criar o squad direto e exige PRD com epics e stories. Fase: descoberta (`*design-squad`). Bloqueante.

**Problema que evita:** squads grandes criados "na hora" ficam com workflows faltando, sem roadmap, com débito técnico e com contexto perdido na conversa.

| Limite | Valor | Efeito |
|--------|-------|--------|
| workflows mapeados | ≥ 10 | VETO: PRD obrigatório |
| agentes necessários | ≥ 8 | VETO: roadmap obrigatório |
| sem squad parecido e ≥ 5 workflows | domínio sem precedente | AVISO: recomenda PRD; o usuário pode seguir |

```text
CHECAGEM PRIMÁRIA (workflows):
  SE workflows_mapeados >= 10
    ENTÃO PARE: "Escopo grande demais para criação direta"
          AÇÃO: PRD com epics e stories → VETO
CHECAGEM SECUNDÁRIA (agentes):
  SENÃO SE agentes_necessarios >= 8
    ENTÃO PARE: "Agentes demais para criar sem roadmap"
          AÇÃO: PRD com implementação em fases → VETO
CHECAGEM TERCIÁRIA (precedente):
  SENÃO SE nenhum squad parecido E workflows >= 5
    ENTÃO AVISO: "Domínio novo, sem precedente"; recomende PRD; o usuário decide
PADRÃO:
  SENÃO criar o squad direto
```

Mensagem de veto:

```text
❌ ESCOPO GRANDE DEMAIS
Mapeei {n} workflows. É complexo demais para criar direto.
Ação necessária:
1. @pm *create-prd: PRD do squad em docs/prd.md
2. Epics por tier (ex.: "Tier 0: diagnóstico", "Tier 1: execução")
3. Stories por epic (@pm *create-story)
4. Implementação em fases, uma story por vez
```

Estrutura sugerida para o PRD de um squad grande: visão geral (o que o squad faz e para quem), tabela completa de workflows, arquitetura de agentes (distribuição por tier e handoffs), epics e critérios de sucesso. Epics típicos: infraestrutura e orquestrador; Tier 0; Tier 1; Tier 2; Tier 3; integração e automação. As stories seguem o formato do guia de autoria, seção 6.1.

| Cenário | Workflows | Agentes | Decisão |
|---------|-----------|---------|---------|
| Squad de contabilidade MEI/Simples | 54 | 14 | VETO: PRD obrigatório |
| Squad jurídico completo | 25 | 12 | VETO: PRD obrigatório |
| Squad de e-mail marketing | 6 | 4 | criação direta |
| Squad de headlines | 3 | 2 | criação direta |

---

## 11. Heurísticas usadas pelo @squad-creator

| id | Nome | Onde | Bloqueia |
|----|------|------|----------|
| `SC_SCP_001` | Gate de escopo | `*design-squad` | sim |
| `SC_RES_002` | Qualidade da pesquisa do agente | `*create-agent`, passo de pesquisa | sim |
| `SC_AGT_001` | Quality gate do agente | `*create-agent` (`checklists/agent-quality-gate.md`) | sim |
| `SC_AGT_004` | Completude operacional e maturidade | `*create-agent` (`checklists/agent-quality-gate.md`, seção 9) | sim |
