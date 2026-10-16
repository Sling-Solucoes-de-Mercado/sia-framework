---
id: download-squad
title: Baixar um squad do repositório de squads
agent: squad-creator
elicit: false
inputs:
  - 'nome (obrigatório, exceto com --list): nome do squad, opcionalmente com versão (nome@1.2.0)'
  - '--list (opcional): lista os squads disponíveis'
  - '--overwrite (opcional): substitui o squad local de mesmo nome, com backup'
  - '--verbose (opcional): mostra o progresso arquivo a arquivo'
outputs:
  - 'squads/{nome}/ com os arquivos do pacote'
  - 'Resultado de sia validate --squad {nome} e próximos passos'
depends_on:
  tasks: [validate-squad.md]
  schemas: [squad-schema.json]
next: [validate-squad, analyze-squad, sync-ide]
source: [squad-creator-download.md]
---

# Baixar um squad do repositório de squads

## Objetivo

Baixar um squad publicado no repositório configurado em `squads.registry.repo` para `squads/{nome}/` e validá-lo antes do uso.

## Quando usar

- Para reaproveitar um squad publicado por outro projeto ou pelo time.
- Com `--list`, para ver o que está disponível.
- Não use para squads do próprio projeto: eles já estão em `squads/`.

## Pré-condições

- [ ] `squads.registry.repo` preenchido no `.sia-core/core-config.yaml`
- [ ] Leitura no repositório (repositório privado: `gh auth status` autenticado)

## Passos

### 1. Verificar o repositório configurado

`squads.registry.repo` vazio: `REGISTRY_NOT_CONFIGURED`. Explique e pare:

```yaml
# .sia-core/core-config.yaml
squads:
  registry:
    repo: 'github.com/{organização}/{repositório}'   # repositório com registry.json e packages/
```

A estrutura do repositório está descrita na task `publish-squad.md`.

### 2. Ler o registry

Leia o `registry.json` da branch principal do repositório, só leitura (`gh api` ou leitura do arquivo bruto). Falha de rede: `REGISTRY_FETCH_ERROR`. Limite de requisições da API: `RATE_LIMIT`.

### 3. Listar (com `--list`)

Mostre os squads da seção `official` e depois os da `community`, no formato `nome@versão: descrição`, e pare.

### 4. Localizar o squad

Procure primeiro em `official`, depois em `community`. Não achou: `SQUAD_NOT_FOUND` (sugira `--list`). Versão pedida diferente da publicada: avise que só a versão {publicada} está disponível e siga com ela.

### 5. Verificar o destino

`squads/{nome}/` já existe:

- sem `--overwrite`: `SQUAD_EXISTS`; pare e sugira `--overwrite` ou outro destino
- com `--overwrite`: copie o squad atual para `.sia/backups/{AAAAMMDD-HHmmss}/squads/{nome}/` e então substitua

### 6. Baixar

Copie `packages/{nome}/` do repositório para `squads/{nome}/` (clone raso com checkout parcial ou `gh api`, de forma recursiva). Só leitura no repositório. Com `--verbose`, mostre cada arquivo.

### 7. Validar

```bash
sia validate --squad {nome}
# sem sia no PATH: node .sia-core/cli/sia.js validate --squad {nome}
```

Mostre erros e avisos com as correções. Não corrija o pacote sem o pedido do usuário.

### 8. Revisar o que executa código

Liste os arquivos de `scripts/`. Código de terceiros não roda antes de revisado: recomende `@validator *revisar-seguranca squads/{nome}/scripts`.

### 9. Mostrar os próximos passos

Revisar o `squad.yaml`, rodar `*analyze-squad {nome}` e `*sync-ide` para projetar os agentes do squad nas IDEs.

## Saída

```text
Baixando: vendas-b2b@1.0.0
  Origem: github.com/{organização}/{repositório}/packages/vendas-b2b
  Destino: squads/vendas-b2b/

✓ 12 arquivos baixados
✓ Validação: VALID
⚠ scripts/ tem 1 arquivo: revisar antes de executar (@validator *revisar-seguranca squads/vendas-b2b/scripts)

Próximos passos:
  1. Revise squads/vendas-b2b/squad.yaml
  2. *analyze-squad vendas-b2b
  3. *sync-ide
```

Com `--list`:

```text
Squads disponíveis (github.com/{organização}/{repositório}):

Oficiais:
  etl@1.0.0: pipelines de dados
Comunidade:
  vendas-b2b@1.0.0: prospecção e propostas
```

## Critérios de conclusão

- [ ] Arquivos de `packages/{nome}/` copiados para `squads/{nome}/`
- [ ] Backup feito quando houve substituição
- [ ] Validação executada e resultado mostrado
- [ ] Scripts sinalizados para revisão antes do uso

## Tratamento de erros

| Código | Ação |
|--------|------|
| `REGISTRY_NOT_CONFIGURED` | Explique a configuração (passo 1) e pare |
| `SQUAD_NOT_FOUND` | Sugira `*download-squad --list` |
| `SQUAD_EXISTS` | Sugira `--overwrite` (com backup) ou outro destino |
| `REGISTRY_FETCH_ERROR` | Verifique a conexão e a URL do repositório |
| `RATE_LIMIT` | Autentique com `gh auth login` (ou defina `GITHUB_TOKEN`) e tente de novo |
| Download incompleto | Remova a pasta parcial; com backup, restaure o squad anterior |

## Handoff

Próximo passo: `@squad-creator *analyze-squad {nome}` e `*sync-ide`.
