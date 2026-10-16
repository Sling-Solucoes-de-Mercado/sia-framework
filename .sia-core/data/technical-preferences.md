# Preferências Técnicas

> Arquivo editável por projeto (exceção da proteção do framework em `core-config.yaml`).
> Lido por: `@pm` [Produto] nas Premissas Técnicas do PRD; `@pm` [Análise] no Project Brief e em `*research-deps`; `@dev` [Arquitetura] ao definir o Tech Stack e ao validar presets; `@pm` [Qualidade] no cálculo do quality score.

Registre aqui o stack e os padrões que os agentes devem preferir. O que o projeto não definir segue o stack padrão do SIA. As versões exatas ficam no Tech Stack da arquitetura do projeto (`docs/architecture/tech-stack.md`), que é a fonte da verdade depois de aprovado.

## Stack Tecnológica

Stack padrão do SIA:

| Categoria | Tecnologia | Propósito |
|-----------|------------|-----------|
| Framework | Next.js (App Router) | Aplicação web full stack com React |
| Linguagem | TypeScript | Segurança de tipos |
| Estilo | Tailwind CSS | CSS utilitário |
| Componentes de UI | shadcn/ui | Componentes acessíveis, copiados para o projeto |
| Banco | Supabase (Postgres) | Banco gerenciado, com schema versionado em migrations |
| Autenticação | Supabase Auth | Cadastro, login e sessão |
| Autorização de dados | RLS do Postgres | Acesso por linha em toda tabela exposta |
| Deploy | Vercel | Previews por branch e produção pela branch principal |

- Bibliotecas complementares (estado, formulários, validação, testes): as da seção Stack Tecnológica do preset ativo.
- Supabase e Vercel são configurados em `core-config.yaml` (`integrations`) e nas IDEs pelo `@devops` (`*setup-mcp`, `*vercel-setup`). Deploy de produção é exclusivo do `@devops` (`*vercel-deploy`).
- Banco, migrations e políticas RLS: `@dev` [Dados] (`*db-setup`, `*db-migrate`, `*db-policy`).

## Tech Presets

Presets de arquitetura prontos para stacks comuns. Local: `.sia-core/data/tech-presets/`.

### Presets Disponíveis

| Preset | Tecnologias | Indicado para |
|--------|-------------|---------------|
| `nextjs-react` | Next.js, React, TypeScript, Tailwind CSS, Zustand, React Query, Zod, Vitest, Playwright | Aplicações web full stack, SaaS, e-commerce, dashboards |

`_template.md` é o modelo para criar presets novos.

### Como Usar os Presets

1. **Na criação da arquitetura:** em `@dev *create-architecture`, carregue o preset ativo para os padrões, a estrutura, os padrões de código e os templates de arquivo.
2. **No desenvolvimento:** cite o preset nas Dev Notes da story quando a implementação depender dele. Ex.: "Siga os padrões do preset nextjs-react neste serviço."
3. **Preset novo:** copie `_template.md`, preencha os detalhes da tecnologia, valide com `@dev *validate-tech-preset {preset}` e acrescente à tabela acima.

### Conteúdo de um Preset

- **Padrões de Design:** padrões recomendados, com exemplos
- **Estrutura do Projeto:** organização de pastas
- **Stack Tecnológica:** bibliotecas e versões
- **Padrões de Código:** convenções de nome e regras críticas
- **Estratégia de Testes:** o que testar e metas de cobertura
- **Templates de Arquivo:** templates de código prontos para uso

### Preset Ativo

O preset ativo é a chave `project.techPreset` do `.sia-core/core-config.yaml` (padrão: `nextjs-react`). Para trocar, edite essa chave com o nome de outro preset de `.sia-core/data/tech-presets/`, ou deixe vazia para não usar preset.

---

## Preferências do Projeto

> Acrescente as preferências da equipe. Os agentes as usam no planejamento e no desenvolvimento. Preencha só o que diverge do stack padrão ou o complementa.

### Tecnologias Preferidas

<!-- Descomente e preencha
| Categoria | Preferência | Observações |
|-----------|-------------|-------------|
| Framework de frontend | Next.js | App Router |
| Estilo | Tailwind CSS | com shadcn/ui |
| Estado global | Zustand | |
| Banco | PostgreSQL | via Supabase |
-->

### Padrões de Código

<!-- Descomente e preencha
- Prefira componentes funcionais a componentes de classe
- Prefira exports nomeados a default exports
- Prefira tratamento de erros explícito a envolver tudo em try/catch
-->

### Regras Específicas do Projeto

<!-- Acrescente as regras específicas do projeto que os agentes devem seguir -->

---

## Pesos do Quality Score (opcional)

Na avaliação de NFR do `@pm` [Qualidade], quality_score = 100 − 20 × (atributos em FAIL) − 10 × (atributos em CONCERNS), entre 0 e 100. Para usar outros pesos, registre aqui:

<!-- Descomente e ajuste
- Peso de FAIL: 20
- Peso de CONCERNS: 10
-->

---

## Histórico de Mudanças

| Data | Mudança | Autor |
|------|---------|-------|
| 2026-10-16 | Preferências padrão do SIA | SIA |
