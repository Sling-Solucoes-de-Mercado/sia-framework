---
description: Protocolo de handoff entre agentes do SIA (compactação de contexto, .sia/handoffs/, last_command e consumed) e consolidação em RUN-LOG
---

# Handoff entre Agentes

## Objetivo

Evitar acúmulo de contexto na troca de agentes. O agente que sai deixa um artefato curto (cerca de 400 tokens) em vez de manter a persona inteira (3 a 5 mil tokens), e o agente que entra sabe qual é o próximo passo.

## Quando gravar

1. Ao concluir um comando que encerra uma etapa de workflow (ex.: `*create-story`, `*validate-story`, `*develop`, `*revisar-feature`, `*qa-gate`, `*create-pr`).
2. Na troca de agente (`@agente` ou ativação pela IDE) com outro agente já ativo na sessão.

## Arquivo

- Local: `.sia/handoffs/` (runtime, não versionado).
- Nome: `handoff-{de}-para-{para}-{AAAAMMDD-HHmmss}.yaml` (ex.: `handoff-dev-para-validator-20261016-143000.yaml`).
- Campos: template `templates/agent-handoff-tmpl.yaml`. Os essenciais:

```yaml
handoff:
  timestamp: '2026-10-16T14:30:00-03:00'
  from_agent: dev
  to_agent: validator
  last_command: develop         # nome do comando concluído, sem * e sem argumentos
  consumed: false               # true depois que o agente seguinte exibe a sugestão
  story_context:
    story_id: '2.1'
    story_path: docs/stories/2.1-login-social.story.md
    story_status: InReview
    current_task: Implementação concluída
    branch: feat/2.1-login-social
  decisions: []                 # até 5
  files_modified: []            # até 10
  blockers: []                  # até 3
  next_action: '@validator *revisar-feature 2.1'
```

## Agente que entra

1. Na ativação (PASSO 4, item 5.5), lê o handoff mais recente com `consumed` diferente de `true`.
2. Com `from_agent` e `last_command` (nome do comando; o storyId vem de `story_context`), procura o próximo passo em `data/workflow-chains.yaml` e mostra a sugestão, com as alternativas.
3. Depois de exibir a saudação, grava `consumed: true` no mesmo arquivo.
4. Carrega o próprio perfil completo e o handoff; nunca a persona, os comandos ou as dependências do agente anterior.

## Limites de compactação

| Limite | Valor |
|--------|-------|
| Tamanho do artefato | até 500 tokens |
| Resumos de agentes mantidos na sessão | 3 (o mais antigo sai na 4ª troca) |
| `decisions` | até 5 |
| `files_modified` | até 10 |
| `blockers` | até 3 |
| `next_action` | até 2 frases |

**Preservar sempre:** storyId e caminho da story ativa, status atual, task em andamento, branch, decisões de arquitetura e de processo, arquivos criados ou modificados, bloqueios ativos e o próximo passo (agente e comando).

**Descartar sempre:** persona, lista de comandos, dependências, saudação e configuração de ferramentas do agente anterior.

## Consolidação em RUN-LOG

Pipelines longos (epics de muitas sessões) acumulam handoffs. Os antigos viram um RUN-LOG por pipeline.

### Gatilho

| Handoffs do mesmo pipeline | Ação |
|----------------------------|------|
| 1 a 4 | manter os arquivos individuais |
| 5 ou mais | DEVE consolidar os antigos no RUN-LOG |
| a cada 5 novos | consolidar de novo |

Pipeline: campo `pipeline_id` do handoff, quando existir; senão, o epic de `story_context.story_id` (o `{epic}` de `{epic}.{story}`).

### Local

| Pipeline | RUN-LOG |
|----------|---------|
| Ligado a um epic | `docs/prd/epic-{n}-run-log.md` |
| Entre epics ou sem epic | `docs/runlogs/{pipeline}-run-log.md` |
| Do próprio framework (`.sia-core`, squads) | `.sia/run-logs/{pipeline}-run-log.md` |

### Seção por onda

Acrescente uma seção por handoff consolidado:

```markdown
## Onda {N}: {objetivo} ({AAAA-MM-DD})

**Status:** concluída | bloqueada | parcial
**Sessão:** {id ou hash} · **Agente:** {agente principal} · **Esforço:** {horas}

### Entregue
- {arquivos criados ou modificados}
- {critérios de aceite concluídos, com ids}

### Decisões
- {decisão, com link para o ADR quando houver}

### Bloqueios resolvidos
- {o que foi destravado}

### Pendências para a próxima onda
- {itens em aberto que não bloqueiam}

### Handoff original
Arquivado em `.sia/handoffs/_archive/{pipeline}/{arquivo}.yaml`
```

### Arquivar ou apagar

- Padrão: arquivar os originais em `.sia/handoffs/_archive/{pipeline}/`.
- Apagar só com autorização explícita do dono do pipeline e quando o RUN-LOG cobre tudo o que importa.
- Depois, atualize o epic (ou o índice do pipeline) para apontar para o RUN-LOG em vez dos handoffs individuais.

### O RUN-LOG nunca perde

- contexto estratégico (por que o pipeline existe)
- decisões de arquitetura, com link para os ADRs
- bloqueios resolvidos, para não serem investigados de novo
- mudanças de schema e migrations aplicadas em produção
- pendências que a próxima sessão precisa tratar
- arquivos criados ou modificados por onda (caminhos, não conteúdo)

**Pode descartar:** passos de investigação (fica a conclusão), alternativas rejeitadas já decididas, sequências de chamadas de ferramenta (fica o resultado) e contexto repetido que já está no plano ou nos ADRs.

### Regras

- O handoff mais recente de um pipeline ativo continua individual: é o que a próxima sessão lê primeiro. O RUN-LOG é para ondas encerradas.
- Qualquer agente consolida ao atingir o gatilho; nenhum apaga originais sem autorização.
- NÃO DEVE: consolidar o handoff ativo, perder resolução de bloqueio no resumo, omitir a referência ao ADR, consolidar antes do gatilho ou misturar pipelines no mesmo RUN-LOG.
- Handoffs antigos que já passaram do gatilho são consolidados na próxima oportunidade; handoff avulso, sem pipeline, não precisa de consolidação.
