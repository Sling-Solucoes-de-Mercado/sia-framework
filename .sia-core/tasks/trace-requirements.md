---
id: trace-requirements
title: Rastrear requisitos até os testes
agent: pm
hat: quality
elicit: false
inputs:
  - 'storyId: id da story (ex.: 2.1)'
  - 'test design (opcional): docs/qa/assessments/{storyId}-test-design-*.md'
outputs:
  - 'docs/qa/assessments/{storyId}-trace-{AAAAMMDD}.md com a matriz de rastreabilidade, as lacunas e o resumo para o gate'
depends_on:
  tasks: []
next: [qa-gate, test-design]
source: [qa-trace-requirements.md]
---

# Rastrear requisitos até os testes

## Objetivo

Montar a matriz de rastreabilidade da story: cada critério de aceite ligado aos testes que o validam, descritos em Dado/Quando/Então, com as lacunas de cobertura apontadas.

**Importante:** aqui, Dado/Quando/Então documenta o que cada teste valida. Não é sintaxe de teste: o código de teste segue o padrão do projeto.

## Quando usar

- Antes do `*qa-gate`: alimenta a verificação 3 (critérios de aceite).
- Depois do `*test-design`, para conferir o planejado contra o implementado.

## Pré-condições

- [ ] Story com critérios de aceite claros
- [ ] Acesso aos arquivos de teste ou à especificação dos testes

## Passos

### 1. Extrair os requisitos

Declare `[Chapéu: Qualidade]`. Fontes, em ordem de peso: critérios de aceite (principal); declaração da story; tasks e subtasks com comportamento específico; NFRs citados; casos de borda documentados.

### 2. Mapear para os testes

Para cada requisito, encontre os testes (busca nos arquivos de teste da File List e do projeto) e descreva o que eles validam:

```yaml
requirement: 'CA 1: usuário entra com credenciais válidas'
test_mappings:
  - test_file: auth/login.test.ts
    test_case: 'entra com e-mail e senha válidos'
    given: 'Usuário cadastrado com credenciais válidas'
    when: 'Envia o formulário de login'
    then: 'Vai para o painel e a sessão é criada'
    coverage: full
  - test_file: e2e/auth-flow.test.ts
    test_case: 'fluxo completo de login'
    given: 'Usuário na página de login'
    when: 'Informa credenciais válidas e envia'
    then: 'O painel carrega com os dados do usuário'
    coverage: integration
```

- **Dado:** o contexto que o teste prepara (estado, dados, usuário simulado, pré-condições).
- **Quando:** a ação que o teste executa (chamada de API, ação do usuário, evento).
- **Então:** o que o teste afirma (resultado, mudança de estado, valores).

### 3. Classificar a cobertura

| Nível | Significado |
|-------|-------------|
| `full` | requisito totalmente testado |
| `partial` | parte testada, com lacunas |
| `none` | nenhum teste encontrado |
| `integration` | coberto só em integração ou e2e |
| `unit` | coberto só em unitário |

### 4. Apontar as lacunas

```yaml
coverage_gaps:
  - requirement: 'CA 3: e-mail de redefinição enviado em até 60 s'
    gap: 'Sem teste do tempo de entrega'
    severity: medium
    suggested_test: { type: integration, description: 'Teste do prazo do serviço de e-mail' }
  - requirement: 'CA 5: suportar 1000 usuários simultâneos'
    gap: 'Sem teste de carga'
    severity: high
    suggested_test: { type: performance, description: 'Teste de carga com 1000 conexões' }
```

Prioridade da cobertura: fluxos críticos de negócio; segurança; integridade de dados; funcionalidades visíveis ao usuário; prazos de desempenho. Granularidade: unitário para regra de negócio, integração para interação entre componentes, e2e para jornadas, teste de desempenho para NFR.

### 5. Gravar o relatório

Grave em `docs/qa/assessments/{storyId}-trace-{AAAAMMDD}.md`:

````markdown
# Matriz de rastreabilidade

## Story {storyId}: {título}

### Resumo de cobertura
- Requisitos: 5
- Cobertura total: 3 (60%)
- Cobertura parcial: 1 (20%)
- Sem cobertura: 1 (20%)

### Mapeamentos

#### CA 1: {critério}
**Cobertura: FULL**
- **Unitário:** `auth.service.test.ts::validateCredentials`
  - Dado: credenciais válidas. Quando: o método de validação é chamado. Então: retorna verdadeiro com o usuário.
- **Integração:** `auth.integration.test.ts::loginFlow`
  - Dado: usuário com conta válida. Quando: a API de login é chamada. Então: o token volta e a sessão é criada.

#### CA 2: {critério}
**Cobertura: PARTIAL**
{mapeamentos e o que falta}

### Lacunas críticas
1. **Requisitos de desempenho**
   - Lacuna: sem teste de carga para usuários simultâneos
   - Risco: alto, pode falhar sob a carga de produção
   - Ação: teste de carga

### Recomendações de test design
Cenários adicionais, tipos de teste (unitário, integração, e2e, desempenho), dados de teste e estratégia de mocks.

### Avaliação de risco
- Alto: requisito sem cobertura
- Médio: requisito com cobertura parcial
- Baixo: requisito com cobertura completa em unitário e integração

### Resumo para o gate
```yaml
trace:
  totals: { requirements: 5, full: 3, partial: 1, none: 1 }
  planning_ref: docs/qa/assessments/2.1-test-design-20261016.md
  uncovered:
    - { ac: 'CA 3', reason: 'Sem teste do tempo de entrega do e-mail' }
  notes: 'Ver docs/qa/assessments/2.1-trace-20261016.md'
```
````

### 6. Informar

```text
Matriz de rastreabilidade: docs/qa/assessments/{storyId}-trace-{AAAAMMDD}.md
```

Efeito no gate: lacuna crítica → `FAIL`; lacuna menor → `CONCERNS`; teste P0 do test design ausente → `CONCERNS`; cobertura completa contribui para `PASS`.

Indicadores de boa rastreabilidade: todo critério com ao menos um teste; caminhos críticos em mais de um nível; casos de borda explícitos; NFRs com o tipo de teste adequado; Dado/Quando/Então claro em cada teste.

Sinais de alerta: critério sem teste; teste que não mapeia nenhum requisito; descrição de teste vaga; casos de borda faltando; NFR sem teste específico.

## Saída

- Relatório em `docs/qa/assessments/{storyId}-trace-{AAAAMMDD}.md`, com o resumo para o gate.
- Linha do passo 6 na resposta.

## Critérios de conclusão

- [ ] Todos os critérios de aceite mapeados, com nível de cobertura
- [ ] Cada mapeamento com arquivo, caso de teste e Dado/Quando/Então
- [ ] Lacunas com severidade e teste sugerido
- [ ] Totais do resumo coerentes com os mapeamentos
- [ ] `planning_ref` apontando para o test design, quando existir

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story sem critérios de aceite | PARE; a story precisa de `*validate-story` |
| Nenhum arquivo de teste encontrado | todos os requisitos com `none`; lacuna crítica |
| Teste existe mas não roda | trate como `partial` e registre o motivo |
| Test design ausente | `planning_ref` vazio; siga |

## Handoff

Próximo passo: `@pm *qa-gate {storyId}`. Com lacunas de planejamento: `@pm *test-design {storyId}`.
