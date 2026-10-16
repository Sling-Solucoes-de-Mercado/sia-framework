---
description: Prioridade de ferramentas no SIA (nativa, CLI, MCP), exemplos de uso por ferramenta e filtragem de respostas longas
---

# Uso de Ferramentas

## Prioridade

1. **Ferramenta nativa da IDE:** ler, criar, editar e buscar arquivos e conteúdo. No Claude Code: Read, Write, Edit, Glob e Grep.
2. **CLI:** `sia`, `git`, `gh`, `supabase`, `vercel` e os scripts do projeto (`quality.scripts` do `core-config.yaml`).
3. **MCP:** só quando a ferramenta nativa e a CLI não alcançam (regra `mcp-usage`).

| Tarefa | Use |
|--------|-----|
| Ler arquivo | leitura nativa (Read) |
| Criar ou editar arquivo | escrita e edição nativas (Write, Edit) |
| Rodar comando | terminal (Bash) |
| Buscar arquivos por nome ou padrão | busca por padrão (Glob) |
| Buscar texto, símbolo ou chamador | busca por conteúdo (Grep) |
| Listar diretórios | `ls` no terminal ou Glob |

Em IDE sem algumas dessas ferramentas, use o equivalente da IDE e, na falta dele, o terminal.

## Exemplos por ferramenta

### git: estado e histórico

- `git diff --stat`: resumo das mudanças por arquivo, antes do diff completo
- `git log --oneline -10`: últimos 10 commits
- `git diff main...HEAD --stat`: tudo o que mudou desde a base da branch
- `git rev-parse --short HEAD`: revisão avaliada no gate e na inspeção

### gh: GitHub

- `gh pr view {número} --json reviews,statusCheckRollup`: revisões e checks de um PR
- `gh issue list --state open --label bug`: issues abertas
- `gh pr create`, `gh pr merge` e `gh release create`: exclusivos do `@devops`

### sia: CLI do SIA

- `sia doctor`: diagnóstico do ambiente
- `sia validate`: valida agentes, tasks, workflows e referências cruzadas
- `sia story status {storyId}` e `sia sdc next {storyId}`: estado e próximo passo da story
- `sia mcp status`: MCPs configurados em cada IDE

### supabase: banco

- `supabase migration list`: estado das migrations
- `supabase db push`: aplica migrations; só pelo `@dev` [Dados], dentro do `*db-migrate {migration}`

### Busca no código: chamadores, usos e dependências

- Busque o nome do símbolo com a busca por conteúdo, fora do arquivo da definição.
- Para a cadeia de imports de um módulo, busque o caminho do módulo nas linhas de import.
- Quando a busca é evidência (inspeção do `@validator`, análise de impacto), registre a busca usada.

### Navegador

- Com servidor de desenvolvimento no ar, abra a rota afetada (ex.: `http://localhost:3000`) e confira erros no console. Só com ferramenta de navegador configurada.

### Documentação de bibliotecas

- Com o MCP Context7 configurado: resolva o id da biblioteca e busque o tópico (ex.: `react` e "server components"). Sem ele, use busca na web.

## Filtragem de respostas longas

Ao receber resposta grande de MCP, busca na web ou comando, filtre antes de usar:

| Tipo | Quando | Como |
|------|--------|------|
| Conteúdo | HTML, resultado de busca, documentação | extraia o conteúdo principal; descarte navegação, anúncios, cabeçalhos e rodapés repetidos; corte num limite natural de parágrafo |
| Esquema | objeto JSON | mantenha só os campos de que a tarefa precisa |
| Campos | lista de objetos, resultado de consulta, CSV | projete as colunas necessárias e limite as linhas, como `SELECT campo1, campo2 ... LIMIT n` |

Regras:

- Trabalhe com o resultado filtrado; não repita o conteúdo bruto na resposta.
- Se o filtro esvaziar o resultado, use a resposta completa. Filtragem nunca produz resultado vazio.
- Prefira pedir menos na origem: `--stat`, `--oneline`, `--json` com campos, `LIMIT` e leitura de arquivo por intervalo de linhas.
