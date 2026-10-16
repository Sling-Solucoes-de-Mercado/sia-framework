# Checklist: Validação da Arquitetura

> Usado por: `@dev` [Arquitetura] em `*architect-checklist` e na seção "Relatório do Checklist" dos templates de arquitetura, com a task execute-checklist.
> Modo: interativo (seção a seção) ou YOLO (relatório completo de uma vez).

Valida o desenho técnico e a arquitetura antes do desenvolvimento: robustez, escalabilidade, segurança e alinhamento com os requisitos do produto.

[[LLM: INICIALIZAÇÃO

Antes de começar, garanta acesso a:
1. docs/architecture.md, o documento principal de arquitetura
2. docs/prd.md, para o alinhamento com os requisitos
3. docs/front-end-architecture.md e docs/front-end-spec.md, se o projeto tiver UI
4. Os diagramas citados na arquitetura
5. A documentação de API, quando houver
6. Os detalhes do stack tecnológico e das versões

IMPORTANTE: se faltar algum documento necessário, peça imediatamente ao usuário a localização ou o conteúdo antes de continuar.

DETECÇÃO DO TIPO DE PROJETO:
- A arquitetura inclui frontend ou UI?
- Existe docs/front-end-architecture.md?
- O PRD cita interfaces de usuário ou requisitos de frontend?

Em projetos só de backend ou de serviço:
- Pule as seções marcadas [[SÓ FRONTEND]]
- Dê atenção extra ao desenho de API, à arquitetura de serviços e aos padrões de integração
- Registre no relatório final que as seções de frontend foram puladas pelo tipo de projeto

ABORDAGEM DE VALIDAÇÃO, em cada seção:
1. Análise profunda: não marque caixas; analise cada item contra a documentação
2. Baseada em evidência: cite seções ou trechos dos documentos ao validar
3. Pensamento crítico: questione suposições e procure lacunas, em vez de só confirmar o que existe
4. Avaliação de risco: considere o que pode dar errado em cada decisão de arquitetura

MODO DE EXECUÇÃO: pergunte ao usuário se prefere seção a seção (interativo, com os achados e a confirmação a cada seção) ou tudo de uma vez (YOLO, relatório completo no fim).

Marque cada item como [x] atendido, [ ] não atendido ou [N/A] não se aplica, com justificativa para [ ] e [N/A].]]

## 1. Alinhamento com os Requisitos

[[LLM: Antes desta seção, entenda de fato o propósito e os objetivos do produto pelo PRD. Qual é o problema central? Quem são os usuários? Quais são os fatores críticos de sucesso? Para cada item, não verifique só se está mencionado: confirme que a arquitetura dá uma solução técnica concreta.]]

### 1.1 Cobertura dos Requisitos Funcionais

- [ ] A arquitetura suporta todos os requisitos funcionais do PRD
- [ ] As abordagens técnicas de todos os epics e stories estão tratadas
- [ ] Casos de borda e cenários de desempenho considerados
- [ ] Todas as integrações necessárias estão contempladas
- [ ] As jornadas do usuário são suportadas pela arquitetura técnica

### 1.2 Alinhamento com os Requisitos Não Funcionais

- [ ] Os requisitos de desempenho têm soluções específicas
- [ ] As considerações de escalabilidade estão documentadas, com abordagem
- [ ] Os requisitos de segurança têm controles técnicos correspondentes
- [ ] As abordagens de confiabilidade e resiliência estão definidas
- [ ] Os requisitos de conformidade têm implementação técnica

### 1.3 Aderência às Restrições Técnicas

- [ ] Todas as restrições técnicas do PRD são atendidas
- [ ] Os requisitos de plataforma e de linguagem são seguidos
- [ ] As restrições de infraestrutura são acomodadas
- [ ] As restrições de serviços de terceiros são tratadas
- [ ] Os padrões técnicos da organização são seguidos

## 2. Fundamentos da Arquitetura

[[LLM: Clareza de arquitetura é decisiva para a implementação. Visualize o sistema como se o explicasse a um desenvolvedor novo. Há ambiguidades que levariam a interpretações erradas? Um agente de IA implementaria esta arquitetura sem confusão? Procure diagramas, definições de componentes e padrões de interação claros.]]

### 2.1 Clareza da Arquitetura

- [ ] A arquitetura está documentada com diagramas claros
- [ ] Os componentes principais e suas responsabilidades estão definidos
- [ ] As interações e dependências entre componentes estão mapeadas
- [ ] Os fluxos de dados estão ilustrados com clareza
- [ ] As escolhas de tecnologia de cada componente estão especificadas

### 2.2 Separação de Responsabilidades

- [ ] Limites claros entre UI, regras de negócio e camada de dados
- [ ] Responsabilidades divididas com clareza entre os componentes
- [ ] Interfaces entre componentes bem definidas
- [ ] Os componentes seguem o princípio da responsabilidade única
- [ ] Preocupações transversais (logs, autenticação etc.) tratadas adequadamente

### 2.3 Padrões de Design e Boas Práticas

- [ ] Padrões de design adequados empregados
- [ ] Boas práticas do setor seguidas
- [ ] Antipadrões evitados
- [ ] Estilo de arquitetura consistente em todo o sistema
- [ ] O uso dos padrões está documentado e explicado

### 2.4 Modularidade e Manutenibilidade

- [ ] O sistema está dividido em módulos coesos e pouco acoplados
- [ ] Os componentes podem ser desenvolvidos e testados de forma independente
- [ ] As mudanças podem ficar restritas a componentes específicos
- [ ] A organização do código favorece encontrar as coisas
- [ ] A arquitetura foi pensada para implementação por agentes de IA

## 3. Stack Técnico e Decisões

[[LLM: Escolhas de tecnologia têm efeito de longo prazo. Para cada decisão: é a solução mais simples que funciona? Há excesso de engenharia? Vai escalar? Quais as implicações de manutenção? Há vulnerabilidades nas versões escolhidas? Verifique que as versões são específicas, não faixas.]]

### 3.1 Seleção de Tecnologia

- [ ] As tecnologias escolhidas atendem a todos os requisitos
- [ ] As versões estão definidas de forma específica (não em faixas)
- [ ] As escolhas de tecnologia têm justificativa clara
- [ ] As alternativas consideradas estão documentadas, com prós e contras (ADR quando estrutural)
- [ ] Os componentes do stack funcionam bem juntos

### 3.2 Arquitetura do Frontend [[SÓ FRONTEND]]

[[LLM: Pule esta seção inteira em projetos só de backend ou de serviço. Avalie só se o projeto tiver interface de usuário.]]

- [ ] Framework e bibliotecas de UI escolhidos de forma específica
- [ ] Abordagem de gerência de estado definida
- [ ] Estrutura e organização dos componentes especificadas
- [ ] Abordagem de design responsivo ou adaptativo descrita
- [ ] Estratégia de build e de bundling definida

### 3.3 Arquitetura do Backend

- [ ] Desenho e padrões de API definidos
- [ ] Organização e limites dos serviços claros
- [ ] Abordagem de autenticação e autorização especificada
- [ ] Estratégia de tratamento de erros descrita
- [ ] Abordagem de escalabilidade do backend definida

### 3.4 Arquitetura de Dados

- [ ] Modelos de dados totalmente definidos
- [ ] Tecnologias de banco escolhidas com justificativa
- [ ] Padrões de acesso a dados documentados
- [ ] Abordagem de migração e de seed especificada
- [ ] Estratégias de backup e recuperação descritas

## 4. Desenho e Implementação do Frontend [[SÓ FRONTEND]]

[[LLM: Pule esta seção inteira em projetos só de backend. Ao avaliar, garanta o alinhamento entre o documento principal de arquitetura e o de arquitetura de frontend.]]

### 4.1 Filosofia e Padrões do Frontend

- [ ] Framework e bibliotecas centrais alinhados ao documento principal de arquitetura
- [ ] Arquitetura de componentes (ex.: Atomic Design) descrita com clareza
- [ ] Estratégia de gerência de estado adequada à complexidade da aplicação
- [ ] Padrões de fluxo de dados consistentes e claros
- [ ] Abordagem de estilo definida, com o ferramental especificado

### 4.2 Estrutura e Organização do Frontend

- [ ] Estrutura de pastas documentada com diagrama ASCII
- [ ] A organização dos componentes segue os padrões declarados
- [ ] Convenções de nomes de arquivo explícitas
- [ ] A estrutura segue as boas práticas do framework escolhido
- [ ] Há orientação clara sobre onde colocar componentes novos

### 4.3 Desenho de Componentes

- [ ] Formato de template ou de especificação de componente definido
- [ ] Props, estado e eventos dos componentes bem documentados
- [ ] Componentes compartilhados e de base identificados
- [ ] Padrões de reutilização de componentes estabelecidos
- [ ] Requisitos de acessibilidade embutidos no desenho dos componentes

### 4.4 Integração entre Frontend e Backend

- [ ] Camada de interação com a API claramente definida
- [ ] Setup e configuração do cliente HTTP documentados
- [ ] Tratamento de erros das chamadas de API completo
- [ ] Definições de serviço seguem padrões consistentes
- [ ] Integração de autenticação com o backend clara

### 4.5 Rotas e Navegação

- [ ] Estratégia e biblioteca de rotas especificadas
- [ ] Tabela de definição de rotas completa
- [ ] Mecanismos de proteção de rotas definidos
- [ ] Considerações de deep linking tratadas
- [ ] Padrões de navegação consistentes

### 4.6 Desempenho do Frontend

- [ ] Estratégias de otimização de imagens definidas
- [ ] Abordagem de divisão de código (code splitting) documentada
- [ ] Padrões de carregamento sob demanda (lazy loading) estabelecidos
- [ ] Técnicas de otimização de re-renderização especificadas
- [ ] Abordagem de monitoramento de desempenho definida

## 5. Resiliência e Prontidão Operacional

[[LLM: Sistemas em produção falham de formas inesperadas. Pense na Lei de Murphy: o que pode dar errado? Considere cenários reais: o que acontece no pico de carga? Como o sistema se comporta quando um serviço crítico cai? A operação consegue diagnosticar um problema às 3 da manhã? Procure padrões de resiliência específicos, não só menções a "tratamento de erros".]]

### 5.1 Tratamento de Erros e Resiliência

- [ ] Estratégia de tratamento de erros completa
- [ ] Políticas de retentativa definidas onde fazem sentido
- [ ] Circuit breakers ou fallbacks especificados para serviços críticos
- [ ] Abordagens de degradação graciosa definidas
- [ ] O sistema se recupera de falhas parciais

### 5.2 Monitoramento e Observabilidade

- [ ] Estratégia de logs definida
- [ ] Abordagem de monitoramento especificada
- [ ] Métricas-chave de saúde do sistema identificadas
- [ ] Limites e estratégias de alerta descritos
- [ ] Recursos de depuração e diagnóstico embutidos

### 5.3 Desempenho e Escalabilidade

- [ ] Gargalos de desempenho identificados e tratados
- [ ] Estratégia de cache definida onde faz sentido
- [ ] Abordagem de balanceamento de carga especificada
- [ ] Estratégias de escala horizontal e vertical descritas
- [ ] Recomendações de dimensionamento de recursos apresentadas

### 5.4 Deploy e DevOps

- [ ] Estratégia de deploy definida
- [ ] Abordagem do pipeline de CI/CD descrita
- [ ] Estratégia de ambientes (desenvolvimento, staging, produção) especificada
- [ ] Abordagem de infraestrutura como código definida
- [ ] Procedimentos de rollback e recuperação descritos

## 6. Segurança e Conformidade

[[LLM: Segurança não é opcional. Revise esta seção com a cabeça de um atacante: como alguém exploraria este sistema? Considere também a conformidade: há regulações do setor que se aplicam (LGPD, GDPR, HIPAA, PCI)? Garanta que a arquitetura trate disso de forma proativa. Procure controles de segurança específicos, não declarações genéricas.]]

### 6.1 Autenticação e Autorização

- [ ] Mecanismo de autenticação claramente definido
- [ ] Modelo de autorização especificado
- [ ] Controle de acesso por papel descrito, quando exigido
- [ ] Abordagem de gestão de sessão definida
- [ ] Gestão de credenciais tratada

### 6.2 Segurança dos Dados

- [ ] Criptografia em repouso e em trânsito especificada
- [ ] Procedimentos de tratamento de dados sensíveis definidos
- [ ] Políticas de retenção e de descarte de dados descritas
- [ ] Criptografia de backups tratada, quando exigida
- [ ] Trilhas de auditoria de acesso a dados especificadas, quando exigidas

### 6.3 Segurança de APIs e Serviços

- [ ] Controles de segurança de API definidos
- [ ] Abordagens de limitação de taxa (rate limiting) especificadas
- [ ] Estratégia de validação de entrada descrita
- [ ] Medidas de prevenção de CSRF e XSS tratadas
- [ ] Protocolos de comunicação segura especificados

### 6.4 Segurança da Infraestrutura

- [ ] Desenho de segurança de rede descrito
- [ ] Configurações de firewall e de grupos de segurança especificadas
- [ ] Abordagem de isolamento de serviços definida
- [ ] Princípio do menor privilégio aplicado
- [ ] Estratégia de monitoramento de segurança descrita

## 7. Orientação para a Implementação

[[LLM: Orientação clara evita erros caros. Imagine um desenvolvedor no primeiro dia: ele tem tudo de que precisa para ser produtivo? Os padrões de código são claros o bastante para manter a consistência? Procure exemplos e padrões específicos.]]

### 7.1 Padrões e Práticas de Código

- [ ] Coding Standards definidos
- [ ] Requisitos de documentação especificados
- [ ] Expectativas de teste descritas
- [ ] Princípios de organização do código definidos
- [ ] Convenções de nomes especificadas

### 7.2 Estratégia de Testes

- [ ] Abordagem de testes unitários definida
- [ ] Estratégia de testes de integração descrita
- [ ] Abordagem de testes E2E especificada
- [ ] Requisitos de testes de desempenho descritos
- [ ] Abordagem de testes de segurança definida

### 7.3 Testes de Frontend [[SÓ FRONTEND]]

[[LLM: Pule esta subseção em projetos só de backend.]]

- [ ] Escopo e ferramentas de teste de componentes definidos
- [ ] Abordagem de testes de integração de UI especificada
- [ ] Testes de regressão visual considerados
- [ ] Ferramentas de teste de acessibilidade identificadas
- [ ] Gestão de dados de teste específicos do frontend tratada

### 7.4 Ambiente de Desenvolvimento

- [ ] Setup do ambiente local documentado
- [ ] Ferramentas e configurações necessárias especificadas
- [ ] Fluxos de desenvolvimento descritos
- [ ] Práticas de controle de versão definidas
- [ ] Abordagem de gestão de dependências especificada

### 7.5 Documentação Técnica

- [ ] Padrões de documentação de API definidos
- [ ] Requisitos de documentação de arquitetura especificados
- [ ] Expectativas de documentação do código descritas
- [ ] Diagramas e visualizações do sistema incluídos
- [ ] Registros de decisão (ADRs) das escolhas-chave incluídos

## 8. Gestão de Dependências e Integrações

[[LLM: Dependências costumam causar problemas em produção. Para cada uma: o que acontece se ela ficar indisponível? Há versão mais nova com correções de segurança? Há aprisionamento a fornecedor? Qual é o plano de contingência? Verifique versões específicas e estratégias de fallback.]]

### 8.1 Dependências Externas

- [ ] Todas as dependências externas identificadas
- [ ] Estratégia de versionamento das dependências definida
- [ ] Abordagens de fallback para dependências críticas especificadas
- [ ] Implicações de licenciamento tratadas
- [ ] Estratégia de atualização e de correções descrita

### 8.2 Dependências Internas

- [ ] Dependências entre componentes claramente mapeadas
- [ ] Dependências de ordem de build tratadas
- [ ] Serviços e utilitários compartilhados identificados
- [ ] Dependências circulares eliminadas
- [ ] Estratégia de versionamento dos componentes internos definida

### 8.3 Integrações de Terceiros

- [ ] Todas as integrações de terceiros identificadas
- [ ] Abordagens de integração definidas
- [ ] Autenticação com terceiros tratada
- [ ] Tratamento de erros nas falhas de integração especificado
- [ ] Limites de uso e cotas considerados

## 9. Adequação à Implementação por Agentes de IA

[[LLM: Esta arquitetura pode ser implementada por agentes de IA. Revise com clareza extrema em mente. Os padrões são consistentes? A complexidade está minimizada? Um agente de IA faria suposições erradas? Lembre: explícito é melhor que implícito. Procure estruturas de arquivos, convenções de nomes e padrões de implementação claros.]]

### 9.1 Modularidade para Agentes de IA

- [ ] Componentes dimensionados para implementação por agentes de IA
- [ ] Dependências entre componentes minimizadas
- [ ] Interfaces claras entre os componentes
- [ ] Componentes com responsabilidade única e bem definida
- [ ] Organização de arquivos e de código otimizada para o entendimento de agentes de IA

### 9.2 Clareza e Previsibilidade

- [ ] Padrões consistentes e previsíveis
- [ ] Lógica complexa quebrada em passos mais simples
- [ ] A arquitetura evita abordagens rebuscadas ou obscuras
- [ ] Exemplos fornecidos para padrões pouco conhecidos
- [ ] Responsabilidades dos componentes explícitas e claras

### 9.3 Orientação de Implementação

- [ ] Orientação detalhada de implementação fornecida
- [ ] Templates de estrutura de código definidos
- [ ] Padrões específicos de implementação documentados
- [ ] Armadilhas comuns identificadas, com soluções
- [ ] Referências a implementações semelhantes fornecidas quando ajudam

### 9.4 Prevenção e Tratamento de Erros

- [ ] O desenho reduz as oportunidades de erro de implementação
- [ ] Abordagens de validação e de verificação de erros definidas
- [ ] Mecanismos de autorrecuperação incorporados onde possível
- [ ] Padrões de teste claramente definidos
- [ ] Orientação de depuração fornecida

## 10. Implementação de Acessibilidade [[SÓ FRONTEND]]

[[LLM: Pule esta seção em projetos só de backend. Acessibilidade é requisito central de qualquer interface; o padrão do SIA é WCAG AA.]]

### 10.1 Padrões de Acessibilidade

- [ ] O uso de HTML semântico é enfatizado
- [ ] Diretrizes de implementação de ARIA fornecidas
- [ ] Requisitos de navegação por teclado definidos
- [ ] Abordagem de gestão de foco especificada
- [ ] Compatibilidade com leitores de tela tratada

### 10.2 Testes de Acessibilidade

- [ ] Ferramentas de teste de acessibilidade identificadas
- [ ] Processo de teste integrado ao fluxo de trabalho
- [ ] Metas de conformidade (nível WCAG) especificadas
- [ ] Procedimentos de teste manual definidos
- [ ] Abordagem de testes automatizados descrita

## Resultado

[[LLM: RELATÓRIO FINAL

Depois de concluir o checklist, gere um relatório de validação completo com:

1. Resumo executivo: prontidão geral da arquitetura (alta, média, baixa); riscos críticos identificados; principais forças da arquitetura; tipo de projeto (full stack, frontend, backend) e seções avaliadas
2. Análise por seção: taxa de aprovação de cada seção (percentual de itens atendidos); falhas ou lacunas mais preocupantes; seções que pedem atenção imediata; seções puladas pelo tipo de projeto
3. Avaliação de riscos: os 5 maiores riscos por severidade, a mitigação recomendada para cada um e o impacto da correção no prazo
4. Recomendações: o que corrigir antes do desenvolvimento; o que corrigir pela qualidade; melhorias desejáveis
5. Prontidão para implementação por IA: preocupações específicas para agentes de IA; áreas que pedem esclarecimento; pontos de complexidade a tratar
6. Avaliação específica do frontend (quando aplicável): completude da arquitetura de frontend; alinhamento entre os documentos principal e de frontend; cobertura da especificação de UI/UX; clareza do desenho de componentes

Depois do relatório, pergunte se o usuário quer a análise detalhada de alguma seção, em especial das que tiveram alertas ou falhas.]]

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Alinhamento com os requisitos | | |
| 2. Fundamentos da arquitetura | | |
| 3. Stack técnico e decisões | | |
| 4. Desenho e implementação do frontend | | |
| 5. Resiliência e prontidão operacional | | |
| 6. Segurança e conformidade | | |
| 7. Orientação para a implementação | | |
| 8. Gestão de dependências e integrações | | |
| 9. Adequação à implementação por agentes de IA | | |
| 10. Implementação de acessibilidade | | |

Status por seção, pela taxa de aprovação: ✅ 90% ou mais; ⚠️ de 60% a 89%; ❌ menos de 60%. Seções puladas pelo tipo de projeto: N/A.

**Decisão:** prontidão ALTA (nenhum item "corrigir antes do desenvolvimento") libera a fragmentação e as stories. Prontidão MÉDIA exige corrigir os itens obrigatórios antes de seguir. Prontidão BAIXA devolve a arquitetura para revisão.
