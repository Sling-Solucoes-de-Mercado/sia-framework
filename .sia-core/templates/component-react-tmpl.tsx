// Template de arquivo: componente React do design system ({{component-name}}.tsx).
// Usado por: @dev [UX/UI] na task ux-build-component (operação build).
// Placeholders:
//   {{ComponentName}} / {{componentName}} / {{component-name}}: PascalCase / camelCase / kebab-case (nome do arquivo)
//   {{atomic_level}}: átomo | molécula | organismo
//   {{UtilityImportPath}}: caminho do helper cn (padrão: '@/lib/utils')
//   {{SpinnerImport}} / {{SpinnerComponent}}: import e nome do indicador de carregamento (ex.: Spinner de '@/components/ui/spinner')
//   {{baseClasses}}: classes base, só utilitários ligados a tokens
//   {{VariantDefinitions}} / {{SizeDefinitions}}: entradas do cva (ex.: primary: 'bg-primary text-primary-foreground hover:bg-primary-hover',)
//   {{AdditionalVariantGroups}} / {{CompoundVariants}} / {{DefaultVariantOverrides}}: grupos extras (estado, densidade),
//     variantes compostas e defaults extras; vazios quando não houver
//   {{DefaultVariant}} / {{DefaultSize}}: variante e tamanho padrão
//   {{ElementAttributes}} / {{ElementTag}} / {{HtmlElement}}: ex.: ButtonHTMLAttributes / HTMLButtonElement / button
//   {{AdditionalProps}}: props próprias, cada uma com TSDoc
//   {{ComponentDescription}} / {{ExampleContent}}: descrição do componente e conteúdo do exemplo de uso
// Regras: zero valor fixo (cor, espaçamento e raio só via tokens); export nomeado; forwardRef e displayName mantidos.
// Atomic level: {{atomic_level}}

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '{{UtilityImportPath}}';
{{SpinnerImport}}

/**
 * Catálogo de variantes gerado a partir dos tokens consolidados.
 * Acrescente grupos (estado, densidade, alinhamento) conforme a necessidade.
 */
export const {{componentName}}Variants = cva('{{baseClasses}}', {
  variants: {
    variant: {
      {{VariantDefinitions}}
    },
    size: {
      {{SizeDefinitions}}
    },{{AdditionalVariantGroups}}
  },
  compoundVariants: [
    {{CompoundVariants}}
  ],
  defaultVariants: {
    variant: '{{DefaultVariant}}',
    size: '{{DefaultSize}}',{{DefaultVariantOverrides}}
  },
});

export interface {{ComponentName}}Props
  extends React.{{ElementAttributes}}<{{ElementTag}}>,
    VariantProps<typeof {{componentName}}Variants> {
  /** Renderiza o elemento filho no lugar da tag padrão (padrão Slot do Radix) */
  asChild?: boolean;
  /** Mostra o estado de carregamento e bloqueia as interações */
  isLoading?: boolean;
  /** Indicador de carregamento personalizado */
  loadingIcon?: React.ReactNode;
  {{AdditionalProps}}
}

/**
 * {{ComponentDescription}}
 *
 * @example
 * ```tsx
 * <{{ComponentName}} variant="{{DefaultVariant}}" size="{{DefaultSize}}">
 *   {{ExampleContent}}
 * </{{ComponentName}}>
 * ```
 */
export const {{ComponentName}} = React.forwardRef<{{ElementTag}}, {{ComponentName}}Props>(
  (
    {
      asChild = false,
      className,
      variant = '{{DefaultVariant}}',
      size = '{{DefaultSize}}',
      isLoading = false,
      loadingIcon,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : '{{HtmlElement}}';

    return (
      <Comp
        ref={ref}
        className={cn(
          {{componentName}}Variants({ variant, size }),
          isLoading && 'pointer-events-none opacity-70',
          className
        )}
        data-state={isLoading ? 'loading' : undefined}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {asChild ? (
          // O Slot exige um único filho: ele recebe as classes e as props
          children
        ) : (
          <>
            {isLoading &&
              (loadingIcon ?? (
                <{{SpinnerComponent}} className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ))}
            <span className="inline-flex items-center gap-1">{children}</span>
          </>
        )}
      </Comp>
    );
  }
);

{{ComponentName}}.displayName = '{{ComponentName}}';

export type {{ComponentName}}Variant = VariantProps<typeof {{componentName}}Variants>;
