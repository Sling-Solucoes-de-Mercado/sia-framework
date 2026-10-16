---
id: example-task
title: Executar a task de exemplo
agent: example-agent
elicit: true
inputs:
  - 'entrada (obrigatória): texto ou caminho de arquivo a processar'
outputs:
  - 'Resumo no chat com o resultado e os próximos passos'
depends_on:
  tasks: []
  templates: []
  checklists: []
  data: []
next: []
---

<!--
Task de exemplo do esqueleto de squad, no formato de task do SIA (guia de autoria, seção 8).
Placeholders: {{SQUAD_NAME}} (ver README.md do esqueleto). Personalize ou remova.
Regras: id igual ao nome do arquivo; agent é o id de um agente do squad (ou um dos 5 agentes do SIA);
toda dependência existe em squads/{{SQUAD_NAME}}/{tipo}/ ou em .sia-core/{tipo}/.
-->

# Executar a task de exemplo

## Objetivo

Mostrar o formato de task do SIA: receber uma entrada, processá-la em passos objetivos e entregar uma saída verificável.

## Quando usar

- Para conhecer a estrutura de uma task antes de escrever as tasks reais do squad.
- Não use em produção: substitua por tasks do domínio do squad.

## Pré-condições

- [ ] Entrada informada (texto ou caminho de arquivo legível)

## Passos

### 1. Receber a entrada

Leia a entrada recebida em `*run-example {entrada}`. Se for um caminho, leia o arquivo por inteiro.

**Ponto de elicitação:** sem entrada, pergunte:

1. Colar um texto
2. Informar o caminho de um arquivo
3. Cancelar

### 2. Processar

Resuma a entrada em até 5 tópicos e identifique o tipo de conteúdo (texto livre, lista, tabela ou código).

### 3. Apresentar o resultado

Mostre o resumo e sugira o próximo passo: personalizar esta task ou criar a task real com `@squad-creator *create-task`.

## Saída

Resumo no chat, neste formato:

```text
Tipo de conteúdo: {tipo}
Resumo:
1. {tópico}
2. {tópico}
Próximo passo: {sugestão}
```

## Critérios de conclusão

- [ ] Entrada lida por inteiro
- [ ] Resumo com no máximo 5 tópicos
- [ ] Próximo passo sugerido

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Arquivo não encontrado | Informe o caminho tentado e peça outro |
| Entrada vazia | Volte ao ponto de elicitação do passo 1 |

## Handoff

Próximo passo: `@squad-creator *create-task` para escrever a primeira task real do squad {{SQUAD_NAME}}.
