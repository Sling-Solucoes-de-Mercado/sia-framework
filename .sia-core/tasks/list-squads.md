---
id: list-squads
title: Listar os squads locais
agent: squad-creator
elicit: false
inputs:
  - '--path (opcional): pasta dos squads (padrão: squads.location do core-config)'
  - '--format (opcional): table (padrão), json ou yaml'
  - '--include-invalid (opcional): inclui pastas sem manifest'
outputs:
  - 'Lista no chat com nome, versão, descrição e status de cada squad'
depends_on:
  schemas: [squad-schema.json]
next: [analyze-squad, validate-squad, create-squad]
source: [squad-creator-list.md]
---

# Listar os squads locais

## Objetivo

Mostrar os squads do projeto com nome, versão, descrição e status do manifest, para escolher o próximo comando.

## Quando usar

- Para saber quais squads existem antes de analisar, estender, validar ou publicar.
- Não use para validar o conteúdo de um squad: use `*validate-squad {nome}`.

## Pré-condições

- [ ] Nenhuma. Sem a pasta de squads, a lista sai vazia.

## Passos

### 1. Ler os parâmetros

Pasta: `--path` ou `squads.location` do `core-config.yaml` (padrão `squads`). Formato: `--format` ou `table`.

### 2. Listar

```bash
sia squad list
# sem sia no PATH: node .sia-core/cli/sia.js squad list
```

Sem CLI, percorra as subpastas (ignore as que começam com ponto, como `.designs`):

| Encontrado | Dados | Status |
|------------|-------|--------|
| `squad.yaml` | `name`, `version`, `description` | válido ✅ |
| só `config.yaml` | os mesmos campos | obsoleto ⚠️ (migrar com `*migrate-squad`) |
| nenhum manifest, ou YAML inválido | nome da pasta, versão `unknown`, descrição com o motivo | inválido ❌ |

### 3. Filtrar

Sem `--include-invalid`, oculte os inválidos e informe quantos foram ocultados.

### 4. Formatar

- `table`: tabela com Nome, Versão, Descrição e Status
- `json`: objeto com `squads`, `count` e `path`
- `yaml`: as mesmas chaves do JSON

### 5. Resumir

Linha final: `Total: {n} squads ({v} válidos, {o} obsoletos, {i} inválidos)`. Sem squads, mostre o estado vazio (ver Saída).

## Saída

Tabela:

```text
Squads locais (squads/)

| Nome              | Versão | Descrição                      | Status |
|-------------------|--------|--------------------------------|--------|
| vendas-b2b        | 1.0.0  | Prospecção e propostas         | ✅     |
| conteudo          | 2.1.0  | Pauta e produção de conteúdo   | ✅     |
| legado-marketing  | 1.0.0  | Usa config.yaml                | ⚠️     |

Total: 3 squads (2 válidos, 1 obsoleto)
```

JSON:

```json
{
  "squads": [
    { "name": "vendas-b2b", "version": "1.0.0", "description": "Prospecção e propostas", "path": "squads/vendas-b2b", "status": "valid" }
  ],
  "count": 1,
  "path": "squads"
}
```

Estado vazio:

```text
Nenhum squad em squads/.

Crie um: @squad-creator *create-squad {nome}
Ou baixe do repositório de squads: @squad-creator *download-squad {nome}
```

## Critérios de conclusão

- [ ] Toda subpasta considerada (exceto as ocultas por começarem com ponto)
- [ ] Status de cada squad informado
- [ ] Resumo com as contagens

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Pasta de squads inexistente | Lista vazia e estado vazio |
| Sem permissão de leitura | Informe a pasta e peça a correção da permissão |
| Manifest com YAML inválido | Status inválido, com a linha do erro na descrição |

## Handoff

Próximo passo: `@squad-creator *analyze-squad {nome}` para um squad da lista, ou `*create-squad {nome}` se a lista estiver vazia.
