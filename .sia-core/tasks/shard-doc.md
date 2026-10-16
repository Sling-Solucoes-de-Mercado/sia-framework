---
id: shard-doc
title: Fragmentar documento por seções
agent: any
elicit: false
inputs:
  - 'documento: Markdown a fragmentar (padrão do *shard-prd: paths.prd, ou seja, docs/prd.md)'
  - 'destino (opcional): pasta de saída (padrão: pasta com o nome do documento; PRD → paths.prdSharded, arquitetura → paths.architectureSharded)'
outputs:
  - '{destino}/{slug}.md para cada seção de nível 2 e {destino}/index.md com os links'
depends_on: {}
next: [create-story, po-checklist]
source: [shard-doc.md]
---

# Fragmentar documento por seções

## Objetivo
Dividir um documento grande (PRD, arquitetura ou outro) em um arquivo por seção de nível 2, numa pasta própria e com índice, preservando todo o conteúdo. Os fragmentos são o que as stories e o `@dev` carregam (ex.: `devLoadAlwaysFiles`).

## Quando usar
- `@pm *shard-prd`: PRD aprovado, antes de criar stories.
- `@pm *shard-doc {documento} {destino}`: arquitetura ou qualquer documento grande.
- Não use para documentos curtos sem seções `##`.

## Pré-condições
- [ ] Documento existe e está aprovado na versão a fragmentar
- [ ] Seções de epic do PRD usam o título `## Epic {n}: {título}`
- [ ] Na arquitetura, as seções fixas usam `## Tech Stack`, `## Source Tree` e `## Coding Standards`

## Passos

### 1. Definir origem e destino
1. `*shard-prd`: origem `paths.prd` (`docs/prd.md`), destino `paths.prdSharded` (`docs/prd/`).
2. Arquitetura: origem `paths.architecture` (`docs/architecture.md`), destino `paths.architectureSharded` (`docs/architecture/`).
3. Outro documento: pasta ao lado dele, com o mesmo nome sem extensão (ex.: `docs/front-end-spec.md` → `docs/front-end-spec/`).
4. Se o destino já tiver fragmentos, pergunte:
   1. Substituir os fragmentos
   2. Usar outro destino
   3. Cancelar

### 2. Caminho automático (opcional)
Se o comando `md-tree` estiver disponível (pacote `@kayvan/markdown-tree-parser`), rode `md-tree explode {documento} {destino}`. Depois confira os nomes gerados contra as regras do passo 4, renomeie o que divergir, gere o `index.md` se ele não existir e siga para o passo 7. Sem a ferramenta, ou se ela falhar, siga o método manual abaixo; instalar é opcional (`npm install -g @kayvan/markdown-tree-parser`).

### 3. Extrair as seções
1. Leia o documento inteiro.
2. Identifique todos os títulos de nível 2 (`## `) **fora** de blocos de código.
3. Cada seção vai do seu `##` até o próximo `##`, com todas as subseções, listas, tabelas, diagramas e blocos de código.
4. Cuidado redobrado com:
   - blocos cercados (```` ``` ```` e `~~~`): capture o bloco inteiro, inclusive o fechamento; um `##` dentro de bloco de código não é título;
   - diagramas Mermaid completos;
   - listas aninhadas e conteúdo em várias linhas.

### 4. Nomear os arquivos (guia de autoria, seção 5.3)
1. Título em kebab-case, minúsculo e sem acentos (á→a, ã→a, ç→c, é→e).
2. Remova numeração inicial (`## 2. Requisitos Funcionais` → `requisitos-funcionais.md`), pontuação, parênteses e barras; junte hífens repetidos e corte hífens das pontas.
3. Seções de epic: `## Epic {n}: {título}` → `epic-{n}-{slug}.md`.
4. Seções fixas da arquitetura, carregadas sempre pelo `@dev`: `## Tech Stack` → `tech-stack.md`, `## Source Tree` → `source-tree.md`, `## Coding Standards` → `coding-standards.md`. Se a arquitetura usar equivalentes em português (ex.: "Pilha Tecnológica", "Árvore de Origem", "Padrões de Código"), use mesmo assim os nomes fixos e avise que o título deveria estar em inglês.
5. Siglas viram minúsculas no nome do arquivo (`API` → `api`).

| Título | Arquivo |
|--------|---------|
| `## Visão do Produto` | `visao-do-produto.md` |
| `## Requisitos Funcionais` | `requisitos-funcionais.md` |
| `## Epic 2: Login Social` | `epic-2-login-social.md` |
| `## Design de API (tRPC)` | `design-de-api-trpc.md` |
| `## Tech Stack` | `tech-stack.md` |

### 5. Gravar os fragmentos
1. O `##` da seção vira `#` no fragmento; os demais níveis sobem um (`###` → `##`, `####` → `###`...).
2. Não altere nenhum outro conteúdo. Preserve:
   - blocos de código e diagramas Mermaid completos;
   - tabelas, indentação de listas e código inline;
   - links e referências;
   - placeholders `{{...}}` exatamente como estão.

### 6. Gerar o índice
Crie `{destino}/index.md` com o título de nível 1 original, o conteúdo anterior à primeira seção `##` e a lista de fragmentos na ordem original:

```markdown
# {Título original}

{Introdução original, se houver}

## Seções

- [Visão do Produto](./visao-do-produto.md)
- [Requisitos Funcionais](./requisitos-funcionais.md)
- [Epic 1: Fundação](./epic-1-fundacao.md)
```

### 7. Validar
1. Todas as seções `##` viraram arquivos.
2. Nenhum conteúdo se perdeu: a soma dos fragmentos reconstrói o original (fragmentação reversível).
3. Os níveis de título foram ajustados corretamente.
4. Todos os arquivos foram criados. O documento original continua intacto.

### 8. Relatar
```text
Documento fragmentado:
- Origem: docs/prd.md
- Destino: docs/prd/
- Arquivos criados: 7
- Seções:
  - requisitos-funcionais.md: "Requisitos Funcionais"
  - epic-1-fundacao.md: "Epic 1: Fundação"
  ...
```

## Saída
Uma pasta de destino com um arquivo por seção de nível 2 e o `index.md`. O documento de origem não é modificado nem apagado.

## Critérios de conclusão
- [ ] Um fragmento por seção `##`, com nomes conforme a seção 5.3 do guia
- [ ] Epics em `epic-{n}-{slug}.md` e seções fixas da arquitetura com os nomes em inglês
- [ ] `index.md` com links para todos os fragmentos
- [ ] Nenhuma perda de conteúdo; níveis de título ajustados

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Documento sem seções `##` | Informe que não há o que fragmentar |
| Dois títulos geram o mesmo nome | Acrescente sufixo numérico (`-2`) e avise |
| `md-tree` indisponível ou com erro | Siga o método manual |
| Seção fixa da arquitetura ausente | Avise: o `@dev` carrega `tech-stack.md`, `source-tree.md` e `coding-standards.md` em toda implementação |

## Handoff
- PRD fragmentado: `@pm *create-story {epic}` (ou `@pm *execute-epic {epic}` para o epic inteiro).
- Arquitetura fragmentada: `@pm *po-checklist`, se ainda não rodou, e depois `@pm *create-story`.
