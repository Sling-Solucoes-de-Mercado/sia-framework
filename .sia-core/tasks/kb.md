---
id: kb
title: Modo base de conhecimento do SIA
agent: squad-creator
elicit: true
inputs:
  - 'pergunta (opcional): dúvida sobre o SIA; sem ela, a task mostra os tópicos'
outputs:
  - 'Respostas no chat, com a fonte citada (arquivo e seção)'
depends_on:
  data: [sia-kb.md, sia-authoring-guide.md]
next: []
source: [kb-mode-interaction.md]
---

# Modo base de conhecimento do SIA

## Objetivo

Responder dúvidas sobre o SIA de forma conversacional, sem despejar informação, usando só a base de conhecimento oficial.

## Quando usar

- Dúvidas sobre agentes, comandos, workflows, ciclo da story, configuração, IDEs ou squads.
- Não use para executar trabalho: o modo KB explica e aponta o comando certo.

## Fontes

Responda somente com base nestes arquivos:

| Fonte | Conteúdo |
|-------|----------|
| `.sia-core/data/sia-kb.md` | base de conhecimento do SIA |
| `.sia-core/user-guide.md` | uso do dia a dia: agentes, ativação, ciclo da story, workflows, CLI |
| `.sia-core/data/sia-authoring-guide.md` | formatos, glossário, estrutura de pastas, ciclo de vida, CLI |
| `.sia-core/constitution.md` | princípios inegociáveis |

## Pré-condições

- [ ] Pelo menos uma das fontes existe (sem nenhuma, avise e saia do modo)

## Passos

### 1. Entrar no modo

Anuncie a entrada no modo KB em uma frase. Carregue as fontes só agora, nunca na ativação do agente. Fonte ausente: diga qual falta e siga com as demais.

### 2. Apresentar os tópicos

Com uma pergunta já feita, pule para o passo 3.

**Ponto de elicitação:** O que você quer saber?

1. Primeiros passos: projeto novo ou existente
2. Agentes e chapéus: quem faz o quê
3. Ciclo da story: de Draft a Done, inspeção e QA gate
4. Workflows: qual usar em cada situação
5. Documentos: PRD, arquitetura, stories e onde ficam
6. Configuração: `core-config.yaml`
7. IDEs e projeções: ativação e `sia sync`
8. Squads e criação de agentes, tasks e workflows
9. Constitution: as regras inegociáveis
10. Boas práticas e armadilhas comuns

Ou pergunte qualquer coisa sobre o SIA.

### 3. Responder no contexto

- Responda a pergunta feita, de forma curta, a menos que o usuário peça detalhe.
- Cite a fonte ao final do trecho: "(guia de autoria, seção 6)", "(user-guide, seção 8)".
- Quando a resposta leva a uma ação, diga o agente e o comando (ex.: `@pm *validate-story {storyId}`).
- Use exemplos curtos quando ajudarem.

### 4. Explorar

Depois de responder, ofereça aprofundar ou sugira até 3 tópicos relacionados, numerados. Mantenha a conversa, sem despejar seções inteiras.

### 5. Tratar o que está fora da base

Se a resposta não está nas fontes, diga "Não encontrei isso na base do SIA" e indique o agente ou o comando que pode ajudar. Nunca complete com conhecimento externo nem com o comportamento de outros frameworks (Artigo IV: sem invenção).

### 6. Sair do modo

Quando o usuário encerrar ("sair do kb") ou pedir um comando: resuma os pontos principais, se ajudar, lembre que `*kb` reabre o modo e sugira os próximos passos.

## Saída

```text
Usuário: *kb
Elo: Modo KB ativo. Respondo com base no guia do usuário, no guia de autoria e na Constitution do SIA.
     O que você quer saber?
     1. Primeiros passos ... 10. Boas práticas
Usuário: quem muda a story para Done?
Elo: O @pm, com o chapéu Qualidade, no *qa-gate: PASS, CONCERNS e WAIVED levam a story de InReview
     para Done; FAIL devolve para InProgress (guia de autoria, seção 6).
     Quer ver: 1. o que a inspeção do @validator exige  2. o QA Loop  3. o ciclo completo?
```

## Critérios de conclusão

- [ ] Toda resposta apoiada nas fontes, com a origem citada
- [ ] Perguntas fora da base sinalizadas, sem invenção
- [ ] Opções sempre numeradas

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nenhuma fonte disponível | Avise e saia do modo |
| Fontes divergentes | Vale a Constitution, depois o guia de autoria; aponte a divergência ao usuário |
| Pedido de execução dentro do modo | Saia do modo e execute o comando correspondente |

## Handoff

Próximo passo: o comando indicado na última resposta, ou `*help` para ver os comandos do `@squad-creator`.
