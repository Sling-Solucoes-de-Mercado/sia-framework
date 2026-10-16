---
id: correct-course
title: Corrigir a rota
agent: pm
hat: product
elicit: true
modes: [interactive, yolo]
inputs:
  - 'gatilho: o que mudou (story que revelou o problema, requisito novo, limitação técnica, feedback, story abandonada)'
  - 'artefatos: PRD, epics, stories, arquitetura, especificação de front-end'
outputs:
  - 'Proposta de Mudança em Markdown, aprovada pelo usuário, com as edições propostas para cada artefato afetado'
  - 'Registro do checklist de mudança com o status de cada item e as decisões'
depends_on:
  checklists: [change-checklist.md]
next: [backlog, create-story, create-brownfield-prd, create-architecture]
source: [correct-course.md]
---

# Corrigir a rota

## Objetivo
Conduzir uma resposta estruturada a uma mudança significativa: analisar o impacto em epics, artefatos e MVP com o `checklists/change-checklist.md`, avaliar caminhos e produzir uma Proposta de Mudança com edições explícitas, aprovada pelo usuário e com handoff claro.

## Quando usar
- Mudança que afeta a direção do projeto: pivô, limitação técnica, requisito descoberto, entendimento errado de requisito, story falha ou abandonada.
- Não use para ajustes pequenos dentro de uma story: o `@pm` atualiza a story diretamente.

## Pré-condições
- [ ] Gatilho identificado e explicado pelo usuário, com o impacto percebido
- [ ] Acesso aos artefatos do projeto (PRD, epics, stories, arquitetura, especificação de front-end)
- [ ] `checklists/change-checklist.md` disponível

## Passos

### 1. Preparar e escolher o modo
1. Confirme que a correção de rota começou, o gatilho e a explicação do usuário.
2. Confirme o acesso aos artefatos e ao checklist de mudança.
3. **Ponto de elicitação (modo):**
   1. **Incremental (padrão, recomendado):** percorremos o checklist seção a seção, discutindo os achados e redigindo as propostas de cada parte antes de seguir.
   2. **YOLO (em lote):** faço a análise completa com o checklist e apresento achados e propostas consolidados para uma revisão ampla.
4. Anuncie: "Vamos usar o checklist de mudança para analisar a mudança e redigir as atualizações propostas."

### 2. Analisar com o checklist (seções 1 a 4)
Percorra as seções do checklist: gatilho e contexto; impacto nos epics; conflitos e impacto nos artefatos; avaliação do caminho. Para cada item ou grupo de itens:
1. Apresente as perguntas e considerações do checklist.
2. Peça as informações que faltam e analise os artefatos (PRD, epics, arquitetura, histórico das stories).
3. Discuta os achados com o usuário.
4. Registre o status: `[x]` tratado, `[N/A]` não se aplica ou `[!]` ação pendente, com notas e decisões.

Na seção 4, avalie os caminhos com esforço, trabalho descartado, riscos, efeito no prazo e sustentabilidade:
1. **Ajuste direto:** modificar ou acrescentar stories futuras dentro do plano atual.
2. **Rollback:** reverter stories ou commits concluídos, quando isso simplifica de verdade.
3. **Revisão do MVP:** reduzir escopo, mudar objetivos ou buscar abordagem alternativa.
4. **Caso extremo:** replanejamento fundamental ou novo PRD.

Combine com o usuário o caminho recomendado.

### 3. Redigir as edições propostas
Fora dos casos de replanejamento fundamental (passo 5), identifique cada artefato afetado e redija a mudança de forma explícita:
- texto, critérios de aceite ou prioridade de stories;
- stories a incluir, remover, reordenar ou dividir no epic;
- trechos de diagrama de arquitetura (bloco Mermaid atualizado ou descrição clara da mudança);
- listas de tecnologia, configuração ou seções do PRD e da arquitetura;
- pequenos artefatos de apoio, quando necessários (ex.: adendo com uma decisão).

Incremental: discuta e refine cada edição com o usuário. YOLO: reúna todas para o passo 4.

### 4. Montar a Proposta de Mudança
Sintetize a análise e as edições num único documento, na estrutura da seção 5 do checklist:
- **Resumo do problema:** enunciado claro e objetivo.
- **Impacto nos epics.**
- **Artefatos a ajustar.**
- **Caminho recomendado,** com a justificativa.
- **Impacto no MVP do PRD** (escopo e objetivos), se houver.
- **Plano de ação:** próximos passos para stories e documentos.
- **Plano de handoff:** quem faz o quê.
- **Edições propostas,** no formato "de → para":

```markdown
### Edições propostas
- **Story 2.3, critério de aceite 2**
  - De: "Dado um usuário logado, quando abre o perfil, então vê as contas"
  - Para: "Dado um usuário logado com conta Google vinculada, quando abre o perfil, então vê a conta vinculada"
- **Epic 2:** dividir a story 2.4 em 2.4 (sessão) e 2.6 (renovação de token)
- **docs/architecture/tech-stack.md:** trocar a biblioteca de sessão pela indicada na pesquisa (motivo: ...)
```

Apresente a proposta completa para revisão e incorpore os ajustes.

### 5. Aprovar e definir os próximos passos
1. Obtenha a aprovação explícita da proposta, incluindo cada edição. Concordância implícita não vale.
2. Edições suficientes para resolver a mudança: pergunte
   1. Aplicar agora as edições nos artefatos do `@pm`: PRD e epics com o chapéu Produto; stories com os chapéus Scrum e Product Owner, registrando a mudança no Change Log de cada story
   2. Registrar como itens de backlog (`*backlog add`)
   3. Só entregar a proposta
3. Edições na arquitetura: encaminhe ao `@dev` [Arquitetura].
4. Replanejamento fundamental (mudança grande de escopo ou de arquitetura): declare a conclusão e indique `@pm *create-prd` / `@pm *create-brownfield-prd` ou `@dev *create-architecture`, com a proposta como entrada.

### 6. Revisão final (seção 6 do checklist)
Confirme que todos os itens relevantes foram discutidos, que a proposta reflete a conversa e o plano de handoff. Termine com o resumo:
- o que mudou e por quê;
- o que vamos fazer;
- quem faz o quê;
- como saberemos que a mudança funcionou.

## Saída
Proposta de Mudança em Markdown, aprovada, apresentada no chat e gravada em `docs/prd/change-proposals/{AAAA-MM-DD}-{slug}.md` (ou no caminho que o usuário indicar). Junto, o registro do checklist com o status de cada item. Edições aplicadas, quando o usuário escolher aplicá-las, ficam nos próprios artefatos.

## Critérios de conclusão
- [ ] Seções 1 a 4 do checklist analisadas e com status registrado
- [ ] Caminho recomendado escolhido com o usuário
- [ ] Toda edição proposta é explícita ("de → para") e aponta o artefato
- [ ] Aprovação explícita do usuário obtida
- [ ] Próximos passos e responsáveis definidos

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Gatilho pouco claro | Use as perguntas da seção 1 do checklist antes de buscar soluções |
| Artefato inexistente (ex.: projeto sem arquitetura) | Siga com o que existe e registre a lacuna na proposta |
| Usuário não aprova a proposta | Volte ao passo do ponto rejeitado ou encerre sem mudanças, registrando o motivo |
| Mudança pequena, restrita a uma story | Encerre esta task e ajuste a story diretamente |

## Handoff
- Mudança absorvida pelo plano: `@pm *backlog add` ou `@pm *create-story {epic}`.
- Arquitetura afetada: `@dev *create-architecture` (ou ADR com `@dev *create-adr {título}`).
- Replanejamento: `@pm *create-brownfield-prd` (ou `*create-prd`), com a Proposta de Mudança como entrada.
