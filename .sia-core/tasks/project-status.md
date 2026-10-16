---
id: project-status
title: Panorama do projeto
agent: pm
hat: owner
elicit: false
inputs:
  - 'epic (opcional): número do epic, para limitar o panorama'
  - '--summary (opcional): só as contagens por epic'
outputs:
  - 'Panorama no chat: epics, stories por status, gates, inspeções, bloqueios, divergências e próximo passo; nada é gravado'
depends_on: {}
next: [next]
source: [project-status.md, init-project-status.md]
---

# Panorama do projeto

## Objetivo
Mostrar um panorama exato de epics e stories, com status, gates, inspeções e bloqueios, lendo cada informação da sua fonte da verdade nos arquivos de `docs/`.

## Quando usar
- `@pm *status`: visão geral do projeto (padrão: todos os epics e todas as stories).
- `@pm *status {epic}`: só um epic. `@pm *status --summary`: só as contagens.
- Para saber só o próximo comando de uma story, use `*next {storyId}`.

## Regras
1. **Fonte da verdade:** o status de uma story é a primeira linha não vazia depois de `## Status` no arquivo da story. Nunca use metadados do epic, `git log`, retrato de git do início da conversa, dados lidos antes na conversa, resumo de subagente que não leu cada arquivo ou suposição sobre stories sem arquivo.
2. **Leia todos os arquivos:** toda execução lê de novo o `## Status` de todas as stories. Sem atalho, sem amostragem.
3. **Divergência:** se o progresso declarado num epic não bate com o status real das stories, sinalize com ⚠️ e sugira a correção.

## Pré-condições
- [ ] Pasta `docs/stories/` (`paths.stories`) existe

## Passos

### 1. Contexto do repositório
1. `git rev-parse --is-inside-work-tree`. Se não for repositório git: mostre "📊 Projeto: sem repositório git", recomende `@devops *environment-bootstrap` e siga só com `docs/`.
2. Com git: branch (`git branch --show-current`), arquivos modificados (`git status --porcelain`; mostre até 5) e os 2 últimos commits (`git log -2 --oneline --no-decorate`).
3. Esse contexto é só informativo. Nunca deduza o status de story a partir do git.

### 2. Descobrir epics
Liste `docs/prd/epic-*.md` (`paths.prdSharded`). De cada epic: número, título, status, stories citadas e progresso declarado.

### 3. Descobrir e ler as stories (obrigatório)
1. Liste todos os arquivos `docs/stories/*.story.md` (`{epic}.{story}-{slug}.story.md`).
2. Leia cada arquivo, sem cache:
   - título: primeira linha que começa com `# `;
   - status: primeira linha não vazia depois de `## Status`, sem `**` nem espaços (não dependa de número de linha);
   - último `**Gate:**` do bloco `## Resultado do QA`;
   - seção `## Dependências`.
3. Associe a story ao epic pelo primeiro número do storyId.
4. Normalize o status:

| Valor encontrado | Status |
|------------------|--------|
| `Ready`, "Ready for Dev", "Ready to Start" | Ready |
| `InProgress`, "In Progress" | InProgress |
| `InReview`, "In Review", "Ready for Review" | InReview |
| `Done`, "Complete", "Completed" | Done |
| `Draft` | Draft |
| qualquer outro | Unknown ⚠️ |

Delegar esta leitura a um subagente só é aceitável com a instrução explícita de ler o `## Status` de cada arquivo.

### 4. Ler gates e inspeções
1. Gates: `docs/qa/gates/*.yml` (`story`, `gate`, `updated`, `iteration`). Vale o mais recente de cada story.
2. Inspeções: frontmatter de `docs/qa/inspections/*.md` (`story`, `verdict`, `findings.bloqueante`, `date`). Vale a mais recente de cada story.

### 5. Levantar bloqueios
| Situação | Bloqueio e dono |
|----------|-----------------|
| Story `InReview` sem inspeção (com `quality.inspection.requiredBeforeGate: true`) | aguarda `@validator *revisar-feature {storyId}` |
| Última inspeção `reprovado` ou com `bloqueante` > 0 | aguarda `@dev *apply-qa-fixes {storyId}` |
| Último gate `FAIL` | aguarda `@dev *apply-qa-fixes {storyId}` |
| Story `Ready` ou `InProgress` com dependência que não está `Done` | aguarda a story da dependência |
| Plano `docs/prd/epic-{n}-execution.yaml` com stories `failed` ou `blocked` | aguarda decisão no `@pm *execute-epic {n}` |
| `docs/stories/{storyId}/spec/critique.json` com `BLOCKED` | aguarda `@pm *gather-requirements` ou o `@dev` [Arquitetura] |

### 6. Detectar divergências
- Progresso declarado no epic diferente do real.
- Story `Done` sem arquivo de gate, ou com último gate `FAIL`.
- Gate `PASS`, `CONCERNS` ou `WAIVED` com a story fora de `Done`.
- Story citada no epic sem arquivo (📄).
- Story sem epic (lista "Stories sem epic").
- Story sem o campo `## Status` (⚠️ campo ausente).

### 7. Montar o panorama
```text
📊 Status completo: {projeto}
Repositório: branch feat/2.3-vincular-contas · 3 arquivos modificados · último commit a1b2c3d feat(auth): ...
Panorama geral: 4/7 stories Done (57%)

═══════════════════════════════════════════════════════
Epic 1: Fundação                                 3/3 ✅
  ✅ 1.1 Estrutura do projeto        Done        · gate PASS
  ✅ 1.2 Autenticação básica         Done        · gate CONCERNS
  ✅ 1.3 Layout                      Done        · gate PASS

Epic 2: Login social                             1/4
  ✅ 2.1 Login com Google            Done        · gate PASS
  🔍 2.2 Tela de login               InReview    · inspeção pendente
  🔄 2.3 Vincular contas             InProgress  · gate FAIL (iteração 1)
  📄 2.4 (sem arquivo de story)
  ⚠️ DIVERGÊNCIA: o epic diz "2/4 concluídas", as stories indicam 1/4
═══════════════════════════════════════════════════════

Qualidade: gates PASS 3 · CONCERNS 1 · FAIL 1 · WAIVED 0 | inspeções: aprovado 3 · com ressalvas 1 · reprovado 1
Bloqueios:
- 2.2 aguarda inspeção: @validator *revisar-feature 2.2
- 2.3 gate FAIL: @dev *apply-qa-fixes 2.3
Próximo: @validator *revisar-feature 2.2
```

| Ícone | Status |
|-------|--------|
| ✅ | Done |
| 🔄 | InProgress |
| ⏳ | Ready |
| 📝 | Draft |
| 🔍 | InReview |
| 📄 | story sem arquivo |
| ⚠️ | divergência ou status desconhecido |

Para cada divergência, sugira a correção:
```text
⚠️ DIVERGÊNCIA no Epic 2:
   O epic diz: "2/4 concluídas"
   Stories reais: 1/4 Done
   Sugestão: atualizar o progresso em docs/prd/epic-2-login-social.md (@pm)
```

Com `--summary`, mostre só as linhas dos epics com as contagens e os bloqueios. Com `{epic}`, só aquele epic.

### 8. Recomendar o próximo passo
O primeiro bloqueio da lista; sem bloqueios, o próximo passo da story ativa (mesma lógica da task `next`); sem story ativa, `@pm *create-story {epic}` do primeiro epic com stories pendentes.

## Anti-padrões (nunca faça)
1. Usar o epic como fonte do status das stories.
2. Usar o retrato de git do início da conversa.
3. Delegar a um subagente sem a instrução explícita de ler o `## Status` de cada arquivo.
4. Afirmar que uma story não existe sem listar os arquivos antes.
5. Informar status sem ter lido o campo `## Status` do arquivo.
6. Deduzir conclusão de story pelo `git log`.

## Saída
Panorama no chat, no formato do passo 7. A task não grava nem altera arquivos.

## Critérios de conclusão
- [ ] Número de stories lidas igual ao número de arquivos encontrados
- [ ] Status normalizado de cada story, com o ícone correspondente
- [ ] Gates, inspeções, bloqueios e divergências listados
- [ ] Próximo passo recomendado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `docs/stories/` não existe | Informe; sugira `@devops *environment-bootstrap` (estrutura) ou `@pm *create-story` |
| Story sem campo `## Status` | Mostre "⚠️ campo Status ausente" e sinalize para revisão |
| Epic cita story sem arquivo | Mostre "📄 sem arquivo de story" e continue |
| Story sem epic | Liste em "Stories sem epic" |
| Gate ou relatório ilegível | Ignore o arquivo, avise e continue |

## Handoff
O comando da linha "Próximo" do panorama. Para detalhar uma story: `*next {storyId}`.
