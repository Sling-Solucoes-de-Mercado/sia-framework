<!--
Esqueleto de squad do SIA (.sia-core/templates/squad/). O @squad-creator copia esta pasta para
squads/{{SQUAD_NAME}}/ em *create-squad, substitui os placeholders e remove este comentário de
cada arquivo gerado.

Placeholders:

| Placeholder              | Valor                                                              | Exemplo            |
|--------------------------|--------------------------------------------------------------------|--------------------|
| {{SQUAD_NAME}}           | Nome em kebab-case, igual à pasta (^[a-z0-9-]+$, 2 a 50 caracteres) | vendas-b2b         |
| {{SQUAD_TITLE}}          | Título curto (até 100 caracteres)                                  | Vendas B2B         |
| {{SQUAD_DESCRIPTION}}    | Descrição do propósito (até 500 caracteres)                        | Prospecção e propostas comerciais |
| {{SQUAD_VERSION}}        | Versão semântica inicial                                           | 1.0.0              |
| {{SQUAD_AUTHOR}}         | Autor (padrão: git config user.name)                               | Time Comercial     |
| {{SQUAD_LICENSE}}        | MIT, Apache-2.0, ISC, GPL-3.0 ou UNLICENSED                        | MIT                |
| {{SQUAD_SLASH_PREFIX}}   | Prefixo dos comandos: o nome sem o sufixo -squad                   | vendas-b2b         |
| {{SIA_MIN_VERSION}}      | Versão mínima do SIA: sia.version do .sia-core/core-config.yaml    | 1.0.0              |
| {{CONFIG_MODE}}          | Herança da configuração do projeto: extend, override ou none       | extend             |

Arquivos do esqueleto:
- squad.yaml: manifest validado por .sia-core/schemas/squad-schema.json
- README.md: este arquivo (documentação do squad)
- config/coding-standards.md, config/tech-stack.md, config/source-tree.md: configuração do squad
  (quando o projeto já tem docs/architecture/coding-standards.md, tech-stack.md e source-tree.md,
  o *create-squad aponta o config do squad.yaml para eles e não copia estes arquivos)
- agents/example-agent.md: agente no formato do guia de autoria, seção 7
- tasks/example-task.md: task no formato do guia de autoria, seção 8
- workflows/, checklists/, templates/, data/, scripts/: pastas vazias com .gitkeep
-->
# {{SQUAD_TITLE}}

{{SQUAD_DESCRIPTION}}

## Instalação

O squad vive dentro do projeto, em `squads/{{SQUAD_NAME}}/`. Para que os agentes apareçam nas IDEs (Claude Code, Codex, Gemini CLI e Grok), rode:

```bash
sia sync
```

## Uso

Ative um agente do squad pela IDE e digite `*help` para ver os comandos. Cada comando executa uma task de `tasks/`.

### Agentes

| Agente | Papel | Tier | Comandos principais |
|--------|-------|------|---------------------|
| `example-agent` | Agente de exemplo (personalize ou remova) | 1 | `*run-example` |

### Tasks

| Task | Agente | O que faz |
|------|--------|-----------|
| `example-task.md` | `example-agent` | Demonstra o formato de task do SIA |

## Configuração

- Herança da configuração do projeto: `{{CONFIG_MODE}}` (`extend` soma as regras do squad às do projeto, `override` substitui, `none` não herda).
- Resolução de dependências dos agentes do squad: primeiro `squads/{{SQUAD_NAME}}/{tipo}/`, depois `.sia-core/{tipo}/`.
- Versão mínima do SIA: `{{SIA_MIN_VERSION}}`.

## Desenvolvimento

1. Agentes em `agents/`, no formato do guia de autoria (`.sia-core/data/sia-authoring-guide.md`, seção 7). Para um agente completo, use `@squad-creator *create-agent`.
2. Tasks em `tasks/`, no formato da seção 8. Task-first: todo comando operacional aponta para uma task.
3. Registre cada arquivo em `components` no `squad.yaml` (ou use `@squad-creator *extend-squad {{SQUAD_NAME}}`).
4. Valide: `@squad-creator *validate-squad {{SQUAD_NAME}}` ou `sia validate --squad {{SQUAD_NAME}}`.
5. Projete nas IDEs: `sia sync`. As pastas das IDEs são geradas e nunca são editadas à mão.
6. Scripts em `scripts/` são implementados pelo `@dev`.

## Licença

{{SQUAD_LICENSE}}
