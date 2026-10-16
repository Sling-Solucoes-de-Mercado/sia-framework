---
id: validate-tech-preset
title: Validar um tech preset
agent: dev
hat: architect
elicit: false
inputs:
  - 'preset (obrigatório): nome sem extensão (ex.: nextjs-react), caminho completo ou --all'
  - '--strict (opcional): avisos viram erros'
  - '--fix (opcional): prepara o pedido de story de correção para o @pm'
outputs:
  - 'Relatório de validação: metadados, seções, qualidade do conteúdo, erros, avisos e resultado'
  - 'Com --fix e erros: rascunho de story de correção entregue ao @pm'
depends_on:
  data: [tech-presets/_template.md]
next: [create-story]
source: [validate-tech-preset.md]
---

# Validar um tech preset

## Objetivo

Conferir se um tech preset em `.sia-core/data/tech-presets/` segue a estrutura exigida por `tech-presets/_template.md` (metadados, seções obrigatórias e qualidade do conteúdo), para que agentes possam usá-lo na arquitetura e na implementação.

## Quando usar

- Depois de criar ou editar um preset (cópia do `_template.md`).
- Para conferir todos os presets antes de usá-los num projeto (`--all`).

## Pré-condições

- [ ] O preset existe (por nome, caminho ou, com `--all`, ao menos um arquivo além do `_template.md`).

## Passos

### 1. Resolver o caminho

- Caminho completo: use-o.
- Nome: `.sia-core/data/tech-presets/{nome}.md`.
- `--all`: todos os `.md` da pasta, menos o `_template.md`.

### 2. Ler o preset

1. Extraia o primeiro bloco YAML (entre ` ```yaml ` e ` ``` `) da seção `## Metadados`.
2. Liste as seções `##` e o conteúdo de cada uma.

### 3. Validar os metadados

| Campo em `preset` | Regra | Falha |
|-------------------|-------|-------|
| `id` | obrigatório, kebab-case | `FIELD_MISSING` ou `FIELD_INVALID` |
| `name` | obrigatório | `FIELD_MISSING` |
| `version` | obrigatório, semver `X.Y.Z` | `FIELD_MISSING` ou `FIELD_INVALID` |
| `description` | obrigatório (quando usar o preset) | `FIELD_MISSING` |
| `technologies` | obrigatório, lista não vazia | `FIELD_MISSING` |
| `suitable_for` | obrigatório, lista não vazia | `FIELD_MISSING` |
| `not_suitable_for` | recomendado | aviso `NOT_SUITABLE_MISSING` |

### 4. Validar as seções

| Seção | Obrigatória | Exigência mínima |
|-------|-------------|------------------|
| Padrões de Design | sim | Ao menos 1 padrão |
| Estrutura do Projeto | sim | Árvore de pastas |
| Stack Tecnológica | sim | Tabela de tecnologias |
| Padrões de Código | sim | Tabela de convenções de nome |
| Estratégia de Testes | sim | Abordagem de testes definida |
| Templates de Arquivo | não | Aviso se ausente |
| Tratamento de Erros | não | Aviso se ausente |
| Diretrizes de Desempenho | não | Aviso se ausente |

Aceite o título com complemento (ex.: `## Padrões de Design (os 5 essenciais)`).

### 5. Validar a qualidade do conteúdo

- **Padrões de Design:** cada padrão tem Propósito, as notas (Nota de execução e Nota anti-bug) e um exemplo de código. Faltou algum: `PATTERN_INCOMPLETE`.
- **Stack Tecnológica:** a tabela tem as colunas Categoria, Tecnologia, Versão e Propósito.
- **Padrões de Código:** há exemplo bom e exemplo ruim (ou antes e depois). Faltou: aviso `EXAMPLE_MISSING`.

### 6. Calcular e apresentar o resultado

- Com `--strict`, todo aviso conta como erro.
- Resultado: `VALID` (sem erros e sem avisos), `VALID (com avisos)` ou `INVALID` (algum erro).

```text
Validando o tech preset: nextjs-react.md

Metadados:
  ✓ id: nextjs-react
  ✓ name: Preset Next.js + React (full stack)
  ✓ version: 1.2.0
  ✓ technologies: 9 itens
  ✓ suitable_for: definido
  ✓ not_suitable_for: definido

Seções:
  ✓ Padrões de Design (5 padrões)
  ✓ Estrutura do Projeto
  ✓ Stack Tecnológica
  ✓ Padrões de Código
  ✓ Estratégia de Testes
  ✓ Templates de Arquivo
  ⚠ Tratamento de Erros: ausente
  ⚠ Diretrizes de Desempenho: ausente

Erros: 0 · Avisos: 2
Resultado: VALID (com avisos)
```

Com `--all`, mostre um bloco por preset e um resumo final (válidos, válidos com avisos, inválidos).

### 7. Preparar a correção (`--fix`)

Com erros (ou avisos, com `--strict`):

1. Monte o rascunho: título "Corrigir o tech preset {nome}", critérios de aceite derivados dos erros e avisos e uma task por erro, com o caminho do preset.
2. **Ponto de elicitação:** pergunte se deve encaminhar (1. Encaminhar ao `@pm`, 2. Só mostrar o rascunho).
3. O `@dev` não cria story (Artigo II): entregue o rascunho ao `@pm *create-story`.

## Códigos

| Código | Severidade | Significado |
|--------|------------|-------------|
| `PRESET_NOT_FOUND` | Erro | Arquivo do preset não encontrado |
| `METADATA_MISSING` | Erro | Sem bloco YAML de metadados |
| `METADATA_PARSE_ERROR` | Erro | YAML inválido |
| `FIELD_MISSING` | Erro | Campo obrigatório ausente |
| `FIELD_INVALID` | Erro | Valor inválido (ex.: versão fora do semver) |
| `SECTION_MISSING` | Erro | Seção obrigatória ausente |
| `PATTERN_INCOMPLETE` | Erro | Padrão de design sem campo exigido |
| `NOT_SUITABLE_MISSING` | Aviso | `not_suitable_for` não definido |
| `SECTION_RECOMMENDED` | Aviso | Seção recomendada ausente |
| `EXAMPLE_MISSING` | Aviso | Falta exemplo bom ou ruim |

## Saída

Relatório no chat com metadados, seções, qualidade, contagem de erros e avisos e resultado. Com `--fix`, o rascunho de story de correção.

## Critérios de conclusão

- [ ] Metadados, seções e qualidade avaliados conforme as tabelas
- [ ] `--strict` aplicado quando pedido
- [ ] Resultado final calculado e apresentado (por preset, com `--all`)
- [ ] Com `--fix`, rascunho encaminhado ao `@pm` ou exibido, conforme a escolha

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Preset não encontrado | `PRESET_NOT_FOUND`; liste os presets disponíveis |
| `--all` sem presets além do template | Informe que não há presets para validar |
| YAML de metadados inválido | `METADATA_PARSE_ERROR` com a linha do erro; siga validando as seções |

## Handoff

Preset inválido: corrija o arquivo ou encaminhe o rascunho para `@pm *create-story`. Preset válido: use-o em `*create-architecture` (Stack Tecnológica e Padrões de Código alimentam as seções `## Tech Stack` e `## Coding Standards` da arquitetura).
