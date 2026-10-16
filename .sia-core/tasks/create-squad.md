---
id: create-squad
title: Criar um squad
agent: squad-creator
elicit: true
modes: [yolo, interactive]
inputs:
  - 'nome (obrigatório): kebab-case, 2 a 50 caracteres; sem nome, a task pergunta'
  - '--from-design (opcional): caminho do blueprint gerado por *design-squad'
  - '--description, --author, --license, --template, --config-mode (opcionais): ver Parâmetros'
  - '--skip-validation (opcional): pula a validação inicial'
  - '--yes (opcional): usa os padrões sem perguntar (modo YOLO)'
outputs:
  - 'squads/{nome}/ com squad.yaml, README.md, config/, agents/, tasks/ e pastas vazias com .gitkeep'
  - 'Resultado de sia validate --squad {nome}'
depends_on:
  templates: [squad/, agent-tmpl.md, task-tmpl.md]
  data: [sia-authoring-guide.md]
  schemas: [squad-schema.json]
next: [validate-squad, extend-squad, sync-ide]
source: [squad-creator-create.md]
---

# Criar um squad

## Objetivo

Criar `squads/{nome}/` a partir do esqueleto `templates/squad/`, com manifest válido em `schemas/squad-schema.json`, agentes e tasks no formato do SIA e validação inicial.

## Quando usar

- Novo domínio de trabalho que pede agentes e tasks próprios (vendas, conteúdo, atendimento).
- Depois de `*design-squad`, com `--from-design`.
- Não use para acrescentar componentes a um squad existente: use `*extend-squad`.

## Pré-condições

- [ ] Nome em kebab-case que ainda não existe em `squads/`
- [ ] Com `--from-design`: blueprint existente, com YAML válido

## Parâmetros

| Parâmetro | Padrão | Valores |
|-----------|--------|---------|
| `nome` | pergunta | `^[a-z][a-z0-9-]*[a-z0-9]$`, 2 a 50 caracteres |
| `--description` | `Squad {nome}` | até 500 caracteres |
| `--author` | `git config user.name` | texto |
| `--license` | `MIT` | MIT, Apache-2.0, ISC, GPL-3.0, UNLICENSED |
| `--template` | `basic` | basic, etl, agent-only |
| `--config-mode` | `extend` | extend, override, none |

| Template | Componentes |
|----------|-------------|
| `basic` | 1 agente (`example-agent`) e 1 task (`example-task`) |
| `etl` | 2 agentes (`data-extractor`, `data-transformer`), 3 tasks (`extract-data`, `transform-data`, `load-data`) e `scripts/` para o `@dev` |
| `agent-only` | 2 agentes (`primary-agent`, `helper-agent`), sem tasks |

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO (`--yes` ou `--from-design`) | 0 a 1 pergunta | Usa os padrões ou os valores do blueprint; só pergunta o nome se faltar |
| Interativo (padrão) | 7 perguntas | Elicita cada opção do passo 3 |

## Passos

### 1. Validar o nome

Nome ausente: pergunte. Rejeite nome fora do padrão (`INVALID_NAME`), com `/`, `\` ou `..`, começando com ponto ou já existente em `squads/` (`SQUAD_EXISTS`).

### 2. Carregar o blueprint (com `--from-design`)

Leia o blueprint e confira `squad.name`, `recommendations.agents` e `recommendations.tasks`. Use `template`, `config_mode`, agentes e tasks do blueprint e pule a elicitação do passo 3.

### 3. Coletar a configuração

**Ponto de elicitação:** pergunte uma opção por vez, com o padrão entre parênteses:

1. Descrição
2. Autor (`git config user.name`)
3. Licença: 1. MIT 2. Apache-2.0 3. ISC 4. GPL-3.0 5. UNLICENSED
4. Template: 1. basic (estrutura mínima) 2. etl (processamento de dados) 3. agent-only (só agentes)
5. Incluir agente de exemplo? 1. Sim 2. Não
6. Incluir task de exemplo? 1. Sim 2. Não
7. Herança de configuração: 1. extend (soma às regras do projeto) 2. override (substitui) 3. none (sem herança)

A versão mínima do SIA é `sia.version` do `.sia-core/core-config.yaml`.

### 4. Gerar a estrutura

1. Copie `.sia-core/templates/squad/` para `squads/{nome}/`.
2. Substitua os placeholders documentados no comentário do `README.md` do esqueleto e remova os comentários de cabeçalho dos arquivos gerados. `{{SQUAD_SLASH_PREFIX}}` é o nome sem o sufixo `-squad`.
3. Configuração:
   - `none`: remova o bloco `config` do `squad.yaml` e a pasta `config/`.
   - `extend` ou `override`: se o projeto tem `docs/architecture/coding-standards.md`, `tech-stack.md` e `source-tree.md` (os `devLoadAlwaysFiles` do core-config), aponte o `config` do `squad.yaml` para eles (`../../docs/architecture/{arquivo}`), troque os arquivos de `config/` por um `.gitkeep` e não crie cópias. Sem esses arquivos, mantenha os de `config/`.
4. Agentes e tasks conforme o template ou o blueprint:
   - Agente: a partir de `agents/example-agent.md`, ou de `templates/agent-tmpl.md` para agentes do blueprint, com id, papel e comandos próprios.
   - Task: a partir de `tasks/example-task.md`, ou de `templates/task-tmpl.md`, com `agent:` igual ao id do agente dono.
   - Todo comando operacional aponta para uma task listada em `dependencies.tasks` do agente.
   - Sem agente ou task de exemplo: remova os arquivos e as entradas em `components`.
5. Atualize `components` no `squad.yaml` com os nomes reais e mantenha `.gitkeep` nas pastas vazias.

Resolução de dependências nos agentes do squad: primeiro `squads/{nome}/{tipo}/`, depois `.sia-core/{tipo}/`.

### 5. Validar

Sem `--skip-validation`, rode:

```bash
sia validate --squad {nome}
# sem sia no PATH: node .sia-core/cli/sia.js validate --squad {nome}
```

Sem CLI, faça as verificações dos passos 3 a 8 da task `validate-squad.md`. Erros: corrija na hora e valide de novo. Avisos: mostre ao usuário.

### 6. Mostrar o resultado

```text
✅ Squad criado: squads/{nome}/

Próximos passos:
1. Personalize o squad.yaml e o README.md
2. Agentes: *create-agent (completo) ou *extend-squad {nome} --add agent
3. Tasks em tasks/ (task-first): *create-task ou *extend-squad {nome} --add task
4. Valide: *validate-squad {nome}
5. Projete nas IDEs: *sync-ide

Distribuição:
- Local: fica em squads/ (privado do projeto)
- Repositório de squads: *publish-squad {nome} (com squads.registry.repo configurado)
```

## Saída

`squads/{nome}/` com `squad.yaml` válido no schema, `README.md`, `config/` (ou referências aos documentos do projeto), agentes, tasks e pastas vazias com `.gitkeep`.

## Critérios de conclusão

- [ ] `squad.yaml` sem placeholders e válido em `schemas/squad-schema.json`
- [ ] Todo arquivo listado em `components` existe
- [ ] Agentes e tasks nos formatos do guia de autoria (seções 7 e 8)
- [ ] `sia validate --squad {nome}` sem erros (ou validação pulada a pedido)
- [ ] Próximos passos mostrados

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `INVALID_NAME` | Mostre o padrão e sugira um nome válido (ex.: `Meu Squad` → `meu-squad`) |
| `SQUAD_EXISTS` | Pare; sugira outro nome, `*extend-squad {nome}` ou remover o existente |
| `PERMISSION_DENIED` | Informe a pasta sem permissão de escrita |
| Blueprint inválido | Mostre o campo faltante; ofereça rodar `*design-squad` de novo ou seguir no modo interativo |
| `VALIDATION_FAILED` | Mostre os erros com a correção; corrija e valide de novo |

## Handoff

Próximo passo: `@squad-creator *validate-squad {nome}` e, depois, `*sync-ide`.
