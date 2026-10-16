---
id: qa-gate
title: QA gate da story
agent: pm
hat: quality
elicit: true
modes: [yolo, interactive]
inputs:
  - 'storyId: id da story em InReview (ex.: 2.1)'
  - 'relatório de inspeção do @validator em docs/qa/inspections/ (obrigatório quando quality.inspection.requiredBeforeGate é true)'
  - 'resultado de lint, typecheck, testes e build (quality.scripts)'
  - 'avaliações em docs/qa/assessments/ (nfr, risk, test-design, trace), se houver'
outputs:
  - 'docs/qa/gates/{storyId}-{slug}.yml no formato da seção 6.2 do guia de autoria'
  - 'Bloco "## Resultado do QA" da story no formato da seção 6.2'
  - 'Transição de status com linha no Change Log: InReview → Done ou InReview → InProgress'
  - 'FAIL: "### Pedido de correção (iteração N)" na story, via create-fix-request'
depends_on:
  tasks: [create-fix-request.md]
  templates: [qa-gate-tmpl.yaml, agent-handoff-tmpl.yaml]
next: [push, create-pr, close-story, apply-qa-fixes]
source: [qa-gate.md, qa-review-story.md, qa-evidence-requirements.md, qa-false-positive-detection.md]
---

# QA gate da story

## Objetivo

Revisar a entrega com evidência e decidir o gate da story: `PASS`, `CONCERNS`, `FAIL` ou `WAIVED`. O veredito se apoia no relatório de inspeção do `@validator`, nos testes, na rastreabilidade dos critérios de aceite e nas avaliações de risco e de NFR. A task grava o arquivo do gate, o bloco `## Resultado do QA` e a transição de status.

## Quando usar

- Story em `InReview`, depois da inspeção `@validator *revisar-feature {storyId}`.
- Em cada iteração do `*qa-loop`.
- Não use para inspecionar código linha a linha (é do `@validator`) nem para corrigir: o `@pm` não altera código (Constitution, Artigo II). Toda correção vai para o `@dev`.

## Pré-condições

- [ ] Story com Status `InReview`
- [ ] Tasks marcadas e File List preenchida pelo `@dev`
- [ ] Repositório git: a revisão avaliada é um commit
- [ ] Relatório de inspeção válido quando `quality.inspection.requiredBeforeGate: true` (passo 2)

## Modos

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Decide e grava sem perguntas. Sem inspeção válida, para e orienta a inspeção. Nunca decide `WAIVED`. |
| Interativo (padrão) | Checkpoints: inspeção ausente, avaliações faltando na revisão profunda, dispensa (`WAIVED`) e confirmação do veredito antes de gravar. |

## Passos

### 1. Carregar o contexto

1. Declare `[Chapéu: Qualidade]`.
2. Leia `.sia-core/core-config.yaml`: `paths.qaGates`, `paths.qaAssessments`, `paths.inspections`, `quality.scripts` e `quality.inspection` (`requiredBeforeGate`, `command`).
3. Leia a story inteira: critérios de aceite, Tasks, Dev Notes, Testes, Registro do Dev (File List) e o `## Resultado do QA` anterior.
4. Status diferente de `InReview`: PARE com "O gate exige story em InReview; encontrado {status}."
5. Revisão avaliada: `git rev-parse --short HEAD`. Se `git status --porcelain` mostrar mudança não commitada em arquivo da File List, PARE e peça o commit ao `@dev`: a revisão precisa representar o código avaliado.
6. Iteração: `currentIteration` de `.sia/qa-loop/{storyId}.json`, se existir; senão, `iteration` do gate anterior + 1; sem gate anterior, 1.
7. Slug: o mesmo do arquivo da story. Arquivo do gate: `docs/qa/gates/{storyId}-{slug}.yml`.

### 2. Verificar o relatório de inspeção

1. Procure em `docs/qa/inspections/` o relatório mais recente com frontmatter `story: '{storyId}'` e `command` igual a `quality.inspection.command` (padrão `revisar-feature`).
2. Relatório desatualizado conta como ausente: `revision` diferente da revisão atual e `git diff --name-only {revision}..HEAD -- {arquivos da File List}` não vazio.
3. Com relatório válido, leia `verdict`, `findings` e cada achado `V-00x`: severidade, confiança, onde, evidência, correção recomendada e se é preexistente.
4. Sem relatório válido e com `requiredBeforeGate: true`, o gate não sai `PASS`:
   - YOLO: PARE e oriente `@validator *revisar-feature {storyId}`.
   - Interativo: **Ponto de elicitação:** "Não há inspeção válida da story {storyId}. 1. Parar e rodar `@validator *revisar-feature {storyId}` (recomendado) 2. Seguir sem inspeção: o veredito máximo é CONCERNS"

### 3. Definir a profundidade

Faça revisão profunda quando qualquer item valer:

- arquivos de autenticação, pagamento ou segurança tocados
- nenhum teste adicionado na story
- diff com mais de 500 linhas
- gate anterior `FAIL` ou `CONCERNS`
- mais de 5 critérios de aceite

Na revisão profunda, leia todas as avaliações `docs/qa/assessments/{storyId}-*`. Se faltar avaliação de risco ou de NFR: **Ponto de elicitação (Interativo):** "1. Rodar `*risk-profile {storyId}` e `*nfr-assess {storyId}` antes do veredito 2. Seguir sem elas"

### 4. Rodar as verificações automáticas

Rode, num único bloco de comandos, os scripts de `quality.scripts` existentes no projeto (lint, typecheck, test, build). Script ausente é registrado e ignorado (Constitution, Artigo V). Guarde o resultado de cada um.

### 5. Fazer as 7 verificações

Cada verificação recebe `PASS`, `CONCERNS` ou `FAIL`, com evidência: arquivo, saída de comando, achado `V-00x` ou avaliação.

| # | Verificação | O que olhar | Apoio |
|---|-------------|-------------|-------|
| 1 | Revisão de código | padrões, legibilidade, manutenibilidade, duplicação; aderência a `coding-standards.md` e `source-tree.md` | lentes arquitetura, código morto, falhas e lógica |
| 2 | Testes | existem, passam e cobrem no nível certo (unitário, integração, e2e); casos de borda e de erro; uso de mocks; confiabilidade e tempo | passo 4; avaliação `test-design` |
| 3 | Critérios de aceite | cada critério implementado e ligado a teste (mapa em Dado/Quando/Então) | lente gaps; avaliação `trace` |
| 4 | Regressões | funcionalidade existente preservada; contratos e chamadores das funções alteradas | lente regressão; suíte completa |
| 5 | Desempenho | dentro de limites aceitáveis: consultas, cache, uso de recursos | avaliação `nfr` |
| 6 | Segurança | OWASP básico: autenticação, autorização, validação de entrada, segredos | lente segurança; avaliação `nfr` |
| 7 | Documentação | mudança de API documentada; README e Dev Notes coerentes com o entregue | story e diff |

Testabilidade (controle das entradas, observação das saídas, facilidade de depurar) e débito técnico (atalhos, testes faltando, dependências desatualizadas, violação de arquitetura) entram como observações nas verificações 1 e 2.

### 6. Exigir evidência conforme o tipo de entrega

Detecte o tipo pela story e pelo diff: correção de bug (título ou commits com "corrige", "bug", "fix"; issue do tipo bug), feature (critérios de funcionalidade nova), atualização de dependência (mudança em `package.json` ou no lockfile), refatoração (nenhuma funcionalidade nova nos critérios).

| Tipo | Evidência obrigatória (peso) | Condicional (peso) |
|------|------------------------------|--------------------|
| Correção de bug | erro original documentado (crítica); causa raiz identificada (alta); antes e depois explicados (alta); teste de regressão (crítica) | casos parecidos verificados (baixa) |
| Feature | todos os critérios verificados (crítica); caminho feliz demonstrado (crítica); casos de borda testados (alta) | multiplataforma, se houver UI (média); impacto de desempenho, se crítico (alta) |
| Dependência | vulnerabilidades checadas, ex.: `npm audit` (crítica); breaking changes tratados (crítica); licença compatível (alta) | tamanho do bundle, no front-end (média) |
| Refatoração | comportamento preservado: testes passam antes e depois (crítica); nenhuma funcionalidade nova (alta) | ganho de desempenho, se alegado (baixa) |

Evidência ausente vira item em `top_issues` (categoria `tests` ou `requirements`): falta crítica → `high`; duas ou mais altas → `high`; uma alta ou média → `medium`; baixa → `low`.

### 7. Checar falso positivo (correção de bug)

Confirme que a correção trata a causa, não só o sintoma. Pontue cada item de 0 a 1 com a evidência disponível (Log de debug, testes, CI). O `@pm` não reverte código para testar: sem evidência, o item vale 0.

| Item | Pergunta | Peso |
|------|----------|------|
| Suposições verificadas | as suposições estão explícitas, cada uma com evidência, e explicações alternativas foram descartadas? | 0,20 |
| Teste de remoção | sem a correção o erro volta, e com ela some? | 0,25 |
| Código antigo falha | há evidência concreta da falha antes da correção? | 0,15 |
| Código novo funciona | há evidência concreta do sucesso depois? | 0,15 |
| Não se autocorrige | a correção resiste a reinício, limpeza de cache e espera? | 0,10 |
| Casos negativos | os cenários em que o código deve rejeitar foram testados? | 0,10 |
| Mecanismo explicado | causa raiz, como a mudança a trata e por que não regride? | 0,05 |

Confiança = soma ponderada. ≥ 0,85: sem impacto. De 0,65 a 0,84: item `low` em `top_issues` (observação). < 0,65: item `high` (provável falso positivo).

Casos de borda a conferir: em bug, nulo ou indefinido, vazio, máximo e mínimo, acesso concorrente, falha de rede e timeout; em feature, primeiro uso, uso repetido, entrada inválida, permissão negada, limite de requisições e modo offline. Sinais de alerta: só caminho feliz testado; erro original não reproduzido; mecanismo obscuro; dependência de tempo ou de ambiente; sem teste de regressão; código parecido não verificado; suposições não documentadas.

### 8. Montar os itens do gate

1. Converta os achados da inspeção que contam (não preexistentes) para `top_issues`:

   | Severidade no relatório | `severity` no gate |
   |-------------------------|--------------------|
   | bloqueante, alto | `high` |
   | medio | `medium` |
   | baixo | `low` |
   | nota | não entra; vira recomendação futura quando útil |

   Achado preexistente não entra em `top_issues`; pode ir para `recommendations.future`.
2. Acrescente os problemas dos passos 4 a 7: script de qualidade falhando e critério de aceite não atendido são `high`. Toda causa de `FAIL` tem um item em `top_issues`.
3. Id com o prefixo da categoria, numerado por prefixo: `SEC-` (`security`), `PERF-` (`performance`), `REL-` (`reliability`), `TEST-` (`tests`), `MNT-` (`maintainability`), `ARCH-` (`architecture`), `DOC-` (`docs`), `REQ-` (`requirements`). Em `finding`, cite o `V-00x` de origem quando houver.
4. Em `suggested_action`, comece pelo dono: `@dev` (mudança de código), `@pm [Scrum]` (esclarecer requisito) ou `@pm [Product Owner]` (decisão de negócio).
5. `nfr_validation`: só os NFRs avaliados (da avaliação `nfr` ou das verificações 5 e 6), cada um com `status` e `notes`.
6. `risk_summary`: copie o bloco da avaliação `risk`, se houver; senão, `{}`.
7. `recommendations.immediate`: o que precisa ser feito antes de produção. `recommendations.future`: o que pode esperar (vira follow-up no `*close-story`).

Severidade usa só `low`, `medium` ou `high`.

### 9. Decidir o veredito

Aplique as regras. O resultado mais severo prevalece (`FAIL` > `CONCERNS` > `PASS`):

1. **Risco** (com `risk_summary`): algum risco com nota ≥ 9 → `FAIL`; ≥ 6 → `CONCERNS`.
2. **Cobertura** (com `test-design` ou `trace`): falta teste P0 → `CONCERNS`; falta teste P0 de segurança ou de perda de dados → `FAIL`.
3. **Severidade**: algum `high` → `FAIL`; algum `medium` → `CONCERNS`.
4. **NFR**: algum `FAIL` → `FAIL`; algum `CONCERNS` → `CONCERNS`.
5. **Inspeção ausente** (passo 2, opção 2): no máximo `CONCERNS`.
6. Nenhuma regra disparada → `PASS`.

**WAIVED:** só quando uma pessoa com autoridade aceita os problemas explicitamente, com motivo e aprovador (`waiver.active: true`, `reason`, `approved_by`). **Ponto de elicitação (Interativo):** "Há problemas que impedem PASS. 1. Manter {veredito} 2. Dispensar (WAIVED): informe o motivo e quem aprova". Achado `bloqueante` do `@validator` nunca é dispensado (Constitution, Artigo V). YOLO nunca decide `WAIVED`.

**Bloqueio (gate não emitido):** pare sem gravar e peça esclarecimento quando a story estiver incompleta ou sem seções críticas; a File List estiver vazia ou claramente incompleta; não houver testes e a story exigir; o código não corresponder aos requisitos da story; houver problema crítico de arquitetura que exija discussão com `@dev [Arquitetura]`. No `*qa-loop`, o bloqueio conta como `verdict_blocked`.

**Ponto de elicitação (Interativo):** mostre o veredito, o motivo e os itens principais e confirme antes de gravar.

### 10. Gravar com protocolo fail-closed

Nenhuma mensagem de sucesso nem handoff antes de tudo gravado e conferido.

1. Prepare o gate, o bloco da story, o Status e a linha do Change Log. Guarde o conteúdo do gate anterior, se existir.
2. Grave o arquivo do gate de uma vez, com `templates/qa-gate-tmpl.yaml` e o formato abaixo. Releia e confira `story`, `gate`, `reviewer` e `reviewed_revision`.
3. Só então grave a story numa única escrita: bloco `## Resultado do QA`, `## Status` e linha no `## Change Log`.
4. Releia os dois arquivos: veredito e revisão iguais nos dois; transição presente uma única vez.
5. Falha em qualquer passo: cancele o handoff; restaure o Status e o Change Log originais da story; restaure o gate anterior (ou remova o criado nesta tentativa) e confira. Se a limpeza falhar, mantenha o bloqueio e reporte os dois erros.

**Arquivo do gate** (`docs/qa/gates/{storyId}-{slug}.yml`):

```yaml
schema: 1
story: '2.1'
story_title: Login social
gate: CONCERNS
status_reason: Critérios atendidos com testes; falta limite de tentativas no login.
reviewer: '@pm (Mira) [Qualidade]'
reviewed_revision: 3f2a9c1
updated: '2026-10-16T14:45:00-03:00'
inspection_report: docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md
iteration: 1
top_issues:
  - id: SEC-001
    severity: medium
    category: security
    finding: 'V-002: endpoint de login sem limite de tentativas'
    suggested_action: '@dev: aplicar limite de tentativas antes de produção'
waiver: { active: false, reason: '', approved_by: '' }
nfr_validation:
  security: { status: CONCERNS, notes: 'Sem limite de tentativas no login' }
  performance: { status: PASS, notes: 'Resposta abaixo de 200 ms nos testes' }
risk_summary: {}
recommendations:
  immediate: []
  future:
    - { action: 'Adicionar limite de tentativas no login', refs: ['src/app/api/auth/login/route.ts'] }
```

`status_reason` tem no máximo duas frases.

**Bloco da story** (a última ocorrência de cada campo vale):

```markdown
## Resultado do QA

- **Gate:** CONCERNS
- **Revisor:** @pm (Mira) [Qualidade]
- **Revisão:** 3f2a9c1
- **Data:** 2026-10-16
- **Arquivo do gate:** docs/qa/gates/2.1-login-social.yml
- **Inspeção:** docs/qa/inspections/2026-10-16-1430-revisar-feature-2.1.md (aprovado com ressalvas)
- **Resumo:** Critérios 1 a 4 atendidos com testes; falta limite de tentativas no login (SEC-001), registrado como recomendação.
```

- Primeira avaliação: os sete campos logo abaixo do título da seção.
- Iterações seguintes: acrescente no fim da seção `### Revisão (iteração {N})` seguido dos sete campos. Não apague as iterações anteriores.
- Sem inspeção (passo 2, opção 2): `- **Inspeção:** ausente (veredito limitado a CONCERNS)`.

**Status e Change Log:**

- `PASS` ou `CONCERNS`: `InReview` → `Done`; `| {AAAA-MM-DD} | @pm [Qualidade] | QA gate {PASS ou CONCERNS}. Status: InReview → Done |`
- `WAIVED`: `InReview` → `Done`; `| {AAAA-MM-DD} | @pm [Qualidade] | QA gate WAIVED: {motivo}, aprovado por {aprovador}. Status: InReview → Done |`
- `FAIL`: `InReview` → `InProgress`; `| {AAAA-MM-DD} | @pm [Qualidade] | QA gate FAIL: {motivo}. Status: InReview → InProgress |`

Story sem `## Change Log`: PARE e peça para restaurar a estrutura do template.

### 11. FAIL: pedir a correção

Rode `tasks/create-fix-request.md` para escrever `### Pedido de correção (iteração {N})` na story. Se falhar, avise no resumo: o `@dev` usa os `top_issues` do gate como pedido.

### 12. Apresentar

Mostre o veredito e o motivo, uma tabela curta das 7 verificações, os itens principais, os caminhos do gate e da inspeção, a transição aplicada e o próximo passo.

## Saída

- `docs/qa/gates/{storyId}-{slug}.yml` no formato da seção 6.2 do guia de autoria.
- Story com `## Resultado do QA`, `## Status` e `## Change Log` atualizados; no `FAIL`, com o pedido de correção.
- Handoff `.sia/handoffs/handoff-pm-para-{devops|dev}-{AAAAMMDD-HHmmss}.yaml` com `last_command: qa-gate`.

## Critérios de conclusão

- [ ] Arquivo do gate com todas as chaves da seção 6.2; severidades só `low`, `medium` ou `high`
- [ ] `## Resultado do QA` com os sete campos; `Revisão` = `git rev-parse --short HEAD`
- [ ] Veredito coerente com o passo 9; nunca `PASS` sem inspeção válida quando exigida
- [ ] `WAIVED` com motivo e aprovador; nenhum achado bloqueante dispensado
- [ ] Transição de status exata, registrada uma única vez no Change Log
- [ ] `FAIL` com pedido de correção na story
- [ ] Gravação conferida por releitura antes do handoff

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story fora de `InReview` | PARE com a mensagem do passo 1 |
| Projeto sem git | PARE; recomende `@devops *environment-bootstrap` |
| Mudança não commitada na File List | PARE; peça o commit ao `@dev` |
| Inspeção ausente ou desatualizada | passo 2 |
| Script de qualidade ausente | registre e ignore (Artigo V) |
| Condição de bloqueio | não emita gate; peça esclarecimento |
| Falha de gravação | protocolo do passo 10, item 5 |

## Handoff

- `PASS`, `CONCERNS` ou `WAIVED` (story `Done`): `@devops *push` / `*create-pr {storyId}`. Também: `@pm *close-story {storyId}` (epic, índice e follow-ups no backlog).
- `FAIL` (story `InProgress`): `@dev *apply-qa-fixes {storyId}`; depois, `@validator *revisar-feature {storyId}` e novo `*qa-gate {storyId}`.

Grave o handoff com `templates/agent-handoff-tmpl.yaml` (`last_command: qa-gate`, `consumed: false`).
