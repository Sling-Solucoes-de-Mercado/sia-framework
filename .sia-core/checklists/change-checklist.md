# Checklist: Navegação de Mudanças

> Usado por: `@pm` [Produto] em `*correct-course`, com a task correct-course.
> Modo: interativo (seção a seção, com o usuário). As decisões são do usuário; o agente orienta.

Guia de forma sistemática a análise e o planejamento quando surge uma mudança significativa durante o trabalho no SIA: pivô, problema técnico, requisito ausente ou story que falhou.

[[LLM: INICIALIZAÇÃO

Mudanças durante o desenvolvimento são inevitáveis; a forma de lidar com elas define o sucesso do projeto.

Antes de começar, entenda:
1. Este checklist é para mudanças SIGNIFICATIVAS, que afetam a direção do projeto
2. Ajustes pequenos dentro de uma story não exigem este processo
3. O objetivo é minimizar trabalho perdido e se adaptar à nova realidade
4. O entendimento e a aprovação do usuário são indispensáveis

Contexto necessário:
- A story ou o problema que disparou a revisão
- O estado atual do projeto (stories concluídas, epic atual)
- Acesso ao PRD, à arquitetura e aos demais documentos-chave
- O trabalho restante planejado

ABORDAGEM: processo interativo com o usuário. Trabalhe cada seção em conjunto, discutindo implicações e opções. O usuário toma as decisões finais; você orienta sobre viabilidade técnica e impacto.

Marque cada item como [x] concluído ou confirmado, [N/A] não se aplica, ou acrescente notas para os pontos em discussão.

LEMBRE: mudanças são oportunidades de melhorar, não fracassos. Trate-as de forma profissional e construtiva.]]

## 1. Entender o Gatilho e o Contexto

[[LLM: Comece entendendo por completo o que deu errado e por quê. Não pule para soluções. Faça perguntas investigativas:
- O que exatamente aconteceu para disparar esta revisão?
- É um problema pontual ou sintoma de algo maior?
- Dava para prever isto antes?
- Que suposições estavam erradas?

Seja específico e factual, sem buscar culpados.]]

- [ ] **Story que disparou a mudança:** a story (ou as stories) que revelou o problema está identificada
- [ ] **Definição do problema:** o problema central está articulado com precisão
  - [ ] É uma limitação técnica ou um beco sem saída?
  - [ ] É um requisito recém-descoberto?
  - [ ] É um mal-entendido fundamental dos requisitos existentes?
  - [ ] É um pivô necessário por feedback ou informação nova?
  - [ ] É uma story que falhou ou foi abandonada e precisa de nova abordagem?
- [ ] **Impacto inicial:** as consequências imediatas estão descritas (ex.: progresso bloqueado, funcionalidade incorreta, tecnologia inviável)
- [ ] **Evidências:** logs, mensagens de erro, feedback de usuários ou análises que sustentam o problema estão registrados

## 2. Avaliação de Impacto nos Epics

[[LLM: Mudanças se propagam pela estrutura do projeto. Avalie de forma sistemática:
1. Dá para salvar o epic atual com modificações?
2. Os epics futuros ainda fazem sentido com esta mudança?
3. Estamos criando ou eliminando dependências?
4. A sequência dos epics precisa mudar?

Pense nos efeitos imediatos e nos posteriores.]]

- [ ] **Epic atual:**
  - [ ] O epic que contém a story-gatilho ainda pode ser concluído?
  - [ ] O epic atual precisa de modificação (mudança, acréscimo ou remoção de stories)?
  - [ ] O epic atual deve ser abandonado ou redefinido por completo?
- [ ] **Epics futuros:**
  - [ ] Todos os epics planejados restantes foram revisados
  - [ ] O problema exige mudar stories planejadas em epics futuros?
  - [ ] O problema invalida algum epic futuro?
  - [ ] O problema exige criar epics novos?
  - [ ] A ordem ou a prioridade dos epics futuros deve mudar?
- [ ] **Resumo do impacto nos epics:** o efeito geral na estrutura e no fluxo dos epics está documentado

## 3. Conflitos e Impacto nos Artefatos

[[LLM: No SIA, a documentação conduz o desenvolvimento. Verifique cada artefato:
1. A mudança invalida decisões documentadas?
2. As premissas de arquitetura continuam válidas?
3. Os fluxos do usuário precisam ser repensados?
4. As restrições técnicas mudaram em relação ao documentado?

Seja minucioso: conflito não detectado vira problema no futuro.]]

- [ ] **PRD (docs/prd.md):**
  - [ ] O problema conflita com os objetivos ou requisitos centrais do PRD?
  - [ ] O PRD precisa de esclarecimento ou atualização com o novo entendimento?
- [ ] **Arquitetura (docs/architecture.md):**
  - [ ] O problema conflita com a arquitetura documentada (componentes, padrões, tecnologias)?
  - [ ] Componentes, diagramas ou seções específicos são afetados?
  - [ ] O Tech Stack precisa de atualização?
  - [ ] Modelos de dados ou schemas precisam de revisão?
  - [ ] Integrações com APIs externas são afetadas?
  - [ ] Alguma decisão nova ou revista exige ADR?
- [ ] **Especificação de front-end (quando aplicável):**
  - [ ] O problema conflita com a arquitetura de front-end, a biblioteca de componentes ou o design de UI/UX?
  - [ ] Componentes ou fluxos de front-end específicos são afetados?
- [ ] **Outros artefatos (quando aplicável):**
  - [ ] Impacto em scripts de deploy, IaC, monitoramento etc. considerado
- [ ] **Resumo do impacto nos artefatos:** todos os artefatos que precisam de atualização e a natureza de cada mudança estão listados

## 4. Avaliação do Caminho a Seguir

[[LLM: Apresente as opções com clareza, com prós e contras. Para cada caminho:
1. Qual é o esforço?
2. Que trabalho é descartado?
3. Que riscos assumimos?
4. Como isto afeta o prazo?
5. É sustentável a longo prazo?

Seja honesto sobre os trade-offs: raramente há solução perfeita.]]

- [ ] **Opção 1: ajuste direto ou integração**
  - [ ] Dá para resolver modificando ou acrescentando stories futuras dentro do plano atual?
  - [ ] Escopo e natureza dos ajustes definidos
  - [ ] Viabilidade, esforço e riscos deste caminho avaliados
- [ ] **Opção 2: rollback**
  - [ ] Reverter stories concluídas simplificaria bastante a solução?
  - [ ] Stories ou commits candidatos a rollback identificados
  - [ ] Esforço do rollback avaliado
  - [ ] Impacto do rollback avaliado (trabalho perdido, implicações nos dados)
  - [ ] Benefício e custo líquidos comparados com o ajuste direto
- [ ] **Opção 3: revisão do MVP no PRD e possível redução de escopo**
  - [ ] O MVP original ainda é alcançável com o problema e as restrições?
  - [ ] O escopo do MVP precisa encolher (remover funcionalidades ou epics)?
  - [ ] Os objetivos centrais do MVP precisam mudar?
  - [ ] São necessárias abordagens alternativas para atender à intenção original do MVP?
  - [ ] **Caso extremo:** o problema exige um replanejamento fundamental ou um novo PRD (conduzido pelo @pm [Produto])?
- [ ] **Caminho recomendado:** o caminho mais viável foi escolhido em acordo com o usuário

## 5. Componentes da Proposta de Mudança

[[LLM: A proposta precisa ser acionável e clara. Garanta que:
1. O problema esteja explicado em linguagem simples
2. Os impactos estejam quantificados quando possível
3. O caminho recomendado tenha justificativa clara
4. Os próximos passos sejam específicos e tenham responsável
5. Os critérios de sucesso da mudança estejam definidos

Esta proposta guia todo o trabalho seguinte.]]

Garanta que tudo o que foi acordado nas seções anteriores esteja na proposta:

- [ ] **Resumo do problema:** definição clara e concisa
- [ ] **Resumo do impacto nos epics:** como os epics são afetados
- [ ] **Ajustes de artefatos:** lista dos documentos a mudar
- [ ] **Caminho recomendado:** solução escolhida, com justificativa
- [ ] **Impacto no MVP do PRD:** mudanças de escopo ou de objetivos (se houver)
- [ ] **Plano de ação de alto nível:** próximos passos de stories e atualizações
- [ ] **Plano de handoff entre agentes:** papéis necessários (@pm [Produto], @pm [Product Owner], @dev [Arquitetura], @dev [UX/UI]) e o comando de cada um

## 6. Revisão Final e Handoff

[[LLM: Mudanças exigem coordenação. Antes de concluir:
1. O usuário está totalmente alinhado com o plano?
2. As partes interessadas entendem os impactos?
3. Os handoffs para os outros agentes estão claros?
4. Há plano de rollback se a mudança falhar?
5. Como vamos validar que a mudança funcionou?

Obtenha aprovação explícita: concordância implícita gera problemas.

RELATÓRIO FINAL: ao concluir o checklist, apresente um resumo conciso: o que mudou e por quê; o que vamos fazer; quem faz o quê; quando saberemos se funcionou. Mantenha o foco em ação e no futuro.]]

- [ ] **Revisão do checklist:** todos os itens relevantes foram discutidos
- [ ] **Revisão da Proposta de Mudança:** ela reflete com precisão a discussão e as decisões
- [ ] **Aprovação do usuário:** aprovação explícita da proposta obtida
- [ ] **Próximos passos confirmados:** plano de handoff e próximas ações de cada agente reafirmados

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Gatilho e contexto | | |
| 2. Impacto nos epics | | |
| 3. Impacto nos artefatos | | |
| 4. Caminho a seguir | | |
| 5. Proposta de Mudança | | |
| 6. Revisão final e handoff | | |

**Decisão:** a Proposta de Mudança só é executada com a aprovação explícita do usuário. Sem aprovação, volte à seção 4 e reavalie o caminho.
