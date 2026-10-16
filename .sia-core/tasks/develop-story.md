---
id: develop-story
title: Implementar a story
agent: dev
hat: dev
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'storyId (obrigatório): id da story, ex.: 2.1'
  - 'modo (opcional): yolo | interactive | preflight; padrão interactive'
outputs:
  - 'Código e testes da story, com commits locais na branch feat/{storyId}-{slug} (ou fix/{storyId}-{slug})'
  - 'Story atualizada: checkboxes, Dev Notes, Testes, Registro do Dev, Status InReview e duas linhas no Change Log'
  - 'Handoff em .sia/handoffs/ para @validator *revisar-feature {storyId} (story de pesquisa: @pm *qa-gate {storyId})'
depends_on:
  tasks: [execute-checklist.md]
  templates: [agent-handoff-tmpl.yaml]
  checklists: [story-dod-checklist.md, self-critique-checklist.md]
  data: [mode-selection-best-practices.md]
next: [revisar-feature, qa-gate]
source: [dev-develop-story.md, plan-execute-subtask.md, verify-subtask.md]
---

# Implementar a story

## Objetivo

Implementar todas as tasks da story com testes, validações e registro rastreável, levando a story de `Ready` a `InReview` e entregando-a à inspeção do `@validator` (ou direto ao QA gate, em story de pesquisa).

## Quando usar

- Story em `Ready` (início) ou `InProgress` (retomada), executada pelo agente declarado em `## Executor` (Constitution, Artigo II).
- Não use para: corrigir achados do QA gate ou da inspeção (`*apply-qa-fixes {storyId}`), criar, validar ou mudar escopo de story (`@pm`), story em `Draft`.

## Executores

A task é a mesma para os três executores possíveis da story; muda só o que a tabela indica.

| Executor declarado | Comando | Diferenças |
|--------------------|---------|------------|
| `@dev` [chapéu] (padrão) | `@dev *develop {storyId}` | Fluxo completo desta task |
| `@devops` (infraestrutura, CI/CD, deploy) | `@devops *develop {storyId}` | Executa as tasks da story com as próprias tasks (`*configure-ci`, `*vercel-setup`...), mantendo checkboxes, File List e Change Log. Push só depois do gate, com a story em `Done` |
| `@pm` [Análise] (pesquisa) | `@pm *execute-research-story {storyId}` | Entregável documental: lint, testes e build não se aplicam e a inspeção do `@validator` é dispensada. O handoff vai direto para `@pm *qa-gate {storyId}`, com troca declarada para o chapéu Qualidade e o checklist do gate sem atalhos (guia de autoria, 4.2) |

## Modos de execução

| Modo | Interação | Comportamento |
|------|-----------|---------------|
| YOLO | 0 a 1 pergunta (só bloqueio que exige aprovação) | Decide sozinho e registra cada decisão em `### Decisões (modo YOLO)` da story (`quality.yoloDecisionLog: story`) |
| Interativo (padrão) | 5 a 10 checkpoints | Resume a story, pergunta nas decisões relevantes, explica os trade-offs antes e o porquê depois, mostra o resultado antes de marcar `[x]` |
| Pre-Flight | todas as perguntas antes | Levanta ambiguidades, faz um questionário único, aprova um plano de execução e implementa sem novas perguntas |

- Modo inválido: use `interactive` e informe os modos válidos.
- Na dúvida sobre o modo, consulte `data/mode-selection-best-practices.md` (complexidade, tipo e risco da story).

## Pré-condições

- [ ] Story encontrada em `docs/stories/{storyId}-*.story.md` (`paths.stories` e `paths.storyFilePattern` do core-config).
- [ ] Quem executa é o executor declarado em `## Executor` (sem declaração, vale `@dev`). Se não for, PARE e indique o agente e o comando certos (tabela de executores).
- [ ] Status `Ready` ou `InProgress` (Artigo III). Qualquer outro status: PARE com a mensagem de bloqueio abaixo.
- [ ] Story com critérios de aceite e ao menos uma task em `## Tasks / Subtasks`.
- [ ] Seção `## Change Log` presente. Ausente: PARE e peça para restaurar a estrutura do template.
- [ ] Repositório git inicializado. Sem git: avise, sugira `@devops *environment-bootstrap` e só continue com confirmação do usuário (registre no `### Log de debug`).

Mensagem de bloqueio (Artigo III, severidade BLOCK):

```text
VIOLAÇÃO CONSTITUCIONAL: Artigo III (Desenvolvimento Orientado a Stories)
Não é possível desenvolver sem uma story válida.
Problema: {detalhe, ex.: status Draft encontrado}
Resolução: @pm *create-story ou @pm *validate-story {storyId}
```

## Regras da story

- Edite SOMENTE: checkboxes de `## Tasks / Subtasks`, `## Dev Notes`, `## Testes` e `## Registro do Dev` inteiro (Modelo usado, Decisões (modo YOLO), Log de debug, Notas de conclusão, File List).
- Status só nas transições `Ready → InProgress` (início) e `InProgress → InReview` (conclusão), cada uma com linha no `## Change Log`.
- NÃO altere Título, Story, Critérios de Aceite, Escopo, Dependências, Riscos, Definição de Pronto nem `## Resultado do QA`. Precisa mudar escopo ou critério: PARE e peça ao `@pm`.
- Não carregue PRD, arquitetura ou outros documentos além dos `devLoadAlwaysFiles`, salvo pedido nas Dev Notes ou do usuário.

## Passos

### 1. Carregar a story e o contexto

1. Leia a story inteira.
2. Releia `## Executor`. Executor `@dev` com outro chapéu (ex.: Dados, UX/UI): declare-o (`[Chapéu: Dados]`) e siga o mindset e o checklist dele, sem atalhos.
3. Carregue os `devLoadAlwaysFiles` do core-config (`coding-standards.md`, `tech-stack.md`, `source-tree.md`). Arquivo ausente: registre no `### Log de debug` e siga.
4. Se existirem, use como roteiro os artefatos do Spec Pipeline em `docs/stories/{storyId}/spec/`: `implementation.yaml` (subtasks, arquivos, verificação e dependências), `project-context.yaml` e `files-context.yaml` (convenções, exemplares e testes). Sem eles, siga as tasks da story e os padrões do código.
5. Story em `InProgress` com `### Pedido de correção (iteração N)` em `## Resultado do QA` sem o bloco `#### Correções do QA (iteração N)` correspondente em `### Notas de conclusão`: pare e indique `*apply-qa-fixes {storyId}`.
6. Valide o modo e preencha `### Modelo usado` com o modelo em execução.

### 2. Guarda de branch e ponto de partida

1. `git branch --show-current`. Em `main` ou `master`: crie ou troque para `feat/{storyId}-{slug}` (correção de bug: `fix/{storyId}-{slug}`). Nunca commite em `main`/`master`.
2. `git status`: a árvore deve estar limpa ou só com mudanças esperadas. Mudanças inesperadas: pergunte (1. commitar, 2. guardar com `git stash`, 3. continuar assim).
3. Registre o commit de partida (`git rev-parse --short HEAD`) no `### Log de debug`. Ele é o ponto de rollback (`git reset --hard {hash}` ou `git checkout {hash} -- {arquivo}`), a ser usado só com aprovação do usuário.

### 3. Transição Ready → InProgress

- Status `InProgress`: retomada. Vá para a primeira task sem `[x]`, sem mudar o status.
- Status `Ready`: troque para `InProgress` e acrescente ao `## Change Log`:

```markdown
| {AAAA-MM-DD} | {executor, ex.: @dev} | Status: Ready → InProgress. Início da implementação (modo {modo}). |
```

### 4. Preparar conforme o modo

- **YOLO:** identifique tasks, critérios de aceite e requisitos técnicos. Não pergunte; decida e registre.
- **Interativo:** apresente um resumo das tasks e dos critérios e confirme o entendimento com o usuário.
- **Pre-Flight:**
  1. Liste as ambiguidades: especificação técnica faltante, biblioteca não definida, critério pouco claro, caso de borda sem tratamento, orientação de teste ausente.
  2. Monte um questionário único cobrindo arquitetura, bibliotecas, algoritmos e estruturas de dados, estratégia de testes, casos de borda, desempenho e segurança. Apresente todas as perguntas de uma vez e colete as respostas.
  3. Monte o plano de execução com todas as decisões documentadas, apresente e aguarde a aprovação antes de codar.

```text
Questionário Pre-Flight: story 3.2 (5 decisões)
1. Acesso a dados: cliente Supabase, ORM ou SQL puro?
2. Estratégia de migration: sequencial ou por timestamp?
3. Banco de teste: local (Docker), projeto de staging ou mock?
4. Paginação: offset ou cursor?
5. Cobertura mínima esperada para o serviço novo?
Responda todas antes de começar.
```

### 5. Aviso CLI First (Artigo I)

Se a story entrega funcionalidade nova com interface, confira se a CLI ou a API que a sustenta existe ou será feita antes. UI antes de CLI/API funcional gera WARN:

```text
AVISO CONSTITUCIONAL: Artigo I (CLI First)
Implementação de UI detectada sem base funcional em CLI/API.
Lembrete: CLI → Observabilidade → UI.
1. Implementar a CLI/API primeiro
2. Continuar mesmo assim (fica registrado)
```

No YOLO, registre o aviso em `### Decisões (modo YOLO)` e no `### Log de debug` e continue (WARN não bloqueia).

### 6. Ciclo por task (repita até concluir todas)

Ordem obrigatória: implementar → testes → validações → `[x]` → File List. Não pule nem combine etapas: autocrítica, testes e lint valem também para código simples.

1. **Ler a task.** Pegue a primeira task sem `[x]` e suas subtasks, com os critérios de aceite citados (`CA: n`). Se o `implementation.yaml` indicar dependências entre subtasks, respeite a ordem e não comece uma subtask com dependência pendente.
2. **Planejar a abordagem.** Defina arquivos a criar e a modificar, o que muda em cada um (onde e como) e os testes necessários (unitário, integração). Antes de criar algo, procure no código o que já existe (grep/glob): REUSE > ADAPT > CREATE.
3. **Decidir.** Em decisões de arquitetura, biblioteca, algoritmo ou abordagem de teste:
   - Interativo: apresente opções numeradas com trade-offs, aguarde a escolha e explique por que ela serve ao contexto.
   - YOLO: decida e registre a decisão (formato abaixo).
   - Decisão estrutural (contrato público, schema, nova dependência relevante, mudança de arquitetura): registre ADR com `*create-adr {título}` antes de implementar, também no YOLO (guia de autoria, 4.2). Dependência não aprovada é bloqueio.
4. **Implementar.** Siga a abordagem e os padrões do código, preserve o que já funciona e use imports absolutos com `@/` (Artigo VI). O código deve compilar ou carregar sem erro de sintaxe; corrija na hora.
5. **Autocrítica pós-código (obrigatória).** Releia o que escreveu e responda à parte pós-código do `self-critique-checklist.md`: bugs previstos, casos de borda (nulo, vazio, limites), tratamento de erros, segurança (validação de entrada, injeção, autenticação e autorização) e falha controlada. Consulte também `docs/gotchas.md` na área tocada, se existir. Achou problema: corrija e repita a autocrítica.
6. **Escrever os testes.** Cubra caminho feliz, caminho de erro e casos de borda de cada critério da task.
7. **Rodar os testes** (`quality.scripts.test`). Falhou: ache a causa raiz, faça a correção mínima sem quebrar o que funciona e rode de novo. Três falhas seguidas na mesma coisa: PARE (bloqueio).
8. **Autocrítica pós-teste (obrigatória).** Com os testes passando, responda à parte pós-teste do checklist: segue os padrões do código, valores fixos que deveriam ser configuráveis, testes suficientes, documentação onde precisa, code smells (duplicação, funções longas, condicionais complexos) e manutenibilidade. Mudou o código: volte ao item 7.
9. **Lint e typecheck.** Rode `quality.scripts.lint` e `quality.scripts.typecheck`. Erro de lint bloqueia (aviso não): tente o auto-fix do projeto (ex.: `npm run lint:fix`, se existir), corrija o resto à mão e rode de novo. Persistindo: PARE.
10. **Verificação funcional** quando a task envolve UI, API ou fluxo, ou quando o plano define `verification` (tipos na tabela abaixo). Falhou: volte ao item 4 da mesma task.
11. **Marcar `[x]`** na task e nas subtasks somente se TODAS as etapas passaram. No Interativo, mostre o resultado ao usuário antes de marcar. Havendo `implementation.yaml`, atualize a subtask para `status: completed`.
12. **Atualizar a File List** com todo arquivo criado, modificado ou removido, com o tipo da mudança.
13. **Commit local** com os arquivos da task e a story: `git add {arquivos}` e `git commit -m "feat: {descrição} [Story {storyId}]"`. Use o tipo coerente com a branch (`github.conventionalCommits.branchTypeMap`: `feat`, `fix`, `refactor`, `test`, `docs`...). Nunca faça push nesta task (nem o `@devops`: push só com a story em `Done`).
14. **Resumir a task** (exemplo abaixo) e seguir para a próxima.

Tipos de verificação funcional:

| Tipo | Como verificar | Campos |
|------|----------------|--------|
| `command` | Rode o comando; sucesso = código de saída 0 | `command`, `timeout` |
| `api` | Faça a requisição e compare status e corpo | `url`, `method`, `body`, `expectedStatus` |
| `browser` | Abra a página (Playwright, quando disponível) e confira seletor e texto; capture a tela se pedido | `url`, `selector`, `expectedText`, `screenshot` |
| `e2e` | Rode a suíte ponta a ponta do fluxo | `command` ou `testFile`, `timeout` |
| `manual` | Execute o passo descrito e registre o resultado observado | `instructions` |

Resumo da task:

```text
Task 2 concluída
Arquivos: 2 (src/utils/validator.ts criado, src/utils/index.ts modificado)
Testes: 4 passaram
Autocrítica: pós-código 1 ajuste (checagem de nulo); pós-teste 0
Commit: 9c1e4ab
Próxima: Task 3
```

Formato de decisão no YOLO (`### Decisões (modo YOLO)`):

```markdown
| # | Tipo | Decisão | Motivo | Alternativas | Prioridade |
|---|------|---------|--------|--------------|------------|
| D1 | library-choice | Usar Axios no cliente HTTP | Interceptors e tipos prontos | fetch nativo, got | média |
| D2 | algorithm | Busca binária na lista ordenada de usuários | O(log n) em vez de O(n) | busca linear, mapa por id | média |
```

Tipos: `architecture`, `library-choice`, `algorithm`, `testing`. Prioridade: alta, média ou baixa.

### 7. Bloqueios (PARE e pergunte)

- Dependência não aprovada (confirme com o usuário).
- Story ambígua depois de relida.
- Três falhas seguidas ao implementar ou corrigir a mesma coisa.
- Configuração ausente (variável de ambiente, credencial, serviço).
- Teste de regressão quebrado.
- Necessidade de mudar escopo ou critério de aceite (`@pm`).

Registre o bloqueio no `### Log de debug`, mantenha o status `InProgress` e informe o que destrava.

### 8. Gates de conclusão

Story de pesquisa (`@pm` [Análise]): lint, testes e build não se aplicam. Confira o entregável contra os critérios de aceite, rode o `story-dod-checklist.md` marcando como N/A, com justificativa, os itens de código, e siga para o passo 9.

1. Confira: todas as tasks e subtasks com `[x]` e com testes.
2. Rode todos os `quality.scripts` do core-config, sem atalhos: `lint`, `typecheck`, `test` (suíte completa de regressão) e `build`. Script inexistente no projeto (ex.: sem `typecheck` no `package.json`): registre como ausente no `### Log de debug` e não invente comando. Falha: volte ao ciclo da task afetada.
3. Registre o resultado em `### Notas de conclusão`:

   ```markdown
   | Script | Comando | Resultado |
   |--------|---------|-----------|
   | lint | npm run lint | passou |
   | typecheck | npm run typecheck | ausente (sem script no package.json) |
   | test | npm test | passou (148 testes) |
   | build | npm run build | passou |
   ```

4. Confira a File List contra `git status` e `git diff --stat {commit de partida}`: nenhum arquivo de fora.
5. Rode `execute-checklist` com `self-critique-checklist.md` (passada final na entrega inteira) e com `story-dod-checklist.md`. Item reprovado: corrija ou, se não se aplica, justifique em `### Notas de conclusão`. Item reprovado sem justificativa impede a conclusão.

### 9. Transição InProgress → InReview

1. Pré-checagem: status diferente de `InProgress` ou `## Change Log` ausente: PARE (`Não é possível enviar para revisão: esperado InProgress, encontrado {status}`).
2. Troque o status para `InReview` e acrescente:

   ```markdown
   | {AAAA-MM-DD} | {executor, ex.: @dev} | Status: InProgress → InReview. Implementação concluída; gates passando. |
   ```

3. Complete `### Notas de conclusão` com o resumo da entrega (no Pre-Flight, compare o executado com o plano aprovado; no Interativo, apresente o resumo ao usuário).
4. Commit local da atualização da story: `git commit -m "docs: story {storyId} pronta para revisão [Story {storyId}]"`.
5. Se a CLI estiver disponível, confira com `sia story status {storyId}`.

### 10. Handoff e parada

1. Grave o handoff em `.sia/handoffs/handoff-{executor}-para-{próximo}-{AAAAMMDD-HHmmss}.yaml` com os campos de `templates/agent-handoff-tmpl.yaml`, incluindo `last_command` (`develop` ou `execute-research-story`) e `consumed: false`. Em `next_action`: `@validator *revisar-feature {storyId}`; em story de pesquisa, `@pm *qa-gate {storyId}`.
2. Informe o próximo passo ao usuário e PARE. Não rode o QA gate nesta task nem marque a story como `Done`.

## Saída

- Código e testes no repositório, com commits locais na branch `feat/{storyId}-{slug}` (nenhum em `main`/`master`, nenhum push).
- Story com tasks `[x]`, `## Registro do Dev` preenchido, Status `InReview` e duas linhas novas no `## Change Log`:

```markdown
## Registro do Dev
### Modelo usado
{modelo}
### Decisões (modo YOLO)
(tabela de decisões; vazio fora do YOLO)
### Log de debug
- Commit de partida: 3f2a9c1
- typecheck: script ausente no package.json (registrado; não bloqueia)
### Notas de conclusão
(resumo, tabela dos scripts, justificativas do DoD)
### File List
- src/auth/session.ts (criado)
- src/auth/index.ts (modificado)
- tests/auth/session.test.ts (criado)
```

- Handoff em `.sia/handoffs/` apontando para `@validator *revisar-feature {storyId}` (story de pesquisa: `@pm *qa-gate {storyId}`).

## Critérios de conclusão

- [ ] Todas as tasks e subtasks com `[x]` e com testes
- [ ] Autocrítica pós-código e pós-teste feita em cada task
- [ ] Scripts existentes de `quality.scripts` passando; ausentes registrados no Log de debug
- [ ] `self-critique-checklist.md` e `story-dod-checklist.md` executados, sem item reprovado sem justificativa
- [ ] File List completa e conferida com o git
- [ ] Commits locais em branch `feat/` ou `fix/`, nenhum push
- [ ] Status `InReview` e duas linhas de transição no Change Log
- [ ] Handoff gravado para o `@validator` (story de pesquisa: para `@pm *qa-gate`)

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story não encontrada | PARE: `Story {storyId} não encontrada em docs/stories/. Verifique o id.` |
| Quem executa não é o executor declarado | PARE e indique o comando certo (ex.: `@devops *develop {storyId}`, `@pm *execute-research-story {storyId}`) |
| Status diferente de `Ready`/`InProgress` | PARE com a mensagem do Artigo III |
| Modo inválido | Use `interactive` e avise os modos válidos |
| Usuário cancela | Pare; o progresso fica na story (checkboxes, File List). Retome com `*develop {storyId}` |
| Teste falha três vezes seguidas | PARE e reporte (bloqueio) |
| Autocrítica acha problema recorrente (mais de 5 vezes na mesma task) | PARE e revise a abordagem com o usuário |
| Lint com erro que o auto-fix não resolve | Corrija à mão; persistindo, PARE |
| Script de `quality.scripts` ausente | Registre como ausente; não invente comando |
| Verificação funcional falha | Volte à implementação da task |
| Branch atual é `main`/`master` | Crie ou troque para `feat/{storyId}-{slug}` antes de qualquer commit |
| `implementation.yaml` inválido | Reporte o erro de sintaxe e siga pelas tasks da story |
| Precisa mudar escopo ou critério de aceite | PARE e peça ao `@pm` |

## Handoff

Próximo passo: `@validator *revisar-feature {storyId}`. Com o relatório pronto: `@pm *qa-gate {storyId}`. Inspeção reprovada ou gate `FAIL`: `@dev *apply-qa-fixes {storyId}`. Story de pesquisa: direto para `@pm *qa-gate {storyId}`.
