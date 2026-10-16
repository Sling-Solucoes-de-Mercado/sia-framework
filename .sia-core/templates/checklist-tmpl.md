<!--
Template de checklist do SIA (guia de autoria, seção 10). Usado por @squad-creator em *create-agent (checklist operacional
do agente) e *extend-squad --add checklist. Destino: .sia-core/checklists/{{CHECKLIST_ID}}.md ou
squads/{nome}/checklists/{{CHECKLIST_ID}}.md. Execução: task execute-checklist.md.

Placeholders: {{CHECKLIST_ID}}, {{CHECKLIST_NAME}}, {{AGENT_ID}}, {{HAT}} (remova os colchetes se o agente não tiver chapéu),
{{COMMAND}}, {{ARTIFACT}} (o que é avaliado), {{CONTEXT_FILES}} (o que carregar antes), {{ITEM_*}}, {{DECISION_RULE}}.

Regras: itens verificáveis e objetivos; cada seção com pelo menos 3 itens; marque (B) os bloqueantes e (R) os recomendados;
blocos [[LLM: ...]] são instruções para o agente e não aparecem no relatório. Regra de decisão padrão:
100% dos bloqueantes e pelo menos 80% dos recomendados aprovam. Remova as seções que não se aplicam e este comentário.
-->
# Checklist: {{CHECKLIST_NAME}}

> Usado por: `@{{AGENT_ID}}` [{{HAT}}] em `*{{COMMAND}}`.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: Antes de avaliar, carregue {{ARTIFACT}} e {{CONTEXT_FILES}}. Avalie cada item com evidência (arquivo, seção ou linha) e marque ✅ atende, ⚠️ parcial ou ❌ não atende. Item que não se aplica vira N/A, com o motivo, e sai da contagem. No modo interativo, apresente uma seção por vez e confirme antes de seguir. No relatório, liste primeiro os bloqueantes que falharam, cada um com a correção sugerida.]]

## 1. Pré-execução

- [ ] (B) {{ITEM_PRE_1}}
- [ ] (B) {{ITEM_PRE_2}}
- [ ] (R) {{ITEM_PRE_3}}

## 2. Execução

### Fase 1: {{PHASE_1_NAME}}

- [ ] (B) {{ITEM_EXEC_1}}
- [ ] (B) {{ITEM_EXEC_2}}
- [ ] (R) {{ITEM_EXEC_3}}

### Fase 2: {{PHASE_2_NAME}}

- [ ] (B) {{ITEM_EXEC_4}}
- [ ] (R) {{ITEM_EXEC_5}}
- [ ] (R) {{ITEM_EXEC_6}}

## 3. Qualidade

### Código (quando a entrega tem código)

- [ ] (B) Testes passando
- [ ] (B) Lint sem erros
- [ ] (B) Nenhum segredo no código ou nos arquivos versionados
- [ ] (R) Sem código comentado ou instrução de depuração esquecida

### Documentação

- [ ] (R) README ou documento afetado atualizado
- [ ] (R) Lógica não óbvia explicada
- [ ] (R) Registro de mudança feito quando o artefato tem histórico

### Segurança e desempenho

- [ ] (B) Entradas externas validadas
- [ ] (R) Sem injeção de SQL nem XSS nos pontos tocados
- [ ] (R) Limites de desempenho definidos atendidos

## 4. Revisão final

- [ ] (B) {{ITEM_FINAL_1}}
- [ ] (B) Saída no formato definido pela task
- [ ] (R) Dependências do artefato existem e estão referenciadas

## Protocolo de falha

| Falha em | Ação |
|----------|------|
| Pré-execução | PARE. Registre o item que falhou e aguarde a correção antes de seguir |
| Execução | Volte ao último estado estável, identifique a causa, corrija e rode a seção de novo |
| Qualidade | Corrija primeiro o que é crítico (segurança, quebra de contrato), depois o alto; registre médio e baixo como pendência |

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Pré-execução | | |
| 2. Execução | | |
| 3. Qualidade | | |
| 4. Revisão final | | |

Bloqueantes: __/__ aplicáveis. Recomendados: __/__ aplicáveis.

**Decisão:** {{DECISION_RULE}} (padrão: aprovado com 100% dos bloqueantes e pelo menos 80% dos recomendados; qualquer bloqueante ❌ reprova).
