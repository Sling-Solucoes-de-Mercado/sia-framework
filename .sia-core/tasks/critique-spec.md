---
id: critique-spec
title: Criticar a spec (Spec Pipeline, fase 5)
agent: pm
hat: quality
elicit: false
inputs:
  - 'storyId'
  - 'docs/stories/{storyId}/spec/spec.md (obrigatório)'
  - 'docs/stories/{storyId}/spec/requirements.json (obrigatório)'
  - 'docs/stories/{storyId}/spec/complexity.json e research.json (opcionais)'
outputs:
  - 'docs/stories/{storyId}/spec/critique.json com veredito APPROVED, NEEDS_REVISION ou BLOCKED'
depends_on:
  data: [technical-preferences.md]
next: [create-plan, write-spec, gather-requirements, analyze-impact]
source: [spec-critique.md]
---

# Criticar a spec (Spec Pipeline, fase 5)

## Objetivo
Validar a spec antes da implementação em cinco dimensões (precisão, completude, consistência, viabilidade e alinhamento) e emitir um veredito que funciona como gate bloqueante do Spec Pipeline.

## Quando usar
- Fase 5 do Spec Pipeline: `@pm *critique-spec {storyId}`, depois de cada `*write-spec`.
- Em COMPLEX, duas vezes: antes e depois da revisão obrigatória.

## Separação de chapéus
Declare `[Chapéu: Qualidade]`. A spec normalmente foi escrita pelo próprio `@pm` com o chapéu Produto: critique com o mesmo rigor aplicado a uma spec alheia, sem atalhos (guia de autoria, seção 4.2). Não corrija a spec durante a crítica; as correções voltam para `write-spec`.

## Pré-condições
- [ ] `spec.md` e `requirements.json` existem

## Passos

### 1. Carregar os artefatos
`spec.md` e `requirements.json` (obrigatórios); `complexity.json` e `research.json` (opcionais). Se a spec estiver malformada, registre os problemas de leitura e faça uma crítica parcial.

### 2. Avaliar as cinco dimensões
Execute cada verificação, registre o resultado e atribua a severidade da falha.

**Precisão (peso 25%):** a spec reflete os requisitos.
| id | Verificação | Severidade da falha |
|----|-------------|---------------------|
| acc-1 | Todo FR do `requirements.json` está na spec? | HIGH |
| acc-2 | Nenhuma funcionalidade fora dos requisitos (Artigo IV)? | HIGH |
| acc-3 | P0 em destaque e P2 como opcional? | MEDIUM |
| acc-4 | Todo NFR tem seção correspondente? | MEDIUM |

**Completude (peso 25%):** todas as seções necessárias preenchidas.
| id | Verificação | Severidade da falha |
|----|-------------|---------------------|
| comp-1 | Visão geral, requisitos, abordagem, dependências, arquivos, testes e riscos presentes? | HIGH |
| comp-2 | Todo FR tem pelo menos um cenário de teste? | HIGH |
| comp-3 | Dependências externas com versão? | MEDIUM |
| comp-4 | Arquivos novos e alterados listados com propósito? | MEDIUM |
| comp-5 | Riscos considerados? | LOW |

**Consistência (peso 20%):** a spec é coerente internamente.
| id | Verificação | Severidade da falha |
|----|-------------|---------------------|
| con-1 | Toda referência `FR-*` e `NFR-*` existe nos requisitos? | HIGH |
| con-2 | Dependências da abordagem batem com a seção de dependências? | MEDIUM |
| con-3 | Profundidade compatível com a complexidade? | LOW |
| con-4 | Nenhuma contradição entre seções? | HIGH |

**Viabilidade (peso 15%):** a spec é tecnicamente viável.
| id | Verificação | Severidade da falha |
|----|-------------|---------------------|
| feas-1 | Dependências existem e são compatíveis? | HIGH |
| feas-2 | A abordagem técnica é alcançável? | HIGH |
| feas-3 | O trabalho cabe no escopo de uma story? | MEDIUM |
| feas-4 | Nenhum requisito tecnicamente impossível? | HIGH |

**Alinhamento (peso 15%):** a spec segue os padrões do projeto.
| id | Verificação | Severidade da falha |
|----|-------------|---------------------|
| align-1 | Tecnologias conforme as preferências (`data/technical-preferences.md`, `docs/architecture/tech-stack.md`)? | MEDIUM |
| align-2 | Padrões propostos compatíveis com o código existente? | MEDIUM |
| align-3 | Nomes de arquivos e componentes seguem as convenções? | LOW |
| align-4 | Cabe na arquitetura existente? | HIGH |

Nota de cada dimensão (1 a 5):
| Nota | Precisão | Completude | Consistência | Viabilidade | Alinhamento |
|------|----------|------------|--------------|-------------|-------------|
| 5 | requisitos representados com exatidão | abrangente, nada falta | consistente do início ao fim | claramente viável | alinhamento pleno |
| 4 | omissões menores, sem distorção | lacunas menores em seções não críticas | inconsistências menores | viável com ressalvas menores | desvios menores justificados |
| 3 | requisitos pouco claros ou incompletos | seções incompletas | contradições ou desencontros | viabilidade questionável | alguns desalinhamentos |
| 2 | lacunas ou distorções significativas | várias seções vazias ou ausentes | várias inconsistências | problemas sérios de viabilidade | desvios significativos |
| 1 | problemas graves de precisão | gravemente incompleta | inconsistente na base | inviável como especificada | desalinhada na base |

### 3. Registrar os problemas
Cada verificação que falhou vira um problema `CRIT-{n}` com severidade, dimensão, id da verificação, descrição, local (`spec.md#{seção}`), sugestão de correção e se a correção pode ser aplicada direto na spec (`autoFixable`).

### 4. Calcular o veredito
Média ponderada = 0,25 × precisão + 0,25 × completude + 0,20 × consistência + 0,15 × viabilidade + 0,15 × alinhamento.

Avalie na ordem; vale a primeira linha que se aplicar:
| Ordem | Veredito | Condição |
|-------|----------|----------|
| 1 | BLOCKED | média < 3,0; ou alguma dimensão ≤ 1; ou problema HIGH que a própria spec não resolve (exige requisito novo, pesquisa ou decisão de arquitetura) |
| 2 | NEEDS_REVISION | média de 3,0 a 3,9; ou alguma dimensão < 3; ou problema HIGH corrigível na spec; ou problema MEDIUM |
| 3 | APPROVED | média ≥ 4,0, todas as dimensões ≥ 3 e nenhum problema HIGH ou MEDIUM em aberto |

Segunda crítica em COMPLEX (depois da revisão): problemas MEDIUM com melhora demonstrada podem virar recomendação e não impedem o APPROVED. Se ainda der NEEDS_REVISION, pare: intervenção manual.

### 5. Gravar o critique.json
```json
{
  "storyId": "2.1",
  "critiquedAt": "2026-10-16T15:30:00-03:00",
  "critiquedBy": "@pm [Qualidade]",
  "specVersion": 1,
  "verdict": "NEEDS_REVISION",
  "verdictReason": "FR-2 sem cenário de teste",
  "scores": { "accuracy": 5, "completeness": 3, "consistency": 4, "feasibility": 4, "alignment": 4, "average": 4.0 },
  "issues": [
    { "id": "CRIT-1", "severity": "HIGH", "category": "completeness", "check": "comp-2",
      "description": "FR-2 (vincular conta) sem cenário de teste", "location": "spec.md#6-estrategia-de-testes",
      "suggestion": "Adicionar cenário Dado/Quando/Então para o vínculo de conta", "autoFixable": true }
  ],
  "summary": { "highIssues": 1, "mediumIssues": 0, "lowIssues": 0, "autoFixable": 1 },
  "nextAction": "@pm *write-spec 2.1 com este critique.json",
  "autoFixes": [
    { "issueId": "CRIT-1", "location": "spec.md#6", "original": "", "suggested": "Cenário: vincular conta Google a usuário existente ..." }
  ]
}
```
Obrigatórios: `storyId`, `critiquedAt`, `verdict`, `scores` (as cinco notas e `average`, de 1 a 5) e `issues`. `severity`: `HIGH`, `MEDIUM` ou `LOW`; `category`: `accuracy`, `completeness`, `consistency`, `feasibility` ou `alignment`. `specVersion` é a iteração da spec criticada.

### 6. Encaminhar
| Veredito | Próximo passo |
|----------|---------------|
| APPROVED (STANDARD) | `@dev *create-plan {storyId}` (fase 6) |
| APPROVED (COMPLEX) | primeira crítica: revisão obrigatória `@pm *write-spec {storyId}` e nova crítica; segunda crítica: recomende a revisão técnica do `@dev` [Arquitetura] e siga para `@dev *create-plan {storyId}` |
| APPROVED (SIMPLE) | sem fase de plano: a spec segue para o ciclo da story (`@dev *develop {storyId}` com a story em `Ready`) |
| NEEDS_REVISION | `@pm *write-spec {storyId}` com o `critique.json` (no máximo 2 revisões) |
| BLOCKED | pare. Problema de requisito: `@pm *gather-requirements {storyId}`. Problema técnico: `@dev` [Arquitetura] (`*analyze-impact {mudança}` ou `*assess-complexity {storyId}`) |

## Saída
`docs/stories/{storyId}/spec/critique.json` no formato do passo 5, com notas, problemas, veredito e próximo passo.

## Critérios de conclusão
- [ ] As 20 verificações executadas e registradas
- [ ] Notas das cinco dimensões e média ponderada calculadas
- [ ] Veredito aplicado pela tabela do passo 4, na ordem
- [ ] Todo problema com local e sugestão de correção
- [ ] Arquivo gravado e próximo passo indicado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `spec.md` ausente | Pare: rode `@pm *write-spec {storyId}` |
| `requirements.json` ausente | Pare: não há como avaliar a precisão |
| `spec.md` malformada | Registre os problemas de leitura e faça crítica parcial |
| Limite de revisões atingido | Escale ao usuário e ao `@dev` [Arquitetura] |

## Handoff
Conforme a tabela do passo 6. O pipeline só avança para o plano com APPROVED.
