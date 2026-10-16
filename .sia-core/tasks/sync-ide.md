---
id: sync-ide
title: Sincronizar as projeções das IDEs
agent: squad-creator
elicit: false
inputs:
  - '--ide (opcional): lista separada por vírgula (claude-code, codex, gemini, grok); padrão: ide.targets do core-config'
  - '--check (opcional): só compara fonte e projeções, sem gravar nada'
outputs:
  - 'Projeções atualizadas em .claude/, .codex/, .gemini/ e .grok/ e nos arquivos CLAUDE.md, AGENTS.md e GEMINI.md'
  - 'Resumo por IDE: arquivos criados, atualizados, removidos e inalterados'
depends_on:
  data: [sia-authoring-guide.md]
next: [validate-framework]
source: [squad-creator-sync-ide-command.md]
---

# Sincronizar as projeções das IDEs

## Objetivo

Gerar ou conferir, com `sia sync`, as projeções das IDEs a partir da fonte única (`.sia-core/` e `squads/`) e explicar o que cada IDE recebeu.

## Quando usar

- Depois de criar ou alterar agente, task, workflow, regra, skill ou squad.
- Com `--check`, para saber se alguma projeção divergiu da fonte.
- Não use para ajustar uma projeção: a mudança vai para a fonte e o sync a propaga.

## Regras (Constitution, Artigo VII)

- A sincronização vai sempre da fonte para a projeção.
- Projeções nunca são editadas à mão; o `sia sync` as sobrescreve.
- Mudança feita direto numa projeção se perde no próximo sync. Leve-a para a fonte antes.

## Pré-condições

- [ ] CLI disponível: `sia` no PATH ou `node .sia-core/cli/sia.js`
- [ ] IDEs alvo listadas em `ide.targets` do `.sia-core/core-config.yaml`

## Passos

### 1. Definir as IDEs

Use `--ide` ou, sem ele, `ide.targets`. Ids aceitos: os de `ide.targets` (`claude-code`, `codex`, `gemini`, `grok`). IDE fora da lista: `IDE_NOT_TARGET`; peça para incluí-la em `ide.targets` antes.

### 2. Validar a fonte

```bash
sia validate
# sem sia no PATH: node .sia-core/cli/sia.js validate
```

Com erros, pare e encaminhe para `*validate-framework`: projetar artefato quebrado espalha o erro por todas as IDEs.

### 3. Conferir a divergência

```bash
sia sync --check [--ide claude-code,codex]
```

Mostre as divergências por IDE.

- Com `--check`: entregue o relatório e pare. Divergência é um aviso (WARN) do gate do Artigo VII.
- Sem `--check`: mostre a lista antes de sobrescrever. Se o usuário disser que algum desses arquivos foi editado à mão de propósito, pare e leve a mudança para a fonte.

### 4. Sincronizar

```bash
sia sync [--ide claude-code,codex,gemini,grok]
```

### 5. Explicar o que foi gerado

| IDE | id | Onde fica | O que recebe | Ativação |
|-----|----|-----------|--------------|----------|
| Claude Code | `claude-code` | `.claude/` e `CLAUDE.md` | agentes e comandos, regras em `.claude/rules/`, skills | `/sia-{agente}` ou `/SIA:agents:{agente}` |
| Codex (ChatGPT) | `codex` | `.codex/` e `AGENTS.md` | agentes, skills `sia-*`, regras no `AGENTS.md` | skill `sia-{agente}` ou `@{agente}` |
| Gemini CLI | `gemini` | `.gemini/` e `GEMINI.md` | comandos (`/sia-menu` lista todos), regras no `GEMINI.md` | `/sia-{agente}` |
| Grok | `grok` | `.grok/` | agentes, comandos, regras em `.grok/rules/`, skills | `/sia-{agente}` |

Agentes e tasks de squads também são projetados; o prefixo dos comandos do squad vem de `slashPrefix` no `squad.yaml`. A lista exata de arquivos está no resumo do `sia sync`.

### 6. Conferir o resultado

Rode `sia sync --check` de novo. Sem divergência, conclua. Divergência persistente: `SYNC_DRIFT`; não corrija à mão, reporte com a saída da CLI.

## Saída

```text
Sincronização (fonte: .sia-core/ e squads/)

Claude Code: 3 atualizados, 1 criado, 42 inalterados
Codex:       3 atualizados, 1 criado, 40 inalterados
Gemini CLI:  2 atualizados, 0 criados, 18 inalterados
Grok:        3 atualizados, 1 criado, 37 inalterados

sia sync --check: sem divergência
Novos comandos: /sia-closer (squad vendas-b2b)
```

Com `--check`, só a lista de divergências por IDE e o resultado: em dia ou divergente.

## Critérios de conclusão

- [ ] `sia validate` sem erros antes do sync
- [ ] `sia sync` executado para as IDEs pedidas (ou só `--check`, quando pedido)
- [ ] `sia sync --check` sem divergência ao final
- [ ] Resumo por IDE entregue, com o que mudou e como ativar

## Tratamento de erros

| Situação | Ação |
|----------|------|
| CLI indisponível | Projeções não são escritas à mão. Restaure a CLI em `.sia-core/cli/` ou rode `sia doctor` (`@devops *health-check`) |
| `sia validate` com erros | Pare; `*validate-framework` |
| `IDE_NOT_TARGET` | Inclua a IDE em `ide.targets` e rode de novo |
| Arquivo de projeção editado à mão | Leve a mudança para a fonte; só então sincronize |
| `SYNC_DRIFT` após o sync | Reporte a saída da CLI; não edite a projeção |

## Handoff

Próximo passo: ative o agente na IDE (ex.: `/sia-{agente}`) para conferir. Se o sync foi bloqueado por erros, `@squad-creator *validate-framework`.
