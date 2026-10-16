---
id: create-epic
title: Criar epic
agent: pm
hat: product
elicit: true
inputs:
  - 'melhoria: descrição do que se quer entregar (do usuário, de um PRD ou de uma proposta de mudança aprovada)'
  - 'contexto do projeto (opcional): docs/architecture/, docs/prd/, código existente'
outputs:
  - 'docs/prd/epic-{n}-{slug}.md com objetivo, contexto, stories previstas (executor, gate e inspeção), compatibilidade, riscos e rollback'
depends_on:
  tasks: [create-doc.md]
  templates: [epic-tmpl.md]
next: [create-story, execute-epic]
source: [brownfield-create-epic.md]
---

# Criar epic

## Objetivo
Criar um epic focado, de 1 a 3 stories, para uma melhoria que não exige o processo completo de PRD e arquitetura, com executores, gates de qualidade e plano de rollback definidos desde o início.

## Quando usar
Use quando:
- a melhoria cabe em 1 a 3 stories;
- não há mudança arquitetural significativa;
- a melhoria segue os padrões existentes do projeto;
- a integração é simples e o risco para o sistema existente é baixo.

Use o processo completo (`@pm *create-brownfield-prd` e `@dev *create-brownfield-architecture`) quando:
- a melhoria exige várias stories coordenadas;
- é preciso planejar arquitetura;
- há integração significativa;
- o risco pede avaliação e plano de mitigação próprios.

Em produto com PRD, os epics nascem das seções `## Epic {n}: {título}` do PRD e viram arquivos com `*shard-prd`.

## Pré-condições
- [ ] Melhoria descrita pelo usuário (ou proposta de mudança aprovada em `correct-course`)
- [ ] Acesso ao contexto do projeto: arquitetura fragmentada (`docs/architecture/`), PRD quando existir e o código

## Passos

### 1. Analisar o projeto (obrigatório)
Contexto do projeto existente:
- [ ] propósito e funcionalidades atuais entendidos
- [ ] stack identificada (`docs/architecture/tech-stack.md` ou manifesto do projeto, ex.: `package.json`)
- [ ] padrões de arquitetura anotados
- [ ] pontos de integração com o sistema existente identificados

Escopo da melhoria:
- [ ] melhoria definida e delimitada
- [ ] impacto nas funcionalidades existentes avaliado
- [ ] pontos de integração necessários identificados
- [ ] critérios de sucesso estabelecidos

**Ponto de elicitação:** pergunte o que faltar, em lista numerada. Sem arquitetura documentada, apoie-se em busca no código (grep/glob) e registre as suposições. Se a análise mostrar mais de 3 stories ou necessidade de arquitetura nova, pare e ofereça:
1. Seguir pelo processo completo (`*create-brownfield-prd`)
2. Reduzir o escopo para caber em até 3 stories e continuar

### 2. Numerar o epic
- `n` = maior número em `docs/prd/epic-*.md` + 1, ou o número indicado pelo usuário ou pelo PRD.
- `slug` = título curto em kebab-case, sem acentos.

### 3. Redigir o epic
Preencha `templates/epic-tmpl.md` seguindo `create-doc` (modo template Markdown). Nas seções do template, ou em seções adicionais quando ele não as tiver, o epic precisa conter:

| Conteúdo | O que registrar |
|----------|-----------------|
| Título | `Epic {n}: {nome da melhoria}` |
| Objetivo | 1 ou 2 frases: o que o epic entrega e por que agrega valor |
| Contexto do sistema existente | funcionalidade atual relevante; tecnologias envolvidas; pontos de integração |
| Detalhes da melhoria | o que muda; como integra; critérios de sucesso mensuráveis |
| Stories previstas | 1 a 3 stories em sequência segura, cada uma com título, descrição curta, executor, gate, inspeção e foco (passo 4) |
| Requisitos de compatibilidade | APIs existentes inalteradas; mudanças de schema compatíveis com versões anteriores; UI segue os padrões existentes; impacto de desempenho mínimo |
| Riscos e mitigação | risco principal ao sistema existente; mitigação; plano de rollback |
| Definição de pronto | stories concluídas com critérios de aceite atendidos; funcionalidade existente verificada por testes; integrações funcionando; documentação atualizada; sem regressão |

Toda story prevista inclui a verificação de que a funcionalidade existente continua intacta.

### 4. Definir executor, gate e foco de cada story
| Tipo de trabalho | Sinais | Executor | Foco da revisão |
|------------------|--------|----------|-----------------|
| Código, features, lógica | feature, lógica, handler, service, API | `@dev` [Desenvolvimento] | validação de entrada, autenticação, tratamento de erros |
| Banco, schema, RLS, migrations | schema, tabela, migration, RLS, query | `@dev` [Dados] | RLS, chaves estrangeiras, migração segura |
| Infraestrutura, CI/CD, deploy | CI/CD, deploy, docker, pipeline | `@devops` | segredos, configuração por ambiente, rollback |
| Interface, componentes | componente, UI, design, acessibilidade | `@dev` [UX/UI] | acessibilidade e padrões de UI |
| Pesquisa, investigação, POC | pesquisa, investigar, analisar, POC | `@pm` [Análise] | evidência e fontes |
| Decisão de arquitetura | arquitetura, decisão de design, padrão, escalabilidade | `@dev` [Arquitetura] | contratos de API, compatibilidade, ADR |

Regras:
- Toda story tem gate `@pm` [Qualidade] e inspeção `@validator` (`*revisar-feature {storyId}`), registrados depois na seção `## Executor` da story (guia de autoria, seção 6.1).
- Quem executa não decide o próprio gate. Story executada pelo `@pm` [Análise] passa pelo gate com o checklist completo do chapéu Qualidade (guia, seção 4.2).
- Segurança: toda story que toca autenticação ou dados pede foco OWASP na implementação.

Gates previstos por risco da story:

| Risco | Gates |
|-------|-------|
| Baixo | inspeção do `@validator` + QA gate |
| Médio | os anteriores + portão `@devops *pre-push` antes do PR |
| Alto | os anteriores + deploy de preview e plano de rollback verificado antes de produção; considere feature flag e liberação gradual |

### 5. Validar o epic
Escopo:
- [ ] cabe em no máximo 3 stories
- [ ] não exige documentação de arquitetura nova
- [ ] segue os padrões existentes
- [ ] complexidade de integração administrável

Risco:
- [ ] risco ao sistema existente é baixo
- [ ] plano de rollback é viável
- [ ] a abordagem de testes cobre a funcionalidade existente
- [ ] o time conhece os pontos de integração

Completude:
- [ ] objetivo claro e alcançável
- [ ] stories bem delimitadas e em sequência lógica
- [ ] critérios de sucesso mensuráveis
- [ ] dependências identificadas

### 6. Gravar e preparar a criação das stories
1. Grave `docs/prd/epic-{n}-{slug}.md`.
2. Inclua no epic o bloco "Notas para a criação das stories" (lido pelo chapéu Scrum em `*create-story`):

```markdown
## Notas para a criação das stories
- Melhoria em sistema existente que roda {stack}
- Pontos de integração: {lista}
- Padrões existentes a seguir: {padrões}
- Requisitos críticos de compatibilidade: {requisitos}
- Toda story inclui a verificação de que a funcionalidade existente continua intacta
- O epic preserva a integridade do sistema enquanto entrega: {objetivo}
```

## Saída
`docs/prd/epic-{n}-{slug}.md` no formato de `epic-tmpl.md`, com stories previstas, executores, gates por risco, requisitos de compatibilidade, riscos com rollback e as notas para a criação das stories.

## Critérios de conclusão
- [ ] Escopo de 1 a 3 stories (ou processo completo recomendado ao usuário)
- [ ] Cada story com executor, gate `@pm` [Qualidade], inspeção `@validator` e gates por risco
- [ ] Requisitos de compatibilidade, risco principal, mitigação e rollback registrados
- [ ] Critérios de sucesso mensuráveis
- [ ] Arquivo gravado em `docs/prd/epic-{n}-{slug}.md`

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Escopo maior que 3 stories | Ofereça as opções do passo 1 |
| Projeto sem arquitetura documentada | Sugira `@dev *analyze-codebase` ou `@dev *document-project`; se o usuário preferir seguir, registre as suposições no epic |
| Número de epic já usado | Use o próximo livre e avise |
| Risco alto ao sistema existente | Recomende o processo completo; se o usuário mantiver o epic, registre o risco e os gates de risco alto |

## Handoff
- Próximo passo: `@pm *create-story {n}` (chapéu Scrum), uma story por vez.
- Para executar o epic inteiro em ondas: `@pm *execute-epic {n}`.
