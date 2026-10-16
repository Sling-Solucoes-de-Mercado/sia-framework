---
id: create-fix-request
title: Gerar o pedido de correção
agent: pm
hat: quality
elicit: false
inputs:
  - 'storyId: id da story com gate FAIL (ex.: 2.1)'
  - '--include-minor (opcional): inclui também os itens de severidade low'
outputs:
  - 'Subseção "### Pedido de correção (iteração N)" dentro de "## Resultado do QA" da story'
depends_on:
  tasks: []
next: [apply-qa-fixes]
source: [qa-create-fix-request.md]
---

# Gerar o pedido de correção

## Objetivo

Transformar os problemas de um gate `FAIL` num pedido de correção estruturado para o `@dev`, escrito na própria story, em `### Pedido de correção (iteração N)`. Cada item diz o que corrigir, onde, qual critério de aceite afeta, qual achado do `@validator` o originou e como verificar a correção.

## Quando usar

- Chamada pelo `*qa-gate` quando o veredito é `FAIL`.
- Avulsa (`*create-fix-request {storyId}`), para refazer o pedido da última iteração.
- Não crie arquivo separado: o pedido vive na story.

## Pré-condições

- [ ] Gate da story com `gate: FAIL` em `docs/qa/gates/{storyId}-{slug}.yml`
- [ ] Último `**Gate:**` de `## Resultado do QA` igual a `FAIL`
- [ ] Relatório de inspeção citado no gate (`inspection_report`), quando houver

## Passos

### 1. Carregar as fontes

1. Gate: `top_issues`, `iteration` e `inspection_report`.
2. Relatório de inspeção: cada achado `V-00x` (severidade, onde, evidência, correção recomendada, preexistente).
3. Story: critérios de aceite, File List e o bloco da iteração atual em `## Resultado do QA`.

Sem gate: PARE com "Rode `*qa-gate {storyId}` primeiro." Gate diferente de `FAIL`: PARE com "Nenhuma correção pedida: o último gate é {gate}."

### 2. Selecionar os itens

| Severidade no gate | Entra no pedido |
|--------------------|-----------------|
| `high` | sempre (corrigir antes do merge) |
| `medium` | sempre (deveria ser corrigido antes do merge) |
| `low` | só com `--include-minor` (melhoria opcional) |

Achado com `preexistente: sim` não entra: ele não derruba o veredito.

### 3. Montar cada item

Ordene por severidade (`high` primeiro) e numere a partir de 1 dentro da iteração. Cada item tem todos os campos:

| Campo | Conteúdo |
|-------|----------|
| Título | uma linha com o problema, a severidade entre colchetes e o id do gate (ex.: `SEC-001`) |
| Arquivo | `caminho:linha`, do achado ou do gate |
| Critério de aceite | `CA n` afetado, ou "nenhum" |
| Achado do @validator | `V-00x` correspondente, ou "—" quando o problema veio das verificações do gate (ex.: teste falhando) |
| Problema | o que está errado, em uma ou duas frases; trecho curto de código quando ajudar |
| Esperado | o comportamento correto |
| Verificação | critério objetivo que prova a correção: teste, comando ou cenário |

### 4. Escrever na story

Declare `[Chapéu: Qualidade]` (só ele edita `## Resultado do QA`). Insira a subseção no fim da seção, logo depois do bloco de campos da iteração. Se já existir pedido da mesma iteração, substitua-o em vez de duplicar.

```markdown
### Pedido de correção (iteração 1)

Resumo: 1 high, 1 medium. Corrija SOMENTE os itens abaixo.

1. **[high] Pedido de outro usuário acessível pelo id** (SEC-001)
   - Arquivo: `src/app/api/orders/[id]/route.ts:42`
   - Critério de aceite: CA 3
   - Achado do @validator: V-001
   - Problema: o id vem do cliente e a consulta não filtra pelo dono da sessão.
   - Esperado: pedido de outro usuário responde 404.
   - Verificação: teste de integração "pedido de outro usuário retorna 404" passando em `npm test`.
2. **[medium] Falta teste do caminho de erro do pagamento** (TEST-001)
   - Arquivo: `src/lib/payments.ts:88`
   - Critério de aceite: CA 4
   - Achado do @validator: V-003
   - Problema: a falha do provedor de pagamento não tem teste.
   - Esperado: teste unitário cobrindo a falha do provedor.
   - Verificação: teste novo passando; lint e typecheck sem erro.

**Restrições para o @dev**
- Corrigir só os itens listados; não acrescentar funcionalidade nem refatorar código não relacionado.
- Rodar lint, typecheck e testes (`quality.scripts`) antes de concluir.
- Atualizar a File List se criar ou remover arquivo.
- Registrar em `### Notas de conclusão`, no bloco `#### Correções do QA (iteração 1)`, o que foi feito em cada item, pelo número.
- Não editar `## Resultado do QA`: a seção é do `@pm` [Qualidade].
```

### 5. Informar

Mostre a story atualizada, a contagem por severidade e o próximo passo: `@dev *apply-qa-fixes {storyId}`. Depois da correção, o ciclo segue com `@validator *revisar-feature {storyId}` e novo `@pm *qa-gate {storyId}`.

## Saída

- Subseção `### Pedido de correção (iteração N)` no fim de `## Resultado do QA` da story, com N igual ao `iteration` do gate.
- Resumo na resposta: total de itens por severidade e próximo passo.

## Critérios de conclusão

- [ ] Título exato `### Pedido de correção (iteração N)`, com N = `iteration` do gate
- [ ] Todos os itens `high` e `medium` não preexistentes incluídos; `low` só com `--include-minor`
- [ ] Cada item com título, arquivo, critério de aceite, achado do `@validator`, problema, esperado e verificação
- [ ] Restrições para o `@dev` presentes
- [ ] Nenhum arquivo separado criado

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Gate inexistente | PARE; rode `*qa-gate {storyId}` |
| Gate diferente de `FAIL` | PARE; informe o gate atual |
| Relatório de inspeção ausente | use só o gate; "Achado do @validator: —" |
| `FAIL` sem `top_issues` | PARE; gate inconsistente, refaça `*qa-gate {storyId}` |
| Pedido da mesma iteração já existe | substitua a subseção da iteração; não duplique |
| Arquivo ou linha do achado não existe mais | cite o arquivo, marque "linha a confirmar" e mantenha o item |

## Handoff

Próximo passo: `@dev *apply-qa-fixes {storyId}`.
