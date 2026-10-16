---
id: modify-task
title: Modificar uma task
agent: squad-creator
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'id (obrigatório): task em .sia-core/tasks/ ou squads/{nome}/tasks/'
  - 'mudança (obrigatório): intenção (ex.: "adicionar passo de validação") ou alterações específicas'
  - 'modo (opcional): yolo, interactive ou preflight (padrão: interactive)'
outputs:
  - 'Task atualizada, com backup em .sia/backups/{AAAAMMDD-HHmmss}/'
  - 'Relatório: uso, diff, compatibilidade, validação e como desfazer'
depends_on:
  data: [sia-authoring-guide.md, workflow-chains.yaml]
next: [validate-framework, sync-ide]
source: [modify-task.md]
---

# Modificar uma task

## Objetivo

Alterar uma task existente sem quebrar o fluxo, a elicitação, o formato de saída nem quem a usa, com análise de uso, backup, diff aprovado, validação e projeção.

## Quando usar

- Passo novo, validação nova, saída nova ou ajuste de elicitação numa task.
- Correção de achado do `*validate-framework` numa task.
- Não use para criar task: `*create-task`.

## Pré-condições

- [ ] Task existe
- [ ] Mudança descrita (intenção ou alterações)
- [ ] Mudança numa regra de processo do SIA (gate, transição de status, limite numérico): story do `@pm`

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO | 1 pergunta: a aprovação do diff | Analisa e prepara tudo sem checkpoints intermediários |
| Interativo (padrão) | checkpoints nos passos 2, 8 e 9 | Confirma uso, compatibilidade e diff |
| Pre-Flight | todas as perguntas antes | Esclarece intenção, pontos de inserção e compatibilidade; depois executa |

A aprovação explícita do diff (passo 9) vale em todos os modos.

## Passos

### 1. Carregar e analisar

Leia a task inteira e registre: frontmatter, objetivo, pré-condições, passos, pontos de elicitação, formato de saída e integrações (tasks chamadas, templates, checklists, comandos `sia`).

### 2. Analisar o uso

```bash
grep -rn "{id}.md" .sia-core squads
grep -rn "*{comando}" .sia-core squads      # comandos que executam a task
```

| Consumidor | Onde |
|------------|------|
| Agentes | `task: {id}.md` em comandos e `dependencies.tasks` |
| Workflows | `task: {id}.md` nas etapas |
| Cadeias | `task: {id}.md` em `data/workflow-chains.yaml` |
| Skills | "Task fonte da verdade" em `.sia-core/skills/*/SKILL.md` |
| Outras tasks | `depends_on.tasks` e chamadas no texto ("rode a task ...") |
| CLI | formatos da seção 6.2 do guia, lidos por `sia story status` e `sia sdc verify` |

Documente cada ponto de uso.

**Ponto de elicitação (com consumidores):** {n} pontos de uso. 1. Seguir 2. Reduzir a mudança 3. Cancelar

### 3. Fazer o backup

Copie o arquivo para `.sia/backups/{AAAAMMDD-HHmmss}/{caminho do arquivo}`. Falha: `BACKUP_FAILED`; pare sem alterar nada.

### 4. Traduzir a intenção em mudanças

Intenção de alto nível: analise o fluxo atual, escolha o ponto de inserção e preserve o que já funciona. Alterações específicas: confira que não quebram o fluxo, a elicitação, o formato de saída e as integrações.

### 5. Preservar a elicitação

Com `elicit: true`: mantenha os pontos de elicitação, as opções numeradas e os blocos `[[LLM: ...]]`; os prompts continuam claros e o tratamento das respostas, coerente. O valor de `elicit` continua refletindo a interação real.

### 6. Gerar o diff

```diff
@@ Task: generate-proposal @@
@@ ## Passos @@
   ### 2. Montar a proposta
+  ### 3. Validar a margem
+  Confira a margem mínima da política comercial; abaixo dela, pare e peça aprovação.
-  ### 3. Entregar
+  ### 4. Entregar
@@ ## Saída @@
+  - **Margem:** {percentual} (aprovada por {responsável}, quando abaixo do mínimo)
```

### 7. Validar a mudança

- Frontmatter (seção 8.1): `id` igual ao nome do arquivo, `agent`, `hat` quando pm ou dev, `elicit` booleano, `depends_on` existente, `next` com comandos existentes
- Seções fixas (seção 8.2) e passos numerados em ordem, sem passo órfão
- Exemplos de saída em YAML ou JSON válidos
- Formato lido pela CLI (seção 6.2) intacto, salvo mudança coordenada com a CLI numa story do `@pm`

### 8. Conferir a compatibilidade

- Entradas existentes continuam aceitas
- Saídas novas entram como acréscimo
- A task funciona com os parâmetros antigos, e o uso legado é tratado

Quebra inevitável: escreva o guia de migração (o que muda para agentes, workflows e skills) e atualize os consumidores no passo 10.

### 9. Aprovar

**Ponto de elicitação:** mostre o resumo, o diff, o impacto (agentes e workflows afetados, capacidades novas, notas de compatibilidade) e o guia de migração, se houver.

1. Aplicar
2. Ajustar
3. Cancelar

### 10. Aplicar

Grave a task de uma vez. Atualize a documentação dos consumidores: descrição e `args` do comando no agente, notas das etapas de workflow e skills. Commit e push seguem o fluxo normal do projeto (push só com o `@devops`).

### 11. Ensaiar e validar

Percorra a task com um caso real, com os parâmetros antigos e com os novos, e confirme que os passos levam à saída esperada e que os critérios de conclusão fecham. Depois:

```bash
sia validate                    # ou sia validate --squad {nome}
sia sync
# sem sia no PATH: node .sia-core/cli/sia.js {comando}
```

### 12. Desfazer, se preciso

Ensaio ou validação falhou sem correção simples, ou o usuário pediu: restaure o backup, desfaça as mudanças nos consumidores, rode `sia validate` e `sia sync` e registre o motivo.

## Saída

```text
=== Modificação de task ===
Task: generate-proposal | Data: 2026-10-16T14:30:00-03:00
Backup: .sia/backups/20261016-143000/squads/vendas-b2b/tasks/generate-proposal.md

Uso: 1 agente (closer, *proposta), 1 workflow (closing.yaml), 0 skills
Mudanças:
  ✓ passo novo: Validar a margem
  ✓ saída com o campo Margem (acréscimo)
Compatibilidade: parâmetros antigos aceitos; nenhuma quebra
Validação: ✓ ensaio com caso real | ✓ sia validate sem erros | ✓ sia sync
Para desfazer: restaure o backup e rode sia validate e sia sync
```

## Critérios de conclusão

- [ ] Pontos de uso levantados e consumidores atualizados quando necessário
- [ ] Backup feito antes da mudança
- [ ] Elicitação e formato de saída preservados (ou migração documentada)
- [ ] Diff aprovado explicitamente
- [ ] Ensaio feito, `sia validate` sem erros e `sia sync` executado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Task não encontrada | Verifique id e caminho; sugira ids parecidos |
| Fluxo quebrado (passo órfão, numeração) | Mostre o conflito entre os passos e corrija antes de aplicar |
| Elicitação inválida | Aponte o ponto sem opções numeradas ou sem tratamento de resposta |
| Formato da seção 6.2 alterado | Pare; mudança só coordenada com a CLI, numa story do `@pm` |
| Quebra de compatibilidade | Escreva o guia de migração e atualize os consumidores |
| Ensaio falhou | Mostre o cenário que falhou; corrija ou desfaça |

## Handoff

Próximo passo: `@squad-creator *validate-framework` e `*sync-ide` (se já não rodaram no passo 11).
