---
id: close-story
title: Fechar a story aprovada no QA gate
agent: pm
hat: owner
elicit: false
inputs:
  - 'storyId: id da story com Status Done (ex.: 2.1)'
outputs:
  - 'Epic com a story marcada como concluída e o progresso atualizado'
  - 'Follow-ups do gate registrados em docs/stories/backlog.md'
  - 'Linha de fechamento no Change Log da story com [closure-key: ...]; Status inalterado'
  - 'docs/stories/index.md regenerado'
depends_on:
  tasks: [manage-backlog.md, stories-index.md]
next: [pre-push, push, create-pr, create-story]
source: [po-close-story.md]
---

# Fechar a story aprovada no QA gate

## Objetivo

Fazer o registro administrativo de uma story já aprovada: conferir o veredito e a revisão avaliada, atualizar o progresso do epic, levar os follow-ups do gate para o backlog, registrar o fechamento e regenerar o índice. A task NUNCA muda o status da story.

## Fronteira de autoridade

O `@pm [Qualidade]`, no `*qa-gate`, é o único dono das transições `InReview` → `Done` (`PASS`, `CONCERNS`, `WAIVED`) e `InReview` → `InProgress` (`FAIL`). Esta task é idempotente: rodar de novo não duplica nenhum registro.

Proibido nesta task: alterar `## Status`; fechar story com gate `FAIL` ou sem veredito; `git push`, PR, merge, release ou tag.

## Quando usar

- Depois do `*qa-gate` com `PASS`, `CONCERNS` ou `WAIVED` (story em `Done`).
- Antes ou depois do push: o fechamento é só registro.
- Não use para aprovar story: sem gate aprovado, a task para.

## Pré-condições

- [ ] Story existe e está legível
- [ ] Status `Done`
- [ ] Gate `PASS`, `CONCERNS` ou `WAIVED` em `## Resultado do QA` e em `docs/qa/gates/{storyId}-{slug}.yml`
- [ ] Gate com `reviewer` e `reviewed_revision` (procedência do veredito)
- [ ] Critérios de aceite, tasks e File List completos

Mensagens de parada:

- Status diferente de `Done`: "O QA precisa concluir o ciclo antes do close-story."
- Procedência ausente, obsoleta, divergente ou não verificável: "A procedência do veredito não corresponde à revisão atual da story."

## Passos

### 1. Conferir veredito e procedência (somente leitura)

1. Leia a story e o arquivo do gate sem alterar nada.
2. Confira: `story` do gate igual ao storyId; `gate` em `PASS`, `CONCERNS` ou `WAIVED` e igual ao último `**Gate:**` da story; `reviewer` preenchido; `reviewed_revision` igual ao último `**Revisão:**` da story.
3. Confira que a revisão existe e não está obsoleta:
   - `git cat-file -e {reviewed_revision}^{commit}` passa.
   - `git diff --name-only {reviewed_revision}..HEAD -- {arquivos da File List}` e `git status --porcelain -- {arquivos da File List}` vêm vazios. Mudança nesses arquivos depois da revisão avaliada torna o veredito obsoleto: PARE com a mensagem de procedência.
4. Sem git ou sem revisão verificável: PARE antes de qualquer escrita e reporte um no-op somente leitura.

### 2. Resolver a chave de fechamento

A chave é `{storyId}:commit:{reviewed_revision}` (ex.: `2.1:commit:3f2a9c1`). Ela marca cada registro desta task.

### 3. Inspecionar cada artefato

Procure `[closure-key: {chave}]` em cada artefato, de forma independente:

| Artefato | Onde procurar | O marcador vale para |
|----------|---------------|----------------------|
| Epic | `docs/prd/epic-{n}-*.md` | só o epic |
| Backlog | `docs/stories/backlog.md` | só o backlog |
| Story | `## Change Log` | só o registro de fechamento da story |

Marcador presente: o artefato já foi fechado e não recebe nada (no-op para ele).

### 4. Atualizar o epic (se o marcador faltar)

Na lista ou tabela de stories do epic, marque a story como `Done`, com o gate, e atualize o progresso do epic (stories concluídas sobre o total). Inclua `[closure-key: {chave}]` na linha da story. Epic não encontrado: avise e siga com os outros artefatos.

### 5. Registrar os follow-ups no backlog (se o marcador faltar)

1. Colete do gate: `recommendations.future`, `top_issues` não resolvidos (em `CONCERNS` e `WAIVED`) e o motivo da dispensa (em `WAIVED`).
2. Para cada item, rode `tasks/manage-backlog.md` com `add follow-up`, sem perguntas: story relacionada = storyId; origem = arquivo do gate; valor × risco pela severidade (`high` → 3 × 2, `medium` → 2 × 2, `low` → 1 × 2).
3. Inclua `[closure-key: {chave}]` no campo Origem de cada item.
4. Sem follow-up, o backlog não muda.

### 6. Registrar o fechamento na story (se o marcador faltar)

Acrescente ao `## Change Log`: `| {AAAA-MM-DD} | @pm [Product Owner] | Fechamento administrativo: epic e backlog atualizados [closure-key: {chave}] |`. Não repita a transição do QA gate e não toque em `## Status`.

### 7. Regenerar o índice

Rode `tasks/stories-index.md` sem confirmação (modo YOLO). O índice é regenerado inteiro, então rodar de novo não duplica nada.

### 8. Sugerir a próxima story e reportar

1. Próxima story elegível: a próxima prevista no epic ainda sem arquivo (`@pm *create-story {epic}`) ou a próxima em `Ready` (`@dev *develop {storyId}`).
2. Reporte: Status preservado (`Done`), chave, arquivos alterados e artefatos que já estavam fechados.

**Escrita atômica e retomada:** cada artefato é gravado de uma vez. Se uma escrita falhar, PARE e reporte a chave, o artefato que falhou e os que já foram gravados. Na nova execução, o passo 3 encontra os marcadores e só o artefato que falta é gravado. Não desfaça escrita válida.

## Saída

- Epic com a story marcada como concluída, progresso atualizado e marcador de fechamento.
- Follow-ups do gate no backlog, cada um com o marcador.
- Linha de fechamento no Change Log da story; `## Status` intacto.
- `docs/stories/index.md` regenerado.
- Relatório com a chave e os arquivos alterados.

## Critérios de conclusão

- [ ] Status continua `Done`; nenhuma transição atribuída ao chapéu Product Owner
- [ ] Exatamente uma ocorrência de `[closure-key: {chave}]` em cada artefato que recebeu registro
- [ ] Segunda execução com a mesma revisão produz no-op
- [ ] Epic e backlog coerentes com a story
- [ ] Nada fechado com gate `FAIL`, ausente ou com procedência inválida

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Status diferente de `Done` | PARE com a mensagem de status |
| Gate `FAIL` ou ausente | PARE; oriente `@pm *qa-gate {storyId}` |
| Procedência divergente ou obsoleta | PARE com a mensagem de procedência; nova inspeção e novo gate |
| Epic não encontrado | registre backlog, story e índice; avise |
| Falha de escrita | PARE; reporte o que foi gravado; a nova execução completa só o que falta |

## Handoff

- Operação remota pedida: `@devops *pre-push` e depois `*push` / `*create-pr {storyId}`, informando storyId, veredito, branch e commit.
- Próxima story: `@pm *create-story {epic}` ou `@dev *develop {storyId}`.
