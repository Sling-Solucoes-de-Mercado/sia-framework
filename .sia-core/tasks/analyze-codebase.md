---
id: analyze-codebase
title: Analisar o código existente
agent: dev
hat: architect
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'feature (opcional): descrição da feature ou do serviço a adicionar'
  - 'diretório (opcional): raiz do projeto; padrão é o diretório atual'
  - 'formato (opcional): report | json | summary; padrão report'
outputs:
  - 'docs/architecture/project-analysis.md: estrutura, stack, serviços, padrões, CI/CD, conflitos e estratégia de integração'
  - 'docs/architecture/recommended-approach.md: abordagem recomendada para a feature (quando houver feature)'
depends_on: {}
next: [document-project, create-service, create-brownfield-architecture]
source: [analyze-project-structure.md, analyze-brownfield.md]
---

# Analisar o código existente

## Objetivo

Mapear um projeto existente (estrutura, stack, serviços, padrões, padrões de qualidade e CI/CD), apontar conflitos para adotar o SIA com segurança e, quando houver uma feature em vista, recomendar como implementá-la seguindo o que o projeto já faz.

## Quando usar

- Ao começar a trabalhar num projeto brownfield ou antes de adotar o SIA nele.
- Antes de criar um serviço ou feature nova num código que ainda não conhece.
- Não use para: documentar o sistema para os agentes (`*document-project`), medir o impacto de uma mudança específica (`*analyze-impact`).
- A task só lê o código; grava apenas os documentos de análise.

## Modos

| Modo | Interação | Comportamento |
|------|-----------|---------------|
| YOLO | nenhuma pergunta | Varredura rápida com recomendações padrão |
| Interativo (padrão) | 3 a 5 perguntas | Coleta a feature, explica a análise e confirma as recomendações |
| Pre-Flight | perguntas antes | Varredura completa, todos os padrões documentados, conflitos e revisões manuais priorizados (projetos grandes) |

## Pré-condições

- [ ] Diretório acessível com marcadores de projeto (`package.json`, `go.mod`, `requirements.txt`, `Cargo.toml`, `pom.xml` etc.). Sem marcador: análise mínima com recomendações.

## Passos

### 1. Coletar a feature

**Ponto de elicitação** (Interativo e Pre-Flight):

1. Qual feature ou serviço precisa ser adicionado? (texto; ex.: "integração com a API do TikTok para gestão de criadores")
2. A feature exige integração com API externa? 1. Sim 2. Não 3. Não sei
3. A feature exige mudança no banco? 1. Sim 2. Não 3. Não sei

Sem feature (ou no YOLO sem feature informada), faça só a análise do projeto e pule o passo 6.

### 2. Stack e estrutura

1. Leia os marcadores e detecte a stack (Node.js, TypeScript, Python, Go, Rust...), os frameworks pelas dependências (React, Vue, Angular, Next.js, Express...) e a versão do projeto.
2. Estrutura: pastas existentes (`src/`, `lib/`, `app/`, `tests/`), tipo de repositório (monorepo ou não) e gerenciador de pacotes.
3. Inventário de serviços e pacotes nas pastas definidas em `docs/architecture/source-tree.md` ou, sem ele, em `services/`, `packages/`, `apps/` e `src/services/`. Para cada um: nome, linguagem (TS ou JS), tem testes, tem README, ponto de entrada (`index.ts` ou `index.js`).
4. Squads do SIA em `squads/`, quando houver: agentes e serviços de cada um.

### 3. Padrões

| Aspecto | Como detectar |
|---------|---------------|
| Linguagem | Contagem de arquivos `.ts` e `.js`; proporção acima de 0,5 → TypeScript |
| Testes | Configuração de Jest, Vitest ou Mocha (ou pytest etc.) e quantidade de arquivos `*.test.*` e `*.spec.*` |
| Documentação | READMEs, JSDoc/TSDoc (`@param`, `@returns`), `typedoc.json` |
| Configuração | `.env.example`, arquivos de configuração, uso de `process.env` |
| Lint e formatação | ESLint, Flake8, Prettier, Black |
| CI/CD | `.github/workflows/`, `.gitlab-ci.yml`, `.circleci/config.yml` |

### 4. Conflitos e estratégia de integração com o SIA

1. Conflitos: ex.: `docs/architecture/` já existe com outro formato. Opções: A. renomear o existente para `docs/legacy-architecture/`; B. apontar os caminhos em `.sia-core/core-config.yaml` (`paths.*`). Outros conflitos: registre a decisão na story ou na análise e considere backup antes.
2. Estratégia: `parallel` quando não há CI/CD a revisar (segue a configuração padrão do SIA); `manual` quando há CI/CD existente que precisa de revisão antes de `@devops *configure-ci`.
3. Itens de revisão manual: workflows existentes (`ls .github/workflows/`, procurar nomes como `quality-gate.yml`, `release.yml`), estágios do GitLab (`grep -E "^[a-z]+:" .gitlab-ci.yml`), configuração do CircleCI.
4. Recomendações típicas: preservar a configuração de lint e de formatação existente; usar o `tsconfig.json` atual; revisar o CI antes de mexer; seguir a estrutura do framework detectado (ex.: Next.js com `app/` ou `pages/`).

### 5. Gravar a análise do projeto

Grave `docs/architecture/project-analysis.md`:

```markdown
# Análise do projeto: {nome}
**Gerado em:** {data} · **Por:** @dev (Davi) [Arquitetura]

## Estrutura
| Aspecto | Valor |
|---------|-------|
| Stack | Node.js, TypeScript |
| Frameworks | Next.js, React |
| Linguagem principal | TypeScript (82%) |
| Testes | Vitest (64 arquivos) |
| Lint / formatação | ESLint / Prettier |
| CI/CD | GitHub Actions (3 workflows) |
| Serviços existentes | 4 |

## Serviços
| Serviço | Linguagem | Testes | README | Entrada |
|---------|-----------|--------|--------|---------|

## Padrões
(linguagem, testes, documentação, configuração)

## Squads
(tabela ou "Nenhum squad configurado.")

## Integração com o SIA
- Estratégia: manual
- Conflitos: ...
- Revisão manual: ...
- Recomendações: ...
```

### 6. Recomendar a abordagem da feature

| Resposta do usuário | Padrão encontrado | Tipo de serviço |
|---------------------|-------------------|-----------------|
| API externa: sim | serviços de API existentes | `api-integration` |
| API externa: não; banco: sim | serviços de dados existentes | `utility` |
| Não sei | sem padrão claro | `utility` (padrão) |
| Ferramenta para agentes de IA | squads configurados | `agent-tool` |

| Tipo | Executor principal | Apoio |
|------|--------------------|-------|
| `api-integration` | `@dev` [Desenvolvimento] | `@pm` [Qualidade] |
| `utility` | `@dev` [Desenvolvimento] | `@dev` [Arquitetura] |
| `agent-tool` | `@dev` [Desenvolvimento] | `@devops` |
| Forte uso de banco | `@dev` [Dados] | `@dev` [Desenvolvimento] |

Grave `docs/architecture/recommended-approach.md` com: requisitos da feature (descrição, API externa, banco), tipo de serviço e justificativa, estrutura sugerida (a do template de serviço: `README.md`, `index.ts`, `client.ts` só em integração, `types.ts`, `errors.ts`, `__tests__/`, `package.json`, `tsconfig.json`), passos (criar com `*create-service`, implementar seguindo o serviço de referência, testes com o framework do projeto e cobertura acima de 70%, README e JSDoc, integração), executores, dependências e próximos passos.

### 7. Apresentar

```text
=== Análise concluída ===
Projeto: loja-web · Stack: Node.js, TypeScript · Frameworks: Next.js
Testes: Vitest · Serviços: 4 · CI/CD: GitHub Actions (estratégia: manual)
Revisão manual: 3 workflows do GitHub
Feature: integração com a API do TikTok → api-integration · Executor: @dev [Desenvolvimento]
Documentos: docs/architecture/project-analysis.md, docs/architecture/recommended-approach.md
Próximo: revisar a abordagem e rodar *create-service {nome}
```

Formatos: `report` (padrão, como acima), `json` (mesmo conteúdo estruturado) ou `summary` (uma linha: `Stack: ... | Frameworks: ... | Padrões: ESLint/Prettier | CI/CD: ... | Estratégia: manual`).

## Saída

- `docs/architecture/project-analysis.md`.
- `docs/architecture/recommended-approach.md`, quando houver feature.
- Resumo no formato pedido.

## Critérios de conclusão

- [ ] Stack, frameworks e padrões de qualidade identificados
- [ ] Serviços inventariados e CI/CD catalogado
- [ ] Estratégia de integração definida, com conflitos e itens de revisão manual listados
- [ ] Recomendação de tipo de serviço, estrutura e executores (quando houver feature)
- [ ] Nenhum arquivo de código alterado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nenhum marcador de projeto | Análise mínima, com a observação "projeto não reconhecido" |
| Arquivo de configuração malformado | Pule o arquivo, avise e siga com análise parcial |
| Pasta sem permissão de leitura | Pule, registre em "revisão manual" e siga |
| Nenhum serviço encontrado | Registre "Nenhum serviço existente" e siga |

## Handoff

Próximo passo: `*document-project` para documentar o sistema, `*create-service {nome}` para criar o serviço recomendado ou `*create-brownfield-architecture` quando a feature exigir mudança arquitetural. Stories da evolução: `@pm *create-brownfield-story`.
