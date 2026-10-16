---
id: design-squad
title: Desenhar um squad a partir de documentação
agent: squad-creator
elicit: true
modes: [yolo, interactive]
inputs:
  - '--docs (opcional): caminhos separados por vírgula (md, yaml, json); sem isso, a task pergunta'
  - '--domain (opcional): dica de domínio para orientar a análise'
  - '--output (opcional): pasta do blueprint (padrão: squads/.designs/)'
  - '--quick (opcional): aceita as recomendações sem revisão (modo YOLO)'
  - '--force (opcional): sobrescreve um blueprint existente'
outputs:
  - 'squads/.designs/{nome}-design.yaml (blueprint do squad)'
  - 'Resumo das recomendações com a confiança geral'
depends_on:
  data: [sia-authoring-guide.md, decision-heuristics-framework.md, tier-system-framework.md]
next: [create-squad]
source: [squad-creator-design.md]
---

# Desenhar um squad a partir de documentação

## Objetivo

Analisar a documentação de um domínio e conduzir o desenho do squad: agentes, tasks e estrutura recomendados, revisados com o usuário e gravados num blueprint que o `*create-squad --from-design` consome.

## Quando usar

- Existe documentação do domínio (PRD, especificação, processo descrito) e você quer recomendações de agentes e tasks.
- Não use quando a estrutura já está decidida: vá direto para `*create-squad {nome}`.
- Não use para um único agente ou task: use `*create-agent` ou `*create-task`.

## Pré-condições

- [ ] Documentação disponível: arquivos legíveis (md, yaml, json), texto colado ou descrição do domínio
- [ ] Pasta de squads gravável (`squads.location` do `core-config.yaml`)

## Modos

| Modo | Interação | Nesta task |
|------|-----------|------------|
| YOLO (`--quick`) | 1 pergunta (a documentação, se faltar) | Aceita as recomendações com confiança de 0,5 ou mais e registra as decisões em `metadata.decisions` do blueprint |
| Interativo (padrão) | um checkpoint por fase | Confirma o domínio, revisa agente por agente e task por task, aceita adições |

## Passos

### 1. Coletar a documentação

Com `--docs`, leia cada arquivo por inteiro. Sem `--docs`:

**Ponto de elicitação:** Como você quer fornecer a documentação?

1. Colar o texto aqui
2. Informar caminhos de arquivo (separados por vírgula)
3. Descrever o domínio em palavras

Junte as fontes num único material de análise e guarde os caminhos para `metadata.source_docs`. Com `--domain`, use a dica para desempatar termos ambíguos.

### 2. Analisar o domínio

Extraia, guardando o trecho de origem de cada item:

| Elemento | Como identificar | Resultado |
|----------|------------------|-----------|
| Entidades | substantivos e termos que se repetem; agrupe conceitos relacionados | `entities[]` |
| Workflows | verbos de ação (criar, atualizar, processar, aprovar), processos em sequência, padrão entrada → processamento → saída | `workflows[]` em kebab-case (ex.: `create-order`) |
| Integrações | APIs, bancos, serviços e terceiros citados | `integrations[]` |
| Stakeholders | papéis e personas (admin, cliente, gestor) | `stakeholders[]` |

Nada extraído: pare com `EMPTY_ANALYSIS` (ver Tratamento de erros).

### 3. Confirmar o domínio

Mostre o domínio, as entidades e os workflows numerados.

**Ponto de elicitação:** O entendimento está correto?

1. Sim, seguir
2. Ajustar (diga o que mudar)
3. Recomeçar com mais documentação

### 4. Checar o escopo (gate SC_SCP_001)

Aplique o gate de escopo de `data/decision-heuristics-framework.md`, seção 10:

| Condição | Decisão |
|----------|---------|
| 10 workflows ou mais | VETO: PRD obrigatório; encaminhe para `@pm *create-prd`, com epics por tier |
| 8 agentes previstos ou mais | VETO: roadmap obrigatório (PRD com implementação em fases) |
| nenhum squad parecido e 5 workflows ou mais | AVISO: recomende PRD; o usuário decide seguir |
| demais casos | seguir |

Para saber se existe squad parecido, rode `sia squad list` e compare os domínios.

### 5. Recomendar agentes

Antes de recomendar, aplique REUSE > ADAPT > CREATE:

- Trabalho técnico de software (código, arquitetura, banco, UI) já é do `@dev`; stories e QA gate são do `@pm`. Não recomende agentes para isso.
- Procure agentes parecidos em `squads/*/agents/` (compare `whenToUse` e `persona.role`). Reaproveite ou adapte em vez de duplicar.

Depois, agrupe os workflows pela categoria da ação:

| Categoria | Verbos | Agente sugerido |
|-----------|--------|-----------------|
| gestão | create, update, delete, add, remove, edit | `{domínio}-manager` |
| processamento | process, transform, migrate, sync, import, export | `{domínio}-processor` |
| atendimento | demais | `{domínio}-handler` |

Regras:

- No máximo 6 comandos por agente. Agentes com mais de 70% de sobreposição de comandos viram um só.
- Menos é mais: prefira um agente com mais comandos a vários agentes pequenos.
- Só entidades, sem workflows claros: recomende `{entidade}-manager` com create, update, delete e list (confiança 0,65).
- Confiança: 0,6 + 0,05 por workflow + 0,1 se tiver mais de 3 comandos, no máximo 0,95. Descarte recomendações abaixo de 0,5.
- Classifique cada agente com a árvore de `data/tier-system-framework.md` (seção 3). Validação e checklist viram ferramenta, não agente.

**Ponto de elicitação (um por agente):** Agente {n} de {total}, com id, papel, comandos, tier e confiança.

1. Aceitar
2. Rejeitar
3. Modificar
4. Pular para as tasks

### 6. Recomendar tasks

Para cada comando aceito, proponha uma task `{comando}.md` no formato do guia de autoria (seção 8): entradas a partir das entradas do workflow, saídas a partir das saídas, passos a partir das etapas descritas. Confiança: 0,5 + 0,1 por entrada + 0,1 por saída, no máximo 0,95.

**Ponto de elicitação (por agente):** Tasks de {agente}, com entradas, saídas e confiança.

1. Aceitar todas
2. Revisar uma a uma
3. Rejeitar todas

### 7. Adições do usuário

**Ponto de elicitação:** Quer acrescentar algo que não foi recomendado?

1. Adicionar agente
2. Adicionar task
3. Seguir para o blueprint

Adições entram com `user_added: true`; recomendações alteradas, com `user_modified: true`.

### 8. Gerar o blueprint

Escolha o template de estrutura: `etl` se alguma task processa, transforma, importa ou exporta dados; `agent-only` se não houver tasks; `basic` nos demais casos. Use `config_mode: extend`. A confiança geral é a média das confianças de agentes e tasks.

Grave em `{output}/{nome}-design.yaml` (padrão `squads/.designs/`), com o nome do squad derivado do domínio, em kebab-case. Se o arquivo existir e não houver `--force`:

**Ponto de elicitação:** Já existe um blueprint com esse nome.

1. Sobrescrever
2. Salvar com outro nome
3. Cancelar

### 9. Mostrar o resumo

Mostre agentes (recomendados e adicionados), tasks, ajustes do usuário, confiança geral, caminho do blueprint e os próximos passos: revisar o arquivo, editar o blueprint se quiser e rodar `*create-squad {nome} --from-design {caminho}`.

## Saída

Blueprint em `squads/.designs/{nome}-design.yaml`:

```yaml
squad:
  name: order-management
  description: Gerado a partir da análise de docs/prd.md
  domain: order-management
analysis:
  entities: [Order, Customer, Payment]
  workflows: [create-order, process-payment, track-shipment]
  integrations: [API de pagamentos]
  stakeholders: [cliente, operador]
recommendations:
  agents:
    - id: order-manager
      role: Gerencia o ciclo de vida dos pedidos
      tier: 1
      commands: [create-order, update-order, cancel-order]
      confidence: 0.92
      user_added: false
      user_modified: false
  tasks:
    - name: create-order
      agent: order-manager
      inputs: [customer_id, items, payment_method]
      outputs: [order_id, status, total]
      confidence: 0.88
  template: basic            # basic | etl | agent-only
  config_mode: extend        # extend | override | none
metadata:
  created_at: '2026-10-16T14:00:00-03:00'
  source_docs: [docs/prd.md]
  user_adjustments: 2
  overall_confidence: 0.87
  decisions: []              # modo YOLO: decisões automáticas
```

## Critérios de conclusão

- [ ] Toda recomendação rastreia para um trecho da documentação (sem invenção)
- [ ] Gate de escopo aplicado e o resultado registrado
- [ ] Agentes com tier, no máximo 6 comandos e confiança de 0,5 ou mais
- [ ] Blueprint gravado com YAML válido
- [ ] Próximos passos mostrados

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `NO_DOCUMENTATION`: nenhuma entrada | Volte ao ponto de elicitação do passo 1 |
| `PARSE_ERROR`: arquivo ilegível | Informe o arquivo e os formatos aceitos (md, yaml, json) e peça outro |
| `EMPTY_ANALYSIS`: nenhum conceito extraído | Peça documentação mais detalhada ou a descrição dos processos |
| `BLUEPRINT_EXISTS` | Ponto de elicitação do passo 8, ou `--force` |
| Gate de escopo em VETO | Pare; ofereça `@pm *create-prd`. Grave o blueprint parcial só se o usuário pedir |

## Handoff

Próximo passo: `@squad-creator *create-squad {nome} --from-design squads/.designs/{nome}-design.yaml`.
