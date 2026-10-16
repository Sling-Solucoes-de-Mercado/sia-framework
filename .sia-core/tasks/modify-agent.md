---
id: modify-agent
title: Modificar um agente
agent: squad-creator
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'id (obrigatório): agente em .sia-core/agents/ ou squads/{nome}/agents/'
  - 'mudança (obrigatório): intenção (ex.: "adicionar comando de desconto") ou alterações específicas'
  - 'modo (opcional): yolo, interactive ou preflight (padrão: interactive)'
outputs:
  - 'Agente atualizado, com backup em .sia/backups/{AAAAMMDD-HHmmss}/'
  - 'Relatório: impacto, diff, validação e como desfazer'
depends_on:
  tasks: [execute-checklist.md]
  checklists: [agent-quality-gate.md]
  data: [sia-authoring-guide.md, workflow-chains.yaml]
next: [validate-framework, sync-ide]
source: [modify-agent.md]
---

# Modificar um agente

## Objetivo

Alterar um agente existente com segurança: análise de impacto, backup, diff aprovado, validação e projeção, preservando o formato do guia de autoria (seção 7) e quem depende do agente.

## Quando usar

- Comando, chapéu ou dependência nova; ajuste de persona ou de autoridade.
- Correção de achado do `*validate-framework` num agente.
- Não use para criar agente: `*create-agent`.

## Pré-condições

- [ ] Agente existe
- [ ] Mudança descrita (intenção ou alterações)
- [ ] Mudança grande num agente do framework (chapéu novo, autoridade): story do `@pm`

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO | 1 pergunta: a aprovação do diff | Analisa e prepara tudo sem checkpoints intermediários |
| Interativo (padrão) | checkpoints nos passos 2, 4 e 8 | Confirma impacto, mudanças derivadas e diff |
| Pre-Flight | todas as perguntas antes | Esclarece intenção, escopo e consumidores; depois executa |

A aprovação explícita do diff (passo 8) vale em todos os modos.

## Passos

### 1. Carregar e analisar

Localize `.sia-core/agents/{id}.md` ou `squads/{nome}/agents/{id}.md` (o mesmo id em mais de um lugar: pergunte qual). Leia o bloco YAML e as seções de apoio e extraia: metadados (name, id, title, icon, whenToUse), chapéus, comandos, dependências, persona, autoridade e `customization`.

### 2. Analisar o impacto

Procure quem referencia o agente e confira cada resultado (o id pode aparecer dentro de outro nome):

```bash
grep -rn "@{id}" .sia-core squads
grep -rn "agent: {id}" .sia-core squads
```

| Consumidor | Onde | O que pode quebrar |
|------------|------|--------------------|
| Workflows | `agent: {id}` em `.sia-core/workflows/` e `squads/*/workflows/` | etapa com comando ou chapéu removido |
| Cadeias | agente e comandos em `data/workflow-chains.yaml` | sugestão de próximo comando na saudação |
| Skills | `agent: {id}` em `.sia-core/skills/*/SKILL.md` | skill que aciona comando removido |
| Tasks | `agent: {id}` no frontmatter; comandos do agente em `next:` | task órfã ou sugestão inválida |
| Outros agentes | `delegates`, `## Colaboração`, `REQUEST-RESOLUTION` | delegação para comando inexistente |
| Regras e documentos | `.sia-core/rules/`, `constitution.md` (Artigo II), guia de autoria (seção 4), `user-guide.md` | autoridade ou tabela desatualizada |
| Hooks | `.sia-core/hooks/` (ex.: autoridade de push do `devops`) | bloqueio indevido |

Risco: baixo (sem consumidores ou só acréscimo), médio (consumidores afetados por mudança compatível), alto (remove ou renomeia comando, chapéu ou id em uso, ou mexe em autoridade). Médio ou alto: avise "Esta mudança afeta {n} consumidores" e liste.

**Ponto de elicitação (risco médio ou alto):**

1. Seguir e atualizar os consumidores
2. Reduzir a mudança
3. Cancelar

### 3. Fazer o backup

Copie o arquivo para `.sia/backups/{AAAAMMDD-HHmmss}/{caminho do arquivo}`. Falha: `BACKUP_FAILED`; pare sem alterar nada.

### 4. Traduzir a intenção em mudanças

Intenção de alto nível: analise as capacidades atuais e derive dependências novas, comandos, chapéu, ajustes de persona e de documentação (Comandos rápidos, Colaboração, Guia). Alterações específicas: valide o formato e procure conflitos (comando duplicado, chapéu inexistente).

- Autoridade segue a Constitution, Artigo II: push, PR, release e deploy só no `devops`. Mudança que contraria a Constitution exige emenda (processo descrito nela) e não é aplicada aqui.
- Agente consolidado: comando novo declara `hat:`; chapéu novo tem id, name, mindset e commands.
- Mudança que reescreve a maior parte do agente: avalie `*create-agent`.

**Ponto de elicitação:** mostre a lista de mudanças derivadas. 1. Seguir 2. Ajustar

### 5. Resolver as dependências

Cada dependência nova existe (em squad: no squad primeiro, depois no `.sia-core/`) e entra no tipo certo (tasks, templates, checklists, data, workflows, schemas). Todo `task:`, `template:` e `checklist:` de comando entra em `dependencies`. Dependência inexistente: crie antes (`*create-task`) ou remova.

### 6. Gerar o diff

```diff
@@ Agente: closer @@
@@ dependencies.tasks @@
   - generate-proposal.md
+  - negotiate-discount.md
@@ commands @@
+  - name: desconto
+    task: negotiate-discount.md
+    visibility: [full, quick]
+    description: 'Negocia desconto dentro da política comercial'
@@ persona @@
-  focus: Fechar propostas
+  focus: Fechar propostas e negociar condições
```

### 7. Validar antes de aplicar

- YAML válido e estrutura da seção 7 do guia
- Dependências existem e comandos no formato certo
- Nenhum comando removido ou renomeado ainda referenciado (lista do passo 2), salvo se os consumidores forem atualizados no passo 9
- Compatível com `agent.customization`
- Chapéus e comandos coerentes entre si

### 8. Aprovar

**Ponto de elicitação:** mostre o resumo, o diff, o impacto (capacidades novas, conflitos, dependências introduzidas, consumidores) e como desfazer.

1. Aplicar
2. Ajustar
3. Cancelar

### 9. Aplicar

Grave o agente de uma vez (tudo ou nada). Atualize os consumidores do passo 2: workflows, cadeias, skills, delegações e tabelas de documentação. Commit e push seguem o fluxo normal do projeto (push só com o `@devops`).

### 10. Validar depois

```bash
sia validate                    # ou sia validate --squad {nome}
sia sync
# sem sia no PATH: node .sia-core/cli/sia.js {comando}
```

Mudança grande (chapéu, persona, vários comandos): rode a task `execute-checklist.md` com `checklists/agent-quality-gate.md`. Depois do sync, confira na IDE: o agente ativa, a saudação aparece, `*help` lista os comandos novos e cada um carrega a sua task.

### 11. Desfazer, se preciso

Validação com erro sem correção simples, ou pedido do usuário: restaure o arquivo do backup, desfaça as mudanças nos consumidores, rode `sia validate` e `sia sync` e registre o motivo.

## Saída

```text
=== Modificação de agente ===
Agente: closer | Data: 2026-10-16T14:30:00-03:00
Backup: .sia/backups/20261016-143000/squads/vendas-b2b/agents/closer.md
Impacto: 2 consumidores (workflows/closing.yaml, tasks/follow-up.md), risco médio

Mudanças:
  ✓ 1 dependência nova (negotiate-discount.md)
  ✓ 1 comando novo (*desconto)
  ✓ persona.focus atualizado

Validação:
  ✓ YAML válido | ✓ dependências existem | ✓ consumidores atualizados
  ✓ sia validate --squad vendas-b2b sem erros | ✓ sia sync

Para desfazer: restaure o backup e rode sia validate e sia sync
```

## Critérios de conclusão

- [ ] Impacto analisado e consumidores afetados atualizados
- [ ] Backup feito antes da mudança
- [ ] Diff aprovado explicitamente
- [ ] Agente segue a seção 7 do guia e respeita a Constitution, Artigo II
- [ ] `sia validate` sem erros e `sia sync` executado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Agente não encontrado | Verifique id e caminho; sugira ids parecidos ou `*create-agent` |
| YAML inválido | Mostre a linha e a correção |
| Dependência inexistente | Liste os arquivos que faltam |
| `BACKUP_FAILED` | Pare sem alterar |
| Arquivo mudou desde a leitura | Releia, refaça o diff e peça aprovação de novo |
| Validação falha depois de aplicar | Desfaça pelo passo 11 |

## Handoff

Próximo passo: `@squad-creator *validate-framework` e `*sync-ide` (se já não rodaram no passo 10).
