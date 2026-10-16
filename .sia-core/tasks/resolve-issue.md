---
id: resolve-issue
title: Conduzir a resolução de uma issue do GitHub
agent: devops
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'número (obrigatório): issue aberta no GitHub'
outputs:
  - 'Diagnóstico e plano da issue, story criada pelo @pm, PR com "Closes #N" e issue fechada com comentário de resolução'
depends_on:
  tasks: [triage-issues.md, pre-push.md, push.md, create-pr.md]
next: [create-story, develop, create-pr]
source: [resolve-github-issue.md]
---

# Conduzir a resolução de uma issue do GitHub

## Objetivo
Levar uma issue da investigação ao PR que a fecha, dentro do fluxo de stories do SIA. O `@devops` investiga, planeja e entrega; a implementação é do `@dev` e passa por story (Constitution, Artigo III).

## Quando usar
- Depois de escolher uma issue na triagem (`*triage-issues`).
- Quando o usuário pede "resolve a issue #N".
- Não use para implementar código como `@devops`: a correção é sempre do `@dev`.

## Pré-condições
- [ ] `gh auth status` autenticado
- [ ] Issue existe e está aberta: `gh issue view {n} --json state` retorna `OPEN`
- [ ] Árvore de trabalho limpa (`git status --porcelain`); senão, avise e sugira commit ou stash

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | investiga, planeja e encaminha com o mínimo de perguntas | correções XS ou S bem definidas |
| Interativo (padrão) | checkpoints no diagnóstico, no plano e na entrega | a maioria das issues |
| Pre-Flight | investigação e pesquisa completas e plano aprovado antes de qualquer código | causa desconhecida, mudanças em muitos arquivos |

## Passos

### 1. Investigar
1. `gh issue view {n} --json title,body,labels,comments,assignees`.
2. Extraia: problema relatado, comportamento esperado e atual, passos para reproduzir, mensagens de erro e módulos prováveis.
3. Procure no código: termos da issue, mensagens de erro, nomes de funções e caminhos (grep e glob), e leia os arquivos suspeitos para confirmar a causa.
4. Envolve padrão externo, API ou tecnologia pouco conhecida? Peça pesquisa ao `@pm` (chapéu Análise, `*research {tema}`) ou ao `@dev` (chapéu Arquitetura).

**Ponto de elicitação (checkpoint):**
```text
━━━ Diagnóstico da issue #{n} ━━━
Problema:        {descrição}
Causa provável:  {causa}
Arquivos:        {quantidade}
  - {arquivo1}
Pesquisa:        {não necessária | pedida | concluída}
Esforço:         {XS | S | M | L | XL}
Abordagem:
  1. {passo}
```
1. Seguir para o plano
2. Investigar mais
3. Encerrar (a issue não procede: comente e feche com confirmação)

### 2. Planejar
1. Manifesto de mudanças:

| Ação | Arquivo | Descrição |
|------|---------|-----------|
| CRIAR | caminho/novo.ts | ... |
| ALTERAR | caminho/existente.ts | ... |
| REMOVER | caminho/antigo.md | ... |

2. Impactos: testes, documentação, CI (`.github/workflows/`), banco (migração → `@dev [Dados]`), configuração e artefatos do SIA (`.sia-core/` → `@squad-creator`).
3. Reaproveitamento: prefira REUSAR o que existe, depois ADAPTAR e só então CRIAR.
4. Testes: quais testes mudam, quais são novos (incluindo o que reproduz a issue) e o que se valida à mão.

### 3. Abrir a story
1. Peça ao `@pm` a story com o diagnóstico e o plano: `@pm *create-story` (ou `*create-brownfield-story`), citando a issue (`#{n}`) nas Dependências e nos Critérios de Aceite.
2. A story segue o ciclo normal: `@pm *validate-story` → `@dev *develop` → `@validator *revisar-feature` → `@pm *qa-gate`. Correção simples pode rodar o `@dev` em modo YOLO.
3. Sugira ao `@dev` a branch `{tipo}/{n}-{slug}`, com o tipo pelo mapa da issue (BUG → `fix`, FEATURE e ENHANCEMENT → `feat`, DOCS → `docs`, CHORE → `chore`, SECURITY → `fix`), e commits no formato `{tipo}({escopo}): {descrição} (#{n})`.
4. Grave um handoff em `.sia/handoffs/` para o `@pm` com o diagnóstico (`last_command: resolve-issue`).

### 4. Acompanhar a implementação
Enquanto a story não chega a `Done`, a task fica em espera. Lições de resoluções anteriores para repassar ao `@dev`:
- Depois de substituições em massa, procure o padrão antigo e padrões corrompidos (o padrão pode aparecer dentro de URLs, e-mails e identificadores compostos).
- Em YAML, um item de lista como `CHAVE: valor` vira objeto, não texto; trate os dois formatos.
- Ganho rápido também passa pelo ciclo completo: validar, commitar, enviar e fechar.

### 5. Entregar
Com a story `Done` e o gate aprovado:
1. `*pre-push` e `*push` da branch (portão completo).
2. `*create-pr {storyId}` com `Closes #{n}` no corpo: o merge fecha a issue.
3. Depois do merge, confira o fechamento (`gh issue view {n} --json state`). Se a issue não fechou sozinha, feche com o comentário de resolução, com confirmação:
```bash
gh issue close {n} --comment "$(cat <<'EOF'
## Resolvida no PR #{pr} ({commit})

### Causa
{causa}

### Mudanças
1. {mudança}

### Validação
- {testes e verificações}
EOF
)"
```

## Saída
Diagnóstico e plano no histórico da conversa e no handoff, story criada pelo `@pm`, PR com `Closes #{n}` e issue fechada com a causa registrada.

## Critérios de conclusão
- [ ] Causa identificada e registrada no comentário de fechamento ou no PR
- [ ] Story criada e concluída pelo fluxo normal (sem código fora de story)
- [ ] Testes existentes passando e teste novo cobrindo a issue
- [ ] Commits e PR no formato Conventional Commits com referência à issue
- [ ] Issue fechada com resolução detalhada

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Issue fechada por outra pessoa | confira com `gh issue view`; informe e pergunte se a story segue |
| Testes falham depois da correção | não envie; volta ao `@dev` pelo QA gate |
| Push recusado (remoto à frente) | `git pull --rebase origin {branch}`, novo portão e novo push |
| Issue sem informação para reproduzir | comente pedindo os dados, aplique `status: needs-info` e pause |
| Pesquisa necessária e indisponível | registre a lacuna na story e siga com o que é verificável |

## Handoff
- Diagnóstico pronto: `@pm *create-story` com a issue #{n}.
- Story `Done`: `@devops *create-pr {storyId}`.
- Próxima issue: `@devops *triage-issues`.
