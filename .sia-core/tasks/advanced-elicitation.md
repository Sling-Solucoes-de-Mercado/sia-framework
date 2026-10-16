---
id: advanced-elicitation
title: Elicitação avançada
agent: any
elicit: true
inputs:
  - 'conteúdo: seção recém-rascunhada (chamada por create-doc) ou qualquer saída do agente na conversa'
  - 'contexto (opcional): tipo de documento, público, nível de risco, custom_elicitation do template'
outputs:
  - 'Conteúdo refinado, aplicado na seção ou na conversa; esta task não grava arquivos'
depends_on:
  data: [elicitation-methods.md]
next: []
source: [advanced-elicitation.md]
---

# Elicitação avançada

## Objetivo
Oferecer ações estruturadas de reflexão e exploração (métodos de `data/elicitation-methods.md`) para melhorar um conteúdo antes de seguir em frente, sempre com a decisão nas mãos do usuário.

## Quando usar
- **Na criação de documento:** chamada por `create-doc` depois de cada seção com `elicit: true`.
- **Na conversa:** quando o usuário pede "faz uma elicitação avançada", "critica isso" ou "explora alternativas" sobre qualquer saída do agente (`@pm *elicit`).
- Não use para levantar requisitos do zero (`gather-requirements`) nem para conduzir brainstorming (`brainstorm`).

## Pré-condições
- [ ] Existe um conteúdo concreto para refinar (seção, lista, decisão, plano)
- [ ] `data/elicitation-methods.md` disponível

## Passos

### 1. Analisar o contexto
Antes de montar o menu, avalie:
- **tipo de conteúdo:** especificação técnica, story, arquitetura, requisitos, estratégia...;
- **complexidade:** simples, moderada ou complexa;
- **quem vai usar** o conteúdo;
- **nível de risco:** decisão de alto impacto ou item de rotina;
- **potencial criativo:** espaço para alternativas ou inovação.

### 2. Selecionar 8 métodos
1. **Núcleo (3 ou 4):** expandir ou contrair para o público; criticar e refinar; identificar riscos potenciais; avaliar o alinhamento com os objetivos.
2. **Por contexto (4 ou 5):**

| Conteúdo | Métodos indicados |
|----------|-------------------|
| Técnico | árvore de pensamentos (tree of thoughts), ReWOO, meta-prompting |
| Voltado ao usuário | mudança de perspectiva do time ágil, mesa-redonda de stakeholders |
| Criativo | torneio de inovação, desafio da sala de fuga |
| Estratégico | time vermelho contra time azul, reflexão retrospectiva ("se ao menos...") |

3. Use só métodos que existem em `data/elicitation-methods.md`, com o nome que está no arquivo. Nunca crie método novo.
4. Se o template em uso declarar `workflow.custom_elicitation`, use as opções dele no lugar desta seleção.

### 3. Contextualizar a revisão
Quando chamada depois de uma seção:
1. Resuma em 1 ou 2 frases o que o usuário deve conferir na seção.
2. Se houver diagrama, explique-o brevemente antes do menu.
3. Se a seção tiver vários itens distintos, avise que a ação pode valer para a seção inteira ou para um item específico (o usuário indica qual ao escolher o método).

### 4. Apresentar o menu
Na mesma mensagem, peça a revisão e informe que o usuário pode sugerir mudanças diretas ou escolher um método. Use descrições curtas, só com o nome do método:

```text
**Opções de elicitação avançada**
1. Prosseguir (sem novas ações)
2. Criticar e refinar
3. Identificar riscos potenciais
...
9. {método}

Escolha de 1 a 9 ou escreva sua pergunta ou ajuste:
```

Aguarde a resposta. Nunca troque o menu por pergunta de sim/não.

### 5. Tratar a resposta
| Resposta | Ação |
|----------|------|
| 1 | encerre a elicitação e siga (próxima seção ou conversa) |
| 2 a 9 | execute o método escolhido (passo 6) |
| texto livre | aplique o ajuste pedido e reapresente o conteúdo com o menu |

### 6. Executar o método
1. Leia a descrição do método em `data/elicitation-methods.md`.
2. Aplique-o ao conteúdo a partir do chapéu ativo.
3. Entregue achados acionáveis (críticas, alternativas, riscos, lacunas), curtos e ligados ao conteúdo analisado.
4. Em métodos com várias personas, identifique qual ponto de vista fala em cada trecho.
5. Ofereça:
   1. Aplicar as mudanças e atualizar o conteúdo
   2. Voltar ao menu de elicitação
   3. Fazer perguntas ou aprofundar este método
6. Repita até o usuário escolher 1 (Prosseguir) no menu ou dar um retorno direto.

## Saída
Nenhum arquivo próprio. O resultado é o conteúdo refinado: dentro de `create-doc`, a seção atualizada que segue para gravação; na conversa, a versão revisada da saída do agente.

## Critérios de conclusão
- [ ] Menu com 9 opções numeradas, opção 1 = Prosseguir
- [ ] Métodos oferecidos existem em `data/elicitation-methods.md` (ou vêm de `custom_elicitation`)
- [ ] Nenhuma mudança aplicada sem a escolha ou o pedido do usuário
- [ ] A elicitação terminou com a opção 1 ou com retorno direto do usuário

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `elicitation-methods.md` ausente | Avise; sem o arquivo não há menu válido. Siga só com revisão direta do usuário e sugira restaurar o arquivo (`@squad-creator`) |
| Usuário escolhe número fora de 1 a 9 | Reapresente o menu |
| Método não faz sentido para o conteúdo | Diga isso em uma frase e volte ao menu |

## Handoff
Volte ao fluxo que chamou a elicitação: a próxima seção em `create-doc` ou a conversa em andamento.
