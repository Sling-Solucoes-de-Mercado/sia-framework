# Matriz de Prioridades de Teste

> Usado por: `@pm` [Qualidade] em `*test-design`, `*trace` e no QA gate (cobertura dos testes P0); `@dev` em `*generate-tests`.
> Complementa: data/test-levels-framework.md (nível de cada teste).

Guia para priorizar cenários de teste por risco, criticidade e impacto no negócio.

## Níveis de Prioridade

### P0: Crítico (teste obrigatório)

**Critérios:**
- Funcionalidade que afeta receita
- Caminhos críticos de segurança
- Operações de integridade de dados
- Requisitos de conformidade regulatória
- Funcionalidade que já quebrou antes (prevenção de regressão)

**Exemplos:**
- Processamento de pagamentos
- Autenticação e autorização
- Criação e exclusão de dados de usuários
- Cálculos financeiros
- Conformidade de privacidade (LGPD, GDPR)

**Requisitos de teste:**
- Cobertura completa em todos os níveis
- Caminhos felizes e de falha
- Casos de borda e cenários de erro
- Desempenho sob carga

### P1: Alto (deveria ser testado)

**Critérios:**
- Jornadas centrais do usuário
- Funcionalidades muito usadas
- Funcionalidades com lógica complexa
- Pontos de integração entre sistemas
- Funcionalidades que afetam a experiência do usuário

**Exemplos:**
- Fluxo de cadastro de usuário
- Busca
- Importação e exportação de dados
- Sistemas de notificação
- Exibição de dashboards

**Requisitos de teste:**
- Caminhos felizes principais obrigatórios
- Cenários de erro mais importantes
- Casos de borda críticos
- Validação básica de desempenho

### P2: Médio (bom testar)

**Critérios:**
- Funcionalidades secundárias
- Funcionalidades administrativas
- Relatórios
- Opções de configuração
- Acabamento e estética da UI

**Exemplos:**
- Painéis de configuração do administrador
- Geração de relatórios
- Personalização de tema
- Documentação de ajuda
- Rastreamento de analytics

**Requisitos de teste:**
- Cobertura do caminho feliz
- Tratamento básico de erros
- Casos de borda podem ficar para depois

### P3: Baixo (testar se houver tempo)

**Critérios:**
- Funcionalidades raramente usadas
- Funcionalidades desejáveis, não essenciais
- Problemas cosméticos
- Otimizações não críticas

**Exemplos:**
- Preferências avançadas
- Suporte a funcionalidades legadas
- Funcionalidades experimentais
- Utilitários de depuração

**Requisitos de teste:**
- Só smoke tests
- Pode depender de teste manual
- Documente as limitações conhecidas

## Ajustes de Prioridade por Risco

### Aumente a prioridade quando

- O impacto no usuário é alto (afeta mais de 50% dos usuários)
- O impacto financeiro é alto (perda potencial acima de US$ 10 mil)
- Há potencial de vulnerabilidade de segurança
- Há requisitos legais ou de conformidade
- O problema foi relatado por clientes
- A implementação é complexa (mais de 500 linhas de código)
- Há várias dependências entre sistemas

### Reduza a prioridade quando

- A funcionalidade está protegida por feature flag
- Há liberação gradual planejada
- Há monitoramento forte
- O rollback é fácil
- O uso é baixo
- A implementação é simples
- O componente é bem isolado

## Cobertura por Prioridade

| Prioridade | Cobertura unitária | Cobertura de integração | Cobertura E2E |
|------------|--------------------|-------------------------|---------------|
| P0 | > 90% | > 80% | Todos os caminhos críticos |
| P1 | > 80% | > 60% | Caminhos felizes principais |
| P2 | > 60% | > 40% | Smoke tests |
| P3 | Melhor esforço | Melhor esforço | Só manual |

## Regras de Atribuição de Prioridade

1. **Comece pelo impacto no negócio:** o que acontece se isto falhar?
2. **Considere a probabilidade:** qual a chance de falha?
3. **Leve em conta a detectabilidade:** saberíamos se falhasse?
4. **Considere a recuperabilidade:** dá para corrigir rápido?

## Árvore de Decisão de Prioridade

```text
É crítico para a receita?
├─ SIM → P0
└─ NÃO → Afeta uma jornada central do usuário?
    ├─ SIM → É de alto risco?
    │   ├─ SIM → P0
    │   └─ NÃO → P1
    └─ NÃO → É muito usado?
        ├─ SIM → P1
        └─ NÃO → É voltado ao cliente?
            ├─ SIM → P2
            └─ NÃO → P3
```

## Ordem de Execução dos Testes

1. Rode os testes P0 primeiro (falhe cedo nos problemas críticos)
2. Rode os testes P1 em seguida (funcionalidade central)
3. Rode os testes P2 se houver tempo
4. Testes P3 só nos ciclos completos de regressão

## Ajuste Contínuo

Revise e ajuste as prioridades com base em:

- Padrões de incidentes em produção
- Feedback e reclamações de usuários
- Analytics de uso
- Histórico de falhas dos testes
- Mudanças de prioridade do negócio
