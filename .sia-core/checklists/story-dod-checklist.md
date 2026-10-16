# Checklist: Definição de Pronto da Story (DoD)

> Usado por: `@dev` [Desenvolvimento] em `*dod-checklist {storyId}` e na conclusão do `*develop`, antes de mover a story para InReview.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

Antes de mover a story para InReview, percorra cada item e informe o status ([x] feito, [ ] não feito, [N/A] não se aplica), com um comentário breve quando necessário.

[[LLM: INICIALIZAÇÃO

Este checklist é a autoavaliação do @dev antes de concluir a story.

IMPORTANTE: seja honesto sobre o que está realmente feito e o que deveria estar. É melhor achar problemas agora do que na inspeção do @validator ou no QA gate.

COMO EXECUTAR:
1. Percorra cada seção de forma sistemática
2. Marque cada item como [x] feito, [ ] não feito ou [N/A] não se aplica
3. Comente brevemente todo [ ] e todo [N/A]
4. Seja específico sobre o que foi de fato implementado
5. Sinalize preocupações ou débito técnico criado
6. Rode lint, typecheck, testes e build com os comandos de quality.scripts do core-config. Script ausente no projeto vira [N/A], com a ausência registrada

O objetivo é entregar com qualidade, não marcar caixinhas.]]

## 1. Requisitos Atendidos

[[LLM: Seja específico: liste cada requisito e diga se está completo.]]

- [ ] Todos os requisitos funcionais da story estão implementados
- [ ] Todos os critérios de aceite da story foram atendidos

## 2. Padrões de Código e Estrutura do Projeto

[[LLM: Qualidade de código importa para a manutenção. Verifique cada item com cuidado.]]

- [ ] O código novo ou alterado segue os Coding Standards (docs/architecture/coding-standards.md)
- [ ] O código segue a Source Tree (docs/architecture/source-tree.md): local dos arquivos, nomes etc.
- [ ] Tecnologias e versões seguem o Tech Stack (docs/architecture/tech-stack.md), quando a story introduz ou altera o uso de tecnologia
- [ ] O código segue a especificação de API e os modelos de dados da arquitetura, quando a story mexe em API ou em modelo de dados
- [ ] Boas práticas básicas de segurança aplicadas ao código novo ou alterado (validação de entrada, tratamento de erros adequado, nenhum segredo no código)
- [ ] Nenhum erro ou aviso de lint novo
- [ ] Comentários onde necessário (explicam lógica complexa, não o óbvio)

## 3. Testes

[[LLM: Os testes provam que o código funciona. Seja honesto sobre a cobertura.]]

- [ ] Todos os testes unitários exigidos pela story e pela estratégia de testes da arquitetura estão implementados
- [ ] Todos os testes de integração exigidos (quando aplicável) estão implementados
- [ ] Todos os testes (unitários, de integração e E2E, quando houver) passam
- [ ] A cobertura atende ao padrão do projeto (quando definido)

## 4. Funcionalidade e Verificação

[[LLM: Você realmente rodou e testou o código? Diga o que foi testado.]]

- [ ] A funcionalidade foi verificada manualmente (ex.: app rodando localmente, UI conferida, endpoints testados)
- [ ] Casos de borda e condições de erro considerados e tratados de forma adequada

## 5. Administração da Story

[[LLM: A documentação ajuda o próximo desenvolvedor. O que ele precisa saber?]]

- [ ] Todas as tasks e subtasks da story estão marcadas [x]
- [ ] Esclarecimentos e decisões da implementação estão registrados na story (Decisões (modo YOLO) e Notas de conclusão)
- [ ] O Registro do Dev está completo: Modelo usado, Notas de conclusão com o que importa para a próxima story ou para o projeto, e File List com todo arquivo criado, modificado ou removido
- [ ] O Change Log registra as transições de status do executor (Ready → InProgress → InReview)

## 6. Dependências, Build e Configuração

[[LLM: Problema de build bloqueia todo mundo. Garanta que tudo compila e roda sem erros.]]

- [ ] O build do projeto conclui sem erros
- [ ] O lint passa
- [ ] O typecheck passa
- [ ] Toda dependência nova foi pré-aprovada nos requisitos da story OU aprovada explicitamente pelo usuário durante o desenvolvimento, com a aprovação registrada na story
- [ ] Dependências novas estão registradas nos arquivos do projeto (ex.: package.json), com justificativa
- [ ] Nenhuma vulnerabilidade de segurança conhecida foi introduzida pelas dependências novas
- [ ] Variáveis de ambiente ou configurações novas estão documentadas e tratadas com segurança

## 7. Documentação (quando aplicável)

[[LLM: Boa documentação evita confusão futura. O que precisa ser explicado?]]

- [ ] Documentação inline (JSDoc, TSDoc, docstrings) completa para APIs públicas novas e lógica complexa
- [ ] Documentação para o usuário atualizada, se a mudança o afeta
- [ ] Documentação técnica (README, diagramas) atualizada, se houve mudança de arquitetura relevante

## Resultado

[[LLM: RESUMO FINAL DA DoD

Depois de concluir o checklist:
1. Resuma o que foi entregue nesta story
2. Liste os itens marcados [ ], com a explicação
3. Identifique débito técnico ou trabalho de continuação necessário (sugira `*tech-debt` quando couber)
4. Registre desafios ou aprendizados úteis para as próximas stories
5. Confirme se a story está realmente pronta para a inspeção

Seja honesto: é melhor sinalizar problemas agora do que vê-los descobertos depois.]]

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Requisitos atendidos | | |
| 2. Padrões de código e estrutura | | |
| 3. Testes | | |
| 4. Funcionalidade e verificação | | |
| 5. Administração da story | | |
| 6. Dependências, build e configuração | | |
| 7. Documentação | | |

- [ ] Eu, @dev, confirmo que todos os itens aplicáveis acima foram tratados.

**Decisão:** a story só vai para InReview com todos os itens aplicáveis em [x] (ou [N/A] justificado). Qualquer [ ] bloqueia: corrija, ou registre o motivo na story e peça orientação ao usuário. Com a DoD aprovada: Status InReview, linha no Change Log e handoff para `@validator *revisar-feature {storyId}`.
