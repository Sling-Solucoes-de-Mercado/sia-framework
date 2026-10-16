---
id: triage-issues
title: Triar e priorizar as issues do GitHub
agent: devops
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'filtros (opcional): estado, labels, responsável e limite; padrão: abertas, até 50'
outputs:
  - 'Relatório de triagem priorizado e, com confirmação, labels aplicadas e issues duplicadas, inválidas ou obsoletas fechadas'
next: [resolve-issue, backlog]
source: [triage-github-issues.md, github-issue-triage.md]
---

# Triar e priorizar as issues do GitHub

## Objetivo
Classificar as issues abertas por tipo, severidade e esforço, calcular a prioridade e recomendar a ordem de resolução. Opcionalmente, aplicar labels e fechar duplicadas, inválidas ou obsoletas.

## Quando usar
- Periodicamente, ou quando o usuário pergunta "qual issue resolvemos agora?".
- Antes do planejamento de sprint, para alimentar o backlog do `@pm`.
- Para uma issue já escolhida, vá direto para `*resolve-issue {número}`.

## Pré-condições
- [ ] `gh auth status` autenticado
- [ ] Remoto do GitHub configurado (`git remote -v`)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | busca, classifica e apresenta a lista priorizada | visão rápida do backlog de issues |
| Interativo (padrão) | apresenta a classificação e pede ajustes de prioridade | planejamento de sprint |
| Pre-Flight | analisa cada issue a fundo, com dependências entre elas | grande revisão de backlog |

## Passos

### 1. Buscar as issues
```bash
gh issue list --state open --limit 50 --json number,title,labels,createdAt,updatedAt,comments,assignees,milestone,author
```
- Obsoletas: `updatedAt` com mais de 90 dias.
- Repositório com label `status: needs-triage`: comece por elas (`gh issue list --label "status: needs-triage"`).

### 2. Classificar cada issue
Leia título, corpo e comentários (`gh issue view {n} --json title,body,comments,labels`).

| Dimensão | Valores | Critério |
|----------|---------|----------|
| Tipo | BUG, FEATURE, ENHANCEMENT, DOCS, TEST, CHORE, SECURITY | labels, palavras do título e corpo |
| Severidade | P0 crítica, P1 alta, P2 média, P3 baixa, P4 cosmética | impacto e existência de contorno |
| Esforço | XS (<1h), S (1-4h), M (4-8h), L (1-2d), XL (>2d) | arquivos afetados, pesquisa e testes necessários |
| Impacto | ALTO, MÉDIO, BAIXO | usuários afetados × frequência × severidade |
| Ganho rápido | SIM, NÃO | esforço até S e severidade P2 ou maior |

Heurísticas:
- Tipo: "bug", "erro", "quebrado", "falha", "crash" → BUG; "segurança", "vulnerabilidade", "CVE" → SECURITY; "docs", "documentação", "readme" → DOCS; "refatorar", "limpeza", "renomear" → CHORE; "adicionar", "implementar", "novo" → FEATURE; "melhorar", "otimizar" → ENHANCEMENT.
- Severidade:

| Sinal | Severidade |
|-------|------------|
| Produção fora do ar, perda de dados, bloqueia todos os usuários | P0 |
| Funcionalidade central quebrada sem contorno, ou SECURITY | P1 |
| Bug relevante com contorno, ou pedido muito frequente | P2 |
| Bug pequeno, caso de borda ou melhoria desejável | P3 |
| Cosmético, sem impacto para quem usa | P4 |

- Duplicada, inválida (spam, fora de escopo) ou sem informação suficiente: marque para a decisão do passo 5.

### 3. Calcular a prioridade
```text
prioridade = (severidade × 3) + (impacto × 2) + bônus de ganho rápido − penalidade de esforço
severidade: P0=10, P1=8, P2=5, P3=3, P4=1
impacto: ALTO=10, MÉDIO=5, BAIXO=2
ganho rápido: SIM=5, NÃO=0
esforço: XS=0, S=1, M=3, L=5, XL=8
```

| Faixa | Pontos | Ação |
|-------|--------|------|
| AGORA | 30 ou mais | resolver já (P0, P1, segurança) |
| PRÓXIMA | 20 a 29 | sprint atual |
| EM BREVE | 10 a 19 | próximo sprint |
| BACKLOG | abaixo de 10 | revisar mensalmente |

### 4. Apresentar o relatório

```text
━━━ Triagem de issues ━━━
Repositório: org/app | Abertas: 18 | Data: 2026-10-16

AGORA
  #456 [SECURITY/P0] Credenciais expostas na configuração    M
  #123 [BUG/P1] Login falha com provedor social                S  ← ganho rápido
PRÓXIMA
  #789 [BUG/P2] Upload trava acima de 10 MB                   M
EM BREVE
  #202 [FEATURE/P3] Exportar relatório em CSV                 L
BACKLOG
  #404 [CHORE/P4] Remover métodos obsoletos                   XS

Recomendação: começar pela #456 (segurança, P0).
```

### 5. Decisão do usuário
**Ponto de elicitação:**
1. Resolver uma issue → `*resolve-issue {número}`
2. Ajustar prioridades → reordenar e apresentar de novo
3. Aplicar labels de triagem
4. Fechar duplicadas, inválidas ou obsoletas
5. Ver detalhes de uma issue → `gh issue view {número}`
6. Levar issues ao backlog do projeto → `@pm *backlog add`

**Labels (opção 3).** Taxonomia: um `type:`, um `priority:`, um ou mais `area:` e um `status:` (`confirmed` ou `needs-info`). Labels que não existem no repositório: ofereça criar com `gh label create "{nome}"`. Aplicação, com confirmação:
```bash
gh issue edit {n} --add-label "type: bug,priority: P2,area: auth,status: confirmed" --remove-label "status: needs-triage"
```

**Fechamento (opção 4).** Confirme a lista antes:
- Duplicada: `gh issue close {n} --reason "not planned" --comment "Duplicada de #{original}."`
- Inválida: `gh issue close {n} --reason "not planned" --comment "{motivo}"`
- Precisa de informação: não feche; comente pedindo os dados e aplique `status: needs-info`.
- Obsoleta: `gh issue close {n} --comment "Fechada por inatividade (mais de 90 dias). Reabra se ainda for relevante."`

## Saída
Relatório de triagem exibido; com confirmação, labels aplicadas e issues fechadas. Nada é gravado no repositório.

## Critérios de conclusão
- [ ] Todas as issues do filtro classificadas com tipo, severidade, esforço e faixa de prioridade
- [ ] Ganhos rápidos destacados
- [ ] Relatório apresentado em tabela legível
- [ ] Ações de escrita (labels, fechamento) só depois da confirmação

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `gh` sem autenticação | `gh auth login` |
| Limite de requisições da API | reduza `--limit`, espere e repita; apresente o resultado parcial |
| Nenhuma issue aberta | informe o backlog limpo |
| Label inexistente | ofereça `gh label create` ou siga sem a label |

## Handoff
`@devops *resolve-issue {número}` para a issue escolhida, ou `@pm *backlog add` para registrar as demais.
