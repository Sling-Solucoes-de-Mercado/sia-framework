---
id: create-doc
title: Criar documento a partir de template
agent: any
elicit: true
modes: [interactive, yolo]
inputs:
  - 'template: arquivo de .sia-core/templates/ (YAML de documento ou Markdown com {{variavel}}), informado pelo campo template: do comando que chamou a task'
  - 'mode (opcional): interactive (padrão) ou yolo'
  - 'documentos de entrada (opcional): brief, PRD, arquitetura, pesquisa, código existente'
outputs:
  - 'Documento Markdown no caminho de template.output.filename (YAML) ou no caminho indicado pelo template Markdown (seção 5.2 do guia de autoria)'
depends_on:
  tasks: [advanced-elicitation.md]
  data: [elicitation-methods.md]
next: [create-prd, create-architecture, po-checklist, shard-prd]
source: [create-doc.md]
---

# Criar documento a partir de template

## Objetivo
Gerar um documento do projeto (brief, PRD, arquitetura, especificação de front-end, ADR, epic...) a partir de um template do `.sia-core/templates/`, seção por seção e com elicitação real do usuário. É o motor comum dos comandos que declaram `task: create-doc.md` e `template:`.

## Quando usar
- Comandos de agente com `template:` (ex.: `@pm *create-prd` → `prd-tmpl.yaml`; `@dev *create-adr` → `adr-tmpl.md`).
- Pedido direto do tipo "cria o documento X a partir do template Y".
- Não use para stories (`create-story`), specs do Spec Pipeline (`write-spec`) nem relatórios de QA: essas tasks têm formato próprio.

## Regras inegociáveis
- Esta task é um workflow executável. Não pule passos por eficiência.
- Seção com `elicit: true` é parada obrigatória (passo 5). Gerar o documento inteiro sem interação no modo Interativo viola esta task.
- Na elicitação, nunca faça pergunta de sim/não: use sempre o menu numerado de 1 a 9.
- Não invente conteúdo ausente do contexto. Pergunte ou registre a suposição de forma explícita.

## Pré-condições
- [ ] Template identificado e legível
- [ ] Documentos de entrada que o template pede (ex.: brief para o PRD) localizados ou dispensados pelo usuário

## Passos

### 1. Identificar o template
1. Use o template do comando (`template:` no agente) ou o indicado pelo usuário.
2. Sem template: liste em lista numerada os templates de documento de `.sia-core/templates/` (e de `squads/{nome}/templates/` quando o comando vier de um squad) e peça a escolha pelo número.
3. Detecte o tipo:
   - **YAML estruturado:** raiz com `template`, `workflow` e `sections` (guia de autoria, seção 9.1).
   - **Markdown com placeholders:** texto com `{{variavel}}`, aberto por um comentário curto que explica o uso e os placeholders (guia, seção 9.2).

### 2. Definir preferências
1. Mostre o modo atual (Interativo por padrão; `workflow.mode` do template pode indicar outro) e lembre que `*yolo` alterna para YOLO.
2. Resolva o arquivo de saída e confirme com o usuário:
   - YAML: `template.output.filename`; o título vem de `output.title`, com os placeholders resolvidos.
   - Markdown: caminho indicado no comentário do template; na falta, o caminho da seção 5.2 do guia (ex.: ADR → `docs/architecture/adr/ADR-{nnn}-{slug}.md`; epic → `docs/prd/epic-{n}-{slug}.md`).
3. Se o arquivo já existir, pergunte:
   1. Atualizar o documento existente
   2. Sobrescrever
   3. Gravar com outro nome
   4. Cancelar
4. Leia os documentos de entrada citados nas instruções do template. Em projeto existente, apoie o rascunho em busca no código (grep/glob), não em suposição.

### 3. Processar template YAML, seção por seção
Para cada seção, na ordem, inclusive as subseções:
1. **`condition`:** avalie com o contexto. Se não se aplica, pule e registre o motivo. Na dúvida, pergunte.
2. **`owner` / `editors`:** ids de agente do SIA, com chapéu opcional (ex.: `pm:quality`). Avise o usuário quando a seção for restrita e inclua no documento a nota "_(Seção de responsabilidade de @{owner}; editável por @{editors})_".
3. **Rascunho:** siga `instruction` (instrução para você; nunca vai para o documento). Use `examples` como referência de formato, sem copiá-los. Formate conforme `type`:

| `type` | Como renderizar |
|--------|-----------------|
| `paragraphs` | parágrafos corridos |
| `bullet-list` / `numbered-list` | lista; com `prefix` (ex.: `FR`, `NFR`), identifique os itens em sequência (`FR1`, `FR2`...) |
| `table` | tabela Markdown com as `columns` declaradas |
| `choice` | ofereça as `choices` em lista numerada e registre a escolha |
| `code` | bloco de código na linguagem indicada (`language`) |
| `mermaid` | diagrama Mermaid do tipo indicado (`mermaid_type`) |
| `template-text` | preencha o texto de `template`, resolvendo cada `{{variavel}}` |

4. **`repeatable: true`:** repita a seção para cada item (ex.: cada epic, cada componente). Pergunte quantos e quais itens quando o contexto não deixar claro.
5. **Texto fixo** da seção, quando existir, entra no documento como está.
6. Apresente o conteúdo com a justificativa detalhada (passo 6).
7. Se `elicit: true`, aplique o passo 5 antes de avançar.
8. Grave a seção no arquivo de saída assim que aprovada (salvamento progressivo).

### 4. Processar template Markdown com placeholders
1. Leia o comentário inicial do template: placeholders, valores automáticos e caminho de saída.
2. Calcule os valores automáticos: data (`AAAA-MM-DD`), próximo número da sequência (ex.: próximo `ADR-{nnn}` em `docs/architecture/adr/`; próximo `{n}` em `docs/prd/epic-*.md`) e slug (kebab-case, sem acentos).
3. Pré-preencha o que o contexto responde e pergunte o restante em blocos curtos e numerados. Para placeholders de escolha (ex.: status), ofereça as opções numeradas.
4. Blocos repetíveis (linhas de tabela, itens de lista) se expandem para quantos itens houver. Bloco condicional sai do documento quando a condição não se aplica. Sem dados para um bloco, use o texto de vazio do próprio template ou pergunte.
5. Remova o comentário de uso do template. Não deixe nenhum `{{placeholder}}` sem resolver.
6. Apresente o documento completo com a justificativa (passo 6) e ofereça o menu do passo 5 uma vez, sobre o documento inteiro ou sobre a seção que o usuário indicar.

### 5. Elicitação obrigatória (`elicit: true`)
É uma parada. Apresente o conteúdo, a justificativa e o menu da task `advanced-elicitation`:
- Opção 1: sempre "Prosseguir para a próxima seção".
- Opções 2 a 9: oito métodos de `data/elicitation-methods.md` escolhidos para o contexto. Se o template declarar `workflow.custom_elicitation`, use as opções dele.
- Termine com: "Escolha de 1 a 9 ou escreva sua pergunta ou ajuste:"
- **Aguarde a resposta.** Não avance sem ela.

Depois de um método (2 a 9), execute-o conforme `advanced-elicitation`, apresente o resultado e ofereça:
1. Aplicar as mudanças e atualizar a seção
2. Voltar ao menu de elicitação
3. Fazer perguntas ou aprofundar este método

Resposta livre do usuário: aplique o ajuste e reapresente a seção com o menu.

### 6. Justificativa detalhada
Ao apresentar qualquer seção, explique em poucas linhas:
- escolhas e trade-offs (o que foi escolhido em vez de quê, e por quê);
- suposições feitas no rascunho;
- decisões questionáveis que pedem atenção;
- pontos que precisam de validação.

### 7. Modos
| Modo | Comportamento |
|------|---------------|
| Interativo (padrão) | seção por seção, com parada em toda seção `elicit: true` |
| YOLO (`*yolo`) | rascunha todas as seções de uma vez, lista as suposições no fim e apresenta o documento completo para uma revisão única com o menu de elicitação |

O usuário pode alternar o modo a qualquer momento; o novo modo vale para as seções seguintes.

### 8. Fechamento
1. Confira se todas as seções aplicáveis foram processadas.
2. Se o template tiver Change Log, registre a criação (data, versão, descrição, autor `@{agente}`).
3. Grave a versão final e informe o caminho.

## Saída
Documento Markdown gravado no caminho confirmado no passo 2, com as seções do template na ordem, sem `instruction`, sem `examples` e sem placeholders. Seções omitidas por `condition` ficam registradas na resposta final ao usuário.

## Critérios de conclusão
- [ ] No modo Interativo, toda seção `elicit: true` passou pela parada com menu e resposta do usuário
- [ ] Seções com `condition` não atendida foram omitidas com o motivo registrado
- [ ] Nenhum `{{placeholder}}`, instrução ou comentário de uso restou no documento
- [ ] Arquivo gravado no caminho confirmado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Template não encontrado | Liste os templates disponíveis (numerados) e peça a escolha |
| Template YAML inválido | Aponte o campo com problema, não gere o documento e sugira `@squad-creator` para corrigir o template |
| Arquivo de saída já existe | Ofereça as opções do passo 2 |
| Documento de entrada ausente (ex.: PRD sem brief) | Ofereça: 1. criar o documento de entrada antes; 2. seguir só com a elicitação |
| Usuário pede para pular a elicitação | Explique que a parada é obrigatória no modo Interativo e ofereça o modo YOLO |

## Handoff
| Documento gerado | Próximo passo |
|------------------|---------------|
| Project brief | `@pm *create-prd` |
| PRD | `@dev *create-architecture` (antes, `@dev *create-front-end-spec` se houver interface) |
| Arquitetura | `@pm *po-checklist` |
| PRD e arquitetura validados | `@pm *shard-prd` e `@pm *shard-doc docs/architecture.md docs/architecture` |
| ADR, pesquisa ou outro documento de apoio | volte à task que motivou o documento |
