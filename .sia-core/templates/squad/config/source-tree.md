<!--
Estrutura de pastas do squad. Gerado por *create-squad quando o projeto não tem
docs/architecture/source-tree.md. Placeholders: {{SQUAD_NAME}}, {{SQUAD_TITLE}}.
-->
# Source Tree: {{SQUAD_TITLE}}

```text
squads/{{SQUAD_NAME}}/
├── squad.yaml        # manifest (obrigatórios: name e version)
├── README.md         # documentação do squad
├── config/           # coding-standards, tech-stack, source-tree
├── agents/           # agentes ({id}.md)
├── tasks/            # tasks executáveis ({id}.md)
├── workflows/        # sequências de tasks ({id}.yaml)
├── checklists/       # checklists de validação
├── templates/        # templates de documento e de arquivo
├── data/             # bases de conhecimento do squad
└── scripts/          # automação (implementada pelo @dev)
```

## Resolução de dependências

Um agente do squad procura cada dependência primeiro em `squads/{{SQUAD_NAME}}/{tipo}/` e depois em `.sia-core/{tipo}/`. Um arquivo do squad com o mesmo nome de um arquivo do `.sia-core` tem precedência para os agentes do squad.

## Projeções

As IDEs recebem os agentes e as tasks do squad por `sia sync`. As pastas `.claude/`, `.codex/`, `.gemini/` e `.grok/` são geradas e nunca são editadas à mão.
