---
id: manage-backlog
title: Gerenciar o backlog
agent: pm
hat: owner
elicit: true
inputs:
  - 'ação: add | review | prioritize | summary | schedule'
  - 'add [tipo]: story, follow-up, tech-debt ou bug; os demais dados são perguntados'
  - 'review [id status]: atualiza um item; sem argumento, revisa o backlog inteiro'
  - 'prioritize [id]: sem id, reprioriza todos os itens'
  - 'summary [visão]: resumo, detalhado, sprint, responsável ou risco'
  - 'schedule {id} {sprint ou onda}'
outputs:
  - 'docs/stories/backlog.md atualizado'
  - 'docs/stories/backlog-archive-{AAAA-MM}.md com os itens DONE arquivados (review completo)'
  - 'Relatório da ação na resposta'
depends_on:
  tasks: []
next: [create-story, stories-index]
source: [po-manage-story-backlog.md, po-backlog-add.md, qa-backlog-add-followup.md]
---

# Gerenciar o backlog

## Objetivo

Manter `docs/stories/backlog.md` como o lugar único do trabalho adiado: stories candidatas, follow-ups do QA, débito técnico e bugs, com prioridade por valor × risco, status e agenda.

## Quando usar

- Depois do QA gate ou da inspeção, para registrar follow-ups (`add follow-up`).
- Durante o desenvolvimento, para registrar débito técnico ou bug fora do escopo da story.
- No planejamento: revisar, priorizar, resumir e agendar.

## Pré-condições

- [ ] Para `add follow-up`: a story de origem existe
- [ ] Para `review {id}`, `prioritize {id}` e `schedule {id}`: o item existe no backlog

## Formato do backlog

Este formato é o contrato do backlog. Toda task que grava aqui (`close-story`, `@dev *tech-debt`) DEVE segui-lo.

**Tipos**

| Tipo | Letra | Uso | Origem típica |
|------|-------|-----|---------------|
| story | S | melhoria, funcionalidade ou otimização que deve virar story | usuário, `@pm` |
| follow-up | F | ação pós-story apontada no QA gate ou na inspeção | `@pm [Qualidade]` |
| tech-debt | T | débito técnico de código ou de arquitetura | `@dev` (`*tech-debt`) |
| bug | B | defeito encontrado fora do escopo da story em andamento | qualquer agente |

**Id:** `[{storyId}-{letra}{n}]` quando ligado a uma story (ex.: `[2.1-F1]`, primeiro follow-up da 2.1); `[BL-{letra}{n}]` sem story. `n` é sequencial por story e tipo.

**Prioridade (valor × risco):** valor é o benefício de fazer; risco é o dano de não fazer. Cada um vai de 1 a 3.

| Valor × risco | Prioridade |
|---------------|------------|
| 9 | 🔴 Crítica |
| 6 | 🟠 Alta |
| 3 ou 4 | 🟡 Média |
| 1 ou 2 | 🟢 Baixa |

Guia para follow-ups: Crítica = problema de segurança, risco de corromper dados, bug bloqueante; Alta = lacuna de teste importante, caso de borda relevante; Média = teste desejável, lacuna menor; Baixa = melhoria opcional. Follow-up Crítico ou Alto deveria ser resolvido antes de a story fechar.

**Status:** `IDEA` (proposto, ainda não aprovado) → `TODO` → `IN_PROGRESS` → `DONE` → arquivado. Desvios: `BLOCKED` (aguarda dependência) e `CANCELLED` (decidido não fazer).

**Estrutura do arquivo:**

```markdown
# Backlog

> Atualizado em {AAAA-MM-DD} por @pm (Mira) [Product Owner]

## Resumo
| Prioridade | IDEA | TODO | IN_PROGRESS | BLOCKED | Total |
|------------|------|------|-------------|---------|-------|

## 🔴 Crítica

## 🟠 Alta

### [2.1-F1] Adicionar teste de integração do login social
- **Tipo:** follow-up
- **Origem:** QA gate 2.1 (docs/qa/gates/2.1-login-social.yml)
- **Story relacionada:** 2.1
- **Valor × risco:** 3 × 2 = 6
- **Esforço:** 3 horas
- **Status:** TODO
- **Sprint/onda:** —
- **Responsável:** @dev
- **Tags:** testes, integração
- **Descrição:** a story só tem testes unitários; falta o fluxo completo de login.
- **Critérios de sucesso:**
  - [ ] Teste de integração do login social passando

## 🟡 Média

## 🟢 Baixa
```

## Passos

### 1. Carregar o backlog

Leia `docs/stories/backlog.md` (`paths.backlog`). Se não existir, crie-o vazio com a estrutura acima. Se o arquivo existir com formato diferente, não o sobrescreva: mostre a divergência e pergunte como migrar.

### 2. Executar a ação

#### add [tipo]

1. **Ponto de elicitação:** pergunte o que não veio no comando, em lista numerada:
   1. Tipo: 1. story 2. follow-up 3. tech-debt 4. bug
   2. Título (uma linha, de 10 a 100 caracteres)
   3. Descrição (até 500 caracteres; obrigatória em follow-up)
   4. Valor (1 a 3) e risco (1 a 3); sem resposta, 2 × 2 (Média)
   5. Story relacionada (obrigatória em follow-up)
   6. Tags (opcional, separadas por vírgula)
   7. Esforço estimado (opcional; padrão "a estimar")
   8. Critérios de sucesso (opcional)
2. Valide a story relacionada em `docs/stories/{storyId}-*.story.md`:
   - Não encontrada em follow-up: mostre stories parecidas e peça outro id. Follow-up sem story não é aceito.
   - Não encontrada nos outros tipos: avise e siga sem story.
   - Mais de um arquivo: use o primeiro e avise.
3. Gere o id, insira o item na seção da prioridade com `Status: TODO` (`IDEA` se o usuário disser que ainda não está aprovado) e atualize o Resumo.
4. Follow-up: **Ponto de elicitação:** "Registrar a referência em `## Resultado do QA` da story? 1. Sim (padrão) 2. Não". Em Sim, declare `[Chapéu: Qualidade]` e acrescente ao fim da seção: `- **Follow-up:** [2.1-F1] {título} (docs/stories/backlog.md)`.
5. Mostre o item criado: id, tipo, título, prioridade, story, esforço, tags e próximos passos (`*backlog prioritize {id}`, `*backlog schedule {id}`). Follow-up Crítico ou Alto: avise que deveria ser resolvido antes de a story fechar.

#### review [id status]

Com id e status, atualize só aquele item:

1. Novo status: `TODO`, `IN_PROGRESS`, `BLOCKED` (peça o motivo do bloqueio), `DONE` (peça as notas de conclusão e registre a data) ou `CANCELLED` (peça o motivo).
2. Atualize o Resumo.

Sem argumento, faça a revisão completa:

1. Gere o relatório: itens por status, por prioridade e por sprint; itens antigos em `TODO`; itens bloqueados.
2. Sugira ajustes de prioridade pela idade do item, pelas dependências, pelos prazos de sprint e pela capacidade do time.
3. Faça as perguntas de revisão: os `TODO` ainda fazem sentido? Algum `IDEA` deve virar `TODO`? Algum item está bloqueado há tempo demais? As prioridades ainda fazem sentido? As estimativas estão corretas?
4. Arquive os itens `DONE`: mova-os para `docs/stories/backlog-archive-{AAAA-MM}.md`, com a data e as notas de conclusão, e tire-os do backlog.
5. Aplique só as mudanças aprovadas pelo usuário.

#### prioritize [id]

1. Mostre valor, risco e prioridade atuais do item (ou de todos).
2. **Ponto de elicitação:** novos valores de valor e risco, com o motivo.
3. Recalcule, mova o item para a seção da nova prioridade e acrescente ao item: `- **Repriorizado:** {AAAA-MM-DD}: {motivo}`.

#### summary [visão]

Não grava nada. Visões:

| Visão | Conteúdo |
|-------|----------|
| resumo (padrão) | contagem por prioridade, status, tipo e sprint |
| detalhado | todos os itens com todos os campos |
| sprint | itens agrupados por sprint ou onda |
| responsável | itens agrupados por responsável |
| risco | itens Críticos e Altos que pedem atenção |

#### schedule {id} {sprint ou onda}

1. Grave a sprint ou onda no campo `Sprint/onda` do item.
2. O item passa a aparecer na visão sprint do `summary`. Item do tipo story ou bug agendado é candidato a `*create-story` no planejamento da sprint.

### 3. Gravar e reportar

1. Grave o backlog inteiro de uma vez, com a data em "Atualizado em".
2. Mostre o que mudou: itens criados, movidos, atualizados ou arquivados.

Boas práticas: descrição específica e acionável; item acima de 8 horas é quebrado em itens menores; contexto sempre ligado (story, gate, relatório de inspeção ou decisão); revisão regular; itens `DONE` arquivados sem demora.

## Saída

- `docs/stories/backlog.md` atualizado (todas as ações, menos `summary`).
- `docs/stories/backlog-archive-{AAAA-MM}.md` na revisão completa com itens `DONE`.
- Referência do follow-up em `## Resultado do QA` da story, quando aprovada.
- Relatório da ação na resposta.

## Critérios de conclusão

- [ ] Item com todos os campos do formato e id único
- [ ] Item na seção da prioridade calculada por valor × risco
- [ ] Follow-up sempre ligado a uma story existente
- [ ] Resumo do backlog coerente com os itens
- [ ] `summary` não alterou nenhum arquivo

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Ação inválida | mostre as cinco ações |
| Tipo inválido | mostre os quatro tipos |
| Follow-up sem story | não aceite; peça o storyId |
| Story não encontrada (outros tipos) | avise e siga sem story |
| Valor ou risco inválido | use 2 × 2 (Média) |
| Item não encontrado | liste ids parecidos |
| Backlog com formato inesperado | não sobrescreva; mostre a divergência e pergunte |

## Handoff

- Item pronto para virar story: `@pm *create-story {epic}`.
- Visão geral das stories: `@pm *stories-index`.
