---
id: pre-push
title: Portão de qualidade antes do push
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'storyId (opcional): story da branch; se ausente, é deduzido do nome da branch ou da File List das stories'
  - 'base (opcional): branch de comparação; padrão: branch padrão do remoto'
outputs:
  - 'Relatório do portão com veredito PASS, CONCERNS ou FAIL, exibido ao usuário e usado por *push, *create-pr e *release'
depends_on:
  tasks: [execute-checklist.md]
  checklists: [pre-push-checklist.md]
next: [push, create-pr]
source: [github-devops-pre-push-quality-gate.md]
---

# Portão de qualidade antes do push

## Objetivo
Garantir, antes de qualquer push, que o código passa nos scripts de qualidade, não leva segredos e pertence a uma story `Done` com QA gate aprovado (Constitution, Artigo V). O veredito decide se o `*push` pode seguir.

## Quando usar
- Sempre antes de `*push`: o `*push` executa esta task automaticamente.
- Antes de `*create-pr` e de `*release`.
- Avulso, para saber se a branch está pronta para entrega.

## Pré-condições
- [ ] Repositório git com o remoto `origin` configurado (`git remote -v`)
- [ ] HEAD em uma branch (não em detached HEAD)
- [ ] `.sia-core/core-config.yaml` legível (`quality.scripts`, `quality.inspection`, `paths`)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | roda tudo e só pergunta no fim (falso positivo de segredo, CONCERNS) | padrão quando chamado pelo `*push` |
| Interativo (padrão) | apresenta cada categoria do checklist e pede decisão nas falhas | `*pre-push` avulso |

## Passos

### 1. Levantar o contexto
1. Branch: `git branch --show-current`. Remoto: `git remote get-url origin`.
2. Base: `git symbolic-ref --short refs/remotes/origin/HEAD` sem o prefixo `origin/`; se falhar, use `main`.
3. Atualize as referências: `git fetch origin --quiet`.
4. Intervalo a enviar: `@{u}..HEAD` quando a branch tem upstream; senão `origin/{base}..HEAD`.
5. Liste commits (`git log --oneline {intervalo}`) e arquivos (`git diff --name-only origin/{base}...HEAD`).
6. Sem commits a enviar: informe "nada a enviar" e encerre.

### 2. Estado do git
| Verificação | Comando | Falha |
|-------------|---------|-------|
| Árvore limpa | `git status --porcelain` | saída não vazia → FAIL: "faça commit ou stash antes do push" |
| Conflitos e espaços | `git diff --check origin/{base}...HEAD` | qualquer saída → FAIL |
| Atualizada com a base | `git rev-list --count HEAD..origin/{base}` | maior que 0 → WARN: sugira `git pull --rebase origin {base}` |
| Mensagens de commit | `git log --format=%s {intervalo}` | fora de `tipo(escopo): descrição` → WARN |

### 3. Scripts de qualidade
1. Leia `quality.scripts` do core-config (`lint`, `typecheck`, `test`, `build`).
2. Detecte scripts ausentes antes de rodar:
   - `npm run {nome}`: o script precisa existir em `scripts` do `package.json`.
   - `npm test`: precisa existir `scripts.test`.
   - Outros comandos: rode; código de saída 127 (comando não encontrado) conta como ausente.
   - Ausente → registre `AUSENTE (ignorado)`. Projeto sem `package.json` → todos os scripts npm ausentes.
3. Rode na ordem lint → typecheck → test → build. Rode os testes com `CI=true` para evitar modo watch.
4. Registre código de saída e as últimas linhas da saída de cada falha.
5. Qualquer falha → FAIL. Não edite código para o portão passar: a correção é do `@dev`.

### 4. Segurança
**4.1 Segredos no diff.** Grave os padrões abaixo em `.sia/secret-patterns.txt` (um por linha) e varra só as linhas adicionadas:

```bash
git diff -U0 origin/{base}...HEAD | grep -E '^\+[^+]' | grep -nE -f .sia/secret-patterns.txt
```

```text
-----BEGIN [A-Z ]*PRIVATE KEY-----
gh[pousr]_[A-Za-z0-9]{36,}
github_pat_[A-Za-z0-9_]{20,}
AKIA[0-9A-Z]{16}
sk-[A-Za-z0-9_-]{20,}
xai-[A-Za-z0-9]{20,}
sb_secret_[A-Za-z0-9_-]+
eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}
(SECRET|TOKEN|PASSWORD|API_KEY|PRIVATE_KEY)[A-Z_]*[[:space:]]*[:=][[:space:]]*['"]?[^'"[:space:]$]{8,}
[a-z]+://[^:/[:space:]]+:[^@/[:space:]]+@
```

Cobrem, na ordem: chave privada, tokens do GitHub, chave da AWS, chaves de LLM, chave secreta e JWT do Supabase (o `service_role` legado é JWT), atribuição de segredo com valor literal e string de conexão com senha.

- Se o projeto tem `secretlint` configurado (dependência ou `.secretlintrc*`), rode também `npx secretlint {arquivos alterados}`.
- Achado → FAIL. Falso positivo (ex.: chave publicável `sb_publishable_`, valor fictício de teste) só é aceito com confirmação explícita do usuário, registrada no relatório.

**4.2 Arquivos sensíveis.** `git diff --name-only origin/{base}...HEAD` e `git ls-files` não podem conter `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key` nem `.vercel/`. O `.env.example` é permitido. Encontrou → FAIL; oriente `git rm --cached {arquivo}` e a inclusão no `.gitignore`, e lembre que o segredo exposto em commit precisa ser revogado.

**4.3 Variáveis públicas.** Nomes `NEXT_PUBLIC_*` (ou prefixo público equivalente do bundler) que contenham `SECRET`, `SERVICE_ROLE`, `PRIVATE`, `TOKEN` ou `PASSWORD` → FAIL. Variáveis públicas vão para o bundle do navegador.

**4.4 Dependências.** Com lockfile npm: `npm audit --audit-level=moderate --json`. Crítica → FAIL. Alta → WARN. Moderada e baixa → informativo. Sem rede ou sem lockfile → registre "não executado" (WARN).

### 5. Story e QA gate
1. **Classifique o diff.** Só documentação (`docs/`, `*.md`), artefatos do SIA (`.sia-core/`, `squads/`) ou arquivos operacionais do `@devops` (`.github/`, `CHANGELOG.md`, versão em manifestos, `.gitignore`, `.env.example`, `vercel.json`)? Pergunte se é trabalho de story. Se não for, marque o bloco como `N/A (sem código de produto)` e vá para o passo 6. Código de produto sem story é FAIL (Artigo III).
2. **Identifique a story.** Ordem: argumento `storyId` → padrão `\d+\.\d+` no nome da branch → stories cuja `### File List` cita arquivos do diff → pergunta com lista numerada das candidatas. Arquivo: `{paths.stories}/{storyId}-*.story.md`. Se a CLI existir, `sia story status {storyId}` resume status e próximo passo.
3. **Status.** A primeira linha não vazia depois de `## Status` precisa ser `Done`. Outro valor → FAIL com o encaminhamento: `InReview` → `@pm *qa-gate {storyId}`; `InProgress` ou `Ready` → `@dev *develop {storyId}`; `Draft` → `@pm *validate-story {storyId}`.
4. **Gate.** Em `## Resultado do QA` vale a última ocorrência de cada campo. `- **Gate:**` precisa ser `PASS`, `CONCERNS` ou `WAIVED`; `FAIL` ou ausente → FAIL. Abra o `- **Arquivo do gate:**` e confira que o campo `gate` é o mesmo; guarde `updated` e `reviewed_revision`. Divergência → FAIL (devolva ao `@pm`).
5. **Inspeção obrigatória.** Com `quality.inspection.requiredBeforeGate: true`, a linha `- **Inspeção:**` precisa existir. Ausente → FAIL: gate emitido sem relatório do `@validator`.
6. **Inspeção posterior.** Liste `{paths.inspections}/*.md` com frontmatter `story` igual ao storyId. Algum com `verdict: reprovado` e `date` posterior ao `updated` do gate → FAIL: "há inspeção reprovada depois do gate; corrija e peça novo `*qa-gate`".
7. **Revisão avaliada.** `git log --oneline {reviewed_revision}..HEAD -- . ':!docs/stories' ':!docs/qa'` com saída → WARN: o código mudou depois da revisão que o gate avaliou; recomende novo `*qa-gate`.
8. **Escopo.** Arquivos do diff fora da File List da story → WARN (possível escopo extra).

### 6. Checklist e veredito
Execute `execute-checklist.md` com `pre-push-checklist.md` em modo YOLO, usando as evidências dos passos 2 a 5.

| Veredito | Condição | Efeito no `*push` |
|----------|----------|-------------------|
| FAIL | algum item (BLOCK) não cumprido | bloqueado; mostre as ações |
| CONCERNS | só itens (WARN) não cumpridos | exige confirmação explícita do usuário |
| PASS | tudo cumprido ou N/A com motivo | liberado (ainda com confirmação do push) |

### 7. Relatório
Apresente neste formato:

```text
━━━ Portão de qualidade (pre-push) ━━━
Branch: feat/2.1-login-social → origin (base: main)
Commits a enviar: 3 | Arquivos alterados: 12

Git        ✅ árvore limpa | ✅ sem conflitos | ⚠️ 2 commits atrás da base
lint       ✅ PASS
typecheck  ⏭️ AUSENTE (ignorado)
test       ✅ PASS
build      ✅ PASS
Segredos   ✅ nenhum achado
npm audit  ⚠️ 1 alta, 0 crítica
Story 2.1  ✅ Done | Gate PASS (2026-10-16) | Inspeção: aprovado com ressalvas

Veredito: ⚠️ CONCERNS
Ações:
1. Atualizar a branch: git pull --rebase origin main
2. Avaliar a vulnerabilidade alta antes de produção
```

Em FAIL, cada ação indica o responsável: código → `@dev`; status e gate → `@pm`; inspeção → `@validator`.

## Saída
Relatório exibido ao usuário com o veredito. Nada é gravado no repositório. O veredito vale para o HEAD avaliado: qualquer commit novo exige rodar o portão de novo.

## Critérios de conclusão
- [ ] Todas as verificações executadas ou registradas como AUSENTE ou N/A, com motivo
- [ ] Checklist `pre-push-checklist.md` preenchido com evidências
- [ ] Veredito apresentado, com ação e responsável para cada falha
- [ ] Nenhum arquivo de código editado por esta task

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Script trava (modo watch, prompt) | rode com `CI=true`; se persistir, interrompa e registre FAIL do script |
| Sem rede para `git fetch` ou `npm audit` | registre WARN e compare com as últimas referências locais |
| Story não encontrada | pergunte ao usuário; sem resposta, FAIL |
| Story e arquivo do gate divergem | FAIL; devolva ao `@pm *qa-gate {storyId}` |
| Frontmatter de inspeção inválido | trate o relatório como reprovado e avise o `@validator` |
| Segredo encontrado em commit já enviado antes | FAIL; oriente revogar o segredo, além de removê-lo |

## Handoff
- PASS, ou CONCERNS confirmado: `@devops *push` (dentro do `*push`, o fluxo segue sozinho).
- FAIL por código ou scripts: `@dev *apply-qa-fixes {storyId}` ou correção direta pelo `@dev`.
- FAIL por status ou gate: `@pm *qa-gate {storyId}`.
- FAIL por inspeção: `@validator *revisar-feature {storyId}` depois das correções.
