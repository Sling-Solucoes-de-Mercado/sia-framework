# Checklist: Validação Mestre do Product Owner

> Usado por: `@pm` [Product Owner] em `*po-checklist`, com a task execute-checklist, antes de começar o desenvolvimento.
> Modo: interativo (seção a seção) ou YOLO (relatório completo de uma vez).

Valida o plano do projeto (PRD, arquitetura, epics e stories) antes da execução. Adapta-se ao tipo de projeto (greenfield ou brownfield) e inclui UI/UX quando houver.

[[LLM: INICIALIZAÇÃO

DETECÇÃO DO TIPO DE PROJETO. Primeiro, determine:
1. É GREENFIELD (projeto novo, do zero)? Procure inicialização de projeto novo, sem referência a código existente, e docs/prd.md, docs/architecture.md e stories de setup.
2. É BROWNFIELD (evolução de sistema existente)? Procure referências ao código existente, linguagem de evolução ou modificação, e o PRD e a arquitetura brownfield (docs/prd.md e docs/architecture.md gerados pelos templates brownfield) com a análise do sistema existente.
3. Tem componentes de UI/UX? Procure docs/front-end-spec.md, docs/front-end-architecture.md, arquivos de design, stories de frontend e especificações de componentes.

DOCUMENTOS NECESSÁRIOS:
- Greenfield: docs/prd.md, docs/architecture.md, docs/front-end-architecture.md (se houver UI) e todos os epics e stories.
- Brownfield: docs/prd.md e docs/architecture.md (brownfield), acesso ao código existente (CRÍTICO: sem isso não dá para seguir), detalhes de deploy e infraestrutura atuais, schemas de banco, documentação de API e setup de monitoramento.

REGRAS DE SALTO:
- Pule as seções e os itens marcados [[SÓ BROWNFIELD]] em projetos greenfield
- Pule os marcados [[SÓ GREENFIELD]] em projetos brownfield
- Pule os marcados [[SÓ UI/UX]] em projetos só de backend
- Registre todas as seções puladas no relatório final

ABORDAGEM DE VALIDAÇÃO:
1. Análise profunda: avalie cada item contra a documentação
2. Baseada em evidência: cite seções ou trechos de código ao validar
3. Pensamento crítico: questione suposições e procure lacunas
4. Avaliação de risco: considere o que pode dar errado em cada decisão

MODO DE EXECUÇÃO: pergunte ao usuário se prefere seção a seção (interativo, com confirmação a cada seção) ou tudo de uma vez (YOLO, relatório no fim).

Marque cada item como [x] atendido, [ ] não atendido ou [N/A] não se aplica, com justificativa para [ ] e [N/A].]]

## 1. Setup e Inicialização do Projeto

[[LLM: O setup é a fundação. Em greenfield, garanta um começo limpo; em brownfield, uma integração segura com o sistema existente. Verifique se o setup corresponde ao tipo de projeto.]]

### 1.1 Scaffolding do Projeto [[SÓ GREENFIELD]]

- [ ] O Epic 1 inclui passos explícitos de criação e inicialização do projeto
- [ ] Com template inicial, os passos de clonagem e setup estão incluídos
- [ ] Sem template, todos os passos de scaffolding estão definidos
- [ ] Setup inicial de README e documentação incluído
- [ ] Setup do repositório e do commit inicial definido

### 1.2 Integração com o Sistema Existente [[SÓ BROWNFIELD]]

- [ ] A análise do projeto existente foi concluída e documentada
- [ ] Os pontos de integração com o sistema atual estão identificados
- [ ] O ambiente de desenvolvimento preserva a funcionalidade existente
- [ ] A abordagem de teste local das funcionalidades existentes foi validada
- [ ] Há procedimento de rollback para cada ponto de integração

### 1.3 Ambiente de Desenvolvimento

- [ ] O setup do ambiente local está claramente definido
- [ ] Ferramentas e versões necessárias especificadas
- [ ] Passos de instalação das dependências incluídos
- [ ] Arquivos de configuração tratados
- [ ] Setup do servidor de desenvolvimento incluído

### 1.4 Dependências Centrais

- [ ] Pacotes e bibliotecas críticos instalados cedo
- [ ] Gestão de pacotes tratada corretamente
- [ ] Versões definidas de forma adequada
- [ ] Conflitos de dependência ou requisitos especiais registrados
- [ ] [[SÓ BROWNFIELD]] Compatibilidade de versões com o stack existente verificada

## 2. Infraestrutura e Deploy

[[LLM: A infraestrutura precisa existir antes do uso. Em brownfield, ela se integra à existente sem quebrá-la.]]

### 2.1 Banco de Dados e Armazenamento

- [ ] Seleção e setup do banco acontecem antes de qualquer operação
- [ ] Definições de schema criadas antes das operações de dados
- [ ] Estratégias de migração definidas, quando aplicável
- [ ] Dados de seed ou carga inicial incluídos, quando necessário
- [ ] [[SÓ BROWNFIELD]] Riscos de migração do banco identificados e mitigados
- [ ] [[SÓ BROWNFIELD]] Compatibilidade retroativa garantida

### 2.2 Configuração de APIs e Serviços

- [ ] Frameworks de API configurados antes da implementação dos endpoints
- [ ] Arquitetura de serviços estabelecida antes da implementação dos serviços
- [ ] Framework de autenticação configurado antes das rotas protegidas
- [ ] Middleware e utilitários comuns criados antes do uso
- [ ] [[SÓ BROWNFIELD]] Compatibilidade de API com o sistema existente mantida
- [ ] [[SÓ BROWNFIELD]] Integração com a autenticação existente preservada

### 2.3 Pipeline de Deploy

- [ ] Pipeline de CI/CD estabelecido antes das ações de deploy (configuração exclusiva do @devops)
- [ ] Infraestrutura como código configurada antes do uso
- [ ] Configurações de ambiente definidas cedo
- [ ] Estratégias de deploy definidas antes da implementação
- [ ] [[SÓ BROWNFIELD]] O deploy minimiza o tempo fora do ar
- [ ] [[SÓ BROWNFIELD]] Deploy blue-green ou canário implementado

### 2.4 Infraestrutura de Testes

- [ ] Frameworks de teste instalados antes da escrita dos testes
- [ ] Setup do ambiente de teste antes da implementação dos testes
- [ ] Serviços ou dados simulados (mocks) definidos antes dos testes
- [ ] [[SÓ BROWNFIELD]] Testes de regressão cobrem a funcionalidade existente
- [ ] [[SÓ BROWNFIELD]] Testes de integração validam as conexões entre o novo e o existente

## 3. Dependências Externas e Integrações

[[LLM: Dependências externas costumam bloquear o progresso. Em brownfield, garanta que as novas não conflitem com as existentes.]]

### 3.1 Serviços de Terceiros

- [ ] Passos de criação de conta nos serviços necessários identificados
- [ ] Processos de obtenção de chaves de API definidos
- [ ] Passos para guardar credenciais com segurança incluídos
- [ ] Opções de desenvolvimento com fallback ou offline consideradas
- [ ] [[SÓ BROWNFIELD]] Compatibilidade com os serviços existentes verificada
- [ ] [[SÓ BROWNFIELD]] Impacto nas integrações existentes avaliado

### 3.2 APIs Externas

- [ ] Pontos de integração com APIs externas claramente identificados
- [ ] Autenticação com serviços externos na sequência correta
- [ ] Limites e restrições das APIs reconhecidos
- [ ] Estratégias de contingência para falhas de API consideradas
- [ ] [[SÓ BROWNFIELD]] Dependências de API existentes mantidas

### 3.3 Serviços de Infraestrutura

- [ ] Provisionamento de recursos de nuvem na sequência correta
- [ ] Necessidades de DNS ou registro de domínio identificadas
- [ ] Setup de e-mail ou mensageria incluído, quando necessário
- [ ] Setup de CDN ou hospedagem de arquivos estáticos antes do uso
- [ ] [[SÓ BROWNFIELD]] Serviços de infraestrutura existentes preservados

## 4. Considerações de UI/UX [[SÓ UI/UX]]

[[LLM: Avalie esta seção só se o projeto tiver interface. Pule por inteiro em projetos só de backend.]]

### 4.1 Setup do Design System

- [ ] Framework e bibliotecas de UI escolhidos e instalados cedo
- [ ] Design system ou biblioteca de componentes estabelecido
- [ ] Abordagem de estilo definida (ex.: Tailwind, CSS Modules)
- [ ] Estratégia de design responsivo estabelecida
- [ ] Requisitos de acessibilidade definidos desde o início

### 4.2 Infraestrutura do Frontend

- [ ] Pipeline de build do frontend configurado antes do desenvolvimento
- [ ] Estratégia de otimização de assets definida
- [ ] Framework de testes de frontend configurado
- [ ] Fluxo de desenvolvimento de componentes estabelecido
- [ ] [[SÓ BROWNFIELD]] Consistência de UI com o sistema existente mantida

### 4.3 Fluxo de Experiência do Usuário

- [ ] Jornadas do usuário mapeadas antes da implementação
- [ ] Padrões de navegação definidos cedo
- [ ] Estados de erro e de carregamento planejados
- [ ] Padrões de validação de formulários estabelecidos
- [ ] [[SÓ BROWNFIELD]] Fluxos existentes do usuário preservados ou migrados

## 5. Responsabilidades do Usuário e dos Agentes

[[LLM: Responsabilidade clara evita confusão. Garanta que cada tarefa esteja com quem pode executá-la, deixando ao usuário só o que exige um humano.]]

### 5.1 Ações do Usuário

- [ ] Responsabilidades do usuário limitadas ao que só um humano pode fazer
- [ ] Criação de contas em serviços externos atribuída ao usuário
- [ ] Compras ou pagamentos atribuídos ao usuário
- [ ] Fornecimento de credenciais atribuído ao usuário

### 5.2 Ações dos Agentes

- [ ] Todas as tarefas de código atribuídas ao @dev
- [ ] Processos automatizados identificados como responsabilidade dos agentes
- [ ] Gestão de configuração atribuída corretamente (CI/CD, MCP e deploy com o @devops)
- [ ] Testes e validação atribuídos aos agentes adequados (@dev testa, @validator inspeciona, @pm [Qualidade] decide o gate)

## 6. Sequência de Funcionalidades e Dependências

[[LLM: As dependências formam o caminho crítico. Em brownfield, garanta que o novo não quebre o existente.]]

### 6.1 Dependências Funcionais

- [ ] Funcionalidades que dependem de outras estão na ordem correta
- [ ] Componentes compartilhados construídos antes do uso
- [ ] Fluxos do usuário seguem progressão lógica
- [ ] Funcionalidades de autenticação vêm antes das funcionalidades protegidas
- [ ] [[SÓ BROWNFIELD]] Funcionalidade existente preservada em todo o processo

### 6.2 Dependências Técnicas

- [ ] Serviços de nível mais baixo construídos antes dos de nível mais alto
- [ ] Bibliotecas e utilitários criados antes do uso
- [ ] Modelos de dados definidos antes das operações sobre eles
- [ ] Endpoints de API definidos antes do consumo pelo cliente
- [ ] [[SÓ BROWNFIELD]] Pontos de integração testados a cada passo

### 6.3 Dependências entre Epics

- [ ] Epics posteriores se apoiam na funcionalidade dos anteriores
- [ ] Nenhum epic exige funcionalidade de epics posteriores
- [ ] A infraestrutura dos primeiros epics é usada de forma consistente
- [ ] A entrega incremental de valor é mantida
- [ ] [[SÓ BROWNFIELD]] Cada epic mantém a integridade do sistema

## 7. Gestão de Riscos [[SÓ BROWNFIELD]]

[[LLM: Seção CRÍTICA em projetos brownfield. Pense de forma pessimista sobre o que pode quebrar.]]

### 7.1 Riscos de Quebra

- [ ] Risco de quebrar funcionalidade existente avaliado
- [ ] Riscos de migração do banco identificados e mitigados
- [ ] Riscos de quebra de API avaliados
- [ ] Riscos de perda de desempenho identificados
- [ ] Riscos de vulnerabilidade de segurança avaliados

### 7.2 Estratégia de Rollback

- [ ] Procedimentos de rollback definidos por story
- [ ] Estratégia de feature flags implementada
- [ ] Procedimentos de backup e recuperação atualizados
- [ ] Monitoramento reforçado para os componentes novos
- [ ] Gatilhos e limites de rollback definidos

### 7.3 Mitigação do Impacto no Usuário

- [ ] Fluxos existentes do usuário analisados quanto ao impacto
- [ ] Plano de comunicação com os usuários elaborado
- [ ] Materiais de treinamento atualizados
- [ ] Documentação de suporte completa
- [ ] Caminho de migração dos dados do usuário validado

## 8. Alinhamento com o Escopo do MVP

[[LLM: MVP é o produto MÍNIMO viável. Em brownfield, garanta que as evoluções sejam realmente necessárias.]]

### 8.1 Alinhamento com os Objetivos Centrais

- [ ] Todos os objetivos centrais do PRD atendidos
- [ ] As funcionalidades apoiam diretamente os objetivos do MVP
- [ ] Nenhuma funcionalidade além do escopo do MVP
- [ ] Funcionalidades críticas priorizadas corretamente
- [ ] [[SÓ BROWNFIELD]] Complexidade da evolução justificada

### 8.2 Completude das Jornadas do Usuário

- [ ] Todas as jornadas críticas do usuário implementadas por completo
- [ ] Casos de borda e cenários de erro tratados
- [ ] Considerações de experiência do usuário incluídas
- [ ] [[SÓ UI/UX]] Requisitos de acessibilidade incorporados
- [ ] [[SÓ BROWNFIELD]] Fluxos existentes preservados ou melhorados

### 8.3 Requisitos Técnicos

- [ ] Todas as restrições técnicas do PRD atendidas
- [ ] Requisitos não funcionais incorporados
- [ ] Decisões de arquitetura alinhadas às restrições
- [ ] Considerações de desempenho tratadas
- [ ] [[SÓ BROWNFIELD]] Requisitos de compatibilidade atendidos

## 9. Documentação e Handoff

[[LLM: Boa documentação viabiliza um desenvolvimento sem atritos. Em brownfield, a documentação dos pontos de integração é crítica.]]

### 9.1 Documentação para Desenvolvedores

- [ ] Documentação de API criada junto com a implementação
- [ ] Instruções de setup completas
- [ ] Decisões de arquitetura documentadas (ADRs)
- [ ] Padrões e convenções documentados
- [ ] [[SÓ BROWNFIELD]] Pontos de integração documentados em detalhe

### 9.2 Documentação para Usuários

- [ ] Guias do usuário ou ajuda incluídos, quando exigidos
- [ ] Mensagens de erro e feedback ao usuário considerados
- [ ] Fluxos de onboarding totalmente especificados
- [ ] [[SÓ BROWNFIELD]] Mudanças em funcionalidades existentes documentadas

### 9.3 Transferência de Conhecimento

- [ ] [[SÓ BROWNFIELD]] Conhecimento do sistema existente registrado
- [ ] [[SÓ BROWNFIELD]] Conhecimento de integração documentado
- [ ] Compartilhamento de conhecimento na revisão de código planejado
- [ ] Conhecimento de deploy transferido para a operação
- [ ] Contexto histórico preservado

## 10. Considerações Pós-MVP

[[LLM: Planejar o sucesso evita débito técnico. Em brownfield, garanta que as evoluções não limitem o crescimento futuro.]]

### 10.1 Evoluções Futuras

- [ ] Separação clara entre MVP e funcionalidades futuras
- [ ] A arquitetura suporta as evoluções planejadas
- [ ] Considerações de débito técnico documentadas
- [ ] Pontos de extensão identificados
- [ ] [[SÓ BROWNFIELD]] Padrões de integração reutilizáveis

### 10.2 Monitoramento e Feedback

- [ ] Analytics ou rastreamento de uso incluídos, quando exigidos
- [ ] Coleta de feedback dos usuários considerada
- [ ] Monitoramento e alertas tratados
- [ ] Medição de desempenho incorporada
- [ ] [[SÓ BROWNFIELD]] Monitoramento existente preservado ou ampliado

## Resultado

[[LLM: RELATÓRIO FINAL, adaptado ao tipo de projeto:

1. Resumo executivo: tipo de projeto (greenfield ou brownfield, com ou sem UI); prontidão geral (percentual); recomendação GO ou NO-GO; quantidade de problemas bloqueantes; seções puladas pelo tipo de projeto
2. Análise específica do projeto
   - Greenfield: completude do setup, sequência das dependências, adequação do escopo do MVP, viabilidade do prazo
   - Brownfield: nível de risco da integração (alto, médio, baixo), impacto no sistema existente, prontidão do rollback, potencial de transtorno aos usuários
3. Avaliação de riscos: os 5 maiores riscos por severidade, mitigações recomendadas, impacto da correção no prazo; em brownfield, os riscos específicos de integração
4. Completude do MVP: cobertura das funcionalidades centrais, funcionalidade essencial ausente, aumento de escopo identificado, MVP real versus excesso de engenharia
5. Prontidão para implementação: nota de clareza para o desenvolvedor (1 a 10), quantidade de requisitos ambíguos, detalhes técnicos ausentes; em brownfield, clareza dos pontos de integração
6. Recomendações: corrigir antes do desenvolvimento; corrigir pela qualidade; considerar como melhoria; adiar para depois do MVP
7. [SÓ BROWNFIELD] Confiança na integração: na preservação da funcionalidade existente, na completude do rollback, na cobertura de monitoramento dos pontos de integração e na prontidão do suporte

Depois do relatório, ofereça:
1. Análise detalhada das seções reprovadas
2. Sugestões de reordenação de stories
3. Estratégias de mitigação de riscos
4. [BROWNFIELD] Aprofundamento dos riscos de integração]]

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Setup e inicialização do projeto | | |
| 2. Infraestrutura e deploy | | |
| 3. Dependências externas e integrações | | |
| 4. Considerações de UI/UX | | |
| 5. Responsabilidades do usuário e dos agentes | | |
| 6. Sequência de funcionalidades e dependências | | |
| 7. Gestão de riscos (brownfield) | | |
| 8. Alinhamento com o escopo do MVP | | |
| 9. Documentação e handoff | | |
| 10. Considerações pós-MVP | | |

Seções puladas pelo tipo de projeto: marque N/A e registre em Observações.

**Deficiências críticas:** (preencher na validação)

**Recomendações:** (preencher na validação)

**Decisão:**
- **APROVADO:** o plano está completo, na sequência certa e pronto para a implementação.
- **CONDICIONAL:** o plano exige ajustes específicos (listados) antes de seguir.
- **REJEITADO:** o plano exige revisão significativa para resolver deficiências críticas.
