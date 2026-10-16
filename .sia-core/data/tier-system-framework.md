# Framework de Tiers

> Organiza os agentes de um squad por papel no fluxo e define como eles colaboram.
> Usado por: `@squad-creator` em `*design-squad` (recomendação de agentes), `*create-agent` (classificação) e `*analyze-squad`.
> Vale para agentes de squad. Os 5 agentes do SIA não têm tier: eles se dividem por chapéus (guia de autoria, seção 4).

---

## 1. Visão geral

```text
┌──────────────────────────────────────────┐
│  ORQUESTRADOR (coordena todos os tiers)  │
├──────────────────────────────────────────┤
│  TIER 0: Fundação e diagnóstico          │
│  - roda SEMPRE primeiro                  │
│  - estabelece o entendimento de base     │
├──────────────────────────────────────────┤
│  TIER 1: Execução principal              │
│  - especialistas centrais do domínio     │
│  - melhores resultados comprovados       │
├──────────────────────────────────────────┤
│  TIER 2: Sistematizadores                │
│  - criadores de frameworks               │
│  - especialistas em processo             │
├──────────────────────────────────────────┤
│  TIER 3: Especialistas de formato        │
│  - canal ou formato específico           │
├──────────────────────────────────────────┤
│  FERRAMENTAS                             │
│  - checklists e validadores              │
│  - não são agentes; aplicadas no fim     │
└──────────────────────────────────────────┘
```

Menos é mais: antes de criar um agente para um tier, confira se um agente existente cobre o papel com mais um comando (REUSE > ADAPT > CREATE).

---

## 2. Definição dos tiers

| Tier | Nome | Propósito | Características | Exemplos |
|------|------|-----------|-----------------|----------|
| Orquestrador | Coordenação | Porta de entrada do squad | Roteia pedidos para o tier certo, conduz os handoffs, aplica os gates, mantém o estado do fluxo | `{prefixo}-chief` |
| 0 | Fundação e diagnóstico | Estabelecer a base antes de qualquer execução | Roda sempre primeiro; foco analítico; cria entendimento comum; identifica restrições e oportunidades | auditor, diagnosticador, pesquisador, analista de segmentação |
| 1 | Execução principal | Produzir as entregas centrais | Resultados comprovados no domínio; frameworks documentados; autoridade e credibilidade | especialista de referência do domínio |
| 2 | Sistematizadores | Criar sistemas e processos | Criadores de metodologia; pensamento de processo; abordagens replicáveis e ensináveis | arquiteto de processo, desenvolvedor de metodologia |
| 3 | Especialistas de formato | Otimizar para um canal ou formato | Atuam depois que o conteúdo central existe; adaptação e melhoria | roteiro de vídeo, sequência de e-mail, landing page, redes sociais |
| Ferramentas | Utilitários | Validação e melhoria depois da criação | Não são agentes; viram checklists, templates ou comandos de um agente existente | checklist de qualidade, biblioteca de gatilhos |

---

## 3. Árvore de decisão do tier

```text
SE o agente faz diagnóstico ou análise ANTES de tudo
  ENTÃO Tier 0
SENÃO SE é o especialista principal, com resultados documentados
  ENTÃO Tier 1
SENÃO SE cria frameworks ou sistemas que outros usam
  ENTÃO Tier 2
SENÃO SE é especialista num formato ou canal
  ENTÃO Tier 3
SENÃO SE é validação ou checklist
  ENTÃO Ferramenta (não crie agente: crie checklist ou comando)
```

O squad tem no máximo um orquestrador. Squads com 1 ou 2 agentes dispensam orquestrador: o agente principal recebe os pedidos.

---

## 4. Critérios de seleção por tier

| Tier | Obrigatório | Desejável |
|------|-------------|-----------|
| 0 | metodologia analítica; framework de diagnóstico; formato de saída da avaliação | métricas quantitativas; critérios objetivos |
| 1 | histórico documentado; resultados verificáveis; metodologia clara | reconhecimento no mercado; frameworks publicados; estudos de caso |
| 2 | frameworks replicáveis; metodologia ensinável; processo documentado | material de treinamento; guias de implementação |
| 3 | domínio profundo do formato; conhecimento do canal; frameworks de adaptação | resultados específicos do formato; domínio da plataforma |

---

## 5. Onde o tier fica registrado no SIA

O formato de agente do SIA não tem campo de tier. Registre a classificação em dois lugares:

1. Na seção `## Colaboração` do agente: `**Posição no fluxo:** Tier {n}, {nome do tier}`, com os handoffs de entrada e de saída.
2. Na tabela de agentes do `README.md` do squad (coluna Tier).

O `squad.yaml` lista os arquivos em `components.agents`. Orquestrador, quando existir, recebe o id `{slashPrefix}-chief`.

---

## 6. Fluxo de orquestração

```text
1. O pedido chega ao orquestrador
2. O orquestrador encaminha ao Tier 0 (SEMPRE)
3. O Tier 0 diagnostica e devolve:
   - entendimento de base
   - restrições identificadas
   - tier recomendado para a execução
4. O orquestrador encaminha ao tier recomendado (1, 2 ou 3)
5. O agente do tier executa o trabalho principal
   - pode pedir apoio a outros tiers
   - produz a entrega principal
6. O orquestrador aplica as ferramentas (validação)
7. A entrega é feita
```

### Regras de roteamento

| Padrão no pedido | Destino |
|------------------|---------|
| auditar, analisar, diagnosticar, avaliar | Tier 0 |
| criar, escrever, construir, desenhar | Tier 1 |
| sistematizar, processo, framework | Tier 2 |
| adaptar, formatar, otimizar para | Tier 3 |
| validar, conferir, revisar | Ferramentas |

---

## 7. Padrões de colaboração

| Padrão | De → Para | Como funciona | Artefato |
|--------|-----------|---------------|----------|
| Handoff | Tier 0 → Tier 1 | O diagnóstico completo libera a execução | relatório de diagnóstico, lista de restrições, abordagem recomendada |
| Apoio | Tier 1 ← Tier 2 | O especialista principal pede uma abordagem sistematizada | framework ou processo |
| Melhoria | Tier 1 → Tier 3 | A entrega principal é adaptada a um formato | versão adaptada (ex.: conteúdo virando roteiro) |

Critério de aceite do handoff do Tier 0: diagnóstico completo e agente do Tier 1 identificado. Registre os handoffs na seção `## Colaboração` de cada agente.

---

## 8. Gates por tier

| Tier | Gate | Critérios |
|------|------|-----------|
| 0 | diagnóstico completo | base estabelecida; restrições identificadas; recomendação feita |
| 1 | entrega principal completa | atende aos requisitos; nota ≥ 7,0 nas dimensões de qualidade (`quality-dimensions-framework.md`); nenhum item bloqueante |
| 2 | sistema validado | framework completo; processo documentado; guia de implementação existe |
| 3 | formato otimizado | requisitos do formato atendidos; boas práticas do canal aplicadas; checklist de melhoria aprovado |

---

## 9. Adicionando um agente ao squad

- [ ] Confirmar que nenhum agente existente cobre o papel (REUSE > ADAPT > CREATE)
- [ ] Definir o tier pela árvore da seção 3
- [ ] Documentar a especialidade e o histórico (Tier 1 exige resultados verificáveis)
- [ ] Criar o agente com `@squad-creator *create-agent` (formato do guia de autoria, seção 7)
- [ ] Registrar o arquivo em `components.agents` e o tier no `README.md`
- [ ] Definir os handoffs com os outros agentes na seção `## Colaboração`
- [ ] Criar as tasks e templates dos comandos operacionais
- [ ] Testar o roteamento do orquestrador, quando houver
- [ ] Rodar `sia validate --squad {nome}` e `sia sync`
