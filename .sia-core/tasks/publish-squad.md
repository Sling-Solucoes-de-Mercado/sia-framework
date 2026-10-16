---
id: publish-squad
title: Preparar a publicação de um squad
agent: squad-creator
elicit: true
inputs:
  - 'nome (obrigatório): squad em squads/'
  - '--category (opcional): community (padrão) ou official'
  - '--dry-run (opcional): mostra a prévia do pacote e do PR sem gravar nada'
outputs:
  - '.sia/publish/{nome}-{versão}/ com o pacote, a entrada do registry.json e o corpo do PR'
  - 'Handoff em .sia/handoffs/ para o @devops fazer o push e abrir o PR'
depends_on:
  tasks: [validate-squad.md]
  templates: [agent-handoff-tmpl.yaml]
  schemas: [squad-schema.json]
next: [push, create-pr]
source: [squad-creator-publish.md]
---

# Preparar a publicação de um squad

## Objetivo

Validar um squad e montar o pacote para o repositório de squads configurado em `squads.registry.repo`, deixando push e PR com o `@devops` (Constitution, Artigo II).

## Quando usar

- Squad validado que vai ser compartilhado com outros projetos.
- Não use para squads privados do projeto: eles ficam em `squads/` e não precisam de publicação.

## Pré-condições

- [ ] `squads.registry.repo` preenchido no `.sia-core/core-config.yaml`
- [ ] Squad sem erros em `sia validate --squad {nome}`
- [ ] Manifest com `name` e `version` (recomendados: `description` e `author`)

## Repositório de squads

O repositório configurado segue esta estrutura (a mesma que o `*download-squad` lê):

```text
{repositório}/
├── registry.json          # índice dos squads publicados
└── packages/
    └── {nome}/            # arquivos do squad
```

```json
{
  "version": "1.0.0",
  "squads": {
    "official": [{ "name": "etl", "version": "1.0.0", "description": "Pipelines de dados", "author": "Time de Dados" }],
    "community": []
  }
}
```

## Passos

### 1. Verificar o repositório configurado

Leia `squads.registry.repo`. Vazio: `REGISTRY_NOT_CONFIGURED`. Explique como configurar e pare:

```yaml
# .sia-core/core-config.yaml
squads:
  registry:
    repo: 'github.com/{organização}/{repositório}'   # repositório git com registry.json e packages/
```

Criar o repositório e configurar o acesso a ele é com o `@devops`.

### 2. Validar

Rode `sia validate --squad {nome}` (ou a task `validate-squad.md`). Qualquer erro: `VALIDATION_FAILED`; pare e mostre as correções.

### 3. Carregar o manifest

Leia `name`, `version`, `author` e `description` e conte os componentes por tipo. Sem `description` ou `author`: avise que são recomendados para publicação.

### 4. Checar conteúdo sensível

O pacote não leva `.env` e variantes, `.sia/`, `.backup/`, `node_modules/`, nem arquivo com chave, token ou senha no conteúdo. Achou segredo: `SENSITIVE_DATA`; pare e mostre os arquivos.

### 5. Checar o registry

Leia o `registry.json` do repositório, só leitura (`gh api` ou clone raso numa pasta temporária). Mesmo nome e mesma versão já publicados: `VERSION_EXISTS`.

**Ponto de elicitação:** O registry já tem {nome}@{versão}.

1. Subir para patch ({x.y.z+1})
2. Subir para minor
3. Subir para major
4. Cancelar

Atualize `version` no `squad.yaml` e valide de novo.

### 6. Montar o pacote

Em `.sia/publish/{nome}-{versão}/`:

- `packages/{nome}/`: cópia do squad, sem os itens do passo 4
- `registry-entry.json`: entrada `{name, version, description, author}` para a seção da categoria (padrão `community`), a inserir em ordem alfabética
- `pr-body.md`: corpo do PR (ver Saída)

Branch sugerida: `squad/{nome}`. Título sugerido: `feat: adiciona squad {nome}@{versão}`.

### 7. Dry-run

Com `--dry-run`, mostre a prévia (ver Saída) e pare sem gravar o pacote nem o handoff.

### 8. Entregar para o @devops

Grave `.sia/handoffs/handoff-squad-creator-para-devops-{AAAAMMDD-HHmmss}.yaml` com `templates/agent-handoff-tmpl.yaml`:

- `from_agent: squad-creator`, `to_agent: devops`, `consumed: false`
- `last_command: publish-squad` (só o nome do comando, sem `*` e sem argumentos)
- `files_modified`: o caminho do pacote, `.sia/publish/{nome}-{versão}/`
- `next_action`: com os argumentos, ex.: "Publicar {nome}@{versão} de .sia/publish/{nome}-{versão}/ em {repositório}: clone ou fork, branch squad/{nome}, cópia de packages/{nome}/, entrada no registry.json, commit, push e PR com pr-body.md."

O `@squad-creator` não faz push nem abre PR.

## Saída

Prévia:

```text
Squad: vendas-b2b@1.0.0 | Autor: Time Comercial | Categoria: community
Destino: github.com/{organização}/{repositório} → packages/vendas-b2b/
Branch: squad/vendas-b2b | Título: feat: adiciona squad vendas-b2b@1.0.0
Componentes: 3 tasks, 2 agentes, 1 workflow
✓ Validação sem erros
✓ Sem conteúdo sensível
Pacote: .sia/publish/vendas-b2b-1.0.0/
```

`pr-body.md`:

```markdown
## Novo squad: {nome}

**Versão:** {versão}
**Autor:** {autor}
**Categoria:** {categoria}
**Descrição:** {descrição}

### Componentes
| Tipo | Quantidade |
|------|------------|
| Tasks | {n} |
| Agentes | {n} |
| Workflows | {n} |

### Checklist de envio
- [x] Segue a arquitetura task-first do SIA
- [x] README completo
- [x] Validado com `sia validate --squad {nome}`
- [ ] Revisão de dados sensíveis confirmada por quem aprova o PR
```

## Critérios de conclusão

- [ ] Squad validado sem erros
- [ ] Nenhum conteúdo sensível no pacote
- [ ] Versão inédita no registry
- [ ] Pacote, entrada do registry e corpo do PR gravados em `.sia/publish/{nome}-{versão}/`
- [ ] Handoff para o `@devops` gravado (exceto no dry-run)

## Tratamento de erros

| Código | Ação |
|--------|------|
| `REGISTRY_NOT_CONFIGURED` | Explique a configuração (passo 1) e pare |
| `SQUAD_NOT_FOUND` | Mostre `*list-squads` |
| `VALIDATION_FAILED` | Mostre as correções; `*validate-squad {nome}` depois de corrigir |
| `MANIFEST_ERROR` | Falta `name` ou `version`: corrija o `squad.yaml` |
| `SENSITIVE_DATA` | Pare; remova o segredo e troque a credencial exposta |
| `VERSION_EXISTS` | Ponto de elicitação do passo 5 |
| Registry inacessível | Verifique `gh auth status` e a URL; sem leitura, não publique |

## Handoff

Próximo passo: `@devops *push` e `@devops *create-pr`, com o pacote de `.sia/publish/{nome}-{versão}/`.
