# Checklist: Qualidade de Componente e Auditoria de Padrões

> Usado por: `@dev` [UX/UI] em `*ux-build-component` (Parte A) e em `*ux-audit` (Parte B).
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: INICIALIZAÇÃO

Rode só a parte pedida pela task.

- Parte A (componente criado, composto ou estendido): leia o componente, os testes, as stories e a documentação; rode lint, typecheck e testes com cobertura. Não marque ✅ sem evidência (saída de comando, arquivo ou linha). Para a revisão completa de acessibilidade, use `accessibility-wcag-checklist.md`.
- Parte B (auditoria de padrões, antes da consolidação): leia `pattern-inventory.json` e o registro da varredura.

Itens que não se aplicam (ex.: Storybook desativado) ficam N/A, com o motivo.]]

## Parte A: Qualidade do componente

### A1. Código
- [ ] TypeScript estrito compila sem erros
- [ ] Sem `any` (prefira unions discriminadas e utility types)
- [ ] Props totalmente tipadas (`VariantProps` + interface do componente)
- [ ] `forwardRef` e `displayName` quando necessários
- [ ] TSDoc descreve props, valores padrão e acessibilidade
- [ ] Export nomeado (tree-shaking)

### A2. Estilo
- [ ] Utilitários do Tailwind ligados a tokens semânticos (nenhum valor fixo)
- [ ] Catálogo `cva` com defaults e variantes compostas
- [ ] `cn` (tailwind-merge) resolve as classes condicionais sem conflito
- [ ] Variantes responsivas e de densidade, quando exigidas
- [ ] Paridade no tema escuro confirmada

### A3. Acessibilidade (WCAG AA no mínimo)
- [ ] Elementos HTML semânticos (`button` em vez de `div` etc.)
- [ ] Atributos ARIA presentes (`aria-expanded`, `aria-busy`, `aria-live` etc.)
- [ ] Contraste WCAG 2.2 AA e APCA atendidos nos temas claro e escuro
- [ ] Teclado funciona (Tab, Shift+Tab, Enter, Espaço)
- [ ] `focus-visible` com contraste ≥ 3:1
- [ ] Carregamento e desabilitado tratados (`aria-busy`, `aria-disabled`)
- [ ] Teste com leitor de tela (VoiceOver ou NVDA) registrado ou delegado

### A4. Testes
- [ ] Testes unitários com React Testing Library
- [ ] Variantes, tamanhos e estados compostos testados
- [ ] Carregamento e desabilitado cobertos
- [ ] Handlers de eventos testados (clique, teclado, ponteiro)
- [ ] Auditoria jest-axe (ou equivalente) sem violações
- [ ] Cobertura ≥ 85% (statements, functions, branches)
- [ ] Todos os testes passam localmente e na CI

### A5. Documentação
- [ ] `docs/ux/components/{componente}.md` (ou MDX) criado
- [ ] Tabelas de props e de variantes
- [ ] Exemplos nos temas claro e escuro e no carregamento
- [ ] Considerações de acessibilidade registradas (ARIA, teclado)
- [ ] Notas de migração ou racional de design, quando aplicável

### A6. Storybook (se ativo)
- [ ] Arquivo de stories em CSF (Storybook 8+)
- [ ] Uma story por variante e tamanho, mais carregamento e desabilitado
- [ ] Controls e args configurados (aba Docs atualizada)
- [ ] Baselines de regressão visual capturadas (se ativo)

## Parte B: Auditoria de padrões

### B1. Completude da varredura
- [ ] Todos os tipos de arquivo de UI detectados (React, Vue, HTML, CSS)
- [ ] Varredura concluída sem erro crítico
- [ ] Total de arquivos condiz com o esperado
- [ ] Nenhum erro de permissão bloqueando a varredura

### B2. Detecção de padrões
- [ ] Botões: instâncias contadas, padrões únicos identificados, fator de redundância (instâncias ÷ únicos) calculado e mais usados capturados
- [ ] Cores: hex (`#RGB`, `#RRGGBB`) e `rgb`/`rgba` extraídos, únicas contadas, top 10 identificado e fator de redundância calculado
- [ ] Espaçamento: valores de padding e margin extraídos e únicos contados
- [ ] Tipografia: famílias, tamanhos e pesos identificados
- [ ] Formulários: inputs e forms contados e padrões únicos identificados

### B3. Saída
- [ ] `pattern-inventory.json` gerado, válido e com todos os tipos de padrão
- [ ] Metadados completos (data, caminho varrido, contagem de arquivos, frameworks)
- [ ] Versão do Tailwind e caminho da configuração registrados (quando houver)

### B4. Métricas
- [ ] Fatores de redundância acima de 1 (indicam duplicação)
- [ ] Contagens plausíveis, sem inflação artificial
- [ ] Nenhuma contagem zero em tipo de padrão relevante, a menos que seja de fato zero

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| A1. Código | | |
| A2. Estilo | | |
| A3. Acessibilidade | | |
| A4. Testes | | |
| A5. Documentação | | |
| A6. Storybook | | |
| B1. Completude da varredura | | |
| B2. Detecção de padrões | | |
| B3. Saída | | |
| B4. Métricas | | |

**Decisão:**

- **Parte A:** APROVADO quando nenhum item aplicável está ❌. Qualquer ❌ = REPROVADO: corrija e rode de novo. O componente só está pronto com APROVADO.
- **Parte B:** qualidade da auditoria Excelente (tudo ✅), Boa (só ⚠️ menores) ou Revisar (algum ❌: refaça a varredura antes de consolidar). Próximo passo pela redundância: fator acima de 3x → consolidar; mais de 50 cores ou mais de 20 variações de botão → débito grave, forte candidato à consolidação; fator abaixo de 2x → código relativamente limpo, avalie se o design system compensa o investimento.
