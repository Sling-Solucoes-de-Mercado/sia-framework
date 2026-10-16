---
id: ux-design-system
title: Configurar o design system (tokens, Tailwind e shadcn/ui)
agent: dev
hat: ux
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'escopo (opcional): setup | tokens | export | shadcn; padrão: setup (todas as etapas, em ordem)'
  - 'origem dos tokens: consolidação do *ux-audit (docs/ux/audit/{AAAA-MM-DD}/), tokens/tokens.yaml existente, template ou entrada manual'
  - 'storyId: story que autoriza a mudança no código (Artigo III da Constitution)'
outputs:
  - 'tokens/tokens.yaml: fonte da verdade dos tokens (camadas core, semantic e component, mais o tema escuro)'
  - 'tokens/tokens.dtcg.json: exportação W3C DTCG validada'
  - 'tokens/tokens.json, tokens/tokens.css e tokens/tokens.tailwind.js (tokens.scss e pacotes de plataforma são opcionais)'
  - 'CSS de entrada do Tailwind (ex.: app/globals.css) com o tema, as camadas base e o tema escuro'
  - 'components/ui/ com os componentes shadcn/ui ligados aos tokens e lib/utils.ts com cn'
  - 'docs/ux/design-system/setup-summary.md e docs/ux/design-system/tokens.md (versão, cobertura, validação e changelog)'
depends_on:
  templates: [tokens-schema-tmpl.yaml, token-exports-css-tmpl.css, token-exports-tailwind-tmpl.js]
  data: [design-token-best-practices.md, atomic-design-principles.md, wcag-compliance-guide.md, tech-presets/nextjs-react.md]
next: [ux-build-component]
source: [setup-design-system.md, bootstrap-shadcn-library.md, extract-tokens.md, export-design-tokens-dtcg.md]
---

# Configurar o design system (tokens, Tailwind e shadcn/ui)

## Objetivo

Montar a base do design system do projeto: tokens em três camadas com uma única fonte da verdade, exportações validadas (DTCG, CSS, Tailwind), Tailwind configurado com tema escuro e a biblioteca shadcn/ui instalada e ligada aos tokens, pronta para `*ux-build-component`.

## Quando usar

- Greenfield: criar o design system do zero, com tokens do template ou informados pelo usuário.
- Brownfield: depois do `*ux-audit`, transformar a consolidação em tokens e preparar a migração.
- Para regenerar as exportações depois de mudar o `tokens.yaml`, ou instalar o shadcn/ui num projeto que já tem tokens.

| Escopo | Passos executados |
|--------|-------------------|
| `setup` (padrão) | 1 a 8 |
| `tokens` | 1, 2, 3, 4 e 8 |
| `export` | 1, 4 e 8, a partir do `tokens.yaml` existente |
| `shadcn` | 1, 7 e 8 (exige Tailwind já configurado com os tokens) |

## Modos de execução

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Usa os padrões (`components/ui`, CSS de entrada do Next.js, tema escuro por `[data-theme="dark"]`, formatos padrão, sem Storybook). Pergunta só antes de sobrescrever arquivo e registra as decisões na story em `### Decisões (modo YOLO)`. |
| Interativo (padrão) | Checkpoints nos passos 1, 2, 3 e 7. |
| Pre-Flight | Faz todas as perguntas do passo 1 (origem, configuração, formatos) e executa sem novas perguntas. |

## Pré-condições

- [ ] Story associada com status `Ready` ou `InProgress` (Artigo III): esta task altera código do projeto.
- [ ] Projeto React/Next.js com TypeScript e `package.json`; Node.js ≥ 18.
- [ ] Brownfield: auditoria com consolidação em `docs/ux/audit/{AAAA-MM-DD}/` (`consolidation.md` e `pattern-mapping.json`).

## Passos

### 1. Detectar o ponto de partida

Leia o `package.json` e a estrutura do projeto: versões do React e do Next.js, versão do Tailwind (v3 usa `tailwind.config`; v4 usa `@import "tailwindcss"` e `@theme` no CSS), `components.json` do shadcn/ui, runner de testes (Vitest no preset `nextjs-react`; Jest quando o projeto usar), Storybook e gerenciador de pacotes. Procure `tokens/tokens.yaml` e a auditoria mais recente em `docs/ux/audit/`.

**Ponto de elicitação:**

```text
Origem dos tokens:
1. Consolidação do *ux-audit (brownfield)
2. tokens.yaml existente (informe o caminho)
3. Criar a partir do template tokens-schema-tmpl.yaml
4. Entrada manual (paleta, tipografia e espaçamento informados agora)

Configuração (Enter aceita o padrão):
- Diretório de componentes [components/ui]
- CSS de entrada do Tailwind [app/globals.css]
- Tema escuro: 1. [data-theme="dark"] [padrão]  2. classe .dark (padrão do shadcn/ui)
- Instalar os componentes base do shadcn/ui? [sim]
- Storybook? [não]
- Formatos: 1. YAML + DTCG + JSON + CSS + Tailwind [padrão]  2. + SCSS  3. + pacotes de plataforma (Android, iOS, Flutter)
```

Use a mesma estratégia de tema escuro em CSS, Tailwind e componentes. Prefixe os caminhos com `src/` quando o projeto usar `src/`.

### 2. Definir os tokens (`tokens/tokens.yaml`)

Gere a partir do `tokens-schema-tmpl.yaml`, seguindo `design-token-best-practices.md`:

- **Três camadas:** `core` (primitivos), `semantic` (aliases por propósito, com referências DTCG como `{layers.core.color.accent-primary}`) e `component` (mapeamentos por componente). O tema escuro sobrescreve só tokens semânticos (`themes.dark`).
- **Nomes semânticos** em kebab-case (`primary`, não `blue-500`), só com letras, números e hífen.
- **Cores em OKLCH**; hex só como fallback, com o motivo registrado.
- **Categorias:** cor, espaçamento e tipografia são obrigatórias; raio, sombra, transição, z-index e breakpoint são recomendadas.
- **Aliases do shadcn/ui** na camada semântica (`primary-foreground`, `muted`, `destructive`, `border`, `input`, `ring`...), para manter paridade entre as variantes dos componentes e os tokens.

No brownfield (origem 1), converta a consolidação:

| Padrão consolidado | Tokens gerados |
|--------------------|----------------|
| Clusters de cor | nomes semânticos (primary, error, success...); a variante mais escura do cluster vira `-hover` e a mais clara, `-light` ou `-disabled` |
| Escala de espaçamento | `xs` a `3xl` sobre a unidade base (4 ou 8 px), para padding, margin e gap |
| Escala tipográfica | famílias, tamanhos com nomes semânticos, pesos e alturas de linha calculadas a partir dos tamanhos |
| Variantes de botão | `component.button` com primary, secondary e destructive e tamanhos sm, md e lg, referenciando cor e espaçamento |

**Ponto de elicitação:** mostre o resumo (quantidade por categoria e nomes propostos) e peça: 1. aprovar, 2. renomear tokens, 3. ajustar valores.

### 3. Validar cobertura e contraste

- Brownfield: cobertura = usos originais cobertos por tokens ÷ total de usos do inventário. Meta: **acima de 95%**, com paridade no tema escuro. Liste as lacunas com o plano de correção.
- Todas as referências resolvem, as categorias obrigatórias existem e o YAML é válido.
- Contraste dos pares semânticos (`foreground` sobre `background`, `primary-foreground` sobre `primary`, texto sobre `muted`...) nos dois temas: ≥ 4.5:1 para texto normal e ≥ 3:1 para texto grande e componentes de UI (`wcag-compliance-guide.md`).

**Ponto de elicitação:** apresente cobertura e contraste e peça aprovação antes de exportar. Cobertura abaixo de 95% volta à consolidação do `*ux-audit` ou exige aceitação explícita do usuário.

### 4. Exportar

Gere tudo a partir do `tokens.yaml` e valide a sintaxe antes de gravar. Nunca edite uma exportação à mão.

| Arquivo | Como gerar |
|---------|------------|
| `tokens/tokens.dtcg.json` | W3C DTCG 2025.10: todo token com `$type` e `$value` (e `$description` quando houver). Mantenha os grupos `layers` e `themes`, porque as referências dependem desses caminhos; `metadata` e `exports` não são tokens e ficam fora |
| `tokens/tokens.json` | mapa achatado para import em JS/TS |
| `tokens/tokens.css` | template `token-exports-css-tmpl.css`: `:root` e o seletor do tema escuro |
| `tokens/tokens.tailwind.js` | template `token-exports-tailwind-tmpl.js` (Tailwind v3, ou v4 via `@config`) |
| `tokens/tokens.scss` | opcional: variáveis `$token-name`, para projetos com Sass |
| `tokens/exports/{plataforma}/` | opcional: Android (XML), iOS (Swift) e Flutter (Dart), via Style Dictionary ou script |

Na conversão para DTCG, os valores legíveis do YAML viram os formatos da especificação: cor `oklch(0.62 0.19 250)` → `{ "colorSpace": "oklch", "components": [0.62, 0.19, 250] }`; dimensão `16px` → `{ "value": 16, "unit": "px" }`; duração `200ms` → `{ "value": 200, "unit": "ms" }`; easing → array de 4 números; sombra → objeto com `color`, `offsetX`, `offsetY`, `blur` e `spread`.

Valide o `tokens.dtcg.json`: estrutura DTCG, referências resolvidas e cores em OKLCH (fallback hex sinalizado). Use o validador adotado pelo projeto; o Style Dictionary v4+ lê o formato DTCG e acusa referências quebradas. Registre o resultado em `docs/ux/design-system/tokens.md`.

### 5. Estruturar o projeto e instalar dependências

- **Pastas** (Atomic Design com a convenção do shadcn/ui, ver `atomic-design-principles.md`): `components/ui/` (átomos e moléculas), `components/composite/` (organismos), `components/layout/` (templates), `lib/` (`utils.ts` com `cn` e helpers) e `tokens/`. Utilitários de teste compartilhados ficam na pasta de testes do projeto.
- **Dependências:** `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-slot` e `lucide-react`; para testes, `@testing-library/react`, `@testing-library/jest-dom` e `jest-axe` (ou equivalente); Storybook 8+ se pedido. Use o gerenciador de pacotes do projeto e confirme com o usuário toda dependência nova.
- **`tokens/index.ts`:** exports tipados das camadas (core, semantic, component), gerados do `tokens.json`, e um helper para ler variáveis CSS. Confirme que `import { tokens } from '@/tokens'` funciona.
- **Lint e formatação:** ESLint e Prettier com o plugin do Tailwind (ordem de classes), quando o projeto já usar essas ferramentas.

Validação: a instalação termina sem erros.

### 6. Configurar o Tailwind e os estilos base

**Tailwind v4.** O bloco `@theme` do CSS de entrada, gerado do `tokens.yaml`, é a exportação consumida pelo app; não importe o `tokens.css` junto, para não duplicar variáveis. Use os namespaces do Tailwind para gerar os utilitários:

| Categoria | Variável no `@theme` | Utilitário gerado |
|-----------|----------------------|-------------------|
| Cor | `--color-primary` | `bg-primary`, `text-primary` |
| Espaçamento | `--spacing-md` | `p-md`, `gap-md` |
| Família de fonte | `--font-heading` | `font-heading` |
| Tamanho de fonte | `--text-lg` | `text-lg` |
| Peso | `--font-weight-semibold` | `font-semibold` |
| Altura de linha | `--leading-tight` | `leading-tight` |
| Raio | `--radius-base` | `rounded-base` |
| Sombra | `--shadow-md` | `shadow-md` |
| Breakpoint | `--breakpoint-tablet` | variante `tablet:` |
| Easing | `--ease-standard` | `ease-standard` |

```css
@import "tailwindcss";
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --color-background: oklch(0.98 0 0);
  --color-foreground: oklch(0.15 0.01 260);
  --color-primary: oklch(0.59 0.19 238);
  --spacing-md: 16px;
}

[data-theme="dark"] {
  --color-background: oklch(0.15 0.01 260);
  --color-foreground: oklch(0.98 0 0);
}
```

Com a estratégia de classe, troque o seletor por `.dark`. Categorias sem namespace no Tailwind (z-index, duração) ficam como variáveis CSS comuns. Não deixe resíduos de `theme.extend`.

**Tailwind v3.** Importe `tokens/tokens.tailwind.js` em `theme.extend` do `tailwind.config`, cubra todos os templates em `content` e configure `darkMode` com o seletor escolhido.

Nas duas versões: `@layer base` recebe o reset (preflight do Tailwind ou modern-normalize), o estilo de `:focus-visible` e os padrões de tipografia; `@layer components` guarda só abstrações reutilizáveis; utilitários próprios usam `@utility` (v4) ou plugin (v3). Estilo só por tokens e utilitários, sem CSS Modules.

Validação: o build gera os utilitários esperados, sem avisos.

### 7. Instalar e ligar o shadcn/ui

1. `npx shadcn@latest init`: confirme os caminhos (`components/ui`, `lib/utils.ts`), TypeScript, Tailwind e variáveis CSS. O `cn` usa `clsx` + `tailwind-merge`.
2. `npx shadcn@latest add button input card textarea badge skeleton spinner`. Se o registro não tiver `spinner`, crie um componente de carregamento.
3. Ligue aos tokens: troque cores fixas por classes semânticas (`bg-primary`), alinhe espaçamento e tipografia à escala e garanta as variantes do tema escuro.
4. Radix: instale os primitivos necessários e confirme que os atributos de acessibilidade e a gestão de foco continuam intactos.
5. Variantes: estenda os `cva` com as variantes do projeto (densidade, destructive, ghost), variantes compostas (botão só de ícone, ação destrutiva) e o padrão de carregamento compartilhado (`Spinner` + prop `isLoading`).
6. Use exports nomeados (`export { Button }`), para tree-shaking.
7. Documente cada componente em `docs/ux/components/{componente}.md`; stories são opcionais, com o Storybook ativo.

O shadcn/ui é copiado para o projeto e não recebe atualização automática: registre as alterações locais e traga melhorias do upstream de forma intencional, em auditorias periódicas.

**Ponto de elicitação:** liste os componentes instalados e as mudanças feitas em cada um e peça confirmação.

### 8. Documentar e registrar

- `docs/ux/design-system/setup-summary.md`: ponto de partida, configuração (pastas, CSS de entrada, tema escuro, runner de testes, Storybook), versão do Tailwind, tokens por categoria, dependências adicionadas, componentes shadcn/ui instalados e próximos passos.
- `docs/ux/design-system/tokens.md`: versão dos tokens (semver: MINOR para token novo; MAJOR para renomear ou remover, combinado antes com os consumidores), data, cobertura, resultado da validação DTCG, formatos exportados e changelog.
- Rode lint, typecheck, testes e build (`*run-tests`).
- Na story: marque os checkboxes concluídos, atualize a File List com todo arquivo criado ou alterado e acrescente no Change Log a linha `| {data} | @dev [UX/UI] | Design system configurado ({escopo}) |`.

A task pode ser executada de novo com segurança: ela pergunta antes de sobrescrever.

## Saída

| Artefato | Local |
|----------|-------|
| Tokens e exportações | `tokens/` (`tokens.yaml`, `tokens.dtcg.json`, `tokens.json`, `tokens.css`, `tokens.tailwind.js`, `index.ts`; opcionais `tokens.scss` e `exports/`) |
| Tema e estilos base | CSS de entrada do Tailwind (`@theme` no v4) ou `tailwind.config` (v3) |
| Componentes base | `components/ui/` e `lib/utils.ts` |
| Documentação | `docs/ux/design-system/setup-summary.md`, `docs/ux/design-system/tokens.md`, `docs/ux/components/` |

## Critérios de conclusão

- [ ] Estrutura de pastas segue Atomic Design e a convenção do shadcn/ui.
- [ ] `tokens.yaml` em três camadas, com nomes semânticos, cores em OKLCH (fallbacks documentados) e tema escuro com paridade.
- [ ] Cobertura acima de 95% dos padrões originais (brownfield) ou exceção aceita pelo usuário.
- [ ] Contraste dos pares semânticos atende WCAG AA nos dois temas.
- [ ] `tokens.dtcg.json` validado sem erros, com todas as referências resolvidas.
- [ ] Exportações escolhidas geradas a partir do `tokens.yaml`.
- [ ] Tailwind configurado (`@theme` no v4 ou `theme.extend` no v3) e build sem avisos.
- [ ] shadcn/ui inicializado, componentes base ligados aos tokens, `cn` e `cva` configurados, padrão de carregamento único.
- [ ] Lint, typecheck, testes e build passando.
- [ ] `setup-summary.md` e `tokens.md` gravados; File List e Change Log da story atualizados.

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Sem consolidação e sem tokens | Ofereça o template ou a entrada manual |
| Schema de tokens inválido | Aponte os erros específicos e sugira a correção |
| Cobertura abaixo de 95% | Avise e sugira consolidar mais no `*ux-audit` |
| Validação DTCG falha ou referência quebrada | Rastreie o token no `tokens.yaml`, corrija o alias ou crie o token e regenere |
| Ambiente sem suporte a OKLCH | Use fallback hex e registre o motivo (navegadores, restrições) |
| Arquivo ou diretório já existe | Pergunte se sobrescreve ou usa outro local |
| Falha no `shadcn init` | Remova os arquivos parciais e rode de novo |
| Versões do Radix divergentes | Alinhe com o lockfile e reinstale |
| Componente com cor sem token | Crie o token semântico que falta ou regenere as classes |
| Build do Storybook falha | Atualize para a versão 8+ e rode de novo |
| Falha em exportação de plataforma | Desfaça só essa etapa e registre a pendência |
| Sem story | Pare e peça `@pm *create-story` |

## Handoff

Próximo passo: `@dev *ux-build-component {componente}`, começando pelos átomos mais usados (prioridade do inventário do `*ux-audit` ou dos wireframes). No brownfield, a migração do código antigo segue o `pattern-mapping.json` da auditoria, em stories criadas pelo `@pm`.
