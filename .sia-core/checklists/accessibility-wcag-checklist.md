# Checklist: Acessibilidade WCAG 2.2 AA

> Usado por: `@dev` [UX/UI] em `*a11y-check` e na task `ux-build-component`; também em stories com interface durante o `*develop`.
> Modo: interativo (item a item) ou YOLO (relatório completo de uma vez).

[[LLM: INICIALIZAÇÃO

Antes de avaliar, carregue `.sia-core/data/wcag-compliance-guide.md` (limiares, critérios do WCAG 2.2 e exemplos).

1. Identifique o alvo: componente, tela ou fluxo, e o tema (claro, escuro ou ambos).
2. Avalie cada item com evidência: resultado do jest-axe (ou equivalente), navegação só por teclado, medição de contraste nos dois temas e, quando possível, leitor de tela.
3. Marque N/A quando o item não se aplica ao alvo e diga por quê. Não marque ✅ sem evidência.
4. No relatório, liste cada ❌ com arquivo, elemento e correção sugerida.]]

## 1. Perceptível

### Cor e contraste
- [ ] Texto normal com contraste ≥ 4.5:1
- [ ] Texto grande (≥ 18 pt, cerca de 24 px, ou ≥ 14 pt em negrito, cerca de 18.66 px) com contraste ≥ 3:1
- [ ] Componentes de UI e gráficos (ícones, bordas de campo, indicador de foco) com contraste ≥ 3:1
- [ ] Nenhuma informação transmitida só por cor (use também ícone ou texto)
- [ ] Contraste APCA dentro da meta para o peso e o tamanho da fonte (complementar; não substitui a razão do WCAG)
- [ ] Tema escuro validado com os mesmos critérios (paridade)

### Alternativas em texto
- [ ] Imagens informativas com texto alternativo
- [ ] Imagens decorativas com `alt=""`
- [ ] Botões só com ícone têm `aria-label`

### Adaptação
- [ ] Com zoom de 200%, conteúdo e funções continuam acessíveis

## 2. Operável

### Teclado
- [ ] Todo elemento interativo é acessível por teclado
- [ ] Ordem de tabulação lógica
- [ ] Indicador de foco visível (outline, ring)
- [ ] Sem armadilha de teclado; em modais, o foco fica contido, Escape fecha e o foco volta ao elemento que abriu

### Navegação
- [ ] Skip link quando houver navegação repetida
- [ ] Landmarks presentes (`header`, `nav`, `main`, `aside`, `footer`)
- [ ] Títulos em hierarquia (h1 → h2 → h3)

### Critérios novos do WCAG 2.2
- [ ] O elemento focado não fica totalmente escondido por cabeçalho fixo, banner ou overlay (2.4.11)
- [ ] Ações de arrastar têm alternativa com um único ponteiro (2.5.7)
- [ ] Alvos de clique e toque com pelo menos 24×24 px CSS, ou espaçamento equivalente (2.5.8)
- [ ] Mecanismos de ajuda aparecem no mesmo lugar relativo entre as páginas (3.2.6)
- [ ] Dados já informados no mesmo processo não são pedidos de novo (3.3.7)
- [ ] Autenticação sem teste cognitivo: colar senha e gerenciador de senhas funcionam (3.3.8)

## 3. Compreensível

### Rótulos e formulários
- [ ] Todo campo de formulário tem rótulo
- [ ] Rótulo associado ao campo (`htmlFor`/`id`)
- [ ] Campos obrigatórios indicados (visualmente e com `required`/`aria-required`)
- [ ] Mensagens de erro claras e úteis, ligadas ao campo (`aria-describedby`, `aria-invalid`)

### Estados
- [ ] Desabilitado indicado visualmente e com `disabled` ou `aria-disabled`
- [ ] Carregamento anunciado (`aria-busy`, região viva)
- [ ] Estados de sucesso e de erro claros
- [ ] Regiões vivas (`aria-live`) em atualizações assíncronas

## 4. Robusto

### ARIA
- [ ] Só atributos ARIA válidos
- [ ] Papéis ARIA usados corretamente (HTML semântico primeiro)
- [ ] `aria-label` ou `aria-labelledby` onde não há texto visível
- [ ] `aria-expanded` em conteúdo recolhível

### HTML
- [ ] HTML semântico válido (`button` em vez de `div` clicável)
- [ ] Sem elementos obsoletos
- [ ] Aninhamento correto

## Ferramentas

- axe DevTools (extensão) e jest-axe (ou equivalente) nos testes
- WAVE (avaliação de acessibilidade)
- Só teclado: Tab, Shift+Tab, Enter, Espaço, Escape e setas
- Leitor de tela: NVDA, JAWS ou VoiceOver
- Contraste: DevTools do navegador e calculadora APCA

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Perceptível | | |
| 2. Operável | | |
| 3. Compreensível | | |
| 4. Robusto | | |

**Decisão:** WCAG AA ✅ quando nenhum item aplicável está ❌. Qualquer ❌ significa problemas encontrados: corrija antes de concluir o componente ou a story, porque a acessibilidade é inegociável. Use ⚠️ só para item sem evidência suficiente, com plano de verificação registrado.
