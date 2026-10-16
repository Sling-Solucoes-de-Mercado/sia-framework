---
id: create-plan
title: Criar o plano de implementação
agent: dev
hat: architect
elicit: true
inputs:
  - 'storyId (obrigatório): id da story, ex.: 2.1'
  - 'complexidade (opcional): --complexity=SIMPLE|STANDARD|COMPLEX; padrão é o resultado de complexity.json'
outputs:
  - 'docs/stories/{storyId}/spec/implementation.yaml aprovado pelo usuário'
depends_on:
  templates: [implementation-plan-tmpl.yaml]
next: [create-context, develop]
source: [plan-create-implementation.md]
---

# Criar o plano de implementação

## Objetivo

Fase 6 do Spec Pipeline: transformar a spec aprovada numa sequência de subtasks atômicas e verificáveis, agrupadas em fases, que serve de roteiro determinístico para o `*develop`.

## Quando usar

- Spec aprovada na crítica (`@pm *critique-spec`, veredito APPROVED).
- Não use para: escrever a spec (`@pm *write-spec`) ou montar o contexto técnico (`*create-context`).

## Regras do plano

- Uma subtask atende um único serviço: `frontend` (componentes, stores, hooks, páginas), `backend` (rotas de API, serviços, controllers), `database` (migrations, seeds, schema) ou `infra` (configuração, CI/CD, ambiente).
- No máximo 3 arquivos por subtask; precisando de mais, divida.
- Toda subtask tem verificação: `command`, `api`, `browser`, `e2e` ou `manual`.
- Ids `{fase}.{n}` (1.1, 1.2, 2.1...); fases `phase-{n}` em sequência.
- Descrição no formato ação + alvo + propósito, com pelo menos 10 caracteres (ex.: "Criar o módulo authStore para a sessão do usuário").

## Pré-condições

- [ ] `docs/stories/{storyId}/spec/spec.md` existe.
- [ ] Spec aprovada: `critique.json` com veredito `APPROVED`. `NEEDS_REVISION` ou `BLOCKED`: PARE. Sem `critique.json`: avise e só siga com confirmação.

## Passos

### 1. Carregar as entradas

1. Obrigatório: `spec.md`.
2. Opcionais em `docs/stories/{storyId}/spec/`: `complexity.json` (sem ele, use STANDARD), `research.json` (dependências pesquisadas), `project-context.yaml` e `files-context.yaml` (do `*create-context`).

### 2. Extrair os requisitos de implementação

- Da spec: arquivos a criar, modificar e remover (seção 5 do `spec-tmpl.md`), dependências (seção 4), estratégia de testes (seção 6) e estratégia de implementação (seção 3).
- De `complexity.json`: `result`, `estimatedEffort` e a nota de escopo.

### 3. Definir as fases

| Classe | Fases |
|--------|-------|
| SIMPLE (até 8) | phase-1 Setup e implementação; phase-2 Testes |
| STANDARD (9 a 15) | phase-1 Setup; phase-2 Implementação; phase-3 Testes; phase-4 Integração |
| COMPLEX (16 ou mais) | phase-1 Setup; phase-2 Implementação principal; phase-3 Implementação secundária; phase-4 Testes; phase-5 Integração; phase-6 Acabamento |

Agrupe arquivos por serviço, coloque mudanças de banco nas primeiras fases, deixe os testes logo depois do que testam e a integração conectando os serviços.

### 4. Gerar as subtasks

1. Ordem de dependência: banco (schema, migrations) → backend (APIs, regra de negócio) → frontend (UI, estado) → integração.
2. Aplique as regras do plano (um serviço, até 3 arquivos, descrição ação + alvo + propósito).
3. Registre em `dependencies` os ids das subtasks que precisam terminar antes.

### 5. Definir a verificação de cada subtask

| Tipo | Quando | Campos |
|------|--------|--------|
| `command` | typecheck, lint, build ou testes | `command` (ex.: `npm run typecheck`, `npm test -- --grep "auth"`) |
| `api` | endpoint de backend | `url`, `method`, `expectedStatus` |
| `browser` | componente de UI com interação | `url`, `actions` |
| `e2e` | fluxo completo | `testFile`, `command` |
| `manual` | não automatizável | `instructions` |

Sem tipo claro: use `command` com o typecheck do projeto.

### 6. Medir o raio de impacto

Para cada subtask, conte as referências aos arquivos e símbolos que ela modifica (grep no projeto): LOW de 0 a 4, MEDIUM de 5 a 15, HIGH acima de 15. Em HIGH, acrescente às `notes`: "⚠️ raio de impacto alto ({n} referências): considere revisão adicional". É informativo; não bloqueia.

### 7. Montar e validar o plano

1. Preencha o `templates/implementation-plan-tmpl.yaml`.
2. Valide:
   - todo arquivo da spec aparece em ao menos uma subtask;
   - toda subtask tem verificação;
   - nenhuma subtask tem mais de 3 arquivos nem mais de um serviço;
   - ids de fase em sequência; dependências apontam para ids existentes;
   - não há ciclo de dependência.
3. Decisão estrutural no plano (dependência nova relevante, mudança de schema, serviço novo): registre ADR com `*create-adr {título}` antes da implementação (guia de autoria, 4.2).

### 8. Aprovar com o usuário

**Ponto de elicitação:**

```text
Plano de implementação: story 2.1
Complexidade: STANDARD · Fases: 4 · Subtasks: 8 · Esforço estimado: 1 a 2 dias

Fases
- phase-1 Setup: 2 subtasks (infra, backend)
- phase-2 Implementação no backend: 2 subtasks (backend)
- phase-3 Implementação no frontend: 2 subtasks (frontend)
- phase-4 Testes: 2 subtasks (backend, frontend)

Prévia
- 1.1 Instalar e configurar as dependências do OAuth do Google (infra) · verificação: npm install && npm run typecheck
- 1.2 Criar o módulo de configuração do OAuth (backend) · verificação: npm run typecheck
- 2.1 Implementar o callback do OAuth (backend) · verificação: api GET /api/auth/google/callback → 302

1. Aprovar e salvar
2. Ver todas as subtasks em detalhe
3. Ajustar a complexidade ou a estrutura de fases
4. Incluir ou remover subtasks
5. Mudar os métodos de verificação
6. Recomeçar com outra abordagem
```

### 9. Salvar

Grave `docs/stories/{storyId}/spec/implementation.yaml` (crie a pasta se preciso). Arquivo já existente: pergunte antes de sobrescrever (1. sobrescrever, 2. salvar como nova versão, 3. cancelar).

## Saída

`docs/stories/{storyId}/spec/implementation.yaml` aprovado, no formato de `templates/implementation-plan-tmpl.yaml`. Exemplo (classe SIMPLE):

```yaml
storyId: '2.3'
createdAt: '2026-10-16T10:00:00-03:00'
createdBy: '@dev (Davi) [Arquitetura]'
status: pending
complexity: SIMPLE
estimatedEffort: 'menos de 1 hora'
dependencies: []
phases:
  - id: phase-1
    name: Implementação
    subtasks:
      - id: '1.1'
        description: Adicionar API_KEY à configuração de ambiente
        service: infra
        files: [.env.example, src/config/env.ts]
        verification: { type: command, command: npm run typecheck }
        status: pending
  - id: phase-2
    name: Testes
    subtasks:
      - id: '2.1'
        description: Testar a validação da variável API_KEY
        service: backend
        files: [tests/config.test.ts]
        verification: { type: command, command: 'npm test -- --grep "env"' }
        status: pending
        dependencies: ['1.1']
```

## Critérios de conclusão

- [ ] Todos os arquivos da spec cobertos por subtasks
- [ ] Toda subtask com um serviço, de 1 a 3 arquivos e verificação definida
- [ ] Fases conforme a classe e dependências válidas, sem ciclo
- [ ] Plano aprovado pelo usuário e salvo
- [ ] Decisões estruturais encaminhadas para ADR

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `spec.md` ausente | PARE: o plano depende da spec (`@pm *write-spec {storyId}`) |
| Spec não aprovada na crítica | PARE: volte para `@pm *critique-spec {storyId}` |
| Spec sem lista de arquivos ou checklist de implementação | Avise e monte o plano a partir das seções disponíveis |
| Subtask com mais de 3 arquivos | Divida em subtasks menores |
| Verificação indefinida | Use `command` com o typecheck do projeto |
| Ciclo de dependência | PARE e mostre o ciclo |

## Handoff

Próximo passo: `*create-context {storyId}` (opcional) e o ciclo da story: `@pm *validate-story {storyId}` se a story estiver em `Draft`, ou `*develop {storyId}` se estiver em `Ready`. O `*develop` segue as subtasks deste plano.
