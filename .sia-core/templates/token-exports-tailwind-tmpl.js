// Template de arquivo: exportação dos design tokens para o Tailwind CSS (tokens/tokens.tailwind.js).
// Usado por: @dev [UX/UI] na task ux-design-system, gerado a partir de tokens/tokens.yaml. Não edite à mão.
//
// Placeholders:
//   {{PROJECT_NAME}}, {{GENERATION_DATE}}, {{TOKEN_SOURCE_FILE}}: cabeçalho do arquivo gerado
//   {{#EACH_X}} ... {{/EACH_X}}: repita o bloco uma vez para cada token da categoria X
//   {{#IF_X}} ... {{/IF_X}}: mantenha o bloco só quando a condição X valer; caso contrário, remova-o
//   Demais {{NOME}}: nome (kebab-case) e valor de cada token
//
// Tailwind v3: importe no tailwind.config.js
//   const tokens = require('./tokens/tokens.tailwind.js');
//   module.exports = {
//     content: ['./src/**/*.{js,jsx,ts,tsx}'],
//     theme: { extend: tokens.theme.extend },
//     plugins: tokens.plugins,
//     darkMode: tokens.darkMode,
//   };
// Tailwind v4: prefira o @theme no CSS de entrada (task ux-design-system). Para reaproveitar este arquivo,
//   carregue-o com @config; no v4, as opções safelist, corePlugins e separator não são lidas.
// Projetos ESM ("type": "module"): troque module.exports por export default.
//
// Uso nos componentes:
//   <button className="bg-primary hover:bg-primary-hover text-primary-foreground px-md py-sm rounded-base">Salvar</button>
//
// Projeto: {{PROJECT_NAME}}
// Gerado em: {{GENERATION_DATE}}
// Fonte: {{TOKEN_SOURCE_FILE}}

module.exports = {
  theme: {
    extend: {
      /* ============================================
         CORES
         ============================================ */

      colors: {
        // Primárias
        {{#EACH_COLOR_PRIMARY}}
        '{{COLOR_NAME}}': '{{COLOR_VALUE}}',
        {{/EACH_COLOR_PRIMARY}}

        // Semânticas
        {{#EACH_COLOR_SEMANTIC}}
        '{{COLOR_NAME}}': '{{COLOR_VALUE}}',
        {{/EACH_COLOR_SEMANTIC}}

        // Neutras
        {{#EACH_COLOR_NEUTRAL}}
        '{{COLOR_NAME}}': '{{COLOR_VALUE}}',
        {{/EACH_COLOR_NEUTRAL}}

        // Estados (hover, disabled, light)
        {{#EACH_COLOR_STATE}}
        '{{COLOR_NAME}}': '{{COLOR_VALUE}}',
        {{/EACH_COLOR_STATE}}

        // Paletas em escala (quando o projeto usa tons numerados)
        {{#EACH_COLOR_SCALE}}
        '{{COLOR_FAMILY}}': {
          {{#EACH_COLOR_SHADE}}
          '{{SHADE_NUMBER}}': '{{SHADE_VALUE}}',
          {{/EACH_COLOR_SHADE}}
        },
        {{/EACH_COLOR_SCALE}}
      },

      /* ============================================
         ESPAÇAMENTO
         ============================================ */

      spacing: {
        {{#EACH_SPACING}}
        '{{SPACING_NAME}}': '{{SPACING_VALUE}}',
        {{/EACH_SPACING}}
      },

      /* ============================================
         TIPOGRAFIA
         ============================================ */

      fontFamily: {
        {{#EACH_FONT_FAMILY}}
        '{{FONT_NAME}}': {{FONT_VALUE_ARRAY}},
        {{/EACH_FONT_FAMILY}}
      },

      fontSize: {
        {{#EACH_FONT_SIZE}}
        '{{SIZE_NAME}}': ['{{SIZE_VALUE}}', {
          lineHeight: '{{LINE_HEIGHT}}',
          {{#IF_LETTER_SPACING}}
          letterSpacing: '{{LETTER_SPACING}}',
          {{/IF_LETTER_SPACING}}
        }],
        {{/EACH_FONT_SIZE}}
      },

      fontWeight: {
        {{#EACH_FONT_WEIGHT}}
        '{{WEIGHT_NAME}}': {{WEIGHT_VALUE}},
        {{/EACH_FONT_WEIGHT}}
      },

      lineHeight: {
        {{#EACH_LINE_HEIGHT}}
        '{{HEIGHT_NAME}}': '{{HEIGHT_VALUE}}',
        {{/EACH_LINE_HEIGHT}}
      },

      letterSpacing: {
        {{#EACH_LETTER_SPACING}}
        '{{SPACING_NAME}}': '{{SPACING_VALUE}}',
        {{/EACH_LETTER_SPACING}}
      },

      /* ============================================
         BORDAS
         ============================================ */

      borderWidth: {
        {{#EACH_BORDER_WIDTH}}
        '{{WIDTH_NAME}}': '{{WIDTH_VALUE}}',
        {{/EACH_BORDER_WIDTH}}
      },

      borderRadius: {
        {{#EACH_BORDER_RADIUS}}
        '{{RADIUS_NAME}}': '{{RADIUS_VALUE}}',
        {{/EACH_BORDER_RADIUS}}
      },

      borderColor: (theme) => ({
        ...theme('colors'),
        {{#EACH_BORDER_COLOR_CUSTOM}}
        '{{COLOR_NAME}}': '{{COLOR_VALUE}}',
        {{/EACH_BORDER_COLOR_CUSTOM}}
      }),

      /* ============================================
         SOMBRAS
         ============================================ */

      boxShadow: {
        {{#EACH_SHADOW}}
        '{{SHADOW_NAME}}': '{{SHADOW_VALUE}}',
        {{/EACH_SHADOW}}
      },

      dropShadow: {
        {{#EACH_DROP_SHADOW}}
        '{{SHADOW_NAME}}': '{{SHADOW_VALUE}}',
        {{/EACH_DROP_SHADOW}}
      },

      /* ============================================
         Z-INDEX
         ============================================ */

      zIndex: {
        {{#EACH_Z_INDEX}}
        '{{Z_NAME}}': {{Z_VALUE}},
        {{/EACH_Z_INDEX}}
      },

      /* ============================================
         TRANSIÇÃO E ANIMAÇÃO
         ============================================ */

      transitionDuration: {
        {{#EACH_DURATION}}
        '{{DURATION_NAME}}': '{{DURATION_VALUE}}',
        {{/EACH_DURATION}}
      },

      transitionTimingFunction: {
        {{#EACH_EASING}}
        '{{EASING_NAME}}': '{{EASING_VALUE}}',
        {{/EACH_EASING}}
      },

      animation: {
        {{#EACH_ANIMATION}}
        '{{ANIMATION_NAME}}': '{{ANIMATION_VALUE}}',
        {{/EACH_ANIMATION}}
      },

      keyframes: {
        {{#EACH_KEYFRAME}}
        '{{KEYFRAME_NAME}}': {
          {{#EACH_KEYFRAME_STEP}}
          '{{STEP_PERCENTAGE}}': {{STEP_PROPERTIES}},
          {{/EACH_KEYFRAME_STEP}}
        },
        {{/EACH_KEYFRAME}}
      },

      /* ============================================
         BREAKPOINTS
         ============================================ */

      screens: {
        {{#EACH_BREAKPOINT}}
        '{{BP_NAME}}': '{{BP_VALUE}}',
        {{/EACH_BREAKPOINT}}
      },

      /* ============================================
         CONTAINER
         ============================================ */

      container: {
        center: true,
        padding: {
          {{#EACH_CONTAINER_PADDING}}
          '{{BP_NAME}}': '{{PADDING_VALUE}}',
          {{/EACH_CONTAINER_PADDING}}
        },
        screens: {
          {{#EACH_CONTAINER_MAX_WIDTH}}
          '{{BP_NAME}}': '{{MAX_WIDTH}}',
          {{/EACH_CONTAINER_MAX_WIDTH}}
        },
      },

      /* ============================================
         TOKENS DE COMPONENTE
         ============================================ */

      {{#EACH_CUSTOM_TOKEN_CATEGORY}}
      {{CATEGORY_NAME}}: {
        {{#EACH_CUSTOM_TOKEN}}
        '{{TOKEN_NAME}}': '{{TOKEN_VALUE}}',
        {{/EACH_CUSTOM_TOKEN}}
      },
      {{/EACH_CUSTOM_TOKEN_CATEGORY}}

      /* ============================================
         OPACIDADE
         ============================================ */

      opacity: {
        {{#EACH_OPACITY}}
        '{{OPACITY_NAME}}': '{{OPACITY_VALUE}}',
        {{/EACH_OPACITY}}
      },

      /* ============================================
         PROPORÇÃO (ASPECT RATIO)
         ============================================ */

      aspectRatio: {
        {{#EACH_ASPECT_RATIO}}
        '{{RATIO_NAME}}': '{{RATIO_VALUE}}',
        {{/EACH_ASPECT_RATIO}}
      },

      /* ============================================
         GRID
         ============================================ */

      gridTemplateColumns: {
        {{#EACH_GRID_COLUMNS}}
        '{{COLUMNS_NAME}}': '{{COLUMNS_VALUE}}',
        {{/EACH_GRID_COLUMNS}}
      },

      gridTemplateRows: {
        {{#EACH_GRID_ROWS}}
        '{{ROWS_NAME}}': '{{ROWS_VALUE}}',
        {{/EACH_GRID_ROWS}}
      },

      gap: {
        {{#EACH_GAP}}
        '{{GAP_NAME}}': '{{GAP_VALUE}}',
        {{/EACH_GAP}}
      },
    },
  },

  /* ============================================
     PLUGINS
     ============================================ */

  plugins: [
    // Utilitários próprios do design system
    function ({ addUtilities }) {
      const newUtilities = {
        {{#EACH_CUSTOM_UTILITY}}
        '.{{UTILITY_CLASS}}': {
          {{#EACH_UTILITY_PROPERTY}}
          {{PROPERTY_NAME}}: {{PROPERTY_VALUE}},
          {{/EACH_UTILITY_PROPERTY}}
        },
        {{/EACH_CUSTOM_UTILITY}}
      };

      addUtilities(newUtilities);
    },

    {{#IF_FORMS_PLUGIN}}
    // Plugin de formulários
    require('@tailwindcss/forms')({
      strategy: '{{FORMS_STRATEGY}}', // 'base' ou 'class'
    }),
    {{/IF_FORMS_PLUGIN}}

    {{#IF_TYPOGRAPHY_PLUGIN}}
    // Plugin de tipografia (prose)
    require('@tailwindcss/typography'),
    {{/IF_TYPOGRAPHY_PLUGIN}}

    {{#IF_ASPECT_RATIO_PLUGIN}}
    // Plugin de aspect ratio (só para navegadores antigos; no v3+ a propriedade é nativa)
    require('@tailwindcss/aspect-ratio'),
    {{/IF_ASPECT_RATIO_PLUGIN}}
  ],

  /* ============================================
     SAFELIST (opcional)
     Classes que nunca podem ser removidas do CSS gerado (ex.: montadas dinamicamente)
     ============================================ */

  safelist: [
    {{#EACH_SAFELIST_PATTERN}}
    {
      pattern: /{{PATTERN_REGEX}}/,
      {{#IF_VARIANTS}}
      variants: [{{VARIANTS}}],
      {{/IF_VARIANTS}}
    },
    {{/EACH_SAFELIST_PATTERN}}
  ],

  /* ============================================
     TEMA ESCURO
     ============================================ */

  darkMode: {{DARK_MODE_STRATEGY}}, // 'media' | 'class' | ['selector', '[data-theme="dark"]'] (v3.4.1+)

  /* ============================================
     IMPORTANT
     ============================================ */

  important: {{IMPORTANT_STRATEGY}}, // true, false ou '#app'
};

/* ============================================
   EXEMPLOS DE USO
   ============================================

   Botão:
     <button className="bg-primary hover:bg-primary-hover text-primary-foreground px-md py-sm rounded-base shadow-base transition-colors duration-fast">
       Salvar
     </button>

   Card:
     <div className="bg-background p-lg rounded-lg shadow-md border border-border">
       <h2 className="text-xl font-semibold text-foreground">Título</h2>
       <p className="text-base text-muted-foreground mt-sm">Conteúdo</p>
     </div>

   Grid responsivo:
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
       {items.map((item) => <Card key={item.id} {...item} />)}
     </div>

   Tema escuro (com darkMode por seletor ou classe):
     <div className="bg-background text-foreground dark:bg-neutral-900 dark:text-neutral-50">
       O conteúdo acompanha o tema
     </div>
*/

/* ============================================
   VERIFICAÇÃO
   ============================================
   1. Confirme que o tailwind.config.js importa este arquivo.
   2. Rode o build do CSS: npx tailwindcss -i ./src/input.css -o ./dist/output.css (v3)
      ou npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css (v4 com @config).
   3. Use classes como bg-primary, text-lg e p-md.
   4. Confira se o CSS gerado contém os valores dos tokens.
*/
