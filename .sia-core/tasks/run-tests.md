---
id: run-tests
title: Rodar os gates de qualidade
agent: dev
hat: dev
elicit: false
inputs:
  - 'nenhum obrigatório; usa quality.scripts do core-config'
outputs:
  - 'Relatório no chat: passou, falhou ou ausente por script, com detalhe e cobertura'
depends_on: {}
next: [develop, apply-qa-fixes]
source: [qa-run-tests.md]
---

# Rodar os gates de qualidade

## Objetivo

Rodar os scripts de qualidade do projeto (`quality.scripts`: lint, typecheck, testes e build) e reportar o resultado de cada um, sem alterar código ou testes para fazê-los passar.

## Quando usar

- Antes de marcar uma task como concluída, de enviar a story para revisão ou depois de corrigir achados.
- Para conferir o estado do repositório a qualquer momento.
- Não use para: corrigir falhas (isso acontece no `*develop` ou no `*apply-qa-fixes`) nem para decidir o QA gate (`@pm` [Qualidade]).

## Pré-condições

- [ ] `.sia-core/core-config.yaml` com `quality.scripts` (padrão: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`).
- [ ] Dependências do projeto instaladas (ex.: `node_modules` presente). Ausentes: avise e pergunte se deve instalá-las antes.

## Passos

### 1. Montar a lista de scripts

1. Leia `quality.scripts` na ordem em que aparecem.
2. Para cada `npm run {nome}`, confira se `{nome}` existe em `scripts` do `package.json`. Para `npm test`, confira se `test` existe e não é o padrão do npm (`echo "Error: no test specified" && exit 1`).
3. Script inexistente: marque como **ausente**. Não invente comando substituto; o gate considera apenas os scripts existentes (Constitution, Artigo V).
4. Se o `package.json` tiver `test:integration`, inclua-o como verificação extra, depois de `test`.

### 2. Executar

1. Rode cada script existente, um por vez, a partir da raiz do projeto, e capture o código de saída, a duração e o trecho relevante da saída.
2. Continue mesmo que um falhe: o relatório mostra todos.
3. Se a saída dos testes trouxer cobertura, registre o percentual. Abaixo de 80%: aviso (não é falha); a cobertura também não deve cair em relação à anterior.

### 3. Regras invioláveis

- Não altere testes, configurações ou limites para fazer algo passar.
- Não pule testes (`.skip`, `.only`, `--passWithNoTests` sem motivo) nem desligue regras de lint.
- Não corrija nada nesta task: reporte. A correção acontece na task da story ativa.

### 4. Reportar

```text
Gates de qualidade · 2026-10-16 14:30 · revisão 3f2a9c1

| Script           | Comando                   | Resultado  | Detalhe                                 |
|------------------|---------------------------|------------|-----------------------------------------|
| lint             | npm run lint              | ✅ passou  | 0 erros, 3 avisos                       |
| typecheck        | npm run typecheck         | ⚪ ausente | sem script no package.json              |
| test             | npm test                  | ❌ falhou  | 2 de 148 falharam: auth/session.test.ts |
| test:integration | npm run test:integration  | ✅ passou  | 12 testes                               |
| build            | npm run build             | ✅ passou  | 41 s                                    |

Cobertura: 76% (abaixo de 80%: aviso)
Resultado geral: FALHOU (1 script)
```

- Resultado geral: PASSOU quando todos os scripts existentes passam; FALHOU quando ao menos um falha. Ausentes não reprovam, mas aparecem no relatório.
- Para cada falha, mostre o comando para reproduzir e as primeiras linhas relevantes do erro (teste, arquivo e linha).

## Saída

Relatório no chat com o resultado por script, cobertura (quando houver) e resultado geral. Quando chamada dentro do `*develop` ou do `*apply-qa-fixes`, a task chamadora registra o resultado na story.

## Critérios de conclusão

- [ ] Todos os scripts de `quality.scripts` avaliados (executados ou marcados como ausentes)
- [ ] Resultado por script com detalhe e duração
- [ ] Nenhum arquivo de código, teste ou configuração alterado
- [ ] Resultado geral calculado só sobre os scripts existentes

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `quality.scripts` ausente no core-config | Use os padrões (`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`) e avise |
| Sem `package.json` | Informe que não há scripts npm e pergunte quais comandos do projeto usar |
| Dependências não instaladas | Avise e pergunte se deve instalar antes de rodar |
| Script trava ou passa do tempo | Interrompa, marque como falhou (tempo esgotado) e siga |
| Teste instável (passa e falha alternadamente) | Reporte como falha e sugira `*tech-debt` |

## Handoff

Tudo passou: siga a task em andamento (`*develop {storyId}` ou `*apply-qa-fixes {storyId}`). Houve falha: corrija na story ativa e rode `*run-tests` de novo.
