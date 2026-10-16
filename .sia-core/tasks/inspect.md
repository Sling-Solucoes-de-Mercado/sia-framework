---
id: inspect
title: Inspecionar uma entrega
agent: validator
elicit: false
inputs:
  - 'comando: comando do @validator que acionou a task (revisar-feature, revisar-seguranca, revisar-todo, gaps, codigo-morto, regressao, revisar-arquitetura, logica ou falhas)'
  - 'escopo (opcional): storyId (ex.: 2.1), epic-*, caminho ou repositório; vazio = entrega recente pelo diff'
outputs:
  - 'docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md com frontmatter e veredito (aprovado, aprovado com ressalvas ou reprovado)'
  - '.sia/handoffs/handoff-validator-para-{pm|dev}-{AAAAMMDD-HHmmss}.yaml quando o escopo é uma story'
depends_on:
  templates: [inspection-report-tmpl.md, agent-handoff-tmpl.yaml]
  data: [inspection-lenses.md]
next: [qa-gate, apply-qa-fixes, qa-loop]
source: [../.validator/METHOD.md, ../.claude/skills/validator/SKILL.md]
---

# Inspecionar uma entrega

## Objetivo

Inspecionar uma entrega já implementada com as lentes do comando e gravar um relatório com achados verificáveis e um veredito (`aprovado`, `aprovado com ressalvas` ou `reprovado`) que alimenta o QA gate do `@pm`. A task não corrige nada: o relatório recomenda a correção e quem implementa aplica.

## Quando usar

- Fase de inspeção do SDC: story em `InReview`, via `*revisar-feature {storyId}`.
- Nova inspeção do QA Loop, depois de `@dev *apply-qa-fixes {storyId}`.
- Sob demanda: epic, caminho, branch atual ou repositório inteiro (`*revisar-todo repositório`).
- Não use para corrigir código, decidir o QA gate ou mudar status: isso é do `@dev` e do `@pm`.

Funciona em qualquer repositório. Se existir `docs/stories/`, a story é o pedido. Se não existir, o pedido é o que o diff e os testes mostram.

## Pré-condições

- [ ] O comando consta em `commands` de `.sia-core/agents/validator.md` com `task: inspect.md`.
- [ ] Há escopo: argumento ou repositório git. Sem os dois, pare e diga que falta o escopo.

## Limites

Valem em todos os passos. Violar qualquer um invalida a inspeção (veto):

| Veto | Regra |
|------|-------|
| Leitura | O veredito só sai depois de ler o diff ou os arquivos do escopo. |
| Evidência | Todo achado tem arquivo e evidência. |
| Pedido | Nenhum requisito inventado: só o que está no pedido ou no código. |
| Só revisão | Não edite código de produto, testes nem configuração; não rode `git add`, commit ou push; não mude status de story, issue ou PR. Os únicos arquivos gravados são o relatório e, quando há story, o handoff em `.sia/handoffs/`. |
| Segurança | Na lente de segurança, descreva o ponto do código e o impacto e pare. Sem exploit, payload, passo a passo de ataque ou pedido de ferramenta de ataque. |

## Passos

### 1. Resolver o comando

Execute na hora, sem pedir confirmação. Leia o comando em `.sia-core/agents/validator.md`: o campo `lenses` define as lentes aplicadas e `scope: estrutural` (só no `*revisar-todo`) alarga o escopo no passo 2. Se a tabela abaixo divergir do agente, vale o agente.

| Comando | Lentes | Escopo |
|---------|--------|--------|
| `*revisar-feature` | gaps, falhas, logica, regressao, seguranca, arquitetura, codigo-morto (nesta ordem) | padrão |
| `*revisar-seguranca` | seguranca | padrão |
| `*revisar-todo` | arquitetura, codigo-morto | estrutural |
| `*gaps` | gaps | padrão |
| `*codigo-morto` | codigo-morto | padrão |
| `*regressao` | regressao | padrão |
| `*revisar-arquitetura` | arquitetura | padrão |
| `*logica` | logica | padrão |
| `*falhas` | falhas | padrão |

`#comando`, `*comando` e `/comando` são o mesmo comando, com ou sem acento (`#revisar-segurança` = `*revisar-seguranca`; `#código-morto` = `*codigo-morto`). No relatório, use sempre o nome sem acento e sem prefixo.

### 2. Fechar o escopo (fase 1)

Use o primeiro caso que existir:

1. **storyId** (`2.1` ou `2.1-login-social.story.md`) e `docs/stories/` presente: leia a story. O conjunto é a File List da story mais o diff desses caminhos.
2. **`epic-*`** e epics presentes (`docs/prd/epic-{n}-*.md`): leia o epic e as stories ligadas. O conjunto é a união das File Lists e o diff dos caminhos citados.
3. **Caminho** de diretório ou arquivo: esse caminho é o limite.
4. **Sem argumento:**
   - inclua `git status`, `git diff` e `git diff --cached`;
   - com a árvore limpa, ache a base com `git merge-base HEAD origin/main` (ou `git merge-base HEAD main`) e use `git diff <base>...HEAD` e `git log --oneline <base>..HEAD`;
   - em `main` com a árvore limpa, use o último commit cujo assunto aponta uma story ou uma feature; se não houver, use o último commit e declare isso no relatório.
5. Sem repositório git e sem argumento: pare (pré-condição).

**Escopo estrutural (`*revisar-todo`):** alargue o conjunto para os diretórios dos arquivos tocados mais um nível de import compartilhado. Linhas fora do diff entram nas lentes de arquitetura e de código morto. Liste esses diretórios no relatório.

**`*revisar-todo repositório`** (pedido explícito do repositório inteiro): inspecione os pontos de entrada, a pasta de bibliotecas compartilhadas, autenticação e acesso a dados. Pastas de feature não tocadas entram só como leitura da responsabilidade da pasta. Declare no relatório que não houve leitura linha a linha.

Anote para o relatório: commits, arquivos, diretórios além do diff e o que ficou fora do escopo, com o motivo.

### 3. Ler o pedido (fase 2)

Quando existir, leia o pedido: story (Story, Critérios de Aceite, Escopo, Tasks / Subtasks, File List), epic, PRD ou issue. Em nova inspeção da mesma story, o relatório anterior e o `### Pedido de correção` de `## Resultado do QA` também fazem parte do pedido. Não invente requisito ausente do pedido e do código.

### 4. Ler o diff e montar os símbolos alterados (fase 3)

Leia o diff do escopo inteiro. Liste os símbolos alterados: funções, componentes, actions, tipos exportados, policies e rotas.

### 5. Buscar chamadores fora do diff (fase 4)

Para cada símbolo, busque o nome no repositório fora do arquivo da definição (busca nativa da IDE ou `grep`). Guarde a busca usada: ela é parte da evidência.

### 6. Aplicar as lentes do comando (fase 5)

Aplique só as lentes do comando, na ordem da tabela do passo 1. O que procurar em cada lente, as âncoras de severidade e o que não marcar estão em `.sia-core/data/inspection-lenses.md`.

**Evidência que pode ser executada:**

- `git` de leitura e busca no código.
- Com escopo pequeno, o teste já existente que cobre o arquivo. Nunca altere o teste para fazê-lo passar. Se a suíte inteira for grande, rode o arquivo de teste ligado ao diff e registre o que não foi executado.
- Diff de interface com servidor de desenvolvimento já no ar: abra a rota afetada. Sem servidor no ar, registre que a interface não foi exercida no navegador.

### 7. Registrar os achados (fase 6)

| Campo | Conteúdo |
|-------|----------|
| id | `V-001`, sequencial no relatório |
| Lente | uma só, a mais específica |
| Severidade | `bloqueante`, `alto`, `medio`, `baixo` ou `nota` |
| Confiança | `alta`, `media` ou `baixa` |
| Onde | arquivo e linha, ou o intervalo no diff |
| Evidência | o trecho ou o fato observado, com a busca que o sustentou |
| Impacto | o que quebra para quem usa a função |
| Correção recomendada | uma frase |
| Preexistente | `sim` ou `não` |

Regras:

- Sem evidência, o achado não entra.
- Confiança baixa não vira `bloqueante`: desce para `nota` ou fica de fora.
- Um defeito, um achado. Não repita a mesma falha em duas lentes.
- Defeito anterior à mudança e não disparado por ela recebe `preexistente: sim`. No `*revisar-todo`, preexistente dentro do limite estrutural conta para o veredito; nos demais comandos, não conta.

### 8. Dar o veredito (fase 7)

Conta para o veredito o achado que está dentro das lentes do comando, tem confiança `alta` ou `media` e não é preexistente fora do escopo.

| Veredito | Regra |
|----------|-------|
| `reprovado` | existe achado `bloqueante` ou `alto` que conta |
| `aprovado com ressalvas` | o pior achado que conta é `medio` |
| `aprovado` | só `baixo`, `nota` ou nenhum achado |

O veredito não muda status de story, issue ou pull request.

### 9. Gravar o relatório

1. Preencha `.sia-core/templates/inspection-report-tmpl.md`. O arquivo começa pelo frontmatter (guia de autoria, seção 6.2), que a CLI lê:

   | Campo | Valor |
   |-------|-------|
   | `command` | nome do comando, sem acento e sem prefixo (`revisar-feature`) |
   | `scope` | argumento recebido (`2.1`, `epic-3`, `src/lib/auth`, `repositório`) ou `entrega-recente` |
   | `story` | storyId quando o escopo é uma story; vazio (`''`) nos demais casos |
   | `verdict` | `aprovado`, `aprovado com ressalvas` ou `reprovado` |
   | `date` | data e hora ISO-8601 com fuso, entre aspas (`'2026-10-16T14:30:00-03:00'`) |
   | `revision` | `git rev-parse --short HEAD`, sempre entre aspas (um hash só de dígitos viraria número); vazio sem git |
   | `findings` | total de achados do relatório por severidade, inclusive preexistentes |

2. Grave em `docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md` (`paths.inspections` do `core-config.yaml`; crie a pasta se não existir). `{escopo}` é o `scope` em kebab-case, sem acentos e sem barras: `2.1`, `epic-3`, `src-lib-auth`, `repositorio`, `entrega-recente`.
3. Nunca sobrescreva nem edite um relatório anterior. Se o nome já existir, acrescente `-2`, `-3`... antes de `.md`.

### 10. Responder e passar o bastão

1. Responda primeiro com o veredito e a lista de achados (id, severidade, lente, onde). Depois, o caminho do relatório.
2. Escopo com story: grave o handoff descrito na seção Handoff.
3. Escopo sem story (`epic-*`, caminho, entrega recente): não grave handoff; a seção Handoff do relatório diz quem implementa as correções.

## Saída

- Relatório novo em `docs/qa/inspections/AAAA-MM-DD-HHmm-{comando}-{escopo}.md`, começando pelo frontmatter da seção 6.2 do guia de autoria.
- Handoff em `.sia/handoffs/` quando o escopo é uma story.
- Resposta: veredito e achados primeiro, caminho do relatório depois.

## Critérios de conclusão

- [ ] Diff ou arquivos do escopo lidos; escopo e exclusões registrados no relatório
- [ ] Só as lentes do comando aplicadas
- [ ] Todo achado com lente, severidade, confiança, onde, evidência, impacto, correção e preexistente
- [ ] Veredito coerente com a tabela do passo 8
- [ ] Relatório novo gravado com frontmatter completo; nenhum relatório anterior alterado
- [ ] Nenhum arquivo de produto alterado; nenhum commit, push ou mudança de status
- [ ] Handoff gravado quando o escopo é uma story

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Sem argumento e sem repositório git | Pare e diga que falta o escopo. |
| storyId sem arquivo em `docs/stories/` | Diga que a story não foi encontrada e peça outro escopo; não invente o pedido. |
| `docs/stories/` ausente | O pedido é o que o diff e os testes mostram (gaps só pelo diff). |
| Escopo sem mudança nem arquivo a ler | Diga que não há entrega a inspecionar e não grave relatório. |
| Busca de chamadores inconclusiva | Registre em Limites e reduza a confiança do achado (ou omita-o). |
| Teste falha ou suíte grande demais | Registre o resultado e o que não rodou; nunca altere o teste. |
| Sem servidor de desenvolvimento no ar | Registre que a interface não foi exercida no navegador. |
| Nome do relatório já existe | Acrescente `-2`, `-3`...; nunca sobrescreva. |
| Pedido para corrigir, commitar ou mudar status | Recuse e delegue: correção → `@dev *apply-qa-fixes {storyId}`; gate e status → `@pm *qa-gate {storyId}`. |

## Handoff

| Situação | Próximo passo | `to_agent` |
|----------|---------------|------------|
| QA Loop ativo para a story (`.sia/qa-loop/{storyId}.json` com `status: in_progress`), qualquer veredito | `@pm *qa-loop resume {storyId}` (o loop roda o gate) | `pm` |
| `aprovado` ou `aprovado com ressalvas` | `@pm *qa-gate {storyId}` | `pm` |
| `reprovado` | `@dev *apply-qa-fixes {storyId}`: a story continua em `InReview`, o `@dev` registra a correção no Change Log e pede nova inspeção | `dev` |

Com story no escopo, grave `.sia/handoffs/handoff-validator-para-{pm|dev}-{AAAAMMDD-HHmmss}.yaml` com os campos de `templates/agent-handoff-tmpl.yaml` (regra `agent-handoff`): `from_agent: validator`, `last_command` com o nome do comando, sem `*` e sem argumentos (`revisar-feature`; o storyId vai em `story_context`), `consumed: false`, `story_context` da story, o veredito e a contagem de achados em `decisions`, o relatório em `files_modified`, até 3 ids de achados `bloqueante` ou `alto` em `blockers` e o próximo passo em `next_action`.

O QA gate exige o relatório do comando de `quality.inspection.command` (padrão `revisar-feature`). Se esta inspeção usou outro comando, avise na resposta que o gate ainda pede essa inspeção.
