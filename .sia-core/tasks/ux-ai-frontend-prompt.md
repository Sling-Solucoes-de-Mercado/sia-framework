---
id: ux-ai-frontend-prompt
title: Gerar prompt para ferramentas de geração de interface
agent: dev
hat: ux
elicit: true
modes: [yolo, interactive, preflight]
inputs:
  - 'escopo: componente, seção ou tela a gerar (um por prompt é o mais eficaz)'
  - 'docs/front-end-spec.md: especificação de UI/UX'
  - 'arquitetura: docs/front-end-architecture.md ou docs/architecture.md (stack, contratos de API)'
  - 'wireframes (opcional): docs/ux/wireframes/{slug}/'
outputs:
  - 'Prompt pronto para copiar, apresentado em bloco de código'
  - 'docs/ux/ai-prompts/{slug}.md: prompt gravado, com a explicação da estrutura'
depends_on:
  data: [tech-presets/nextjs-react.md]
next: [create-front-end-architecture]
source: [generate-ai-frontend-prompt.md, ux-create-wireframe.md]
---

# Gerar prompt para ferramentas de geração de interface

## Objetivo

Produzir um prompt completo e otimizado para ferramentas de geração de interface por IA (Vercel v0, Lovable e similares), capaz de gerar componentes, seções ou telas fiéis à especificação, à stack e ao design system do projeto.

## Quando usar

- Depois de `*create-front-end-spec`, quando o time quer gerar a interface numa ferramenta externa (etapa opcional do fluxo greenfield de UI).
- Para acelerar protótipos a partir dos wireframes.
- Não substitui a implementação: o código gerado é ponto de partida e só entra no produto por uma story, com testes, inspeção e QA gate.

## Modos de execução

| Modo | Comportamento nesta task |
|------|--------------------------|
| YOLO | Usa a spec, a arquitetura e os tokens como estão, descreve o visual pela spec e grava o prompt sem perguntar; premissas ficam no arquivo do prompt. |
| Interativo (padrão) | Checkpoints nos passos 2 e 5. |
| Pre-Flight | Pergunta escopo, arquivos de design e restrições de uma vez e entrega o prompt final sem novas perguntas. |

## Pré-condições

- [ ] `docs/front-end-spec.md` concluído, ou wireframes com conteúdo e estados definidos.
- [ ] Stack conhecida pela arquitetura ou pelo tech preset (padrão do SIA: Next.js + React + TypeScript + Tailwind + shadcn/ui, em `tech-presets/nextjs-react.md`).

## Princípios do prompt

- **Explícito e detalhado:** a IA não adivinha. Pedidos vagos geram saída genérica ou errada.
- **Iterativo:** gerar uma aplicação complexa inteira de uma vez raramente funciona. Peça um componente ou uma seção por vez e construa sobre o resultado.
- **Contexto primeiro:** comece pela stack, pelo código existente e pelo objetivo do projeto.
- **Mobile-first:** descreva o layout mobile primeiro e, separadamente, como ele se adapta a tablet e desktop.

## Passos

### 1. Reunir o contexto

Leia `docs/front-end-spec.md`, a arquitetura (stack, contratos de API), os wireframes e, se o design system existir, os tokens (`tokens/tokens.yaml` ou o `@theme` do CSS de entrada). Monte o preâmbulo do prompt com o propósito do projeto, a stack completa (ex.: Next.js, TypeScript, Tailwind CSS) e a biblioteca de componentes (shadcn/ui).

### 2. Descrever o visual

**Ponto de elicitação:**

```text
Existem arquivos de design (Figma etc.)?
1. Sim: vou enviar links ou screenshots
2. Não: descreva o estilo a partir da spec
```

Sem arquivos de design, descreva: paleta (tokens semânticos), tipografia, espaçamento e estética geral (minimalista, corporativa, lúdica). Informe se há tema escuro.

### 3. Escrever o prompt em quatro partes

Todo prompt segue esta estrutura:

1. **Objetivo de alto nível:** resumo claro do que gerar.
   _Ex.: "Crie um formulário de cadastro responsivo, com validação no cliente e integração com a API."_
2. **Instruções detalhadas, passo a passo:** lista numerada e granular. É a parte mais importante.
   _Ex.: "1. Crie o arquivo `RegistrationForm.tsx`. 2. Use hooks do React para o estado. 3. Adicione os campos Nome, E-mail e Senha. 4. Valide o formato do e-mail. 5. No envio, chame o endpoint abaixo."_
3. **Exemplos de código, estruturas de dados e restrições:** trechos de código existente, payloads e contratos de API, e o que **não** fazer.
   _Ex.: "Use `POST /api/register` com o payload `{ "name": "string", "email": "string", "password": "string" }`. NÃO inclua campo de confirmação de senha. Use Tailwind CSS em todo o estilo."_
4. **Escopo estrito:** quais arquivos criar ou alterar e, principalmente, quais não tocar.
   _Ex.: "Crie só `RegistrationForm.tsx` e use-o em `app/register/page.tsx`. NÃO altere `Navbar.tsx` nem outras páginas ou componentes."_

### 4. Incluir as restrições do projeto

Garanta que o prompt declare:

- Framework e linguagem: React + TypeScript + Tailwind CSS, com os componentes shadcn/ui do projeto em vez de recriá-los.
- Estilo só por tokens: classes semânticas (`bg-primary`, `text-foreground`), sem cores ou espaçamentos fixos.
- Acessibilidade WCAG AA: rótulos, foco visível, contraste, navegação por teclado.
- Estados de carregamento, vazio e erro.
- Layout mobile-first com os breakpoints da spec; tema escuro (sim ou não).

Modelos curtos para pedidos rápidos:

```text
Componente (v0):
Crie o componente {nome} com:
- {recurso 1}
- {recurso 2}
Estilo: {moderno | minimalista | marcante}
Cores: tokens {primary} e {secondary}
Framework: React + TypeScript + Tailwind CSS (shadcn/ui)
Acessibilidade: WCAG AA

Tela (Lovable):
Construa a página {tela} com:
- {seção 1}
- {seção 2}
Layout: {grid | flex | stack}
Responsiva: sim, mobile-first
Tema escuro: {sim | não}
```

### 5. Apresentar e refinar

1. Mostre o prompt completo num único bloco de código, pronto para copiar.
2. Explique a estrutura e por que cada informação foi incluída, citando os princípios acima.
3. **Ponto de elicitação:** 1. aprovar e gravar, 2. ajustar trechos, 3. dividir em prompts menores (um por componente ou seção).
4. Grave o prompt aprovado em `docs/ux/ai-prompts/{slug}.md`.
5. Termine lembrando que todo código gerado por IA exige revisão humana cuidadosa, testes e refinamento antes de ir para produção.

## Saída

- Prompt final em bloco de código, na conversa.
- `docs/ux/ai-prompts/{slug}.md` com: escopo, preâmbulo de contexto, prompt nas quatro partes, explicação da estrutura e premissas.

## Critérios de conclusão

- [ ] Preâmbulo com propósito do projeto, stack completa e biblioteca de componentes.
- [ ] Visual descrito (ou arquivos de design referenciados).
- [ ] Prompt nas quatro partes, com o que não fazer e o escopo de arquivos explícitos.
- [ ] Restrições de tokens, acessibilidade, estados e responsividade declaradas.
- [ ] Prompt apresentado em bloco copiável, explicado e gravado em `docs/ux/ai-prompts/`.
- [ ] Aviso de revisão humana obrigatória incluído.

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Sem front-end spec nem wireframes | Sugira `*create-front-end-spec` ou `*ux-wireframe`; se o usuário seguir mesmo assim, registre as lacunas no prompt |
| Escopo grande demais (aplicação inteira) | Divida em prompts por componente ou seção, em ordem de dependência |
| Stack não declarada | Pergunte; sem resposta, use o tech preset padrão e registre a premissa |
| Prompt permite alterar arquivos fora do escopo | Restrinja o escopo e liste os arquivos que não podem ser tocados |
| Contrato de API indefinido | Marque o trecho como mock e registre a pendência para a arquitetura |

## Handoff

Próximo passo: `@dev *create-front-end-architecture` (chapéu Arquitetura, gera `docs/front-end-architecture.md`), considerando a estrutura gerada na ferramenta de IA. O código gerado entra no produto por uma story criada pelo `@pm` (`*create-story`).
