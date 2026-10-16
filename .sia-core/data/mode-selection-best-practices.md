# Boas Práticas de Escolha de Modo

> Usado por: `@dev` ao escolher o modo de `*develop {storyId} [yolo|interactive|preflight]`, e por qualquer task que ofereça modos (guia de autoria, seção 8.3).
> Os três modos: YOLO (autônomo), Interativo (padrão) e Pre-Flight (planejamento antes).

## Seletor Rápido

### Pela complexidade da story

| Complexidade | Horas estimadas | Modo | Motivo |
|--------------|-----------------|------|--------|
| Trivial | < 2 h | YOLO | Rápido e direto |
| Simples | 2 a 4 h | YOLO ou Interativo | Depende da familiaridade |
| Moderada | 4 a 8 h | Interativo | Pede equilíbrio |
| Complexa | 8 a 16 h | Interativo ou Pre-Flight | Pede decisões cuidadosas |
| Muito complexa | > 16 h | Pre-Flight | Exige planejamento |

### Pelo tipo da story

```text
Documentação           → YOLO
Bug simples            → YOLO
Bug complexo           → Interativo
Funcionalidade pequena → YOLO ou Interativo
Funcionalidade grande  → Pre-Flight
Refatoração            → Interativo
Infraestrutura         → Pre-Flight
Arquitetura            → Pre-Flight
Experimento            → YOLO
```

### Pelo nível de risco

```text
Risco baixo  → YOLO
Risco médio  → Interativo
Risco alto   → Pre-Flight
Crítico      → Pre-Flight + revisão do time
```

---

## Características dos Modos

### YOLO 🚀

- Decisões autônomas, registradas na story em `### Decisões (modo YOLO)`
- 0 a 1 pergunta ao usuário
- Execução mais rápida (cerca de 30% a 50% mais rápida que o Interativo)

**Indicado para:** requisitos claros; quem conhece bem a área; trabalho urgente; várias stories simples em sequência; sistemas não críticos.

**Não recomendado para:** requisitos ambíguos; decisões críticas de arquitetura; aprendizado de áreas novas do framework; trabalho que pede colaboração do time.

### Interativo 💬 (padrão)

- Checkpoints de decisão, com explicações didáticas
- 5 a 10 perguntas ao usuário
- Equilíbrio entre velocidade e controle; é a linha de base de tempo

**Indicado para:** a maioria das stories (é o padrão por um motivo); aprender os padrões do projeto; desenvolvimento colaborativo; complexidade moderada.

**Não recomendado para:** quando a velocidade máxima é crítica; stories muito ambíguas; quando não há tempo para interação.

### Pre-Flight ✈️

- Questionário completo antes de começar, depois execução sem interrupções
- Todas as decisões documentadas
- Investimento de tempo: +20% a 40% no início e −15% a 25% na execução (resultado líquido igual ou pouco maior)

**Indicado para:** requisitos ambíguos; várias decisões de arquitetura; consenso do time necessário; sistemas críticos; criação de precedentes.

**Não recomendado para:** stories simples e claras; quando a velocidade é prioridade; trabalho individual direto.

---

## Matriz de Decisão

**Use YOLO quando TODAS forem verdadeiras:** os requisitos estão cristalinos; você já fez trabalho parecido; a story é de risco baixo ou médio; você aceita decisões autônomas.
**Não use YOLO se QUALQUER uma for verdadeira:** os requisitos são ambíguos; é a primeira vez na área; a story é de risco alto; o time precisa opinar.

**Use Interativo quando PELO MENOS UMA for verdadeira:** você quer aprender; os requisitos estão quase todos claros; a complexidade é moderada; você quer controlar as decisões-chave. Na dúvida, use Interativo.

**Use Pre-Flight quando PELO MENOS UMA for verdadeira:** há várias decisões de arquitetura; os requisitos têm lacunas; o time precisa de consenso; a mudança é em sistema crítico.

---

## Antipadrões

| Não faça | Exemplo | Por quê |
|----------|---------|---------|
| YOLO em sistema crítico | `*develop 4.1 yolo` (reescrita da autenticação) | Decisões críticas pedem supervisão humana |
| Pre-Flight em correção trivial | `*develop 3.9 preflight` (erro de digitação na documentação) | Exagero: desperdiça tempo em trabalho trivial |
| Ignorar as decisões do YOLO | Rodar YOLO e nunca ler `### Decisões (modo YOLO)` | Perde a chance de conferir as escolhas autônomas |
| Atropelar os checkpoints | Responder 1, 1, 1, 1 em todo checkpoint do Interativo | Anula o propósito dos pontos de decisão |

---

## Boas Práticas por Perfil

| Perfil | Modo principal | Distribuição típica | Dicas |
|--------|----------------|---------------------|-------|
| Dev júnior | Interativo | Interativo 80%, Pre-Flight 15% (quando travar), YOLO 5% (documentação, correções triviais) | Pergunte "por quê" nas explicações; use Pre-Flight quando se sentir sobrecarregado |
| Dev pleno | Interativo, com YOLO no simples | Interativo 60%, YOLO 30%, Pre-Flight 10% (stories complexas) | YOLO em padrões conhecidos; Interativo em áreas novas; Pre-Flight em trabalho de arquitetura |
| Dev sênior | YOLO, com Interativo para colaborar | YOLO 60%, Interativo 25%, Pre-Flight 15% (decisões críticas) | Revise as decisões depois do YOLO; Interativo para mentorar; Pre-Flight para alinhar times |
| Arquitetura | Pre-Flight | Pre-Flight 50% (stories de arquitetura), Interativo 40%, YOLO 10% (mudanças simples) | Compartilhe o questionário do Pre-Flight com o time; registre as decisões em ADR; YOLO só em atualização de documentação |

---

## Orientação pelo Tempo Disponível

| Tempo | Recomendação |
|-------|--------------|
| < 30 min | YOLO só em correções triviais; não comece stories complexas |
| 30 min a 2 h | YOLO em stories simples e claras; Interativo em moderadas (pode não terminar) |
| 2 a 4 h | YOLO em várias stories simples; Interativo em 1 ou 2 moderadas; análise de Pre-Flight (sem executar ainda) |
| 4 a 8 h | Qualquer modo para uma story; YOLO em lote; Interativo com foco em aprendizado; Pre-Flight com execução nas complexas |
| Vários dias | Pre-Flight nas complexas; Interativo no trabalho colaborativo; YOLO com sessões de revisão |

---

## Qualidade versus Velocidade

```text
Qualidade máxima (risco mínimo):
Pre-Flight → planejamento completo → revisão do time → execução cuidadosa
Uso: sistemas em produção, funcionalidades críticas, mudanças de arquitetura

Equilíbrio entre qualidade e velocidade:
Interativo → decisões pensadas → revisão individual → execução completa
Uso: a maior parte do trabalho

Velocidade máxima (risco calculado):
YOLO → decisões automáticas → revisão posterior → execução rápida
Uso: trabalho não crítico, documentação, experimentos
```

---

## Trabalho em Equipe

| Situação | Modo recomendado | Como |
|----------|------------------|------|
| Desenvolvimento individual | Conforme a complexidade | Simples → YOLO; moderada → Interativo; complexa → Pre-Flight (com autorrevisão) |
| Programação em par | Interativo | Os checkpoints facilitam a discussão; didático para os dois; decisões documentadas |
| Funcionalidades do time | Pre-Flight | Compartilhe o questionário antes; obtenha consenso antes de executar; documente as decisões |
| Sistemas críticos | Pre-Flight + revisão de arquitetura | 1. Questionário do Pre-Flight; 2. Revisão do plano pelo time; 3. Aprovação da arquitetura (@dev [Arquitetura]); 4. Execução sem ambiguidade |

---

## Métricas a Acompanhar

| Depois de | O que observar | Meta |
|-----------|----------------|------|
| YOLO | Qualidade das decisões registradas; quantas você aprova ou rejeita; quais mudaria | > 90% de concordância com as decisões autônomas |
| Interativo | Tempo nos checkpoints; opções consideradas; aprendizados registrados | Aprender 1 ou 2 padrões novos por story |
| Pre-Flight | Precisão do plano (a execução seguiu o plano?); surpresas no meio da execução; qualidade do consenso | < 5% de desvio do plano na execução |

---

## Melhoria Contínua

**Reflexão semanal:**
1. Que modo usei mais? Foi o adequado?
2. Que decisões eu tomaria de outro jeito?
3. Onde perdi tempo? Onde ganhei?
4. Que padrões estou aprendendo?

**Revisão mensal das decisões registradas:**
1. As decisões do YOLO estão melhorando?
2. Os checkpoints do Interativo continuam úteis?
3. O planejamento do Pre-Flight está acertando?

**Retrospectiva do time:**
1. Estamos usando os modos de forma eficaz?
2. Que preferências de modo cada pessoa tem?
3. Vale padronizar o modo de certos tipos de story?

---

## Perguntas Frequentes

**Posso trocar de modo no meio da story?**
Não. O modo é escolhido no início da story. Se cancelar, você pode retomar em outro modo, mas isso não é recomendado (gera execução inconsistente).

**E se eu escolher o modo errado?**
Cancele e recomece no modo certo. O progresso da story fica salvo (checkboxes e Registro do Dev).

**Posso criar modos próprios?**
Não. Os 3 modos cobrem a maioria dos casos.

**O time deve padronizar um modo só?**
Não. Use o modo certo para cada story. A consistência do time está na qualidade das decisões, não na escolha do modo.

**E se o questionário do Pre-Flight tiver perguntas demais?**
Sinal de que os requisitos da story estão muito ambíguos. Considere:
1. Refinar a story com o `@pm` [Product Owner] antes do desenvolvimento
2. Quebrar a story em partes menores
3. Seguir com o Pre-Flight (ele está cumprindo seu papel)

---

## Fluxograma de Escolha

```text
                        INÍCIO
                          |
                  A story está clara?
                     /         \
                   SIM          NÃO
                   /              \
       Você domina a área?     Pre-Flight ✈️
             /      \
           SIM      NÃO
           /          \
      YOLO 🚀    Interativo 💬

Versão curta:
Clara + domínio         → YOLO 🚀
Clara + aprendizado     → Interativo 💬
Ambígua + qualquer caso → Pre-Flight ✈️
Na dúvida               → Interativo 💬 (padrão)
```

---

## Resumo

| Cenário | Modo | Por quê |
|---------|------|---------|
| Correção trivial | YOLO | Rápido e claro |
| Documentação | YOLO | Risco baixo, claro |
| Área nova para você | Interativo | Didático |
| Funcionalidade moderada | Interativo | Equilibrado |
| Story ambígua | Pre-Flight | Precisa de clareza |
| Decisão de arquitetura | Pre-Flight | Crítica |
| Colaboração do time | Interativo ou Pre-Flight | Pede discussão |
| Urgência | YOLO | Velocidade é prioridade |
| **Na dúvida** | **Interativo** 💬 | **Padrão seguro** |

**Lição principal:** não existe o "melhor" modo, só o modo certo para o contexto atual.
