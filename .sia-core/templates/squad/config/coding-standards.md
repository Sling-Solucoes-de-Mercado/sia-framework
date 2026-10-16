<!--
Padrões de código do squad. Gerado por *create-squad quando o projeto não tem
docs/architecture/coding-standards.md. Placeholders: {{SQUAD_NAME}}, {{SQUAD_TITLE}}, {{CONFIG_MODE}}.
-->
# Coding Standards: {{SQUAD_TITLE}}

> Modo de herança: `{{CONFIG_MODE}}`. Com `extend`, estas regras somam às do projeto (`docs/architecture/coding-standards.md`, quando existir). Com `override`, substituem. Com `none`, o squad é independente.

## Estilo de código

- Nomes de arquivo e de pasta em inglês, kebab-case.
- Variáveis e funções com nomes que dizem o que fazem.
- Funções pequenas, com uma responsabilidade.
- Comentário só onde a lógica não é óbvia.

## Organização

- Agentes em `agents/`, tasks em `tasks/`, workflows em `workflows/`.
- Checklists em `checklists/`, templates em `templates/`, bases de conhecimento em `data/`.
- Código de automação em `scripts/`, implementado pelo `@dev`.
- Todo arquivo novo entra em `components` no `squad.yaml`.

## Testes

- Todo script novo tem teste.
- Cobertura mínima de 80% nos scripts do squad.
- Nomes de teste descrevem o comportamento esperado.

## Documentação

- Textos para humanos em português do Brasil, com acentuação correta.
- Exemplos curtos que mostram o formato de saída.
- `README.md` atualizado a cada agente, task ou workflow novo.
