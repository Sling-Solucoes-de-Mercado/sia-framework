---
id: migrate-squad
title: Migrar um squad do AIOX para o SIA
agent: squad-creator
elicit: true
inputs:
  - 'caminho (obrigatório): pasta do squad no formato do AIOX (squad.yaml ou config.yaml)'
  - '--dry-run (opcional): mostra a análise e as mudanças planejadas sem alterar arquivos'
  - '--verbose (opcional): mostra o detalhe de cada ação'
outputs:
  - 'squads/{nome}/ no formato do SIA: manifest, agentes, tasks e workflows convertidos'
  - 'Backup em .sia/backups/{AAAAMMDD-HHmmss}/ e relatório de migração com as pendências'
depends_on:
  templates: [agent-tmpl.md, task-tmpl.md, workflow-tmpl.yaml]
  data: [sia-authoring-guide.md]
  schemas: [squad-schema.json]
next: [validate-squad, analyze-squad, sync-ide]
source: [squad-creator-migrate.md]
---

# Migrar um squad do AIOX para o SIA

## Objetivo

Converter um squad do AIOX (manifest `squad.yaml` ou `config.yaml` legado, agentes, tasks no "AIOX Task Format" e workflows) para os formatos do SIA, com análise prévia, backup, validação e relatório.

## Quando usar

- Squad criado no AIOX que vai passar a rodar no SIA.
- Squad com `config.yaml` (status obsoleto em `*list-squads`).
- Não use em squad que já segue o formato do SIA: use `*validate-squad`.

## Pré-condições

- [ ] Pasta do squad existe e tem `squad.yaml` ou `config.yaml`
- [ ] Guia de autoria disponível (seções 4.1, 7, 8, 11 e 14)

## Passos

### 1. Resolver origem e destino

- Pasta dentro de `squads/`: a migração é no lugar.
- Pasta fora de `squads/` (ex.: outro projeto): copie para `squads/{nome}/` e migre a cópia; a origem não é tocada.
- `{nome}`: o `name` do manifest em kebab-case ou, sem ele, o nome da pasta.

### 2. Analisar

Monte a lista de problemas (severidade erro, aviso ou informação) e a lista de ações planejadas, sem alterar nada.

**Manifest**

| No AIOX | No SIA | Ação |
|---------|--------|------|
| `config.yaml` como manifest | renomear para `squad.yaml` | RENAME_MANIFEST |
| bloco `pack:` (config legado por tier) | levar `name`, `version`, `author`, `description` e `slash_prefix` para a raiz (`slashPrefix`); agentes listados por tier viram `components.agents`, e o tier vai para a seção `## Colaboração` de cada agente | UPDATE_FIELD |
| bloco `aiox:` (`minVersion`, `type`) | `sia: { minVersion: {sia.version do core-config} }`; `type` sai | UPDATE_FIELD |
| `requires.aiox` | `requires.sia` (ex.: `>=1.0.0`) | UPDATE_FIELD |
| `name` ausente | inferir do nome da pasta | ADD_FIELD |
| `version` ausente | `1.0.0` | ADD_FIELD |
| `keywords` | renomear para `tags` | UPDATE_FIELD |
| `dependencies` como lista | `{ node: [], python: [], squads: [] }` | UPDATE_FIELD |
| `components` com globs (`agents/*.yaml`) | nomes reais dos arquivos | UPDATE_FIELD |
| `components.tools` e pasta `tools/` | `components.scripts` e pasta `scripts/` | MOVE_FILE |
| `config` apontando para `docs/framework/` | `docs/architecture/{arquivo}` se existir; senão, `config/{arquivo}` | UPDATE_FIELD |
| `mcps` ou `integration` | manter e avisar: configuração de MCP é do `@devops` (`*setup-mcp`) | informação |

**Estrutura:** sem `tasks/` ou `agents/` (estrutura plana), crie as pastas e mova cada arquivo para a pasta do seu tipo (CREATE_DIRECTORIES, MOVE_FILE).

**Agentes** (CONVERT_AGENT), para o formato da seção 7 do guia:

- Agente em `.yaml` (`name`, `persona`, `capabilities`, `commands`, `system_prompt`): gere o `.md` a partir de `templates/agent-tmpl.md`, levando o `system_prompt` para persona e princípios.
- Agente em `.md`: mantenha o bloco YAML e ajuste: `IDE-FILE-RESOLUTION` com a resolução de squad (`squads/{nome}/{type}/`, depois `.sia-core/{type}/`); `activation-instructions` iguais às do template; comandos no formato compacto (`- help: descrição`) viram objetos com `name`, `description`, `visibility` e `task`; `dependencies.tools` sai (não é tipo do SIA).
- Referências a agentes e personas do AIOX: aplique a tabela 4.1 do guia de autoria. Agente do próprio squad mantém o id.
- Remova tudo o que a seção 14.1 do guia lista: `autoClaude`, IDS e registro de entidades, code intelligence, SYNAPSE, CodeRabbit, ClickUp, `zodiac`, scripts de ativação e `require` de módulos do `.aiox-core`.

**Tasks** (CONVERT_TASK), do "AIOX Task Format" para a seção 8 do guia:

| No AIOX | No SIA |
|---------|--------|
| nome do arquivo | `id` (sem `.md`, kebab-case) |
| `task:` ou primeiro título | `title` |
| `responsavel` / `responsável` | `agent` sem `@` (agente do AIOX pela tabela 4.1; agente do squad mantém o id); `hat` quando o resultado for `pm` ou `dev` |
| `elicit` | `elicit` (padrão `false`) |
| bloco "Execution Modes" | `modes: [yolo, interactive, preflight]` e uma seção `## Modos` curta |
| `Entrada` (campo, tipo, origem, regras) | `inputs`, no formato `'nome (obrigatório ou opcional): descrição'` |
| `Saida` | `outputs` |
| `Checklist` do frontmatter | base dos `## Passos` (quando o corpo não tem passos) ou `## Critérios de conclusão` |
| pré-condições reais | `## Pré-condições` |
| "Error Handling" | `## Tratamento de erros`, em tabela |
| templates, checklists e tasks citados | `depends_on` (só os que existem) |
| não existe | `source: [{arquivo original}]`, `next: []`, seções `## Objetivo`, `## Saída` e `## Handoff` |

Remova: bloco "Task Definition (AIOX Task Format V1.0)", Pre-Conditions, Post-Conditions e Acceptance Criteria genéricos, "Tools", "Scripts", "Performance", "Metadata", "Step 0: IDS Registry Check", blocos de code intelligence e chamadas `require(...)` (troque por comando `sia` quando houver equivalente).

**Workflows** (CONVERT_WORKFLOW), para a seção 11 do guia:

- `steps:` ou `phases:` sem `sequence` viram `sequence`.
- `agent:` do AIOX pela tabela 4.1; agente do squad mantém o id.
- `task:` do AIOX: procure em `.sia-core/tasks/` a task cujo `source:` contém o nome original e use o nome do SIA. Task do squad mantém o nome. Sem correspondência: problema de severidade erro.

**Textos:** instruções e descrições em inglês ficam como pendência de tradução (guia, seção 2).

### 3. Mostrar a análise

Mostre o relatório de análise (ver Saída). Nada a migrar: informe que o squad já está no formato do SIA e siga para `*validate-squad {nome}`.

### 4. Dry-run

Com `--dry-run`, mostre cada ação com a prévia (diff do manifest e de uma task convertida) e pare. Nada é gravado.

### 5. Confirmar

**Ponto de elicitação:** {n} ações planejadas.

1. Migrar tudo
2. Migrar só o manifest e a estrutura (agentes, tasks e workflows ficam como pendência)
3. Cancelar

### 6. Fazer o backup

Copie o squad inteiro para `.sia/backups/{AAAAMMDD-HHmmss}/squads/{nome}/` antes de qualquer mudança. Falha: `BACKUP_FAILED`, pare.

### 7. Executar as ações

Na ordem: RENAME_MANIFEST, CREATE_DIRECTORIES, MOVE_FILE, ADD_FIELD e UPDATE_FIELD, CONVERT_AGENT, CONVERT_TASK, CONVERT_WORKFLOW. Registre o resultado de cada ação. Falha: `MIGRATION_FAILED`, pare e ofereça a restauração do backup.

### 8. Validar

```bash
sia validate --squad {nome}
# sem sia no PATH: node .sia-core/cli/sia.js validate --squad {nome}
```

Problemas restantes entram no relatório como `VALIDATION_FAILED` (aviso), com a correção sugerida.

### 9. Entregar o relatório final

Ações executadas, backup, resultado da validação e pendências: textos a traduzir, referências sem correspondência, MCPs para o `@devops`, scripts para revisão do `@dev`.

## Saída

```text
═══════════════ MIGRAÇÃO DE SQUAD ═══════════════
Squad: squads/marketing-legado/
Precisa migrar: sim

PROBLEMAS
  ⚠️ [AVISO] Usa o manifest obsoleto config.yaml
  ⚠️ [AVISO] Faltam as pastas task-first: tasks, agents
  ❌ [ERRO] Bloco aiox: no lugar de sia:
  ❌ [ERRO] 4 tasks no AIOX Task Format

AÇÕES PLANEJADAS
  1. Renomear config.yaml → squad.yaml
  2. Criar as pastas tasks/ e agents/
  3. Trocar aiox: por sia: { minVersion: 1.0.0 }
  4. Converter 4 tasks e 2 agentes

RESULTADO
  Status: ✅ concluída
  Backup: .sia/backups/20261016-143000/squads/marketing-legado/
  Validação: VALID (com 2 avisos)
  Pendências: traduzir 3 descrições; revisar scripts/importar.js com o @dev
═════════════════════════════════════════════════
```

Restauração, se o resultado não servir:

```bash
rm -rf squads/{nome}
cp -R .sia/backups/{AAAAMMDD-HHmmss}/squads/{nome} squads/{nome}
sia validate --squad {nome}
```

## Critérios de conclusão

- [ ] Manifest válido em `schemas/squad-schema.json`, sem bloco `aiox:` e sem `requires.aiox`
- [ ] Agentes, tasks e workflows nos formatos das seções 7, 8 e 11 do guia (ou listados como pendência, na opção 2)
- [ ] Nenhuma referência a agente do AIOX sem mapeamento
- [ ] Backup feito antes da primeira mudança
- [ ] Relatório final com pendências entregue

## Tratamento de erros

| Código | Situação | Ação |
|--------|----------|------|
| `SQUAD_NOT_FOUND` | pasta inexistente | peça o caminho certo |
| `INVALID_PATH` | caminho inválido ou com `..` fora do projeto sem confirmação | peça confirmação explícita da origem |
| `NO_MANIFEST` | sem `config.yaml` e sem `squad.yaml` | pare; sugira `*create-squad` e mover os arquivos |
| `BACKUP_FAILED` | backup não gravado | pare; nada é alterado |
| `MIGRATION_FAILED` | ação falhou | pare; ofereça a restauração do backup |
| `VALIDATION_FAILED` | problemas após a migração | aviso no relatório, com as correções |

## Handoff

Próximo passo: `@squad-creator *validate-squad {nome}`, depois `*analyze-squad {nome}` e `*sync-ide`.
