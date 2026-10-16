---
id: gotchas
title: Registrar e consultar gotchas
agent: dev
hat: dev
elicit: false
inputs:
  - 'ação (obrigatório): add | list | search'
  - 'add: {título} [- {descrição}] [--category c] [--severity s] [--workaround "texto"] [--files a,b] [--story id]'
  - 'list: [--category c] [--severity s] [--unresolved] [--stats]'
  - 'search: {termo}'
outputs:
  - 'docs/gotchas.md criado ou atualizado (add)'
  - 'Lista filtrada, estatísticas ou resultado de busca (list, search)'
depends_on: {}
next: []
source: [gotcha.md, gotchas.md, document-gotchas.md]
---

# Registrar e consultar gotchas

## Objetivo

Manter em `docs/gotchas.md` a base de armadilhas conhecidas do projeto (sintoma, causa e solução, por categoria) e consultá-la, para que o mesmo erro não seja investigado duas vezes.

## Quando usar

- `add`: ao descobrir um comportamento traiçoeiro, um contorno necessário ou um erro que custou investigação.
- `list` e `search`: antes de mexer numa área, na autocrítica do `*develop` ou ao investigar um erro.
- Não use para: débito técnico a corrigir (`*tech-debt`) ou bug a resolver dentro da story.

## Formato de `docs/gotchas.md`

```markdown
# Gotchas do projeto

> Armadilhas conhecidas e como evitá-las. Mantido pelo @dev com `*gotchas add`.
> Atualizado em: 2026-10-16 · Total: 2 (2 em aberto)

## Índice
- [api](#api) (1)
- [typescript](#typescript) (1)

## api

### G-001 Sempre conferir `response.ok` no fetch
- **Severidade:** warning
- **Status:** aberto
- **Sintoma:** respostas HTTP 4xx e 5xx seguem o fluxo como sucesso.
- **Causa:** `fetch()` só rejeita em falha de rede, não em status de erro.
- **Solução:** checar `response.ok` e lançar erro tipado.
- **Arquivos:** src/lib/fetch.ts
- **Origem:** Story 2.1 (2026-10-16)
```

- Severidade: `critical`, `warning` (padrão) ou `info`. Status: `aberto` ou `resolvido`.
- Quando ajudar, a solução pode trazer os blocos **Errado:** e **Certo:** com código curto.
- Ids sequenciais `G-nnn`; seções por categoria em ordem alfabética.

Categorias e palavras-chave para detecção automática:

| Categoria | Palavras-chave |
|-----------|----------------|
| `build` | build, compile, bundle, webpack, vite, tsc, deploy |
| `test` | test, jest, vitest, mock, coverage |
| `lint` | lint, eslint, prettier, stylelint |
| `runtime` | TypeError, null, undefined, crash |
| `typescript` | tipo, type, inferência, generics |
| `frontend` | React, componente, render, hook |
| `state` | estado, store, Zustand, Redux |
| `api` | api, http, fetch, cors, webhook |
| `database` | banco, postgres, supabase, prisma, sql, migration |
| `auth` | login, sessão, token, OAuth |
| `security` | xss, csrf, injection, segredo |
| `performance` | lento, memória, N+1, cache |
| `other` | nenhuma das anteriores |

## Pré-condições

- [ ] `add`: título informado.
- [ ] `list` e `search`: `docs/gotchas.md` existente. Ausente: informe que ainda não há gotchas e como registrar o primeiro.

## Passos

### 1. Ação `add`

1. Separe o título e a descrição (o que vem depois de ` - `) e leia as opções.
2. Sem `--category`: detecte pela tabela de palavras-chave no título e na descrição; sem correspondência, use `other`. Informe "(detectada)".
3. Monte o registro: sintoma (da descrição), causa, solução (de `--workaround`), arquivos (`--files`), origem (story ativa ou `--story`, e a data). Falta causa ou solução e o contexto não as dá: pergunte; se o usuário não souber, grave "a investigar".
4. Procure duplicata: gotcha com título, sintoma ou arquivos equivalentes. Achou: mostre e pergunte (1. atualizar o existente, inclusive o status, 2. registrar como novo, 3. cancelar).
5. Arquivo inexistente: crie com o cabeçalho do formato. Insira o registro na seção da categoria (crie a seção e a linha do índice se preciso) com o próximo id.
6. Atualize a data, os totais e as contagens do índice.
7. Confirme:

```text
Gotcha registrado: G-003
Título: Zustand persist exige anotação de tipo
Categoria: state (detectada) · Severidade: warning
Será útil na autocrítica de tasks dessa área.
```

### 2. Ação `list`

1. Leia `docs/gotchas.md` e aplique os filtros: `--category`, `--severity`, `--unresolved` (só `aberto`).
2. Mostre cada item no formato abaixo, com o sintoma truncado em uma linha:

```text
=== Gotchas (12 no total, 10 em aberto) ===

[CRITICAL] G-002 Arquivos protegidos exigem leitura completa
  Categoria: build · Status: aberto
  Sintoma: leitura parcial bloqueada pelo hook de proteção...
  Solução: ler o arquivo inteiro e filtrar depois
  Arquivos: **/agents/*.md
---
Total: 12 · critical 1 · warning 8 · info 3
```

3. Com `--stats`, mostre só os números: total, em aberto e resolvidos, por categoria e por severidade.

### 3. Ação `search`

1. Busque o termo, sem diferenciar maiúsculas, em título, sintoma, causa, solução e arquivos.
2. Mostre os resultados no formato do `list`, com o campo onde houve a correspondência. Sem resultado: diga isso e sugira `*gotchas add`.

## Saída

- `add`: registro novo ou atualizado em `docs/gotchas.md`, com índice e totais corretos.
- `list` e `search`: lista no formato acima ou estatísticas.

## Critérios de conclusão

- [ ] Registro com categoria, severidade, status, sintoma, causa, solução e origem
- [ ] Sem duplicata não intencional
- [ ] Índice, totais e data de atualização coerentes
- [ ] Filtros e busca aplicados exatamente como pedidos

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `add` sem título | Peça o título |
| Categoria ou severidade inválida | Mostre os valores válidos e use a detecção ou `warning` |
| `docs/gotchas.md` ausente em `list` ou `search` | Informe que não há registros e sugira `*gotchas add` |
| Arquivo com seção fora do formato | Não reestruture; acrescente na seção da categoria e avise |
| Ação desconhecida | Mostre as ações válidas: `add`, `list`, `search` |

## Handoff

Sem próxima etapa obrigatória. O `*develop` consulta `docs/gotchas.md` na autocrítica, e o `*document-project` pode citá-lo na seção de contornos e gotchas.
