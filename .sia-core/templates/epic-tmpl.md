<!--
Template de epic do SIA.
Usado por: @pm [Produto] em *create-epic. Atualizado por @pm [Product Owner] em *close-story (tabela de stories e progresso).
Saída: docs/prd/epic-{n}-{slug}.md (guia de autoria, seção 5.2).

Como preencher:
- Troque cada {{placeholder}} pelo valor real e apague este comentário no arquivo gerado.
- Linhas marcadas com "repita" (em comentário) se repetem para cada item.
- Seções opcionais (Valor de Negócio, Partes Interessadas, Contexto do Sistema Existente, Requisitos de
  Compatibilidade, Planejamento): apague quando não houver conteúdo.
- Demais seções sem conteúdo: escreva o texto indicado no comentário da seção (ex.: "_Nenhum risco identificado._").

Placeholders:
  {{epic_num}}             número do epic (ex.: 3)
  {{epic_title}}           título do epic
  {{status}}               Planning | InProgress | Done | OnHold | Cancelled (padrão: Planning)
  {{owner}}                responsável pelo epic (ex.: @pm (Mira) [Produto])
  {{created}}              data de criação (AAAA-MM-DD)
  {{updated}}              data da última atualização (AAAA-MM-DD; apague a linha na criação)
  {{objective}}            objetivo principal do epic: o que entrega e por que agrega valor
  {{business_value}}       valor de negócio entregue
  {{stakeholder}}          parte interessada
  {{existing_context}}     funcionalidade atual relevante, tecnologias envolvidas e pontos de integração
  {{in_scope_item}}        item dentro do escopo
  {{out_of_scope_item}}    item fora do escopo
  {{story_num}}            número da story dentro do epic
  {{story_slug}}           título curto da story em kebab-case, sem acentos
  {{story_title}}          título da story
  {{executor}}             @dev [Desenvolvimento | Dados | UX/UI | Arquitetura], @devops (infraestrutura) ou @pm [Análise] (pesquisa)
  {{story_status}}         Draft | Ready | InProgress | InReview | Done (padrão: Draft)
  {{gate}}                 veredito do QA gate: PASS | CONCERNS | FAIL | WAIVED ("-" até o *qa-gate)
  {{done_count}}           quantidade de stories em Done
  {{total_count}}          quantidade total de stories do epic
  {{story_description}}    descrição curta da story
  {{inspection}}           @validator (*revisar-feature) ou "não se aplica (entregável documental)" em story de pesquisa
  {{review_focus}}         foco da revisão (ex.: RLS e migração segura; acessibilidade)
  {{sprint_num}}           número da sprint
  {{sprint_goal}}          objetivo da sprint
  {{sprint_story}}         story planejada na sprint (ex.: 3.2)
  {{success_criterion}}    critério de sucesso do epic
  {{metric}} / {{target}}  métrica e meta do critério (opcional)
  {{technical_requirement}} requisito técnico
  {{compatibility_requirement}} requisito de compatibilidade com o sistema existente
  {{risk}}                 risco
  {{impact}}               Alto | Médio | Baixo (padrão: Médio)
  {{mitigation}}           mitigação ("_A definir_" quando não houver)
  {{rollback_plan}}        como desfazer a mudança se algo der errado
  {{depends_on}}           epic, story ou recurso de que este epic depende
  {{blocks}}               epic ou story que este epic bloqueia
  {{doc_type}}             tipo de documento (PRD, arquitetura, spec, ADR...)
  {{doc_location}}         caminho do documento
  {{doc_status}}           Pendente | Em andamento | Concluído (padrão: Pendente)
  {{version}}              versão do epic (1.0 na criação)
  {{change_description}}   descrição da mudança
  {{author}}               autor da mudança, no formato @agente [Chapéu] (ex.: @pm [Produto])
-->

# Epic {{epic_num}}: {{epic_title}}

**Status:** {{status}}
**Responsável:** {{owner}}
**Criado em:** {{created}}
**Atualizado em:** {{updated}}

---

## Objetivo

{{objective}}

## Valor de Negócio

{{business_value}}

## Partes Interessadas

<!-- repita -->
- {{stakeholder}}

## Contexto do Sistema Existente

<!-- Opcional: evolução em projeto existente. -->

{{existing_context}}

---

## Escopo

<!-- Sem escopo definido: "_Escopo a definir._" -->

### Dentro

<!-- repita -->
- {{in_scope_item}}

### Fora

<!-- repita; apague a subseção quando não houver itens fora do escopo -->
- {{out_of_scope_item}}

---

## Stories

<!-- O *close-story atualiza esta tabela (Status e Gate da story, com o marcador [closure-key: ...]) e a linha de Progresso.
     Sem stories previstas: "_Stories a definir._" -->

| storyId | Título | Executor | Status | Gate |
|---------|--------|----------|--------|------|
| [{{epic_num}}.{{story_num}}](../stories/{{epic_num}}.{{story_num}}-{{story_slug}}.story.md) | {{story_title}} | {{executor}} | {{story_status}} | {{gate}} |

**Progresso:** {{done_count}} de {{total_count}} stories Done

### Detalhe das Stories Previstas

<!-- repita para cada story -->
- **{{epic_num}}.{{story_num}} {{story_title}}:** {{story_description}} Inspeção: {{inspection}}. Foco da revisão: {{review_focus}}.

Em todas as stories, o gate de qualidade é do @pm [Qualidade]; a inspeção técnica é do @validator (`*revisar-feature`), salvo em story de pesquisa, cujo entregável é só documento.

---

## Planejamento

<!-- Opcional. Para executar o epic em ondas com *execute-epic, o plano fica em docs/prd/epic-{n}-execution.yaml. -->

### Sprint {{sprint_num}}

**Objetivo:** {{sprint_goal}}

**Stories:**
<!-- repita -->
- {{sprint_story}}

---

## Critérios de Sucesso

<!-- repita; sem critérios definidos: "_Critérios de sucesso a definir._" -->
- [ ] {{success_criterion}} ({{metric}}: {{target}})

---

## Requisitos Técnicos

<!-- repita; sem requisitos definidos: "_Requisitos técnicos a definir._" -->
- {{technical_requirement}}

## Requisitos de Compatibilidade

<!-- Opcional: evolução em projeto existente. Cubra APIs existentes, schema do banco, padrões de UI e desempenho. Repita. -->
- {{compatibility_requirement}}

---

## Riscos

<!-- Sem riscos: "_Nenhum risco identificado._" -->

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| {{risk}} | {{impact}} | {{mitigation}} |

**Plano de rollback:** {{rollback_plan}}

---

## Dependências

<!-- Sem dependências: "_Nenhuma dependência._" -->

**Depende de:**
<!-- repita -->
- {{depends_on}}

**Bloqueia:**
<!-- repita; apague o bloco quando não bloquear nada -->
- {{blocks}}

---

## Definição de Pronto

- [ ] Todas as stories em Done, com os critérios de aceite atendidos
- [ ] Funcionalidade existente verificada por testes, sem regressão
- [ ] Pontos de integração funcionando
- [ ] Documentação atualizada

---

## Documentação

<!-- Sem documentação prevista: "_Documentação a definir._" -->

| Tipo | Local | Status |
|------|-------|--------|
| {{doc_type}} | {{doc_location}} | {{doc_status}} |

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| {{created}} | 1.0 | Epic criado | @pm [Produto] |
<!-- repita para cada mudança -->
| {{updated}} | {{version}} | {{change_description}} | {{author}} |
