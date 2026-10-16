---
id: create-context
title: Montar o contexto técnico da story
agent: dev
hat: architect
elicit: false
inputs:
  - 'storyId (obrigatório): id da story, ex.: 2.1'
  - '--force (opcional): regenera mesmo que o contexto já exista'
outputs:
  - 'docs/stories/{storyId}/spec/project-context.yaml: stack, convenções, padrões, scripts e pastas do projeto'
  - 'docs/stories/{storyId}/spec/files-context.yaml: arquivos a modificar, exemplares, dependências e testes da story'
depends_on: {}
next: [create-plan, develop]
source: [plan-create-context.md]
---

# Montar o contexto técnico da story

## Objetivo

Gerar os arquivos de contexto que o planejamento e a implementação usam: o contexto do projeto (stack, convenções, padrões) e o contexto de arquivos da story (o que modificar, o que imitar, o que testar).

## Quando usar

- Antes do `*create-plan`, depois da spec escrita.
- Antes do `*develop`, quando a story mexe numa área pouco conhecida e o contexto ainda não existe.
- Roda de forma independente e sem interação.

## Pré-condições

- [ ] Story em `docs/stories/{storyId}-*.story.md`.
- [ ] Contexto ainda inexistente em `docs/stories/{storyId}/spec/` ou `--force` informado. Sem `--force`, devolva o contexto existente.

## Passos

### 1. Validar as entradas

1. Confirme a story.
2. Procure `docs/stories/{storyId}/spec/`. Sem spec, siga só com a análise da story.
3. Contexto existente e sem `--force`: informe os caminhos e encerre.

### 2. Extrair o contexto do projeto

| Fonte | O que extrair |
|-------|---------------|
| `.sia-core/core-config.yaml` | `project.name`, `project.type`, `project.language`, `paths.stories`, `quality.scripts`, `devLoadAlwaysFiles` |
| `docs/architecture/tech-stack.md` | runtime, linguagem, dependências principais, testes, lint, build; avisos de depreciação |
| `docs/architecture/source-tree.md` | pastas e propósito, padrão de nomes de arquivos, onde colocar arquivos novos |
| `docs/architecture/coding-standards.md` | convenções de nome, imports e organização |
| `package.json` | nome, versão, dependências, `devDependencies`, scripts |
| `tsconfig.json` (se existir) | `target`, `module`, `strict`, `paths` (aliases) |

### 3. Analisar o escopo da story

1. Story: critérios de aceite, componentes e módulos citados, referências explícitas a arquivos.
2. Spec (se houver): requisitos funcionais, restrições técnicas e decisões de `requirements.json` e `spec.md`.
3. Áreas afetadas: componentes a modificar, serviços e APIs envolvidos, mudança de banco, testes necessários.
4. Padrões parecidos: extraia os conceitos-chave e busque no código (grep/glob) implementações semelhantes para servir de exemplar; anote as consultas usadas e quantos resultados deram.
5. Para cada símbolo-chave, localize a definição (arquivo e linha), quem depende dele e os testes que o citam.

### 4. Gerar os arquivos

Crie `docs/stories/{storyId}/spec/` se preciso e grave:

`project-context.yaml`:

```yaml
# Gerado por @dev [Arquitetura] *create-context · Story 2.1 · 2026-10-16T12:00:00-03:00
project:
  name: loja-web
  version: 1.4.0
  type: brownfield
  stack:
    runtime: Node.js 20
    language: TypeScript 5 (strict)
    testing: Vitest
    linting: ESLint 9 + Prettier 3
  conventions:
    naming: { files: kebab-case, directories: kebab-case, components: PascalCase }
    imports: { style: absolutos, alias: '@/ → src/' }
  patterns:
    state: Zustand
    api: Route Handlers do Next.js
    components: componentes funcionais com hooks
    testing: describe/it com builders de fixture
  scripts: { test: vitest run, lint: eslint ., build: next build, dev: next dev }
  directories: { source: src/, tests: tests/, stories: docs/stories }
metadata:
  generatedBy: '@dev (Davi) [Arquitetura]'
  generatedAt: '2026-10-16T12:00:00-03:00'
  sources: [.sia-core/core-config.yaml, docs/architecture/tech-stack.md, docs/architecture/source-tree.md, package.json, tsconfig.json]
```

`files-context.yaml`:

```yaml
# Gerado por @dev [Arquitetura] *create-context · Story 2.1 · 2026-10-16T12:00:00-03:00
storyId: '2.1'
storyPath: docs/stories/2.1-login-social.story.md
specAvailable: true
relevantFiles:
  toModify:
    - path: src/features/auth/services/auth.service.ts
      purpose: incluir o login com Google
      confidence: high          # high | medium | low
      reason: citado no critério de aceite 1
  exemplars:
    - path: src/features/billing/services/billing.service.ts
      purpose: mesmo padrão de serviço com contrato
      keyPatterns: [implementa o contrato da feature, erros tipados, eventos no event bus]
  dependencies:
    - path: src/config/env.ts
      relationship: precisa das credenciais OAuth
  tests:
    - path: tests/auth/auth.service.test.ts
      type: unit                # unit | integration | e2e
      status: exists            # exists | needed
  definitions:
    - symbol: AuthService
      file: src/features/auth/services/auth.service.ts
      line: 12
      dependents: [src/app/login/page.tsx]
      tests: [tests/auth/auth.service.test.ts]
searchQueries:
  - query: oauth
    results: 4
storyAnalysis:
  components: [AuthService, LoginPage]
  modules: [features/auth]
  estimatedFiles: { new: 2, modified: 3, deleted: 0 }
metadata:
  generatedBy: '@dev (Davi) [Arquitetura]'
  generatedAt: '2026-10-16T12:00:00-03:00'
  storyParsed: true
  specParsed: true
```

### 5. Validar as saídas

1. Releia os dois arquivos e confirme que são YAML válido.
2. Campos obrigatórios: `project.name`, `project.stack` e `metadata.generatedBy`/`generatedAt` no contexto do projeto; `storyId`, `relevantFiles` e `metadata` no contexto de arquivos; `path` e `purpose` em cada item de `toModify` e `exemplars`.

## Saída

`project-context.yaml` e `files-context.yaml` em `docs/stories/{storyId}/spec/`. O `*create-plan` os usa para conhecer convenções, arquivos e exemplares; o `*develop` os usa para seguir nomes, estilo de import, local de arquivos novos e implementações de referência.

## Critérios de conclusão

- [ ] Contexto do projeto com stack, convenções, padrões, scripts e pastas
- [ ] Contexto de arquivos com arquivos a modificar (com confiança e motivo), exemplares, dependências e testes
- [ ] Consultas de busca registradas
- [ ] Os dois arquivos válidos e com os campos obrigatórios

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story não encontrada | PARE: `Story {storyId} não encontrada. Verifique o caminho.` |
| `core-config.yaml` ausente | Use padrões (`project.type: desconhecido`) e avise |
| `tech-stack.md` ausente | Deduza do `package.json`: runtime por `engines.node`, testes por `devDependencies` (vitest, jest), linguagem pela presença de TypeScript |
| Nenhum arquivo relevante encontrado | Gere o contexto com `toModify` vazio, confiança `low` e aviso em `metadata` |
| Erro de sintaxe em YAML ou JSON lido | PARE e aponte o arquivo e o erro |

## Handoff

Próximo passo: `*create-plan {storyId}` no Spec Pipeline ou `*develop {storyId}` quando o plano já existir.
