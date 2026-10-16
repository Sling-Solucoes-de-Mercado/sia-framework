# Checklist: Quality gate de agente

> Usado por: `@squad-creator` em `*create-agent` (heurísticas `SC_AGT_001` e `SC_AGT_004`) e em `*modify-agent` quando a mudança é grande.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: Antes de avaliar, leia por inteiro o arquivo do agente, as tasks, templates, checklists e dados listados em dependencies e o guia de autoria (`.sia-core/data/sia-authoring-guide.md`, seção 7). Para cada item, marque ✅ atende, ⚠️ parcial ou ❌ não atende, com a evidência (campo, seção ou arquivo). (B) é bloqueante e (R) é recomendado. Item que não se aplica vira N/A, com o motivo, e sai da contagem: chapéus em agente sem chapéus, tier em agente do framework, credibilidade fora dos domínios da seção 7, voz de especialista em agente genérico. Calcule a maturidade da seção 10. No relatório, liste primeiro os bloqueantes que falharam, cada um com a correção sugerida.]]

## 1. Arquivo

- [ ] (B) Arquivo em `.sia-core/agents/{id}.md` ou `squads/{nome}/agents/{id}.md`, com `agent.id` igual ao nome do arquivo, em kebab-case
- [ ] (B) Bloco YAML válido (a CLI consegue ler)
- [ ] (B) Nenhum placeholder `{{...}}` sem preencher
- [ ] (B) Textos em português do Brasil com acentuação correta; identificadores em inglês (guia, seção 2)

## 2. Carregamento

- [ ] (B) AVISO DE ATIVAÇÃO no topo do arquivo
- [ ] (B) IDE-FILE-RESOLUTION com a regra de resolução: `.sia-core/{type}/{name}` (framework) ou `squads/{nome}/{type}/` antes de `.sia-core/{type}/` (squad)
- [ ] (B) REQUEST-RESOLUTION com exemplos de pedido → comando
- [ ] (B) activation-instructions com os passos de ativação (ler o arquivo, adotar a persona, memória, saudação, PARE) e as regras de execução, de interação e de opções numeradas
- [ ] (B) Todo comando operacional tem `task:` (exceto os embutidos help, guide, yolo e exit)
- [ ] (B) Todo `task:`, `template:` e `checklist:` de comando consta em `dependencies`
- [ ] (B) Todo arquivo de `dependencies` existe (em squad: no squad ou no `.sia-core/`)

## 3. Identidade

- [ ] (B) `agent` com name, id, title, icon e whenToUse
- [ ] (B) whenToUse descritivo (20 caracteres ou mais), com "NÃO use para" apontando o agente certo
- [ ] (B) `persona` com role, style, identity e focus
- [ ] (B) Agente de squad: tier definido pela árvore de `data/tier-system-framework.md` e registrado em `## Colaboração`
- [ ] (R) `aliases` definidos
- [ ] (R) Agente baseado em especialista: histórico e contexto do especialista documentados (3 parágrafos ou mais) em `data/`

## 4. Operação

- [ ] (B) `core_principles` com 5 a 12 itens, específicos do domínio (consolidados com chapéus tendem ao limite superior)
- [ ] (B) Pelo menos um framework operacional (o método do agente) com nome, filosofia, 3 passos ou mais e exemplos, numa task ou em `data/`
- [ ] (B) `commands` com 5 itens ou mais, incluindo help e exit
- [ ] (B) Agente consolidado: todo comando com `hat:` aponta para um chapéu existente, e cada chapéu tem id, name, mindset e commands
- [ ] (R) Todo comando com `description` e `visibility`
- [ ] (R) `authority` com exclusive, delegates e blocked

## 5. Voz

- [ ] (B) `persona_profile` com archetype, tone, emoji_frequency, vocabulary (5 a 10 termos em português, sem emoji), greeting_levels (minimal, named, archetypal) e signature_closing
- [ ] (B) Saudação sem adjetivo com gênero ("em ação", "na área", "por aqui")
- [ ] (R) Agente baseado em especialista: termos que o agente nunca usa (3 ou mais)
- [ ] (R) Agente baseado em especialista: expressões típicas (5 ou mais) e metáforas do domínio (3 ou mais)
- [ ] (R) Estados de comportamento (2 ou mais), ex.: modo diagnóstico e modo execução

## 6. Qualidade

- [ ] (B) Saídas exemplificadas: 3 ou mais comandos operacionais com a `## Saída` da task exemplificada ou com template (todos, se houver menos de 3)
- [ ] (B) `### Armadilhas comuns` no guia do agente com 5 itens ou mais, específicos do domínio
- [ ] (B) Cada task de comando operacional com 2 critérios de conclusão ou mais
- [ ] (B) Cada task de comando operacional com a seção `## Handoff`
- [ ] (R) Sinais de alerta no pedido (2 ou mais) que fazem o agente parar ou perguntar
- [ ] (R) Checklist de validação das entregas do agente com 3 itens ou mais
- [ ] (R) Agente que atende pessoas (vendas, suporte): objeções comuns e respostas (3 ou mais)

## 7. Credibilidade (só especialistas de copy, jurídico, storytelling ou dados)

- [ ] (R) 3 conquistas verificáveis do especialista ou mais
- [ ] (R) Publicações ou obras de referência citadas
- [ ] (R) 1 caso ou depoimento documentado ou mais

## 8. Integração

- [ ] (B) Posição no fluxo definida em `## Colaboração` (quem entrega para o agente e para quem ele entrega)
- [ ] (B) Pelo menos 1 handoff de saída na tabela de colaboração
- [ ] (R) Pelo menos 1 handoff de entrada ("Recebo de")

## 9. Completude operacional

- [ ] (B) Task para cada comando operacional (comando sem task faz o modelo improvisar a cada execução)
- [ ] (B) Cada task com 3 passos ou mais (task sem passos é decoração, não processo)
- [ ] (B) Cada task com pelo menos 1 condição que para a execução: pré-condição bloqueante ou linha de `## Tratamento de erros` que aborta (sem isso, trabalho incompleto passa)
- [ ] (B) Pelo menos 1 checklist operacional em `dependencies` (ou critérios de decisão equivalentes em `data/`)
- [ ] (R) Template para cada comando que produz documento, relatório ou análise (ou formato fixo na `## Saída`)
- [ ] (R) Templates listam as seções obrigatórias
- [ ] (R) O checklist operacional tem itens bloqueantes

## 10. Maturidade

| Componente | Peso | Pontua quando |
|------------|------|---------------|
| Identidade | 1,0 | `agent` e `persona` completos |
| Modelo mental | 1,5 | princípios (5 a 12) e framework operacional documentado (mindset dos chapéus, quando houver) |
| Voz | 1,5 | `persona_profile` completo |
| Saídas exemplificadas | 1,0 | 3 ou mais saídas exemplificadas (todas, se houver menos de 3 comandos) |
| Mapa comando → task | 1,5 | todo comando operacional com `task:` e `dependencies` completas |
| Cobertura de tasks | 1,5 × razão | tasks existentes ÷ comandos operacionais |
| Templates | 1,0 | saídas estruturadas com template |
| Checklists | 0,5 | pelo menos 1 checklist operacional |
| Dados | 0,5 | base de conhecimento em `data/` |

Nota máxima: 10,0.

| Nota | Nível | Leitura |
|------|-------|---------|
| 0,0 a 3,9 | Nível 1: só persona | decorativo, não operacional |
| 4,0 a 6,9 | Nível 2: frameworks | funcional, mas inconsistente |
| 7,0 a 8,9 | Nível 3: completo | determinístico |
| 9,0 a 10,0 | Nível 3+: completo e integrado | pronto para produção |

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Arquivo | | |
| 2. Carregamento | | |
| 3. Identidade | | |
| 4. Operação | | |
| 5. Voz | | |
| 6. Qualidade | | |
| 7. Credibilidade | | |
| 8. Integração | | |
| 9. Completude operacional | | |
| 10. Maturidade | | nota ___/10, Nível ___ |

Bloqueantes: __/__ aplicáveis. Recomendados: __/__ aplicáveis.

**Decisão:**
- **FAIL:** algum bloqueante ❌ ou maturidade abaixo de 4,0. Corrija e reavalie (no máximo 2 iterações; depois, salve como rascunho e peça revisão humana).
- **CONDICIONAL:** todos os bloqueantes ✅, mas maturidade entre 4,0 e 6,9 ou menos de 50% dos recomendados. O usuário escolhe: 1. corrigir agora (recomendado) 2. seguir com as lacunas documentadas 3. abortar.
- **PASS (BOM):** todos os bloqueantes ✅, maturidade de 7,0 ou mais e 50% a 79% dos recomendados.
- **PASS (EXCELENTE):** todos os bloqueantes ✅, maturidade de 7,0 ou mais e 80% dos recomendados ou mais.
