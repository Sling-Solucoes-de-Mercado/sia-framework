# Framework de Níveis de Teste

> Usado por: `@pm` [Qualidade] em `*test-design` e `*trace`; `@dev` em `*generate-tests` e na seção Testes da story.
> Complementa: data/test-priorities-matrix.md (prioridade P0 a P3).

Guia para escolher o nível de teste adequado (unitário, integração, E2E) em cada cenário.

## Matriz de Decisão por Nível

### Testes Unitários

**Quando usar:**
- Funções puras e regras de negócio
- Correção de algoritmos
- Validação de entrada e transformação de dados
- Tratamento de erros em componentes isolados
- Cálculos complexos ou máquinas de estado

**Características:**
- Execução rápida (retorno imediato)
- Sem dependências externas (banco, API, sistema de arquivos)
- Fáceis de manter e estáveis
- Falhas fáceis de depurar

**Exemplo:**

```yaml
unit_test:
  component: 'PriceCalculator'
  scenario: 'Calcular desconto com várias regras'
  justification: 'Regra de negócio complexa, com vários ramos'
  mock_requirements: 'Nenhum: função pura'
```

### Testes de Integração

**Quando usar:**
- Interação entre componentes
- Operações e transações de banco
- Contratos de endpoints de API
- Comunicação entre serviços
- Comportamento de middleware e interceptors

**Características:**
- Tempo de execução moderado
- Testam as fronteiras entre componentes
- Podem usar bancos de teste ou containers
- Validam os pontos de integração do sistema

**Exemplo:**

```yaml
integration_test:
  components: ['UserService', 'AuthRepository']
  scenario: 'Criar usuário com atribuição de papel'
  justification: 'Fluxo de dados crítico entre serviço e persistência'
  test_environment: 'Banco em memória'
```

### Testes de Ponta a Ponta (E2E)

**Quando usar:**
- Jornadas críticas do usuário
- Fluxos entre sistemas
- Testes de regressão visual
- Requisitos regulatórios e de conformidade
- Validação final antes da entrega

**Características:**
- Execução mais lenta
- Testam fluxos completos
- Exigem o ambiente completo
- Os mais realistas e os mais frágeis

**Exemplo:**

```yaml
e2e_test:
  journey: 'Processo completo de checkout'
  scenario: 'Usuário compra com meio de pagamento salvo'
  justification: 'Caminho crítico de receita, exige validação completa'
  environment: 'Staging com gateway de pagamento de teste'
```

## Regras de Seleção de Nível

### Prefira testes unitários quando

- A lógica pode ser isolada
- Não há efeitos colaterais
- É preciso retorno rápido
- A complexidade ciclomática é alta

### Prefira testes de integração quando

- O alvo é a camada de persistência
- É preciso validar contratos de serviço
- O alvo é middleware ou interceptor
- As fronteiras entre componentes são críticas

### Prefira testes E2E quando

- São caminhos críticos voltados ao usuário
- Há interação entre vários sistemas
- Há cenários de conformidade regulatória
- A regressão visual importa

## Antipadrões a Evitar

- Teste E2E para validar regra de negócio
- Teste unitário do comportamento do framework
- Teste de integração de bibliotecas de terceiros
- Cobertura duplicada entre níveis

## Proteção Contra Cobertura Duplicada

**Antes de acrescentar qualquer teste, verifique:**

1. Isto já está testado num nível mais baixo?
2. Um teste unitário cobre isto em vez de um de integração?
3. Um teste de integração cobre isto em vez de um E2E?

**Sobreposição de cobertura só é aceitável quando:**

- Testa aspectos diferentes (unitário: lógica; integração: interação; E2E: experiência do usuário)
- O caminho é crítico e pede defesa em profundidade
- Previne regressão de funcionalidade que já quebrou antes

## Convenções de Nome dos Testes

- Unitário: `test_{componente}_{cenario}`
- Integração: `test_{fluxo}_{interacao}`
- E2E: `test_{jornada}_{resultado}`

## Formato do ID de Teste

`{EPIC}.{STORY}-{NÍVEL}-{SEQ}`

Exemplos:

- `1.3-UNIT-001`
- `1.3-INT-002`
- `1.3-E2E-001`
