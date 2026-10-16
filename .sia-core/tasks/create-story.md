---
id: create-story
title: Criar a próxima story
agent: pm
hat: scrum
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'epic (opcional): número do epic; se ausente, continua o epic da última story'
  - 'modo (opcional): yolo, interactive ou preflight (padrão: interactive)'
outputs:
  - 'docs/stories/{epic}.{story}-{slug}.story.md com status Draft'
  - 'Resultado do story-draft-checklist.md no resumo final'
  - 'Handoff em .sia/handoffs/ apontando para *validate-story'
depends_on:
  tasks: [execute-checklist.md]
  templates: [story-tmpl.yaml, agent-handoff-tmpl.yaml]
  checklists: [story-draft-checklist.md]
next: [validate-story]
source: [create-next-story.md, sm-create-next-story.md]
---

# Criar a próxima story

## Objetivo

Identificar a próxima story lógica do epic e gerar um arquivo de story autossuficiente: requisitos, critérios de aceite testáveis, contexto técnico extraído do PRD e da arquitetura, executor definido e tasks rastreáveis. O `@dev` deve conseguir implementar sem procurar contexto em outros documentos.

## Quando usar

- Projeto com PRD fragmentado (`docs/prd/epic-{n}-{slug}.md`) e arquitetura disponível, fragmentada ou não.
- Ao seguir para a próxima story de um epic.
- Não use em projeto existente sem PRD fragmentado: use `*create-brownfield-story`.
- Não use para corrigir uma story já criada: edite as seções do `@pm` e rode `*validate-story` de novo.

## Pré-condições

- [ ] `.sia-core/core-config.yaml` existe
- [ ] Existe ao menos um epic em `docs/prd/` (ou uma seção `## Epic {n}: {título}` em `docs/prd.md`)
- [ ] `templates/story-tmpl.yaml` disponível

## Modos

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Escolhe a story, lê a arquitetura e preenche tudo sem perguntar. Suposições ficam em Dev Notes. As perguntas obrigatórias do passo 2 continuam valendo. |
| Interativo (padrão) | Confirma a story escolhida, os critérios de aceite reescritos, o executor e as lacunas de contexto. |
| Pre-Flight | Reúne todas as dúvidas (story, lacunas da arquitetura, critérios ambíguos) antes de escrever; depois gera a story sem novas perguntas. |

## Passos

### 1. Carregar a configuração

1. Leia `.sia-core/core-config.yaml`. Se não existir, PARE e informe: "core-config.yaml não encontrado. Ele é obrigatório para criar stories. Rode `sia doctor` para diagnosticar a instalação."
2. Extraia `paths.stories`, `paths.storyFilePattern`, `paths.prd`, `paths.prdSharded`, `paths.epicFilePattern`, `paths.architecture`, `paths.architectureSharded`, `prd.sharded` e `architecture.sharded`.

### 2. Identificar a próxima story

1. Localize os epics: com `prd.sharded: true`, os arquivos `docs/prd/epic-{n}-*.md`; senão, as seções `## Epic {n}: {título}` de `docs/prd.md`.
2. Liste as stories de `docs/stories/` e carregue a de maior número (`{epic}.{story}`). Com o argumento `epic`, considere só as stories desse epic.
3. Se a story mais recente não estiver `Done`:
   **Ponto de elicitação:** "ALERTA: story incompleta. Arquivo: {arquivo}. Status: {status}. O recomendado é concluí-la antes. Criar a próxima story mesmo assim, em Draft? 1. Sim, assumo o risco 2. Não, cancelar"
4. Se seguir, selecione a próxima story sequencial do mesmo epic.
5. Se a story mais recente era a última prevista no epic:
   **Ponto de elicitação:** "Epic {n} concluído. 1. Começar o Epic {n+1} pela story 1 2. Escolher uma story específica 3. Cancelar"
6. NUNCA pule para outro epic por conta própria. O usuário escolhe o epic explicitamente.
7. Sem nenhuma story no projeto, a próxima é a 1.1 (ou `{epic}.1`, com o argumento `epic`).
8. Anuncie: "Próxima story: {epic}.{story} - {título}".

### 3. Reunir requisitos e o contexto da story anterior

1. Do epic, extraia a story: título, user story, critérios de aceite, dependências, notas e, quando o epic já prevê, executor e gate.
2. Leia os fragmentos do PRD que o epic cita ou que tratam do mesmo assunto: requisitos funcionais e não funcionais, restrições.
3. Se houver story anterior, leia o `## Registro do Dev` dela (Notas de conclusão, Log de debug, Decisões (modo YOLO)): desvios de implementação, decisões técnicas, dificuldades e lições. Guarde o que afeta a story atual.

### 4. Reunir o contexto de arquitetura

1. Com `architecture.sharded: true`, leia `docs/architecture/index.md` e localize os fragmentos pela tabela abaixo; senão, use as seções equivalentes de `docs/architecture.md`.
2. Leia conforme o tipo de story:

| Tipo de story | Assuntos a ler |
|---------------|----------------|
| Todas | Tech Stack (`tech-stack.md`), Source Tree (`source-tree.md`), Coding Standards (`coding-standards.md`), estratégia de testes |
| Backend/API | modelos de dados, schema do banco, arquitetura de backend, especificação da API, APIs externas |
| Frontend/UI | arquitetura de frontend, componentes, fluxos principais, modelos de dados |
| Full stack | os dois grupos acima |

3. Só os três primeiros fragmentos têm nome fixo. Os demais têm título em português: encontre o arquivo pelo `index.md` (ex.: modelos de dados → `modelos-de-dados.md`). Ao usar um arquivo com nome diferente do esperado, registre em Dev Notes: `[Nota: usado '{arquivo}' para '{assunto}']`. Assunto inexistente: `[Nota: '{assunto}' não encontrado na arquitetura]`.
4. Extraia SOMENTE o que a story usa: modelos e schemas, endpoints a implementar ou consumir, especificação de componentes, caminhos e convenções de nome dos arquivos novos, requisitos de teste, cuidados de segurança e de desempenho.
5. NÃO invente bibliotecas, padrões ou normas ausentes das fontes. Cite a fonte de cada detalhe: `[Fonte: architecture/{arquivo}.md#{seção}]`.

### 5. Verificar a estrutura do projeto e o que já existe

1. Cruze os requisitos com `source-tree.md`: caminhos de arquivo, local dos componentes, nomes de módulos.
2. Busque no código (grep/glob) funcionalidade parecida e os arquivos que a story vai tocar. Oriente REUSE > ADAPT > CREATE.
3. Funcionalidade possivelmente duplicada vira aviso ao usuário (não bloqueia). Os arquivos relevantes encontrados entram em Dev Notes.
4. Conflitos entre epic, arquitetura e código existente vão para Dev Notes ("Notas de estrutura do projeto") e para o resumo final.

### 6. Definir executor, gate e complexidade

Classifique a story pelos critérios de aceite, pelos fragmentos lidos e pelos caminhos de arquivo:

| Tipo de trabalho | Indícios | Executor | Gate de qualidade |
|------------------|----------|----------|-------------------|
| Código, feature, lógica (inclui API, segurança e integração) | endpoint, serviço, rota, regra de negócio, autenticação, API externa | `@dev [Desenvolvimento]` | `@pm [Qualidade]` |
| Schema, RLS, migration | tabela, migration, RLS, chave estrangeira, índice; `supabase/migrations/` | `@dev [Dados]` | `@pm [Qualidade]` |
| UI, componentes | tela, componente, formulário, página; arquitetura de frontend | `@dev [UX/UI]` | `@pm [Qualidade]` |
| Infra, CI/CD, deploy | deploy, pipeline, ambiente, configuração; `.github/workflows/` | `@devops` | `@pm [Qualidade]` |
| Pesquisa | investigar, comparar, avaliar opções | `@pm [Análise]` | `@pm [Qualidade]` |

- O executor declarado é quem faz as transições Ready → InProgress → InReview (Constitution, Artigo II): `@dev` com `*develop`, `@devops` com `*develop` (story de infraestrutura) e `@pm` [Análise] com `*execute-research-story` (story de pesquisa).
- Inspeção: `@validator (*revisar-feature)` em toda story que altera código ou configuração. Story de pesquisa, cujo entregável é só documento, registra "- Inspeção: não se aplica (entregável documental)", e o gate avalia o documento contra os critérios de aceite.
- Story que mistura tipos: o executor é o do tipo com mais trabalho; os demais tipos aparecem em Dev Notes.
- Decisão estrutural (padrão novo, refatoração ampla): inclua uma task inicial de ADR com `@dev [Arquitetura]` (`*create-adr`), conforme a regra 4.2 do guia de autoria.
- Complexidade: **Baixa** (um arquivo ou componente, escopo bem definido, poucas dependências), **Média** (vários arquivos, alguma interação entre sistemas) ou **Alta** (muitos arquivos, vários sistemas, padrão novo ou segurança crítica).

Formato da seção na story:

```markdown
## Executor
- Executor: @dev [Desenvolvimento]
- Gate de qualidade: @pm [Qualidade]
- Inspeção: @validator (*revisar-feature)
- Complexidade: Média (três arquivos e uma API externa)
```

### 7. Escrever a story

Crie `docs/stories/{epic}.{story}-{slug}.story.md` com `templates/story-tmpl.yaml`. O `{slug}` é o título curto em kebab-case, sem acentos. Se o arquivo já existir, não sobrescreva (ver Tratamento de erros). Na criação, o `@pm` preenche todas as seções de planejamento; depois disso, cada seção segue o dono definido na seção 6.1 do guia de autoria.

| Seção | Conteúdo |
|-------|----------|
| `# Story {epic}.{story}: {título}` | título claro e objetivo |
| `## Status` | `Draft`, sozinho na primeira linha não vazia |
| `## Executor` | passo 6 |
| `## Story` | **Como** {persona}, **quero** {ação}, **para** {benefício}; uma ou duas frases com o problema e o valor de negócio |
| `## Critérios de Aceite` | lista numerada do epic, em Dado/Quando/Então, sem mudar o sentido |
| `## Escopo` | `### Dentro` e `### Fora`, a partir do epic e do PRD |
| `## Dependências` | stories pré-requisito, serviços, variáveis de ambiente, dados; "Nenhuma" quando não houver |
| `## Riscos` | riscos conhecidos e mitigação (PRD, arquitetura, story anterior) |
| `## Definição de Pronto` | critérios atendidos; testes novos e existentes passando; código no padrão do projeto; sem regressão; documentação atualizada quando aplicável |
| `## Tasks / Subtasks` | regras abaixo |
| `## Dev Notes` | regras abaixo |
| `## Testes` | local dos arquivos de teste, frameworks, padrões e testes específicos da story |
| `## Registro do Dev` | subseções vazias: Modelo usado, Decisões (modo YOLO), Log de debug, Notas de conclusão, File List |
| `## Resultado do QA` | vazio |
| `## Change Log` | linha de criação (passo 8) |

Critério ambíguo ou não testável: pergunte (Interativo e Pre-Flight) ou registre em `## Riscos` como ponto a esclarecer (YOLO).

**Tasks / Subtasks**

- Lista detalhada e sequencial, baseada SOMENTE nos requisitos do epic, nos critérios de aceite e na arquitetura lida.
- Cada task cita os critérios que atende, `(CA: 1, 3)`, e o documento de arquitetura quando couber.
- Testes unitários entram como subtasks explícitas, conforme a estratégia de testes.

```markdown
- [ ] 1. Criar o endpoint de login social (CA: 1, 2)
  - [ ] 1.1 Rota `POST /api/auth/social` [Fonte: architecture/especificacao-da-api.md#autenticacao]
  - [ ] 1.2 Testes unitários do handler
```

**Dev Notes (crítico)**

- SOMENTE informação extraída dos documentos lidos. Nunca invente nem suponha detalhe técnico.
- Organize por categoria: Insights da story anterior; Modelos de dados; Especificação de API; Especificação de componentes; Locais de arquivo; Requisitos de teste; Restrições técnicas (versões, desempenho, segurança); Notas de estrutura do projeto.
- Todo detalhe técnico leva `[Fonte: ...]`.
- Categoria sem informação: "Nenhuma orientação específica encontrada na arquitetura".
- O conteúdo deve bastar para o `@dev` não abrir a arquitetura além dos `devLoadAlwaysFiles`.

### 8. Revisar e rodar o checklist

1. Registre a criação no Change Log: `| {AAAA-MM-DD} | @pm [Scrum] | Story criada a partir do epic {n}. Status: Draft |`
2. Revise todas as seções: completude, fonte citada em todo detalhe técnico, tasks coerentes com o epic e com a arquitetura.
3. Rode `tasks/execute-checklist.md` com `checklists/story-draft-checklist.md`.
4. Lacuna apontada pelo checklist: corrija antes de entregar. Se a correção depende de informação externa, pergunte (Interativo e Pre-Flight) ou registre a lacuna no resumo como bloqueio (YOLO).

### 9. Resumir para o usuário

Apresente:

- Story criada: `docs/stories/{epic}.{story}-{slug}.story.md`
- Status: Draft
- Executor e complexidade
- Componentes técnicos principais vindos da arquitetura
- Desvios ou conflitos entre epic e arquitetura
- Resultado do checklist
- Próximo passo: `@pm *validate-story {storyId}`. Em story de complexidade Alta, recomende que o usuário revise o rascunho antes da validação.

## Saída

- Arquivo da story com as seções canônicas e status `Draft`.
- Resumo para o usuário com o resultado do checklist.
- Handoff `.sia/handoffs/handoff-pm-para-pm-{AAAAMMDD-HHmmss}.yaml` com `last_command: create-story`.

## Critérios de conclusão

- [ ] Arquivo em `docs/stories/{epic}.{story}-{slug}.story.md`, sem sobrescrever story existente
- [ ] Todas as seções canônicas presentes, na ordem, com os títulos exatos
- [ ] `Draft` na primeira linha não vazia de `## Status`
- [ ] Executor, gate, inspeção e complexidade preenchidos
- [ ] Critérios de aceite numerados, em Dado/Quando/Então
- [ ] Todo detalhe técnico de Dev Notes com `[Fonte: ...]`; nada inventado
- [ ] Toda task ligada a ao menos um critério; testes como subtasks
- [ ] Linha de criação no Change Log
- [ ] `story-draft-checklist.md` executado e resultado apresentado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `core-config.yaml` ausente | PARE e oriente `sia doctor` |
| Nenhum epic encontrado | PARE; sugira `@pm *create-epic` ou `*shard-prd` |
| Story mais recente fora de `Done` | elicitação do passo 2.3 |
| Epic concluído | elicitação do passo 2.5; nunca escolha outro epic sozinho |
| Arquivo da story já existe | não sobrescreva; pergunte: 1. abrir o existente 2. usar o próximo número 3. cancelar |
| Fragmento de arquitetura ausente | use o equivalente do `index.md` ou registre a ausência em Dev Notes |
| Epic e arquitetura em conflito | registre em Dev Notes e no resumo; não resolva por conta própria |

## Handoff

Próximo passo: `@pm *validate-story {storyId}`, com o chapéu Product Owner e o checklist completo, sem leniência por ser story própria (regra 4.2 do guia de autoria).

Grave o handoff em `.sia/handoffs/` com `templates/agent-handoff-tmpl.yaml`: `from_agent: pm`, `to_agent: pm`, `last_command: create-story`, `consumed: false` e `next_action` apontando para `*validate-story {storyId}`.
