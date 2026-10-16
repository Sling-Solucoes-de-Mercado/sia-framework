<!--
Template de ADR (registro de decisão de arquitetura) do SIA.
Usado por: @dev [Arquitetura] em *create-adr {título}. Registre a decisão antes de implementá-la (guia de autoria, seção 4.2).
Saída: docs/architecture/adr/ADR-{nnn}-{slug}.md, com {nnn} = próximo número livre, em 3 dígitos.

Como preencher:
- Troque cada {{placeholder}} pelo valor real e apague este comentário no arquivo gerado.
- Linhas e blocos marcados com "repita" se repetem para cada item.
- Seções sem conteúdo: use o texto indicado no comentário da seção.

Placeholders:
  {{number}}                número do ADR com 3 dígitos (ex.: 007)
  {{title}}                 título da decisão
  {{status}}                Proposed | Accepted | Deprecated | Superseded (padrão: Proposed)
  {{date}}                  data da decisão (AAAA-MM-DD)
  {{deciders}}              quem participou da decisão, separado por vírgula
  {{context}}               contexto e problema que levaram à decisão
  {{decision}}              a decisão tomada
  {{positive_consequence}}  consequência positiva
  {{negative_consequence}}  consequência negativa ou trade-off
  {{n}}                     número da alternativa (1, 2, 3...)
  {{alternative_name}}      nome da alternativa considerada
  {{alternative_description}} descrição da alternativa
  {{pros}} / {{cons}}       prós e contras da alternativa
  {{why_not}}               por que a alternativa não foi escolhida
  {{related_number}}        número do ADR relacionado (3 dígitos)
  {{related_slug}}          slug do ADR relacionado
  {{related_title}}         título do ADR relacionado
  {{reference}}             referência externa (link, documento, issue)
-->

# ADR {{number}}: {{title}}

**Status:** {{status}}
**Data:** {{date}}
**Decisores:** {{deciders}}

---

## Contexto

{{context}}

---

## Decisão

{{decision}}

---

## Consequências

### Positivas

<!-- repita -->
- ✅ {{positive_consequence}}

### Negativas

<!-- repita; sem nenhuma: "_Nenhuma consequência negativa relevante identificada._" -->
- ⚠️ {{negative_consequence}}

---

## Alternativas Consideradas

<!-- Opcional: apague a seção quando nenhuma alternativa foi avaliada. Repita o bloco para cada alternativa. -->

### Opção {{n}}: {{alternative_name}}

{{alternative_description}}

| Aspecto | Detalhes |
|---------|----------|
| **Prós** | {{pros}} |
| **Contras** | {{cons}} |
| **Por que não foi escolhida** | {{why_not}} |

---

## Decisões Relacionadas

<!-- repita; sem nenhuma: "_Nenhuma decisão relacionada._" -->
- [ADR {{related_number}}](./ADR-{{related_number}}-{{related_slug}}.md): {{related_title}}

---

## Referências

<!-- repita; sem nenhuma: "_Nenhuma referência externa._" -->
- {{reference}}
