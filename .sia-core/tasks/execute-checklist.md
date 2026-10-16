---
id: execute-checklist
title: Executar checklist
agent: any
elicit: false
modes: [yolo, interactive]
inputs:
  - 'checklist: arquivo de .sia-core/checklists/, informado pelo campo checklist: do comando, ou nome aproximado'
  - 'alvo (opcional): artefato avaliado (storyId, documento, caminho)'
  - 'mode (opcional): yolo (recomendado) ou interactive'
outputs:
  - 'Relatório do checklist no formato da seção 10 do guia de autoria, apresentado ao usuário e registrado onde a task chamadora indicar'
depends_on: {}
next: []
source: [execute-checklist.md]
---

# Executar checklist

## Objetivo
Validar documentos e artefatos contra um checklist do `.sia-core/checklists/` de forma sistemática, item por item e com evidência, e entregar um relatório com status por seção e decisão final.

## Quando usar
- Comandos de agente com `checklist:` (ex.: `@pm *po-checklist`, `@pm *story-checklist {storyId}`, `@dev *dod-checklist {storyId}`, `@dev *architect-checklist`).
- Tasks que mandam rodar um checklist como parte do processo (ex.: `pre-push`, `correct-course`).
- Pedido direto do usuário para validar algo contra um checklist.

## Pré-condições
- [ ] Checklist identificado
- [ ] Artefatos exigidos pelo checklist disponíveis ou localizáveis

## Passos

### 1. Identificar o checklist
1. Com nome informado, faça correspondência aproximada (ex.: "checklist de arquitetura" → `architect-checklist.md`). Mais de uma correspondência: pergunte qual, em lista numerada.
2. Sem nome: liste em lista numerada os checklists do agente ativo (`dependencies.checklists`). Fora de um agente, liste `.sia-core/checklists/` (e `squads/{nome}/checklists/` quando o contexto for um squad).
3. Carregue o checklist de `.sia-core/checklists/{nome}`.

### 2. Escolher o modo
Se o modo não veio do comando ou da task chamadora, pergunte:
1. **YOLO (recomendado):** processa todas as seções de uma vez e entrega o relatório completo, com resumo por seção para discutir no fim.
2. **Interativo:** seção a seção, item a item, com confirmação ao fim de cada seção (mais demorado).

### 3. Reunir documentos e artefatos
1. O início do checklist (blocos `[[LLM: ...]]`) diz o que carregar.
2. Resolva os caminhos pela seção 5.2 do guia (ex.: PRD em `docs/prd.md` ou `docs/prd/`; stories em `docs/stories/`).
3. Se não encontrar um artefato ou houver dúvida sobre qual usar, pare e confirme com o usuário.

### 4. Avaliar cada item
Para cada item:
1. Leia e entenda o requisito.
2. Procure evidência nos documentos e artefatos: cobertura explícita ou implícita.
3. Siga as instruções `[[LLM: ...]]` da seção e do checklist. Esses blocos nunca aparecem no relatório.
4. Marque:

| Marca | Significado |
|-------|-------------|
| ✅ PASS | requisito claramente atendido |
| ❌ FAIL | requisito não atendido ou cobertura insuficiente |
| ⚠️ PARTIAL | parte atendida, precisa melhorar |
| N/A | não se aplica a este caso; registre a justificativa |

### 5. Processar conforme o modo
- **Interativo:** percorra uma seção por vez. Ao fim de cada seção, apresente o resumo com falhas, parciais e itens N/A (com o motivo) e pergunte: 1. seguir para a próxima seção; 2. parar para corrigir algo grave agora. Registre as decisões e explicações do usuário.
- **YOLO:** avalie todas as seções sem parar e monte o relatório completo.

### 6. Analisar cada seção
1. Calcule a taxa de aprovação passo a passo: itens ✅ sobre itens aplicáveis (N/A fica fora da conta).
2. Identifique temas comuns entre as falhas.
3. Escreva recomendações específicas de melhoria.
4. Defina o status da seção: ✅ quando todos os itens aplicáveis passaram; ⚠️ quando há parciais ou falhas que o checklist não trata como bloqueantes; ❌ quando há falha bloqueante segundo o checklist (sem regra no checklist, qualquer FAIL vale ❌).

### 7. Montar o relatório final
Use o formato da seção 10 do guia de autoria:

```markdown
## Resultado
| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Requisitos | ✅ | 6/6 |
| 2. Testes | ⚠️ | 4/5; 2.3 parcial: falta o cenário de erro |
| 3. Segurança | ❌ | 2/4; 3.1 e 3.4 falharam |

Taxa geral: 12/15 itens aplicáveis (80%) · N/A: 2 (justificados)

**Decisão:** NO-GO (regra do checklist: GO só sem ❌)
```

Inclua também:
- itens que falharam, com contexto e evidência;
- recomendações específicas;
- itens N/A com justificativa.

Depois, ofereça a análise detalhada das seções com ⚠️ ou ❌.

## Saída
Relatório no formato acima, apresentado ao usuário. Quando a task chamadora indicar onde registrar (ex.: `validate-story` na própria story, `pre-push` no relatório do portão), registre lá. Fora disso, grave em arquivo só se o usuário pedir.

## Critérios de conclusão
- [ ] Todos os itens de todas as seções avaliados e marcados
- [ ] Todo N/A tem justificativa
- [ ] Taxa de aprovação por seção calculada
- [ ] Decisão final aplicada com a regra do próprio checklist

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Checklist não encontrado | Liste os disponíveis (numerados) e peça a escolha |
| Artefato exigido ausente | Pare e pergunte: indicar o caminho, gerar o artefato antes ou marcar os itens afetados como FAIL |
| Checklist sem regra de decisão | Informe as taxas por seção e deixe a decisão com o usuário |

## Handoff
- Sem falhas bloqueantes: siga o próximo passo da task ou do workflow que chamou o checklist.
- Com falhas bloqueantes: devolva ao dono do artefato avaliado, com a lista de falhas: story, PRD ou epic → `@pm`; código → `@dev`; arquitetura → `@dev` [Arquitetura]; pipeline ou entrega → `@devops`.
