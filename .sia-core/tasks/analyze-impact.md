---
id: analyze-impact
title: Analisar o impacto de uma mudança
agent: dev
hat: architect
elicit: true
inputs:
  - 'tipo de modificação (obrigatório): modify | deprecate | remove | refactor'
  - 'alvo (obrigatório): caminho do componente afetado (arquivo ou módulo)'
  - 'opções (opcional): --depth shallow|medium|deep, --include-tests, --risk-threshold low|medium|high|critical, --output-format text|json|visual, --save-report {caminho}, --approve-high-risk, --exclude-external'
outputs:
  - 'Relatório de impacto: componentes afetados com nota, propagação, risco geral, fatores de risco e recomendações'
  - 'Relatório gravado no caminho de --save-report, quando informado'
  - 'Registro de aprovação para risco alto ou crítico'
depends_on: {}
next: [create-adr, research-deps, write-spec]
source: [architect-analyze-impact.md]
---

# Analisar o impacto de uma mudança

## Objetivo

Medir, antes de implementar, o que uma mudança num componente afeta (dependentes diretos e indiretos, contratos, testes) e o risco dela, com recomendações e aprovação explícita quando o risco for alto.

## Quando usar

- Antes de alterar, depreciar, remover ou refatorar um componente usado por outros.
- Na avaliação de uma story ou spec que mexe em contrato público, schema ou módulo central.
- Não use para: avaliar a complexidade da story inteira (`*assess-complexity`), inspecionar a entrega (`@validator *regressao`).

## Parâmetros

| Opção | Padrão | Uso |
|-------|--------|-----|
| `--depth` | `medium` | `shallow` (só dependentes diretos), `medium` (dois níveis), `deep` (até não surgir dependente novo) |
| `--include-tests` | desligado | Inclui os testes afetados |
| `--risk-threshold` | `medium` | Nível a partir do qual o risco gera alerta: `low`, `medium`, `high`, `critical` |
| `--output-format` | `text` | `text`, `json` ou `visual` (mapa em ASCII ou Mermaid) |
| `--save-report {caminho}` | | Grava o relatório (`.md` ou `.json`) |
| `--approve-high-risk` | desligado | Dispensa a pergunta de aprovação para risco `high`; nunca para `critical` |
| `--exclude-external` | desligado | Ignora dependências externas (pacotes) |

## Pré-condições

- [ ] Tipo de modificação válido.
- [ ] Alvo existente e legível.

## Passos

### 1. Validar e classificar o alvo

1. Confira o tipo de modificação e as opções; valor inválido: erro com os valores aceitos.
2. Leia o alvo e classifique o componente pelo caminho e pelo conteúdo: rota ou API, serviço, componente de UI, modelo ou schema, configuração, utilitário ou teste.
3. Identifique o que ele expõe: exports, rotas, eventos, tabelas, variáveis de ambiente.

### 2. Analisar as dependências

1. Ache os dependentes diretos: quem importa o arquivo ou usa os símbolos expostos (grep por caminho de import, nome de símbolo, rota e tabela).
2. Percorra os dependentes dos dependentes até a profundidade pedida. Inclua testes com `--include-tests`; ignore pacotes externos com `--exclude-external`.
3. Para cada componente afetado, dê uma nota de impacto de 1 a 10 e o motivo (ex.: "chama a função removida", "depende do formato de retorno"), destacando potencial de quebra.

### 3. Prever a propagação

Descreva como a mudança se espalha: efeitos em cascata, profundidade máxima atingida e pontos de falha prováveis (contratos usados por muitos, caminhos sem teste).

### 4. Avaliar o risco

1. Defina o risco geral (`low`, `medium`, `high`, `critical`) considerando o tipo de modificação (remover e depreciar pesam mais que modificar), a criticidade do componente, o número de dependentes e a cobertura de testes.
2. Liste os fatores de risco (tipo, descrição, severidade), os problemas críticos e as recomendações com mitigação (ex.: manter compatibilidade por uma versão, adicionar teste de contrato antes, migrar os chamadores em etapas).
3. Risco igual ou acima de `--risk-threshold`: destaque o alerta no relatório.

### 5. Apresentar o relatório

```text
RELATÓRIO DE IMPACTO
Alvo: src/billing/invoice.service.ts · Modificação: refactor · Profundidade: medium
Risco: HIGH · Componentes afetados: 12 · Propagação: 3 níveis · Problemas críticos: 1

Mais impactados:
  🔴 src/billing/checkout.ts (9/10) usa o retorno de calculateTotal()
  🟡 src/reports/monthly.ts (6/10) importa InvoiceService
  🟢 src/admin/invoices.page.tsx (3/10) só exibe o total

Recomendações:
  1. Escrever teste de contrato para calculateTotal() antes de refatorar
  2. Manter a assinatura atual e marcar a nova como opcional por uma versão
  3. Migrar checkout.ts primeiro, por ser o mais acoplado

Fatores de risco:
  - contrato: formato de retorno muda (high)
  - testes: monthly.ts sem cobertura (medium)
```

Ícones: 🔴 nota acima de 8; 🟡 acima de 5; 🟢 até 5. Em `json`, entregue o mesmo conteúdo estruturado (`summary`, `affectedComponents`, `propagation`, `riskAssessment`). Em `visual`, acrescente o mapa de dependências em ASCII ou Mermaid.

### 6. Aprovar mudança de risco alto

**Ponto de elicitação:** risco `high` ou `critical` sem `--approve-high-risk` (e sempre que for `critical`):

```text
MUDANÇA DE RISCO ALTO
Prosseguir com a modificação de risco {nível} em {alvo}?
1. Sim, aprovar e registrar
2. Não, parar aqui
```

- Aprovado: registre no relatório quem aprovou, quando e o nível de risco; havendo story, registre também no `### Log de debug`.
- Não aprovado: encerre com "requer aprovação antes de prosseguir".

### 7. Registrar decisões e salvar

1. Mudança estrutural (contrato público, schema, remoção de módulo, nova dependência): registre a decisão em ADR com `*create-adr {título}` antes de implementar (guia de autoria, 4.2).
2. Com `--save-report`, grave o relatório no caminho informado, validando que ele fica dentro do projeto.

## Saída

Relatório de impacto no formato pedido (e gravado, com `--save-report`), com risco geral, componentes afetados, propagação, fatores de risco, recomendações e, para risco alto, o registro da aprovação.

## Critérios de conclusão

- [ ] Dependentes rastreados até a profundidade pedida, cada um com nota e motivo
- [ ] Risco geral, fatores de risco e recomendações definidos
- [ ] Aprovação obtida e registrada para risco `high` (sem dispensa) e sempre para `critical`
- [ ] Decisão estrutural encaminhada para ADR

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Tipo de modificação ou opção inválida | Erro com os valores aceitos |
| Alvo não encontrado ou não é arquivo | Erro: `Componente não encontrado: {caminho}` |
| Nenhum dependente encontrado | Informe; confira importações dinâmicas e uso por string antes de concluir risco baixo |
| Caminho de relatório fora do projeto | Recuse e peça outro caminho |
| `--approve-high-risk` em risco `critical` | Ignore a dispensa e peça aprovação |

## Handoff

Mudança estrutural: `*create-adr {título}`. No Spec Pipeline: `@pm *research-deps {storyId}` (classe STANDARD ou COMPLEX) ou `@pm *write-spec {storyId}` (classe SIMPLE). Pronto para implementar: `*develop {storyId}`.
