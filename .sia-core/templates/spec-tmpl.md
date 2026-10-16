<!--
Template da spec do Spec Pipeline do SIA.
Usado por: @pm [Produto] em *write-spec {storyId} (fase 4). Criticada por @pm [Qualidade] em *critique-spec (fase 5).
Saída: docs/stories/{storyId}/spec/spec.md (guia de autoria, seção 5.2).

Artigo IV (Sem Invenção): toda afirmação rastreia para um requisito funcional (FR-*), um requisito não funcional
(NFR-*), uma restrição (CON-*) ou um achado de pesquisa verificado (research.json). Feche cada trecho derivado com
a marca de rastreio, ex.: _Derivado de FR-1 e de research.json (google-auth-library)_. Sem rastro, a afirmação sai
da spec ou vai para "Afirmações Não Verificadas".

Como preencher:
- Troque cada {{placeholder}} pelo valor real e apague este comentário no arquivo gerado.
- Linhas marcadas com "repita" se repetem para cada item. Preserve os IDs de requirements.json.
- Seções sem conteúdo: use o texto indicado no comentário da seção.

Placeholders principais:
  {{story_id}} / {{story_title}}  storyId (ex.: 2.1) e título da story
  {{timestamp}}                   data e hora ISO 8601 da geração
  {{complexity}}                  SIMPLE | STANDARD | COMPLEX (de complexity.json) ou "não avaliada"
  {{phases}}                      fases executadas (ex.: gather → spec → critique)
  {{status}}                      Draft na geração; o *critique-spec registra APPROVED | NEEDS_REVISION | BLOCKED
  {{iteration}}                   1 na geração; +1 a cada revisão depois da crítica (no máximo 2 revisões)
  {{fr_id}} / {{nfr_id}} / {{con_id}}  identificadores de requirements.json (FR-1, NFR-1, CON-1...)
  {{trace_ref}}                   rastro do trecho: FR-*, NFR-*, CON-* ou achado de research.json
-->

# Spec: {{story_title}}

> **Story:** {{story_id}}
> **Gerada em:** {{timestamp}}
> **Complexidade:** {{complexity}}
> **Fases do pipeline:** {{phases}}
> **Status:** {{status}}
> **Iteração:** {{iteration}}

---

## 1. Visão Geral

### 1.1 Resumo

{{overview_summary}}

_Derivado de {{trace_ref}}_

### 1.2 Objetivos

<!-- repita -->
- {{goal}} _Derivado de {{trace_ref}}_

### 1.3 Fora dos Objetivos

<!-- repita -->
- {{non_goal}} _Derivado de {{trace_ref}}_

---

## 2. Resumo dos Requisitos

### 2.1 Requisitos Funcionais

| ID | Descrição | Prioridade | Critério de aceite |
|----|-----------|------------|--------------------|
| {{fr_id}} | {{description}} | {{priority}} | {{acceptance}} |

### 2.2 Requisitos Não Funcionais

| ID | Categoria | Requisito | Meta |
|----|-----------|-----------|------|
| {{nfr_id}} | {{category}} | {{requirement}} | {{target}} |

### 2.3 Restrições

<!-- repita -->
- **{{con_id}} {{name}}:** {{description}}

### 2.4 Premissas

<!-- repita -->
- {{assumption}}

---

## 3. Abordagem Técnica

### 3.1 Visão da Arquitetura

{{architecture_overview}}

_Derivado de {{trace_ref}}_

### 3.2 Decisões-Chave

<!-- repita -->
- **{{decision}}:** {{rationale}} _Derivado de {{trace_ref}}_

### 3.3 Padrões a Usar

<!-- repita; só padrões pesquisados -->
- {{pattern_name}}: {{pattern_description}} _Derivado de {{trace_ref}}_

### 3.4 Estratégia de Implementação

{{implementation_strategy}}

---

## 4. Dependências

### 4.1 Dependências Externas

| Nome | Versão | Propósito | Verificada |
|------|--------|-----------|------------|
| {{name}} | {{version}} | {{purpose}} | {{verified}} |

### 4.2 Dependências Internas

<!-- repita -->
- `{{path}}`: {{purpose}}

### 4.3 Afirmações Não Verificadas

<!-- repita; sem nenhuma: "_Nenhuma afirmação não verificada._" -->
- ⚠️ {{claim}}: {{reason}}

---

## 5. Arquivos a Criar ou Modificar

### 5.1 Arquivos Novos

<!-- repita -->
- `{{path}}`: {{purpose}}

### 5.2 Arquivos Modificados

<!-- repita -->
- `{{path}}`: {{changes}}

### 5.3 Arquivos Removidos

<!-- repita; sem remoções: "_Nenhum arquivo a remover._" -->
- `{{path}}`: {{reason}}

---

## 6. Estratégia de Testes

<!-- Pelo menos um teste por FR, com critério em Dado/Quando/Então; teste de NFR quando mensurável. -->

### 6.1 Testes Unitários

<!-- repita -->
- {{unit_test}} (cobre {{fr_id}})

### 6.2 Testes de Integração

<!-- repita -->
- {{integration_test}} (cobre {{fr_id}})

### 6.3 Testes E2E

<!-- repita; sem E2E: "_Nenhum teste E2E necessário._" -->
- {{e2e_test}} (cobre {{fr_id}})

### 6.4 Verificação Manual

<!-- repita -->
- [ ] {{manual_check}}

---

## 7. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| {{risk}} | {{probability}} | {{impact}} | {{mitigation}} |

---

## 8. Questões em Aberto

<!-- repita, numerando Q1, Q2...; sem questões: "_Nenhuma questão em aberto._" -->
- [ ] **Q{{n}}:** {{question}}
  - Contexto: {{context}}
  - Responsável: {{owner}}
  - Bloqueante: {{blocking}}

---

## Metadados

```yaml
spec:
  version: '1.0'
  generatedBy: spec-pipeline
  generatedAt: '{{timestamp}}'
  iteration: {{iteration}}

inputs:
  requirements: docs/stories/{{story_id}}/spec/requirements.json
  complexity: docs/stories/{{story_id}}/spec/complexity.json
  research: docs/stories/{{story_id}}/spec/research.json

status: '{{status}}'
```

---

_Gerada pelo Spec Pipeline do SIA._
