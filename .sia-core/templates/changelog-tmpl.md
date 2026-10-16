<!--
Template de CHANGELOG do SIA (Keep a Changelog 1.1.0 em pt-BR + Versionamento Semântico 2.0.0).
Usado por: @devops em *release. Quando o projeto não tem CHANGELOG.md, a task cria o arquivo a partir
deste template; nas releases seguintes, só acrescenta a seção da nova versão logo abaixo de "Não publicado".

Placeholders:
  {{project_name}}      nome do projeto (core-config: project.name)
  {{version}}           versão sem o "v" (ex.: 1.4.0)
  {{previous_version}}  versão anterior, para o link de comparação
  {{date}}              data da release no formato AAAA-MM-DD
  {{repo_url}}          URL do repositório (ex.: https://github.com/org/repo)

Regras de preenchimento:
  - Mantenha a seção "Não publicado" sempre no topo. Na release, mova as entradas dela para a seção da versão.
  - Use só as seis categorias abaixo, nesta ordem, e omita as vazias.
  - Mapeamento a partir dos commits (Conventional Commits): feat → Adicionado; fix → Corrigido;
    mudança de comportamento existente (refactor, perf) → Modificado; aviso de remoção futura → Obsoleto;
    remoção → Removido; correção de vulnerabilidade → Segurança. docs, chore, test e ci só entram se afetam quem usa.
  - Breaking change: inicie a linha com **BREAKING:** e diga como migrar.
  - Cite a story e a issue de cada entrada quando houver (ex.: "Story 2.1, #42").
  - Escreva para quem usa o produto, não para quem leu os commits.
-->
# Changelog

Todas as mudanças relevantes de {{project_name}} são registradas neste arquivo.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto adota o [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não publicado]

### Adicionado

### Modificado

### Obsoleto

### Removido

### Corrigido

### Segurança

## [{{version}}] - {{date}}

### Adicionado
- Descrição da nova funcionalidade (Story 2.1, #42)

### Modificado
- **BREAKING:** descrição da mudança incompatível e de como migrar (Story 2.3)
- Descrição de mudança em funcionalidade existente

### Obsoleto
- Funcionalidade X será removida na versão {próxima MAJOR}; use Y

### Removido
- Funcionalidade Z, obsoleta desde a versão {versão}

### Corrigido
- Descrição da correção (#57)

### Segurança
- Correção de vulnerabilidade em X (CVE-AAAA-NNNNN)

[Não publicado]: {{repo_url}}/compare/v{{version}}...HEAD
[{{version}}]: {{repo_url}}/compare/v{{previous_version}}...v{{version}}
