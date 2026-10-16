---
id: ux-audit
title: Auditar a UI (padrões duplicados, consolidação, Tailwind e ROI)
agent: dev
hat: ux
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'caminho: diretório do código (ex.: ./src) ou artefato único (arquivo HTML, componente .jsx/.tsx, screenshot ou URL)'
  - 'etapas (opcional): inventário | consolidação | tailwind | relatório; padrão: todas as aplicáveis'
  - 'dados de custo (opcional, para o ROI): valor da hora e custo estimado de implementação'
outputs:
  - 'docs/ux/audit/{AAAA-MM-DD}/pattern-inventory.json: contagens e fatores de redundância por tipo de padrão'
  - 'docs/ux/audit/{AAAA-MM-DD}/scan-{slug}.md: análise de artefato único (quando o alvo é arquivo, screenshot ou URL)'
  - 'docs/ux/audit/{AAAA-MM-DD}/consolidation.md e pattern-mapping.json: clusters, escalas propostas e mapa padrão antigo → token'
  - 'docs/ux/audit/{AAAA-MM-DD}/tailwind-audit.md: saúde da configuração do Tailwind (quando houver Tailwind)'
  - 'docs/ux/audit/{AAAA-MM-DD}/shock-report.md: relatório de inconsistências com ROI simples'
depends_on:
  tasks: [execute-checklist.md]
  checklists: [component-quality-checklist.md]
  data: [atomic-design-principles.md, design-token-best-practices.md]
next: [create-story, ux-design-system]
source: [audit-codebase.md, consolidate-patterns.md, generate-shock-report.md, ux-ds-scan-artifact.md, audit-tailwind-config.md, calculate-roi.md]
---

# Auditar a UI (padrões duplicados, consolidação, Tailwind e ROI)

## Objetivo

Medir com números a redundância de padrões de UI (botões, cores, espaçamento, tipografia, formulários), propor a consolidação em tokens e variantes, verificar a saúde do Tailwind e apresentar tudo num relatório de inconsistências com ROI simples, que justifica e orienta o design system.

## Quando usar

- Projeto existente, antes do `*ux-design-system`: a consolidação vira a origem dos tokens.
- Brownfield discovery, para levantar os débitos de UI/UX do frontend.
- Auditoria periódica, para evitar regressão de padrões (compare com a auditoria anterior).
- Análise de um artefato único (página, componente, screenshot ou URL de concorrente) para extrair tokens e componentes.

A task é somente leitura: não altera o código do projeto.

| Etapa | Entrada | Produz | Quando |
|-------|---------|--------|--------|
| 2. Inventário | diretório | `pattern-inventory.json` | alvo é diretório |
| 3. Análise de artefato | arquivo, screenshot ou URL | `scan-{slug}.md` | alvo é artefato único |
| 4. Consolidação | inventário ou análise | `consolidation.md`, `pattern-mapping.json` | redundância relevante ou pedido do usuário |
| 5. Auditoria do Tailwind | configuração e CSS de entrada | `tailwind-audit.md` | projeto usa Tailwind |
| 6 e 7. ROI e relatório | etapas anteriores | `shock-report.md` | sempre que houver inventário |

## Modos de execução

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Roda todas as etapas aplicáveis sem perguntar, com limiar HSL de 5%, sem overrides manuais e ROI em horas quando faltar valor da hora; decisões ficam em `consolidation.md`. |
| Interativo (padrão) | Checkpoints nos passos 1, 4, 6 e 8. |
| Pre-Flight | Pergunta alvo, etapas, overrides, público do relatório e dados de custo de uma vez. |

## Pré-condições

- [ ] Alvo existe e é legível: diretório com código de UI (React, Vue, HTML ou CSS) ou artefato acessível.
- [ ] Shell com `grep` e `find` disponível para a varredura.
- [ ] URL: página pública ou acesso fornecido pelo usuário.

## Passos

### 1. Definir alvo e escopo

**Ponto de elicitação:**

```text
O que vamos auditar?
1. Diretório do código (ex.: ./src)
2. Arquivo HTML
3. Componente React (.jsx/.tsx)
4. Screenshot (.png/.jpg)
5. URL pública

Público do relatório: 1. engenharia  2. executivos
```

Valide o caminho, conte os arquivos e estime o tempo (cerca de 2 min por 100 mil linhas). Detecte os frameworks pela contagem de `.jsx`/`.tsx`, `.vue`, `.html` e `.css`/`.scss`/`.sass`; pelo menos um tipo de arquivo de UI precisa existir. Mostre o plano (etapas, pasta de saída `docs/ux/audit/{AAAA-MM-DD}/`) e confirme antes de começar.

### 2. Inventariar os padrões (diretório)

Varra só leitura, ignorando `node_modules`, `dist`, `build`, binários e arquivos grandes não textuais.

| Padrão | O que extrair | Métricas |
|--------|---------------|----------|
| Botões | `<button`, `<Button`, `className="btn..."` e as combinações de classe ou variante | instâncias, padrões únicos, fator de redundância |
| Cores | hex (`#RGB`, `#RRGGBB`), `rgb`/`rgba` (e `hsl`/`oklch`, se houver), inclusive em classes arbitrárias | únicas, instâncias, top 10, fator |
| Espaçamento | valores de `padding`, `margin` e `gap` | valores únicos, mais comuns |
| Tipografia | `font-family`, `font-size`, `font-weight` | únicos por propriedade |
| Formulários | `<input`, `<form` e suas classes | instâncias, padrões únicos |

Fator de redundância = instâncias ÷ padrões únicos. Exemplos de varredura (adapte extensões e pastas):

```bash
# cores hex, da mais usada para a menos usada
grep -rhoE '#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?' src --include='*.tsx' --include='*.jsx' --include='*.css' --include='*.scss' \
  | tr 'A-F' 'a-f' | sort | uniq -c | sort -rn | head -20
# instâncias de botão
grep -rhoE '<(button|Button)([ >]|$)' src --include='*.tsx' --include='*.jsx' --include='*.html' | wc -l
```

Grave `pattern-inventory.json`:

```json
{
  "scan_metadata": { "timestamp": "2026-10-16T12:00:00-03:00", "scan_path": "./src", "total_files": 487,
    "frameworks_detected": { "react": true, "vue": false, "html": false }, "tailwind": { "version": "3.4", "config": "tailwind.config.ts" } },
  "patterns": {
    "buttons": { "unique_patterns": 47, "total_instances": 327, "redundancy_factor": 6.96 },
    "colors": { "unique_hex": 82, "unique_rgb": 7, "total_unique": 89, "total_instances": 1247, "redundancy_factor": 14.01 },
    "spacing": { "unique_padding": 19, "unique_margin": 15 },
    "typography": { "unique_font_families": 4, "unique_font_sizes": 15, "unique_font_weights": 6 },
    "forms": { "input_instances": 189, "unique_input_patterns": 23, "form_instances": 45, "unique_form_patterns": 12 }
  }
}
```

Valide o inventário com `execute-checklist` e `component-quality-checklist.md`, Parte B, antes de consolidar.

### 3. Analisar artefato único (alternativa ao passo 2)

| Artefato | Análise | Limitações |
|----------|---------|------------|
| HTML ou React | estrutura (DOM/JSX), classes e estilos inline, elementos semelhantes agrupados | não vê a renderização nem o comportamento dinâmico |
| Screenshot | regiões (cabeçalho, conteúdo, rodapé), componentes, paleta e espaçamento, por visão computacional | não extrai estrutura de código nem estados de hover e foco |
| URL | HTML, estilos inline e CSS externo acessível, componentes interativos | pode ser bloqueada por CORS ou login |

1. Extraia os tokens: cores com contagem de uso, tipografia (famílias, tamanhos, pesos), espaçamento (escala e padrões comuns), raios e sombras.
2. Identifique os componentes por nível atômico (`atomic-design-principles.md`), com contagem e variantes. Agrupe estruturas e estilos com mais de 85% de similaridade e use a variante mais comum como base.
3. Calcule a redundância (variações únicas → conjunto ideal, com o percentual de redução).
4. Recomende a construção: prioridade ALTA (mais usados, ex.: Button, Input, Card), MÉDIA e BAIXA (únicos ou específicos de página), e a ordem em fases (1. átomos centrais; 2. moléculas comuns; 3. organismos complexos; 4. templates de página).

Grave `scan-{slug}.md` com resumo, tokens, componentes, redundância e recomendações.

### 4. Consolidar os padrões

**Ponto de elicitação:** mostre as métricas atuais e confirme o limiar HSL (padrão 5%) e os overrides manuais (padrões que não devem ser fundidos, ex.: uma cor de hover intencional).

- **Cores:** converta para HSL e agrupe as cores com diferença de até 5% em H, S e L em relação à cor principal do cluster. A mais usada de cada cluster vira a canônica. Identifique relações semânticas: a variante mais escura vira hover; a mais clara, fundo ou desabilitado.
- **Botões:** agrupe por propósito semântico pelas palavras-chave das classes (primary/main → primary; secondary/default → secondary; danger/delete/destructive → destructive). Mantenha a mais usada de cada grupo; conjunto mínimo recomendado: primary, secondary e destructive.
- **Espaçamento:** detecte a unidade base (4 ou 8 px; padrão 4) e proponha a escala xs, sm, md, lg, xl, 2xl, 3xl (base × 1, 2, 4, 6, 8, 12, 16). Mapeie cada valor existente para o degrau mais próximo.
- **Tipografia:** proponha uma escala (modular ou de intervalos fixos), funda pesos próximos (500 e 600) e reduza as famílias ao mínimo.

Meta: **redução geral acima de 80%**. Se não for atingida, explique por quê e mostre a redução real.

**Ponto de elicitação:** apresente o antes e depois por tipo e peça: 1. aprovar, 2. ajustar clusters, 3. registrar override. Todo override fica com o motivo.

Grave `consolidation.md` (tabela antes/depois com percentuais, clusters com contagem de uso, análise semântica dos botões, escalas de espaçamento e tipografia, decisões e overrides) e `pattern-mapping.json` (padrão antigo → token novo, com trechos de migração).

### 5. Auditar o Tailwind (projeto com Tailwind)

1. **Contexto:** CSS de entrada (`app/globals.css`, `src/styles.css`), `@import`, plugins, utilitários próprios e versão.
2. **Tema:** tokens agrupados core → semantic → component (`@theme` no v4, `theme.extend` no v3); o tema escuro sobrescreve tokens semânticos; no v4, sem resíduos de `theme.extend`.
3. **Camadas:** `@layer base` (reset, tipografia, `focus-visible`), `components` (abstrações reutilizáveis) e `utilities` (`@utility` no v4), nessa ordem e sem definições duplicadas.
4. **Cobertura de conteúdo:** globs de `content` (v3) ou detecção automática e `@source` (v4) cobrindo `.tsx`, `.jsx`, `.mdx`, stories e templates. Sinalize classes montadas dinamicamente e proponha safelist.
5. **Saúde dos utilitários:** conflitos de classe (tailwind-merge, regra `no-contradicting-classname` do `eslint-plugin-tailwindcss`), utilitários próprios redundantes com tokens ou variantes e classes legadas (ex.: `outline-none` no lugar de `outline-hidden` no v4).
6. **Desempenho:** tempo de build a frio e incremental, tamanho do CSS gerado e quantidade de utilitários, comparados com a linha de base anterior.

Grave `tailwind-audit.md` com o status de cada item (pass / warn / fail), as métricas e a lista de ações priorizada (tokens a criar, utilitários a remover, ajustes de configuração), com responsável e prazo. Sugira lint automático (ESLint e `prettier-plugin-tailwindcss`) e a ordem de classes: layout → tamanho → espaçamento → tipografia → cor → efeito.

### 6. Calcular o ROI simples

**Ponto de elicitação:** peça o valor da hora do time e o custo estimado de implementação (horas ou R$). A manutenção padrão é de 2 h/mês por padrão (estimativa conservadora, recomendada para stakeholders).

```text
custo mensal        = padrões × horas por padrão × valor da hora
economia mensal     = custo antes − custo depois        (anual = × 12)
ROI                 = economia anual ÷ custo de implementação
retorno (meses)     = custo de implementação ÷ economia mensal
```

Mostre as fórmulas e as entradas usadas. Sem valor da hora, apresente o resultado em horas e marque como estimativa. ROI negativo ou baixo: explique e sugira a consolidação de maior impacto.

### 7. Gerar o relatório de inconsistências

Grave `shock-report.md`, autocontido (sem recursos externos) e legível em 5 minutos, nesta ordem:

1. **Resumo executivo:** o problema numa frase, três tópicos (redução possível, economia, retorno) e uma chamada para ação.
2. **Os números:** tabela por tipo de padrão com quantidade atual, meta, fator de redundância e redução.
3. **O caos em evidência:** por tipo, as variações lado a lado em tabela (amostra de código, `arquivo:linha`, usos); as cores com contagem de uso; as inconsistências de espaçamento; os 10 piores casos. Opcional: gráfico Mermaid `pie` com a distribuição de usos.
4. **O custo:** tabela do ROI (antes, depois, economia, retorno).
5. **A solução:** o estado futuro consolidado (ex.: 47 botões → 3 variantes) e o resumo do mapa de migração.
6. **Próximos passos.**

Para engenharia, inclua caminhos de arquivo e trechos de código; para executivos, priorize os números. Sanitize textos fornecidos pelo usuário. Depois de consolidar, rode a auditoria de novo para mostrar o progresso.

### 8. Fechar a auditoria

Interprete a redundância: fator acima de 3x indica débito significativo; mais de 50 cores únicas ou mais de 20 variações de botão indicam débito grave; abaixo de 2x o código está relativamente limpo e vale avaliar se o design system compensa.

**Ponto de elicitação:** apresente o resumo e peça: 1. formalizar a consolidação numa story (ou num epic, se o volume pedir) com o `@pm`, 2. seguir para `*ux-design-system` numa story existente, 3. encerrar com o relatório.

## Saída

Em `docs/ux/audit/{AAAA-MM-DD}/`: `pattern-inventory.json`, `scan-{slug}.md` (artefato único), `consolidation.md`, `pattern-mapping.json`, `tailwind-audit.md` (com Tailwind) e `shock-report.md`. Nenhum arquivo do código é alterado.

## Critérios de conclusão

- [ ] Varredura concluída; arquivos com falha ou permissão negada registrados.
- [ ] Botões, cores, espaçamento, tipografia e formulários inventariados, com fatores de redundância.
- [ ] `pattern-inventory.json` válido e Parte B do `component-quality-checklist.md` executada.
- [ ] Consolidação com clusters HSL, variantes semânticas de botão e escala sobre unidade base; overrides com motivo.
- [ ] Redução acima de 80% ou justificativa com a redução real; mapa antigo → token completo.
- [ ] Tailwind auditado (quando houver), com ações priorizadas.
- [ ] ROI com fórmulas e entradas explícitas.
- [ ] `shock-report.md` com resumo executivo, números, evidências, custo e estado futuro.

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Caminho não existe | Pare com mensagem clara e sugira caminhos válidos |
| Nenhum arquivo de UI | Avise e confira o caminho com o usuário |
| Permissão negada | Diga qual diretório precisa de leitura |
| Falha parcial ou arquivo malformado | Registre os arquivos, siga com os demais e marque os dados como incompletos |
| Redundância abaixo de 2x | Informe que o código está relativamente limpo; consolidação é opcional |
| Meta de 80% não atingida | Explique o motivo e mostre a redução real |
| URL bloqueada (CORS, login) | Peça o HTML salvo ou um screenshot |
| Exemplos visuais indisponíveis | Use descrições em texto no relatório |
| Sem valor da hora | ROI em horas, marcado como estimativa |

## Handoff

Próximo passo: `@pm *create-story` (ou `*create-epic`, se o volume pedir) para a consolidação e a migração. Dentro da story, `@dev *ux-design-system` com escopo `tokens`, usando `consolidation.md` e `pattern-mapping.json` como origem dos tokens.
