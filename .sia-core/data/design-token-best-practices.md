# Boas práticas de design tokens

> Uso no SIA: nomenclatura e organização de tokens no chapéu UX/UI do `@dev` (`*ux-design-system`, `*ux-build-component`, `*ux-audit`).
> Fonte da verdade do projeto: `tokens/tokens.yaml`, criado a partir do template `tokens-schema-tmpl.yaml`.

---

## Nomenclatura

### Semântico acima de descritivo

- ✅ `color-primary` (descreve o propósito)
- ❌ `color-blue-500` (descreve a aparência)

Nomes semânticos sobrevivem a redesenhos: se a cor primária muda de azul para roxo, `color-primary` continua correto, enquanto `color-blue-500` passa a enganar.

### kebab-case

- ✅ `color-primary-dark`
- ❌ `colorPrimaryDark` ou `color_primary_dark`

### Sufixos de variante

| Sufixo | Uso |
|--------|-----|
| `-light` | variante mais clara: fundos, estado desabilitado |
| `-dark` | variante mais escura: hover, ativo |
| `-hover` | estado de hover explícito |
| `-focus` | estado de foco explícito |
| `-foreground` | cor de texto e ícone sobre o token de fundo de mesmo nome (convenção do shadcn/ui) |

---

## Camadas

| Camada | Conteúdo | Exemplos |
|--------|----------|----------|
| `core` | primitivos: paletas e escalas | `neutral-50`, `accent-primary`, `spacing.md` |
| `semantic` | aliases por propósito, que referenciam o core | `background`, `primary`, `primary-hover`, `error` |
| `component` | mapeamentos por componente | `button.primary.background`, `input.border-focus` |

O tema escuro sobrescreve só a camada semântica. As referências usam a sintaxe do DTCG: `{layers.core.color.accent-primary}`.

---

## Categorias

**Obrigatórias:** `color`, `spacing` e `typography` (famílias, tamanhos, pesos, alturas de linha).

**Recomendadas:** `radius`, `shadow`, `transition` (duração e easing), `z-index` e `breakpoint`.

---

## Organização

```yaml
color:
  # Primária
  primary: 'oklch(0.53 0.17 250)'
  primary-dark: 'oklch(0.45 0.15 250)'
  primary-light: 'oklch(0.95 0.03 250)'

  # Semânticas
  error: 'oklch(0.58 0.22 27)'
  success: 'oklch(0.60 0.13 163)'
  warning: 'oklch(0.77 0.16 70)'

  # Neutras
  neutral-50: 'oklch(0.98 0 0)'
  neutral-900: 'oklch(0.21 0.03 265)'
```

---

## Valores

| Categoria | Formato |
|-----------|---------|
| Cores | OKLCH (`oklch(0.53 0.17 250)`); hex como fallback, com o motivo documentado |
| Espaçamento | px (`16px`); evite rem na definição do token |
| Tipografia | px nos tamanhos; line-height sem unidade |
| Tempo | ms (`200ms`) |

---

## Exportações

**Fonte única:** `tokens.yaml`. Exporte para:

- `tokens.dtcg.json`: formato W3C DTCG, validado
- `tokens.json`: imports em JavaScript e TypeScript
- `tokens.css`: propriedades customizadas do CSS
- `tokens.tailwind.js`: tema do Tailwind v3 (no v4, o `@theme` do CSS de entrada)
- `tokens.scss`: variáveis SCSS (opcional)

Mantenha os formatos em sincronia: altere o `tokens.yaml` e regenere todos. Nunca edite uma exportação à mão.

---

## Versionamento

Versione os tokens com semver: MINOR para token novo (ex.: 1.1.0) e MAJOR para renomear ou remover. Combine com as equipes consumidoras antes de qualquer mudança que quebre compatibilidade.

---

## Uso

**CSS:**

```css
.button {
  background: var(--color-primary);  /* token */
  padding: var(--space-md);          /* token */
  /* NÃO: background: #0066cc;          valor fixo */
}
```

**Tailwind:**

```tsx
<button className="bg-primary p-md">Salvar</button>          // ✅ tokens
<button className="bg-[#0066cc] p-[16px]">Salvar</button>    // ❌ valores fixos
```

**TypeScript:**

```typescript
import { tokens } from '@/tokens';
const primaryColor = tokens.color.primary;
```

**Regra:** zero valor fixo. Tokens ou nada.
