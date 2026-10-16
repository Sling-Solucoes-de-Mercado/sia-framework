---
id: gather-requirements
title: Levantar requisitos (Spec Pipeline, fase 1)
agent: pm
hat: product
elicit: true
inputs:
  - 'storyId: id da story especificada (ex.: 2.1)'
  - 'source (opcional): user (padrão) | prd | existing'
  - 'prd (opcional): caminho do PRD ou do fragmento, quando source=prd'
outputs:
  - 'docs/stories/{storyId}/spec/requirements.json'
depends_on: {}
next: [assess-complexity, write-spec]
source: [spec-gather-requirements.md]
---

# Levantar requisitos (Spec Pipeline, fase 1)

## Objetivo
Transformar uma descrição informal em requisitos formais e categorizados (FR, NFR, CON e afins), por elicitação interativa, extração do PRD ou iteração sobre requisitos anteriores. O `requirements.json` é a base rastreável de todas as fases seguintes.

## Quando usar
- Primeira fase do Spec Pipeline (sempre obrigatória): `@pm *gather-requirements {storyId}` ou `@pm *run-workflow spec-pipeline`.
- Feature complexa ou ambígua, antes da story ir para implementação.
- Não use para correção simples e bem entendida: siga direto o ciclo da story.

## Pré-condições
- [ ] `storyId` informado
- [ ] Pasta `docs/stories/{storyId}/spec/` existe ou pode ser criada
- [ ] Se já existe `requirements.json`, a task itera sobre ele (`source=existing`) em vez de sobrescrever

## Passos

### 1. Identificar a fonte
| Fonte | Quando | Como |
|-------|--------|------|
| `user` (padrão) | pedido novo do usuário | elicitação (passo 2) |
| `prd` | requisitos já estão no PRD | extração (passo 3) |
| `existing` | já há `requirements.json` | iteração (passo 4) |

### 2. Elicitar (source=user)
**Esta fase exige interação. Não pule.** Faça as perguntas na ordem, uma categoria por vez. Use os desdobramentos quando a resposta vier vaga e aceite "não se aplica".

| # | Categoria | Pergunta | Desdobramentos e exemplos |
|---|-----------|----------|---------------------------|
| 1 | Funcional | O que o sistema deve FAZER? | Quem usa essa funcionalidade? Qual o gatilho da ação? |
| 2 | Restrições | Existem RESTRIÇÕES técnicas ou de negócio? | tempo máximo de resposta, integrações obrigatórias, limites da stack |
| 3 | Não funcionais | Quais requisitos NÃO FUNCIONAIS importam? | desempenho (latência, vazão), segurança (autenticação, autorização), escalabilidade |
| 4 | Aceite | Como sabemos que está PRONTO? | critérios em Dado/Quando/Então |
| 5 | Suposições | Que SUPOSIÇÕES estamos fazendo? | registrar para validar depois |
| 6 | Modelo de domínio | Quais ENTIDADES e RELACIONAMENTOS existem? | objetos principais, como se relacionam, atributos obrigatórios ("Usuário tem muitos Pedidos") |
| 7 | Interação | Como o USUÁRIO INTERAGE com o sistema? | fluxo principal, telas ou componentes, estados de carregamento, erro e vazio |
| 8 | Casos de borda | O que acontece quando algo DÁ ERRADO? | rede falha, usuário sem permissão, dados inválidos, serviço externo fora do ar |
| 9 | Terminologia | Existe GLOSSÁRIO ou termo específico do domínio? | termos com sentido próprio, sinônimos a padronizar ("Cliente" ou "Usuário"?) |

Terminologia inconsistente causa bugs e confusão: insista na categoria 9 quando o mesmo conceito aparecer com nomes diferentes.

Exemplo:
```text
Entrada: "Quero adicionar login com Google"
1. Funcional → permitir login com conta Google
2. Restrições → OAuth 2.0; não armazenar senhas
3. Não funcionais → login completo em menos de 3 segundos
4. Aceite → Dado o usuário na página de login, quando clica em "Entrar com Google",
   então é redirecionado ao Google e, depois de autorizar, está logado no sistema
```

### 3. Extrair do PRD (source=prd)
1. Leia o PRD indicado (`docs/prd.md` ou o fragmento em `docs/prd/`).
2. Extraia: stories e funcionalidades → FR; critérios de aceite → `acceptance` de cada FR; restrições técnicas e de negócio → CON; requisitos não funcionais → NFR.
3. Valide: toda descrição clara; requisitos ambíguos marcados e perguntados ao usuário; coerência com os objetivos do PRD.

### 4. Iterar (source=existing)
1. Carregue o `requirements.json` existente.
2. Preserve todos os IDs. Itens novos continuam a sequência; nunca renumere nem reutilize ID.
3. Pergunte só o que mudou ou o que ficou em aberto (`openQuestions`).

### 5. Estruturar o requirements.json
```json
{
  "storyId": "2.1",
  "gatheredAt": "2026-10-16T14:30:00-03:00",
  "source": "user",
  "gatheredBy": "@pm [Produto]",
  "elicitationVersion": "2.0",
  "functional": [
    { "id": "FR-1", "description": "Permitir login com conta Google", "priority": "P0",
      "rationale": "Reduzir o atrito do cadastro",
      "acceptance": ["Dado o usuário na página de login, quando clica em Entrar com Google, então é redirecionado ao Google"] }
  ],
  "nonFunctional": [
    { "id": "NFR-1", "category": "performance", "description": "Login completo em menos de 3 segundos", "metric": "p95 < 3 s" }
  ],
  "constraints": [
    { "id": "CON-1", "type": "technical", "description": "Usar OAuth 2.0 e não armazenar senhas", "impact": "Sem tabela de senhas" }
  ],
  "assumptions": [
    { "id": "ASM-1", "description": "Todo usuário tem conta Google ativa", "risk": "medium",
      "riskIfWrong": "Usuários sem conta Google ficam sem acesso", "validationNeeded": true }
  ],
  "domainModel": [
    { "id": "DM-1", "entity": "Usuário", "description": "Pessoa autenticada", "attributes": ["email", "nome"],
      "relationships": ["has_many Sessão"] }
  ],
  "interactions": [
    { "id": "INT-1", "flow": "Login com Google", "description": "Fluxo principal de entrada",
      "trigger": "clique em Entrar com Google", "steps": ["redireciona ao Google", "volta autenticado"],
      "states": { "loading": "botão desabilitado com indicador", "error": "mensagem com nova tentativa", "empty": "não se aplica" } }
  ],
  "edgeCases": [
    { "id": "EC-1", "scenario": "Google fora do ar", "handling": "mensagem clara e nova tentativa", "severity": "high" }
  ],
  "terminology": [
    { "term": "Conta vinculada", "definition": "Conta Google associada ao usuário", "aliases": [], "avoid": ["perfil social"] }
  ],
  "openQuestions": [
    { "id": "OQ-1", "question": "Usuários antigos podem vincular a conta Google?", "blocking": true, "owner": "@pm" }
  ]
}
```

Regras do formato:
- Obrigatórios: `storyId`, `gatheredAt`, `source` e `functional` com pelo menos 1 item.
- IDs em sequência e nunca reutilizados: `FR-n`, `NFR-n`, `CON-n`, `ASM-n`, `DM-n`, `INT-n`, `EC-n`, `OQ-n`.
- `description` com pelo menos 10 caracteres.
- `priority`: `P0` (essencial), `P1` ou `P2` (desejável).
- `nonFunctional.category`: `performance`, `security`, `scalability`, `usability` ou `reliability`.
- `constraints.type`: `technical`, `business` ou `regulatory`.
- `assumptions.risk`: `low`, `medium` ou `high`; `edgeCases.severity`: `critical`, `high`, `medium` ou `low`.
- `domainModel.relationships`: `has_many`, `belongs_to` ou `has_one` seguido da entidade.
- `acceptance`: critérios completos em Dado/Quando/Então (são a base dos testes da spec).

### 6. Validar e gravar
1. Aplique as verificações de "Tratamento de erros".
2. Grave `docs/stories/{storyId}/spec/requirements.json`.
3. Resuma: "{n} FR, {n} NFR, {n} CON, {n} perguntas em aberto ({n} bloqueantes)".

## Saída
`docs/stories/{storyId}/spec/requirements.json` no formato do passo 5, com todos os requisitos identificados e rastreáveis por ID.

## Critérios de conclusão
- [ ] Pelo menos um requisito funcional
- [ ] Todo FR com prioridade e critérios de aceite (ou sugestão aprovada pelo usuário)
- [ ] As 9 categorias perguntadas (source=user) ou cobertas pela extração (source=prd)
- [ ] IDs únicos e em sequência; IDs anteriores preservados na iteração
- [ ] Arquivo gravado no caminho da spec

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `functional` vazio depois da elicitação | Pergunte de novo até ter pelo menos um requisito funcional (bloqueante) |
| Descrição com menos de 10 caracteres | Peça esclarecimento |
| FR sem critério de aceite | Sugira critérios Dado/Quando/Então para o usuário aprovar |
| Requisito ambíguo extraído do PRD | Marque e pergunte ao usuário antes de gravar |
| `requirements.json` já existe | Itere (source=existing), preservando os IDs |

## Handoff
- Próximo: `@dev *assess-complexity {storyId}` (fase 2, chapéu Arquitetura).
- Pedido declarado simples pelo usuário (complexidade SIMPLE): pule a avaliação e siga para `@pm *write-spec {storyId}`.
