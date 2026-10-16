# Checklist: Requisitos do Produto (PM)

> Usado por: `@pm` [Produto] na seção "Relatório do Checklist" do `*create-prd` e do `*create-brownfield-prd`, com a task execute-checklist.
> Modo: interativo (seção a seção) ou YOLO (relatório completo de uma vez).

Valida se o PRD e os epics estão completos, bem estruturados e com o escopo certo para o MVP.

[[LLM: INICIALIZAÇÃO

Antes de começar, garanta acesso a:
1. docs/prd.md, o PRD
2. Pesquisas com usuários, de mercado ou de concorrentes (ex.: docs/brief.md, docs/market-research.md, docs/competitor-analysis.md)
3. Documentos de objetivos e de estratégia de negócio
4. Definições de epics ou stories já existentes

IMPORTANTE: se o PRD não existir, pergunte imediatamente ao usuário onde ele está antes de continuar.

ABORDAGEM DE VALIDAÇÃO:
1. Centrada no usuário: todo requisito se liga a valor para o usuário
2. Foco no MVP: o escopo é realmente mínimo, mas viável
3. Clareza: requisitos inequívocos e testáveis
4. Completude: todos os aspectos da visão do produto estão cobertos
5. Viabilidade: os requisitos são tecnicamente alcançáveis

MODO DE EXECUÇÃO: pergunte ao usuário se prefere seção a seção (interativo: apresente os achados de cada seção e confirme antes de seguir) ou tudo de uma vez (YOLO: análise completa e relatório no fim).

Marque cada item como [x] atendido, [ ] não atendido ou [N/A] não se aplica. Justifique todo [ ] e todo [N/A].]]

## 1. Definição do Problema e Contexto

[[LLM: A base de qualquer produto é uma definição clara do problema. Ao revisar esta seção:
1. Verifique se o problema é real e vale ser resolvido
2. Confira se o público-alvo é específico, não "todo mundo"
3. Garanta que as métricas de sucesso sejam mensuráveis, não aspirações vagas
4. Procure evidência de pesquisa com usuários, não só suposições
5. Confirme que a relação entre problema e solução é lógica]]

### 1.1 Definição do Problema

- [ ] O problema resolvido está articulado com clareza
- [ ] Está identificado quem vive o problema
- [ ] Está explicado por que resolver o problema importa
- [ ] O impacto do problema está quantificado (quando possível)
- [ ] A diferenciação em relação às soluções existentes está clara

### 1.2 Objetivos de Negócio e Métricas de Sucesso

- [ ] Objetivos de negócio específicos e mensuráveis definidos
- [ ] Métricas de sucesso e KPIs claros
- [ ] Métricas ligadas a valor para o usuário e para o negócio
- [ ] Linha de base das medidas identificada (quando aplicável)
- [ ] Prazo para atingir os objetivos especificado

### 1.3 Pesquisa e Insights de Usuários

- [ ] Personas dos usuários-alvo definidas com clareza
- [ ] Necessidades e dores dos usuários documentadas
- [ ] Achados de pesquisa com usuários resumidos (quando houver)
- [ ] Análise de concorrentes incluída
- [ ] Contexto de mercado apresentado

## 2. Definição do Escopo do MVP

[[LLM: O escopo do MVP é decisivo: escopo demais desperdiça recursos, de menos não valida nada. Verifique:
1. É realmente mínimo? Questione cada funcionalidade
2. Cada funcionalidade ataca diretamente o problema central?
3. O desejável está separado do indispensável?
4. O motivo de cada inclusão ou exclusão está documentado?
5. Dá para entregar isto no prazo previsto?]]

### 2.1 Funcionalidade Essencial

- [ ] Funcionalidades essenciais claramente separadas das desejáveis
- [ ] As funcionalidades atacam diretamente o problema definido
- [ ] Cada epic se liga a necessidades específicas dos usuários
- [ ] Funcionalidades e stories descritas do ponto de vista do usuário
- [ ] Requisitos mínimos de sucesso definidos

### 2.2 Limites do Escopo

- [ ] O que fica FORA do escopo está articulado com clareza
- [ ] Há uma seção de evoluções futuras
- [ ] O motivo das decisões de escopo está documentado
- [ ] O MVP minimiza funcionalidade e maximiza aprendizado
- [ ] O escopo foi revisado e refinado mais de uma vez

### 2.3 Abordagem de Validação do MVP

- [ ] Método para testar o sucesso do MVP definido
- [ ] Mecanismos de feedback inicial dos usuários planejados
- [ ] Critérios para ir além do MVP especificados
- [ ] Objetivos de aprendizado do MVP articulados
- [ ] Expectativas de prazo definidas

## 3. Requisitos de Experiência do Usuário

[[LLM: Os requisitos de UX ligam as necessidades do usuário à implementação técnica. Valide:
1. Os fluxos cobrem por completo os casos de uso principais
2. Os casos de borda estão identificados (mesmo que adiados)
3. A acessibilidade não é deixada para depois
4. As expectativas de desempenho são realistas
5. Estados de erro e recuperação estão planejados]]

### 3.1 Jornadas e Fluxos do Usuário

- [ ] Fluxos principais documentados
- [ ] Pontos de entrada e de saída de cada fluxo identificados
- [ ] Pontos de decisão e ramificações mapeados
- [ ] Caminho crítico destacado
- [ ] Casos de borda considerados

### 3.2 Requisitos de Usabilidade

- [ ] Considerações de acessibilidade documentadas
- [ ] Compatibilidade de plataformas e dispositivos especificada
- [ ] Expectativas de desempenho do ponto de vista do usuário definidas
- [ ] Abordagens de tratamento de erro e recuperação descritas
- [ ] Mecanismos de feedback do usuário identificados

### 3.3 Requisitos de UI

- [ ] Arquitetura de informação esboçada
- [ ] Componentes críticos de UI identificados
- [ ] Diretrizes de design visual referenciadas (quando aplicável)
- [ ] Requisitos de conteúdo especificados
- [ ] Estrutura de navegação de alto nível definida

## 4. Requisitos Funcionais

[[LLM: Os requisitos funcionais precisam ser claros o bastante para a implementação. Verifique:
1. Os requisitos falam do O QUÊ, não do COMO (sem detalhes de implementação)
2. Cada requisito é testável (como o QA verificaria?)
3. As dependências são explícitas (o que precisa vir antes?)
4. A terminologia é consistente
5. Funcionalidades complexas estão quebradas em partes gerenciáveis]]

### 4.1 Completude das Funcionalidades

- [ ] Todas as funcionalidades exigidas para o MVP documentadas
- [ ] Funcionalidades com descrição clara, focada no usuário
- [ ] Prioridade ou criticidade de cada funcionalidade indicada
- [ ] Requisitos testáveis e verificáveis
- [ ] Dependências entre funcionalidades identificadas

### 4.2 Qualidade dos Requisitos

- [ ] Requisitos específicos e inequívocos
- [ ] Requisitos focados no O QUÊ, não no COMO
- [ ] Terminologia consistente
- [ ] Requisitos complexos quebrados em partes mais simples
- [ ] Jargão técnico minimizado ou explicado

### 4.3 Stories e Critérios de Aceite

- [ ] Stories em formato consistente
- [ ] Critérios de aceite testáveis
- [ ] Stories com tamanho adequado (não grandes demais)
- [ ] Stories independentes sempre que possível
- [ ] Stories com o contexto necessário
- [ ] Requisitos de testabilidade local (ex.: via CLI) definidos nos critérios das stories de backend e de dados

## 5. Requisitos Não Funcionais

### 5.1 Desempenho

- [ ] Expectativas de tempo de resposta definidas
- [ ] Requisitos de vazão e capacidade especificados
- [ ] Necessidades de escalabilidade documentadas
- [ ] Restrições de uso de recursos identificadas
- [ ] Expectativas de carga definidas

### 5.2 Segurança e Conformidade

- [ ] Requisitos de proteção de dados especificados
- [ ] Necessidades de autenticação e autorização definidas
- [ ] Requisitos de conformidade documentados
- [ ] Requisitos de testes de segurança descritos
- [ ] Questões de privacidade tratadas

### 5.3 Confiabilidade e Resiliência

- [ ] Requisitos de disponibilidade definidos
- [ ] Necessidades de backup e recuperação documentadas
- [ ] Expectativas de tolerância a falhas definidas
- [ ] Requisitos de tratamento de erros especificados
- [ ] Considerações de manutenção e suporte incluídas

### 5.4 Restrições Técnicas

- [ ] Restrições de plataforma e de tecnologia documentadas
- [ ] Requisitos de integração descritos
- [ ] Dependências de serviços de terceiros identificadas
- [ ] Requisitos de infraestrutura especificados
- [ ] Necessidades do ambiente de desenvolvimento identificadas

## 6. Estrutura de Epics e Stories

### 6.1 Definição dos Epics

- [ ] Epics representam unidades coesas de funcionalidade
- [ ] Epics focados em entregar valor ao usuário ou ao negócio
- [ ] Objetivos dos epics articulados com clareza
- [ ] Epics dimensionados para entrega incremental
- [ ] Sequência e dependências entre epics identificadas

### 6.2 Quebra em Stories

- [ ] Stories com tamanho adequado
- [ ] Stories com valor claro e independente
- [ ] Stories com critérios de aceite adequados
- [ ] Dependências e sequência das stories documentadas
- [ ] Stories alinhadas aos objetivos do epic

### 6.3 Completude do Primeiro Epic

- [ ] O primeiro epic inclui todos os passos de setup necessários
- [ ] Scaffolding e inicialização do projeto tratados
- [ ] Setup da infraestrutura central incluído
- [ ] Setup do ambiente de desenvolvimento tratado
- [ ] Testabilidade local estabelecida desde o início

## 7. Orientação Técnica

### 7.1 Orientação de Arquitetura

- [ ] Direção inicial de arquitetura apresentada
- [ ] Restrições técnicas comunicadas com clareza
- [ ] Pontos de integração identificados
- [ ] Considerações de desempenho destacadas
- [ ] Requisitos de segurança articulados
- [ ] Áreas de alta complexidade ou risco técnico sinalizadas para aprofundamento na arquitetura

### 7.2 Critérios de Decisão Técnica

- [ ] Critérios de decisão para as escolhas técnicas apresentados
- [ ] Trade-offs das decisões-chave articulados
- [ ] Motivo da abordagem escolhida em relação às alternativas documentado (nas escolhas-chave de design e de funcionalidade)
- [ ] Requisitos técnicos inegociáveis destacados
- [ ] Áreas que pedem investigação técnica identificadas
- [ ] Orientação sobre débito técnico apresentada

### 7.3 Considerações de Implementação

- [ ] Orientação sobre a abordagem de desenvolvimento apresentada
- [ ] Requisitos de teste articulados
- [ ] Expectativas de deploy definidas
- [ ] Necessidades de monitoramento identificadas
- [ ] Requisitos de documentação especificados

## 8. Requisitos Transversais

### 8.1 Dados

- [ ] Entidades de dados e relações identificadas
- [ ] Requisitos de armazenamento especificados
- [ ] Requisitos de qualidade de dados definidos
- [ ] Políticas de retenção identificadas
- [ ] Necessidades de migração de dados tratadas (quando aplicável)
- [ ] Mudanças de schema planejadas de forma iterativa, ligadas às stories que as exigem

### 8.2 Integrações

- [ ] Integrações com sistemas externos identificadas
- [ ] Requisitos de API documentados
- [ ] Autenticação das integrações especificada
- [ ] Formatos de troca de dados definidos
- [ ] Requisitos de testes de integração descritos

### 8.3 Operação

- [ ] Expectativas de frequência de deploy definidas
- [ ] Requisitos de ambientes definidos
- [ ] Necessidades de monitoramento e alertas identificadas
- [ ] Requisitos de suporte documentados
- [ ] Abordagem de monitoramento de desempenho especificada

## 9. Clareza e Comunicação

### 9.1 Qualidade da Documentação

- [ ] Linguagem clara e consistente
- [ ] Documentos bem estruturados e organizados
- [ ] Termos técnicos definidos quando necessário
- [ ] Diagramas incluídos quando ajudam
- [ ] Documentação versionada (Change Log)

### 9.2 Alinhamento com as Partes Interessadas

- [ ] Partes interessadas-chave identificadas
- [ ] Contribuições das partes interessadas incorporadas
- [ ] Possíveis pontos de discordância tratados
- [ ] Plano de comunicação das atualizações definido
- [ ] Processo de aprovação definido

## Resultado

[[LLM: RELATÓRIO FINAL

Monte um relatório de validação com:

1. Resumo executivo
   - Completude geral do PRD (percentual)
   - Adequação do escopo do MVP (grande demais, na medida, pequeno demais)
   - Prontidão para a arquitetura (pronto, quase pronto, não pronto)
   - Lacunas ou preocupações mais críticas
2. A tabela por categoria abaixo, com os problemas críticos que bloqueiam o avanço
3. Principais problemas por prioridade
   - BLOQUEADOR: corrigir antes de a arquitetura começar
   - ALTO: corrigir pela qualidade
   - MÉDIO: melhoraria a clareza
   - BAIXO: desejável
4. Avaliação do escopo do MVP: o que pode sair para um MVP verdadeiro, o que falta e é essencial, preocupações de complexidade, realismo do prazo
5. Prontidão técnica: clareza das restrições técnicas, riscos técnicos identificados, áreas que pedem investigação da arquitetura
6. Recomendações: ação específica para cada bloqueador, melhorias sugeridas, próximos passos

Depois de apresentar o relatório, ofereça:
1. Análise detalhada das seções reprovadas
2. Sugestões de melhoria para áreas específicas
3. Ajuda para refinar o escopo do MVP]]

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Definição do problema e contexto | | |
| 2. Definição do escopo do MVP | | |
| 3. Requisitos de experiência do usuário | | |
| 4. Requisitos funcionais | | |
| 5. Requisitos não funcionais | | |
| 6. Estrutura de epics e stories | | |
| 7. Orientação técnica | | |
| 8. Requisitos transversais | | |
| 9. Clareza e comunicação | | |

Status por categoria: ✅ 90% ou mais dos itens atendidos; ⚠️ de 60% a 89%; ❌ menos de 60%.

**Deficiências críticas:** (preencher na validação)

**Recomendações:** (preencher na validação)

**Decisão:** PRONTO PARA ARQUITETURA quando o PRD e os epics estão completos, bem estruturados e sem nenhum problema BLOQUEADOR (próximo passo: `@dev *create-architecture`). Caso contrário, PRECISA DE REFINAMENTO, com as deficiências listadas.
