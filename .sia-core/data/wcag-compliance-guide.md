# Guia de conformidade WCAG

> Padrão do SIA: WCAG 2.2 nível AA (mínimo); AAA é meta opcional.
> Uso: chapéu UX/UI do `@dev` (`*ux-wireframe`, `*ux-design-system`, `*ux-build-component`, `*a11y-check`) e stories com interface.
> Verificação item a item: `checklists/accessibility-wcag-checklist.md`.
> Referência oficial: https://www.w3.org/WAI/WCAG22/quickref/

---

## Referência rápida: requisitos AA

### Contraste de cor

| Elemento | Razão mínima |
|----------|--------------|
| Texto normal | 4.5:1 |
| Texto grande: ≥ 18 pt (cerca de 24 px) ou ≥ 14 pt em negrito (cerca de 18.66 px) | 3:1 |
| Componentes de UI e gráficos (ícones, bordas de campo, indicador de foco) | 3:1 |

Valide nos temas claro e escuro. O APCA serve de referência complementar para o peso e o tamanho da fonte; não substitui as razões do WCAG 2.x.

Teste automatizado de uma página:

```bash
npx pa11y --standard WCAG2AA http://localhost:3000
```

### Navegação por teclado

- Todo elemento interativo é alcançável com Tab
- Ordem de tabulação lógica (de cima para baixo, da esquerda para a direita)
- Enter e Espaço ativam botões
- Setas navegam em grupos de rádio e menus
- Escape fecha modais e dropdowns

### Indicador de foco

- Contorno visível, com contraste ≥ 3:1
- Nunca `outline: none` sem substituto

```css
/* Bom */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Ruim: remove o indicador de foco de quem navega por teclado */
button:focus {
  outline: none;
}
```

### Critérios novos do WCAG 2.2 (níveis A e AA)

| Critério | Nível | O que exige |
|----------|-------|-------------|
| 2.4.11 Foco não encoberto (mínimo) | AA | o elemento focado não fica totalmente escondido por cabeçalho fixo, banner ou overlay |
| 2.5.7 Movimentos de arrastar | AA | toda ação de arrastar tem alternativa com um único ponteiro (ex.: botões) |
| 2.5.8 Tamanho do alvo (mínimo) | AA | alvos de pelo menos 24×24 px CSS, ou espaçamento equivalente |
| 3.2.6 Ajuda consistente | A | mecanismos de ajuda no mesmo lugar relativo entre as páginas |
| 3.3.7 Entrada redundante | A | dado já informado no mesmo processo não é pedido de novo |
| 3.3.8 Autenticação acessível (mínimo) | AA | login sem teste cognitivo; colar senha e gerenciador de senhas funcionam |

### Atributos ARIA

Use ARIA em widgets próprios (sem equivalente em HTML semântico), em conteúdo dinâmico e em interações complexas. HTML semântico vem primeiro; ARIA complementa.

```tsx
// Botão só com ícone
<button aria-label="Fechar diálogo">
  <CloseIcon aria-hidden="true" />
</button>

// Carregamento
<div aria-live="polite" aria-busy="true">
  Carregando...
</div>

// Estado expandido
<button aria-expanded={isOpen} aria-controls="menu">
  Menu
</button>

// Desabilitado: disabled em elementos nativos; aria-disabled quando o elemento precisa continuar focável
<button disabled>Enviar</button>
```

---

## WCAG AAA (meta, não obrigatória)

- Contraste de texto ≥ 7:1 (normal) e ≥ 4.5:1 (grande)
- Sem imagens de texto
- Apresentação visual aprimorada (altura de linha ≥ 1.5)

---

## Diretrizes por componente

### Botões

```tsx
// ✅ Bom
<button onClick={handleClick} disabled={isDisabled}>
  Salvar
</button>

// ❌ Ruim: div não é acessível por teclado
<div onClick={handleClick}>Salvar</div>
```

### Formulários

```tsx
// ✅ Bom
<label htmlFor="email">E-mail</label>
<input
  id="email"
  type="email"
  required
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby="email-error"
/>
{hasError && (
  <span id="email-error" role="alert">
    Formato de e-mail inválido
  </span>
)}

// ❌ Ruim: campo sem rótulo
<input placeholder="E-mail" />
```

### Modais

```tsx
// ✅ Bom
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title">
  <h2 id="dialog-title">Confirmar ação</h2>
  <p>Tem certeza?</p>
  <button onClick={onConfirm}>Sim</button>
  <button onClick={onCancel}>Não</button>
</div>
```

Comportamento esperado: Tab circula dentro do modal (foco contido), Escape fecha e o foco volta ao elemento que abriu o modal. O Dialog do shadcn/ui (Radix) já implementa esse comportamento.

---

## Testes

### Automatizados

```bash
npm install --save-dev @testing-library/jest-dom jest-axe
```

```tsx
import { render } from '@testing-library/react';
import { axe } from 'jest-axe';
// no setup dos testes: expect.extend(toHaveNoViolations), de jest-axe

test('Button é acessível', async () => {
  const { container } = render(<Button>Clique aqui</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Manuais

- [ ] Navegar pela aplicação inteira só com o teclado
- [ ] Testar com leitor de tela (NVDA, JAWS, VoiceOver)
- [ ] Zoom de 200%: todo o conteúdo continua acessível
- [ ] Conferir o contraste nas DevTools do navegador
- [ ] Testar com o modo de alto contraste

---

## Violações comuns e correções

### 1. Imagem sem texto alternativo

```tsx
// ❌ Ruim
<img src="logo.png" />

// ✅ Bom
<img src="logo.png" alt="Logotipo da empresa" />

// ✅ Bom (decorativa)
<img src="decoracao.png" alt="" />
```

### 2. Contraste baixo

```css
/* ❌ Ruim: 2.8:1 */
.text {
  color: #999;
  background: #fff;
}

/* ✅ Bom: 5.7:1 */
.text {
  color: #666;
  background: #fff;
}
```

### 3. Elemento clicável sem teclado

```tsx
// ❌ Ruim
<div onClick={handleClick}>Clique aqui</div>

// ✅ Bom
<button onClick={handleClick}>Clique aqui</button>

// ✅ Bom (quando a div é inevitável)
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Clique aqui
</div>
```

---

## Recursos

- WCAG 2.2, referência rápida: https://www.w3.org/WAI/WCAG22/quickref/
- ARIA Authoring Practices: https://www.w3.org/WAI/ARIA/apg/
- axe DevTools: extensão de navegador para testes automatizados
- WAVE: ferramenta de avaliação de acessibilidade

---

## Regra do design system

Todo componente DEVE:

- passar nos testes automatizados com axe
- ter contraste de texto ≥ 4.5:1 (≥ 3:1 para texto grande)
- ser navegável por teclado
- ter indicador de foco visível
- usar os atributos ARIA adequados
- ser testado com leitor de tela

Acessibilidade é qualidade e não é negociável.
