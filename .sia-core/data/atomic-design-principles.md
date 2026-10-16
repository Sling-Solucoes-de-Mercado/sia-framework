# Princípios de Atomic Design

> Fonte: metodologia Atomic Design, de Brad Frost (https://atomicdesign.bradfrost.com/).
> Uso no SIA: organização de componentes no chapéu UX/UI do `@dev` (`*ux-wireframe`, `*ux-design-system`, `*ux-build-component`, `*ux-audit`).

---

## Os cinco níveis

### Átomos
**Definição:** blocos básicos que não se dividem em partes menores com significado próprio.

**Exemplos:** Button, Input, Label, Icon, Heading, Text.

**Regras:**
- Independentes e reutilizáveis
- Não dependem de outros átomos
- Usam só tokens (nenhum valor fixo)
- Responsabilidade única

### Moléculas
**Definição:** grupos de átomos que funcionam juntos como uma unidade.

**Exemplos:** FormField (Label + Input + HelperText), SearchBar (Input + Button), CardHeader (Icon + Heading + Text).

**Regras:**
- Compõem átomos, não os reimplementam
- Acrescentam só a lógica de composição
- Os átomos continuam independentes

### Organismos
**Definição:** componentes complexos, formados por moléculas e átomos.

**Exemplos:** Navigation (Logo + NavLinks + SearchBar + UserMenu), LoginForm (FormFields + Button + Link), ProductCard (Image + CardHeader + CardBody + Button).

**Regras:**
- Formam uma seção distinta da interface
- Podem ser reutilizados entre templates
- Podem ter estado interno, quando necessário

### Templates
**Definição:** layout de página sem o conteúdo real.

**Exemplos:** DashboardLayout, ArticleLayout, CheckoutFlowLayout.

**Regras:**
- Definem a estrutura da página
- Usam conteúdo de exemplo
- São reutilizáveis entre páginas

### Páginas
**Definição:** templates preenchidos com conteúdo real.

**Exemplos:** página inicial, página de produto, dashboard do usuário.

O design system cobre de átomos a organismos (e os templates). As páginas pertencem à aplicação.

---

## Como classificar um componente

1. Dá para dividir em partes menores com significado próprio? Não → **átomo**.
2. É um grupo pequeno de átomos com uma única função? → **molécula**.
3. É uma seção distinta da interface, com várias funções? → **organismo**.
4. Define a estrutura de uma página, sem conteúdo real? → **template**.

---

## Benefícios

1. **Consistência:** reutilizar átomos garante uma UI consistente.
2. **Escala:** features novas nascem de componentes existentes.
3. **Manutenção:** corrigiu uma vez, vale em todo lugar.
4. **Testes:** átomos bem testados permitem compor com confiança.
5. **Colaboração:** a taxonomia de componentes fica clara para todos.

---

## Estrutura no projeto

Padrão do SIA (convenção do shadcn/ui):

| Nível | Pasta | Exemplos |
|-------|-------|----------|
| Átomos e moléculas | `components/ui/` | `button.tsx`, `input.tsx`, `form-field.tsx` |
| Organismos | `components/composite/` | `navigation.tsx`, `login-form.tsx` |
| Templates | `components/layout/` | `dashboard-layout.tsx` |
| Páginas | rotas da aplicação (`app/` no Next.js) | `app/dashboard/page.tsx` |

Alternativa por nível atômico, quando o projeto já a adota:

```text
design-system/
├── atoms/        Button/, Input/, Label/
├── molecules/    FormField/, SearchBar/
├── organisms/    Navigation/, LoginForm/
└── templates/    DashboardLayout/
```

Escolha uma das duas estruturas e não misture.

**Ordem de construção:** átomos → moléculas → organismos → templates.
