---
id: validate-story
title: Validar a story (checklist de 10 pontos)
agent: pm
hat: owner
elicit: true
modes: [yolo, interactive]
inputs:
  - 'storyId: id da story em Draft (ex.: 2.1)'
outputs:
  - 'Relatório de validação: nota de 0 a 10, confiança, problemas por gravidade e decisão GO ou NO-GO'
  - 'GO: Status Draft → Ready e linha no Change Log'
  - 'NO-GO: Status mantido em Draft, linha no Change Log e lista de correções obrigatórias'
depends_on:
  tasks: [create-story.md]
  templates: [story-tmpl.yaml, agent-handoff-tmpl.yaml]
next: [develop, validate-story]
source: [validate-next-story.md]
---

# Validar a story (checklist de 10 pontos)

## Objetivo

Validar um rascunho de story antes da implementação: completo, correto, rastreável às fontes e com contexto suficiente para o executor. A validação previne alucinação e confirma a prontidão para implementar. GO move a story de `Draft` para `Ready`.

## Quando usar

- Toda story em `Draft`, antes do `*develop`.
- Depois de corrigir uma story que recebeu NO-GO (revalidação completa, do zero).
- Não use para mudar status de story fora de `Draft`: a validação só aplica a transição `Draft` → `Ready`.

## Pré-condições

- [ ] Story existe em `docs/stories/{storyId}-*.story.md`
- [ ] Status `Draft` (em outro status, gere só o relatório, sem transição)
- [ ] Epic de origem acessível (em brownfield, a fonte citada na story)

## Modos

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Valida, decide e aplica o resultado sem perguntas. No NO-GO, só lista as correções. |
| Interativo (padrão) | Mostra o relatório e, no NO-GO, oferece corrigir agora e revalidar do zero. |

## Passos

### 1. Carregar as entradas e declarar o chapéu

1. Declare `[Chapéu: Product Owner]`.
2. Leia `.sia-core/core-config.yaml`: caminhos de stories, PRD e arquitetura, e `quality.storyValidation.minScore` (padrão 7).
3. Carregue: a story; o epic pai (`docs/prd/epic-{n}-*.md`); os documentos de arquitetura citados (fragmentados ou monolítico); `templates/story-tmpl.yaml`; o `## Registro do Dev` das stories anteriores do mesmo epic, para o contexto acumulado.
4. Separação de chapéus (seção 4.2 do guia de autoria): se o Change Log mostra que a story foi criada pelo `@pm [Scrum]`, valide com o checklist completo, sem atalhos e sem leniência. Ser story própria não muda nenhuma nota.

### 2. Conformidade com o template

- Seções canônicas (seção 6.1 do guia) presentes, na ordem e com os títulos exatos.
- Nenhum placeholder sem preencher (`{{...}}`, `{epic}`, `_TBD_`, `TODO`).
- Seções dos outros agentes presentes para uso futuro: `## Registro do Dev` com as cinco subseções, `## Resultado do QA` e `## Change Log`.
- Em `## Status`, a primeira linha não vazia contém só o valor.

### 3. Executor

- `Executor`, `Gate de qualidade` e `Inspeção` presentes e preenchidos.
- Executor e gate nunca são o mesmo agente com o mesmo chapéu.
- Executor coerente com o conteúdo, pela tabela do passo 6 de `create-story.md`: as palavras-chave dos critérios e os arquivos citados batem com o tipo de trabalho.
- Inspeção: `@validator (*revisar-feature)`.
- Complexidade registrada.

Qualquer falha neste passo é problema crítico.

### 4. Arquivos e estrutura

- Os arquivos novos e existentes a criar ou modificar estão claros?
- A parte relevante da estrutura do projeto está em Dev Notes?
- Diretórios novos ficam no lugar certo segundo `source-tree.md`?
- As tasks criam os arquivos numa ordem lógica?
- Os caminhos batem com a arquitetura? Confira no repositório (glob/ls) os que já deveriam existir.

### 5. Interface (quando houver UI)

- Componentes especificados o bastante para implementar
- Orientação visual clara
- Fluxos de interação e comportamentos definidos
- Responsividade e acessibilidade tratadas, quando exigidas
- Pontos de integração entre front-end e back-end claros

### 6. Critérios de aceite

- Cobertura: as tasks atendem todos os critérios?
- Testabilidade: cada critério é mensurável, em Dado/Quando/Então?
- Cenários faltando: casos de borda e de erro?
- "Pronto" definido para cada critério?
- Cada task aponta o critério que atende, `(CA: n)`?

### 7. Testes

- Abordagem de teste clara (unitário, integração, e2e)
- Cenários principais identificados
- Passos para verificar cada critério
- Ferramentas e frameworks indicados
- Dados de teste necessários identificados

### 8. Segurança (quando aplicável)

- Requisitos de segurança identificados
- Autenticação e autorização especificadas
- Tratamento de dado sensível claro
- Vulnerabilidades comuns consideradas
- Requisitos regulatórios ou de conformidade tratados

### 9. Sequência das tasks

- Ordem lógica de implementação
- Dependências entre tasks claras e corretas
- Granularidade adequada e acionável
- Tasks cobrem todos os requisitos e critérios
- Nenhuma task bloqueia outra sem necessidade

### 10. Anti-alucinação

- Toda afirmação técnica rastreia para um documento de origem (`[Fonte: ...]`).
- Dev Notes batem com a arquitetura.
- Nenhuma biblioteca, padrão ou norma inventada: decisão técnica sem fonte é sinalizada.
- Referências corretas e acessíveis: abra cada arquivo e seção citados.
- Afirmações conferidas contra o epic, a arquitetura e o contexto acumulado do epic.
- Busque no código (grep/glob) funcionalidade que a story duplicaria. Duplicidade provável é problema a corrigir, não bloqueio.

### 11. Prontidão para implementação

- A story é autossuficiente: o executor não precisa ler documentos além dos `devLoadAlwaysFiles`?
- As instruções não têm ambiguidade?
- O contexto técnico em Dev Notes está completo?
- Há lacuna crítica de informação?
- Todas as tasks são executáveis pelo executor definido?

### 12. Pontuar e decidir

Cada item vale 1 ponto quando atendido por inteiro. Item parcial não pontua.

| # | Item | Atende quando |
|---|------|---------------|
| 1 | Título | claro e objetivo, descreve o resultado |
| 2 | Descrição | problema ou necessidade explicados em `## Story` |
| 3 | Critérios de aceite | numerados, testáveis, em Dado/Quando/Então |
| 4 | Escopo | `### Dentro` e `### Fora` preenchidos |
| 5 | Dependências | stories e recursos pré-requisito mapeados, ou "Nenhuma" explícito |
| 6 | Complexidade | estimativa registrada (Baixa, Média ou Alta; pontos ou tamanho) |
| 7 | Valor de negócio | benefício para o usuário ou para o negócio claro |
| 8 | Riscos | problemas potenciais identificados, com mitigação |
| 9 | Definição de pronto | critério claro de conclusão |
| 10 | Alinhamento com PRD e epic | coerente com as fontes, sem afirmação técnica sem fonte |

Classifique os problemas dos passos 2 a 11:

- **Crítico (obrigatório, bloqueia a story):** informação essencial ausente; afirmação técnica imprecisa ou sem fonte; cobertura incompleta dos critérios; seção obrigatória ausente; executor inválido.
- **A corrigir:** orientação de implementação pouco clara; segurança não tratada; sequência de tasks com problema; instruções de teste incompletas; duplicidade provável.
- **Opcional:** contexto extra útil, esclarecimentos, melhorias de documentação.

Decisão:

- **GO:** nota ≥ `minScore` e nenhum problema crítico.
- **NO-GO:** nota < `minScore` ou qualquer problema crítico.

Registre também a confiança na implementação: Alta, Média ou Baixa.

### 13. Montar o relatório

```markdown
## Validação da story {storyId}: {GO | NO-GO}

**Nota:** {n}/10 (mínimo {minScore}) · **Confiança:** {Alta | Média | Baixa}

| # | Item | Pontos | Observação |
|---|------|--------|------------|
| 1 | Título | 1 | |
| 3 | Critérios de aceite | 0 | CA 2 sem resultado verificável |

### Conformidade com o template
### Problemas críticos
### Problemas a corrigir
### Melhorias opcionais
### Achados de anti-alucinação
### Correções obrigatórias (NO-GO)
1. `## Critérios de Aceite`: reescrever o CA 2 em Dado/Quando/Então com resultado verificável (item 3)
```

### 14. Aplicar o resultado na story

Obrigatório antes de apresentar o relatório.

Verificação prévia (bloqueante): Status `Draft` e `## Change Log` presente. Status diferente: PARE com "Transição não aplicada: esperado Draft, encontrado {status}." Sem Change Log: PARE e peça para restaurar a estrutura do template.

**GO:**

1. Em `## Status`, troque `Draft` por `Ready`.
2. Change Log: `| {AAAA-MM-DD} | @pm [Product Owner] | Validação GO ({n}/10). Status: Draft → Ready |`
3. Story em `Draft` depois de um GO é violação de processo.

**NO-GO:**

1. Status continua `Draft`.
2. Change Log: `| {AAAA-MM-DD} | @pm [Product Owner] | Validação NO-GO ({n}/10): {resumo do motivo} |`
3. Apresente a lista numerada de correções obrigatórias.
4. **Ponto de elicitação (Interativo):** "1. Corrigir agora com o chapéu Scrum e revalidar do zero 2. Manter em Draft e encerrar". Na opção 1, declare `[Chapéu: Scrum]`, corrija só as seções do `@pm`, volte a `[Chapéu: Product Owner]` e refaça os passos 2 a 14 sem reaproveitar notas anteriores.

## Saída

- Relatório de validação na resposta ao usuário.
- Story com `## Status` e `## Change Log` atualizados.
- Handoff `.sia/handoffs/handoff-pm-para-{dev|pm}-{AAAAMMDD-HHmmss}.yaml` com `last_command: validate-story`.

## Critérios de conclusão

- [ ] Passos 2 a 11 executados, incluindo os condicionais aplicáveis
- [ ] Os 10 itens pontuados, com observação nos que não pontuaram
- [ ] Decisão coerente com a regra (nota ≥ `minScore` e nenhum crítico)
- [ ] GO: Status `Ready` e linha no Change Log
- [ ] NO-GO: Status `Draft`, linha no Change Log e correções numeradas
- [ ] Story própria validada sem leniência (regra 4.2)

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Story não encontrada | liste as stories em `Draft` e pergunte |
| Status diferente de `Draft` | gere só o relatório; não aplique transição |
| Change Log ausente | PARE; peça para restaurar a estrutura do template |
| Epic de origem ausente | item 10 não pontua; registre como problema crítico |
| Referência citada não existe | problema crítico de anti-alucinação |
| `minScore` ausente no config | use 7 |

## Handoff

- GO: o executor definido em `## Executor`. Em regra, `@dev *develop {storyId}`; infra, `@devops`; pesquisa, `@pm [Análise]`.
- NO-GO: `@pm [Scrum]` corrige a story e roda `*validate-story {storyId}` de novo.

Grave o handoff com `templates/agent-handoff-tmpl.yaml` (`last_command: validate-story`, `consumed: false`).
