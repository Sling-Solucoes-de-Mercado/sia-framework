---
id: ux-build-component
title: Construir, compor ou estender componente do design system
agent: dev
hat: ux
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'componente: nome em kebab-case (ex.: button, form-field)'
  - 'operação (opcional): build | compose | extend; detectada pelo estado do código se ausente'
  - 'extensão (opcional, extend): variante, tamanho ou recurso a acrescentar (ex.: variante warning)'
  - 'storyId: story que autoriza o componente (Artigo III da Constitution)'
outputs:
  - '{dir-de-componentes}/{componente}.tsx: componente React + TypeScript (forwardRef, cva, tokens)'
  - '{dir-de-componentes}/{componente}.test.tsx: testes unitários e de acessibilidade'
  - '{dir-de-componentes}/{componente}.stories.tsx: stories, quando o Storybook está ativo'
  - 'docs/ux/components/{componente}.md: props, variantes, composição e acessibilidade'
  - 'barrel export, File List e Change Log da story atualizados'
depends_on:
  tasks: [execute-checklist.md]
  templates: [component-react-tmpl.tsx]
  checklists: [component-quality-checklist.md, accessibility-wcag-checklist.md]
  data: [atomic-design-principles.md, design-token-best-practices.md, wcag-compliance-guide.md, tech-presets/nextjs-react.md]
next: [a11y-check, run-tests]
source: [build-component.md, compose-molecule.md, extend-pattern.md]
---

# Construir, compor ou estender componente do design system

## Objetivo

Entregar um componente pronto para produção, seguindo Atomic Design: variantes `cva` ligadas a tokens (zero valor fixo), TypeScript estrito, testes com auditoria de acessibilidade WCAG AA e documentação.

## Quando usar

| Operação | Quando | Regra central |
|----------|--------|---------------|
| `build` | átomo ou organismo novo (Button, Input, Card, Header) | gerar pelo template; estilo só por tokens |
| `compose` | molécula a partir de átomos existentes (FormField = Label + Input + texto de ajuda; SearchBar = Input + Button) | compor, não reimplementar; a molécula só acrescenta a lógica de composição; os átomos continuam independentes e reutilizáveis |
| `extend` | nova variante, tamanho ou recurso num componente existente | acrescentar, não substituir; API compatível; as variantes existentes continuam funcionando |

Use dentro de uma story, em geral durante o `*develop`. Os componentes vêm do inventário dos wireframes ou do `*ux-audit`, na ordem átomos → moléculas → organismos.

## Modos de execução

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Assume variantes, tamanhos e estados do inventário ou dos tokens e registra as decisões na story em `### Decisões (modo YOLO)`. |
| Interativo (padrão) | Checkpoints nos passos 1, 2 e 6. |
| Pre-Flight | Faz todas as perguntas do passo 1 antes e executa sem novas perguntas. |

## Pré-condições

- [ ] Design system configurado (`*ux-design-system`): tokens acessíveis, `cn` e `cva` disponíveis.
- [ ] React e TypeScript configurados.
- [ ] Story associada com status `Ready` ou `InProgress` (Artigo III).
- [ ] `compose`: os átomos dependentes existem. `extend`: o componente existe e há tokens para a nova variante.

## Passos

### 1. Configurar o componente

Procure no código o que já existe (REUSE > ADAPT > CREATE): componente com o mesmo nome ou papel e variantes `cva` parecidas. Se o componente existe, proponha `extend`; se for combinação de átomos existentes, `compose`.

**Ponto de elicitação:**

```text
Componente: {nome}
1. Nível atômico: átomo | molécula | organismo (atomic-design-principles.md)
2. Variantes: primary, secondary, destructive, outline, ghost...
3. Tamanhos: sm, md, lg, icon
4. Estados: hover, foco, desabilitado, carregando, erro
5. Props adicionais
6. Stories no Storybook? (quando ativo)
```

Valide o nome: arquivo em kebab-case (`form-field.tsx`), componente em PascalCase (`FormField`), sem caracteres especiais. Mostre o plano (arquivos a criar ou alterar e a cobertura exigida) e confirme.

### 2. Validar tokens e dependências

- Liste os tokens que o componente usa e confirme que existem (`tokens/tokens.yaml` ou `@theme`). Token ausente: informe qual e sugira uma alternativa existente ou `*ux-design-system` com escopo `tokens`.
- `compose`: importe os átomos com imports absolutos (`@/components/ui/...`, Artigo VI).
- `extend`: leia o componente e verifique se a extensão é compatível com a API atual (props, defaults e variantes).

### 3. Gerar ou alterar o componente

**build:** parta do `component-react-tmpl.tsx`.

- `React.forwardRef` + `Slot` do Radix (`asChild`), `displayName` e export nomeado.
- Catálogo `cva`: classes base, variantes, tamanhos, densidade, variantes compostas e defaults; tipos via `VariantProps`.
- Carregamento (`isLoading` + Spinner, `aria-busy`), desabilitado, ARIA e teclado.
- Só utilitários ligados a tokens (sem hex, sem `p-[13px]`), com paridade no tema escuro.
- TSDoc nas props. No React 19, `forwardRef` continua funcionando: siga o padrão que o projeto já usa.
- Nada de `eval` nem código dinâmico; conteúdo de exemplo escapado.

**compose:** importe os átomos e acrescente só a lógica de composição (layout, espaçamento e ligação entre rótulo, campo e mensagem). Estilo por utilitários e tokens.

```tsx
// form-field.tsx (molécula): compõe átomos existentes, não os reimplementa
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface FormFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  helperText?: string;
  error?: string;
}

export function FormField({ id, label, helperText, error, className, ...inputProps }: FormFieldProps) {
  const generatedId = React.useId();
  const fieldId = id ?? generatedId;
  const messageId = `${fieldId}-message`;
  const message = error ?? helperText;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={message ? messageId : undefined}
        {...inputProps}
      />
      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-sm', error ? 'text-destructive' : 'text-muted-foreground')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
```

**extend:** acrescente a variante no catálogo `cva`, sem mexer no corpo do componente, usando tokens:

```ts
variant: {
  // variantes existentes, intactas
  warning: 'bg-warning text-foreground hover:bg-warning/90',
},
```

Se a API precisar mudar, pare: proponha uma alternativa compatível ou registre a quebra com guia de migração e confirme com o usuário.

### 4. Escrever os testes

Arquivo `{componente}.test.tsx`, com o runner do projeto (Vitest no preset `nextjs-react`; Jest quando o projeto usar), React Testing Library e `jest-axe` (ou equivalente). Cubra:

- render padrão (snapshot opcional) e permutações de variante, tamanho e variantes compostas;
- carregamento e desabilitado (sem interação, com `aria-busy` ou `aria-disabled`);
- eventos de clique, teclado (Enter, Espaço) e ponteiro;
- `asChild` (o filho recebe as classes e as props);
- auditoria de acessibilidade sem violações;
- `compose`: interação entre os átomos no contexto da molécula (o rótulo foca o campo, o erro é anunciado);
- `extend`: a nova variante e todas as anteriores (compatibilidade).

Cobertura: meta ≥ 85% (statements, functions, branches); abaixo de 80% a task não conclui. Rode os testes e não siga com falhas.

### 5. Criar as stories (Storybook ativo)

`{componente}.stories.tsx` em CSF (Storybook 8+): uma story por variante e tamanho, mais carregamento e desabilitado; controls e args configurados; addon de acessibilidade; play functions para as interações. No `extend`, acrescente a story da nova variante. Validação: o Storybook renderiza sem avisos.

### 6. Verificar a acessibilidade

- Teclado: Tab, Shift+Tab, Enter, Espaço (e Escape em overlays); `focus-visible` presente, tematizável e com contraste ≥ 3:1.
- Contraste WCAG 2.2 AA nos temas claro e escuro (APCA como referência complementar).
- Elemento semântico correto (`button`, não `div` clicável) e ARIA válido.
- Rode `execute-checklist` com `accessibility-wcag-checklist.md` (o mesmo do `*a11y-check`). Nenhum item aplicável pode ficar ❌.

### 7. Documentar

Em `docs/ux/components/{componente}.md`: visão geral e nível atômico; tabela de props (tipo, padrão, descrição); tabela de variantes e tamanhos; composição (átomos usados, nas moléculas); uso nos temas claro e escuro e no carregamento; acessibilidade (ARIA, teclado); notas de migração quando a API mudou. A documentação reflete o código e os tokens.

### 8. Exportar, validar e registrar

1. Atualize o barrel export (`index.ts`) e confirme o import (`import { Button } from '@/components/ui/button'`).
2. Rode lint, typecheck e testes (`*run-tests`).
3. Rode `execute-checklist` com `component-quality-checklist.md`, Parte A. O componente só está pronto com a decisão APROVADO.
4. Na story: marque o checkbox, atualize a File List com todo arquivo criado ou alterado e acrescente no Change Log a linha `| {data} | @dev [UX/UI] | Componente {componente} ({operação}) |`.

## Saída

| Arquivo | build | compose | extend |
|---------|-------|---------|--------|
| `{componente}.tsx` | criado | criado | alterado |
| `{componente}.test.tsx` | criado | criado | alterado |
| `{componente}.stories.tsx` (Storybook ativo) | criado | criado | alterado |
| `docs/ux/components/{componente}.md` | criado | criado | alterado |
| barrel export (`index.ts`) | atualizado | atualizado | sem mudança |

## Critérios de conclusão

- [ ] TypeScript estrito sem erros e lint limpo.
- [ ] Variantes via `cva` com utilitários ligados a tokens; nenhum valor fixo.
- [ ] Props tipadas (`VariantProps` + props próprias) com TSDoc.
- [ ] Carregamento, desabilitado, ARIA e tema escuro suportados.
- [ ] Testes unitários e de acessibilidade passando, com cobertura ≥ 85%.
- [ ] `compose`: átomos importados, não reimplementados; lógica da molécula isolada.
- [ ] `extend`: uso existente intacto; quebra de API só com migração documentada e aprovada.
- [ ] Stories renderizando (Storybook ativo) e documentação gravada.
- [ ] `component-quality-checklist.md` (Parte A) APROVADO e `accessibility-wcag-checklist.md` sem ❌.
- [ ] Barrel export, File List e Change Log da story atualizados.

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Token não encontrado | Informe qual e sugira uma alternativa existente ou a criação via `*ux-design-system` |
| Componente já existe (`build`) | Pergunte: estender (`extend`), sobrescrever ou usar outro nome |
| Átomo ausente (`compose`) | Construa o átomo antes (`build`) |
| Extensão quebra a API | Pare e proponha alternativa compatível, ou registre a quebra com migração e confirme |
| Erro de TypeScript | Mostre os erros e corrija antes de seguir |
| Teste falhando | Não conclua até corrigir |
| Violação de acessibilidade | Corrija antes de concluir; se depender de outra parte, registre e não marque o checkbox |
| Nome inválido | Converta para kebab-case (arquivo) e PascalCase (componente), sem caracteres especiais |
| Sem story | Pare e peça `@pm *create-story` |

## Handoff

Próximo passo: voltar à execução da story (`@dev *develop {storyId}`) ou construir o próximo componente do inventário (`*ux-build-component {componente}`), na ordem átomos → moléculas → organismos. Para revisar a acessibilidade de uma tela inteira: `*a11y-check`.
