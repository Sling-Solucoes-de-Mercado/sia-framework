---
id: setup-mcp
title: Conectar o MCP do Supabase ou da Vercel nas IDEs
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'servidor (obrigatório): supabase | vercel'
  - '--ide (opcional): lista separada por vírgula entre claude-code, codex, gemini e grok; padrão: ide.targets do core-config'
outputs:
  - 'Entrada do servidor nos arquivos de MCP de cada IDE escolhida (.mcp.json, .codex/config.toml, .gemini/settings.json, .grok/config.toml)'
  - 'integrations.{servidor} atualizado no core-config, com confirmação do usuário'
depends_on:
  data: [mcp-servers.yaml]
next: [db-setup, vercel-setup, health-check]
source: [new, add-mcp.md]
---

# Conectar o MCP do Supabase ou da Vercel nas IDEs

## Objetivo
Registrar o servidor MCP oficial do Supabase ou da Vercel, em escopo de projeto, nas IDEs do time (Claude Code, Codex, Gemini CLI e Grok Build), com o menor privilégio possível, e orientar a autenticação em cada uma. Configuração de MCP é exclusiva do `@devops` (Constitution, Artigo II).

## Quando usar
- O `@dev` precisa consultar o banco ou o projeto na Vercel a partir da IDE.
- Uma IDE nova entrou em `ide.targets`.
- Trocar o escopo ou o modo de acesso do MCP do Supabase (projeto, somente leitura).
- Outro servidor MCP: primeiro acrescente-o em `data/mcp-servers.yaml` no mesmo formato, com a fonte oficial em `docs:`.

## Pré-condições
- [ ] `.sia-core/data/mcp-servers.yaml` contém o servidor pedido
- [ ] Comando executado na raiz do projeto (os caminhos de `ides.*.file` são relativos a ela)
- [ ] Supabase: `projectRef` do projeto à mão (aparece na URL do painel, `/dashboard/project/{ref}`, e nas configurações gerais do projeto)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | usa `ide.targets` e o core-config; pergunta só o que falta e a confirmação de gravação | reconfiguração rápida |
| Interativo (padrão) | escolhe IDEs, escopo e modo de acesso passo a passo | primeira configuração |

## Passos

### 1. Carregar catálogo e configuração
1. Leia `data/mcp-servers.yaml`: `servers.{id}` (`url`, `params`, `auth`, `env`, `notes`) e `ides.*` (`file`, `format`, `key`, `entry`, `login`, `unsupported`).
2. Leia do core-config: `ide.targets` e `integrations.{id}` (Supabase: `projectRef`, `mcp.readOnly`; Vercel: `team`, `project`).
3. Mostre ao usuário as `notes` do servidor: elas trazem as ressalvas da documentação oficial (clientes aceitos, alternativas, riscos).

### 2. Elicitar IDEs e dados
**Ponto de elicitação (IDEs):** marque como padrão as de `ide.targets` e aceite a resposta por número.

```text
1. Claude Code  → .mcp.json
2. Codex        → .codex/config.toml
3. Gemini CLI   → .gemini/settings.json
4. Grok Build   → .grok/config.toml
Padrão (ide.targets): 1,2,3,4
```

**Supabase:**
- `projectRef` vazio → peça. Sem ele, o MCP enxerga a conta inteira (todos os projetos e as ferramentas de conta). Recomende o escopo de projeto; siga sem ele só com confirmação explícita.
- Modo de acesso: somente leitura (`mcp.readOnly: true`) é o padrão. Escrita só pelo passo 3.

**Vercel:**
- `team` e `project` vazios → pergunte os slugs e registre no core-config (são usados por `*vercel-setup` e `*vercel-deploy`). O MCP usa o endpoint compartilhado `https://mcp.vercel.com`.
- Avise as ressalvas por IDE: Grok Build não consta na lista de clientes aprovados pela Vercel; no Gemini CLI, a Vercel documenta a ponte `npx mcp-remote`.

### 3. Escrita no Supabase (só com confirmação explícita)
Quando o usuário pedir MCP com escrita (`readOnly: false`):
1. Explique o risco: o agente passa a executar SQL que altera ou apaga dados, aplicar migrações e mudar configuração; uma instrução maliciosa escondida em dados (prompt injection) pode disparar essas ações.
2. Recomende: nunca em produção; use projeto ou branch de desenvolvimento; mantenha a aprovação manual de cada chamada de ferramenta; mudança de schema segue o fluxo do `@dev [Dados]` (`*db-migrate`).
3. Peça a confirmação digitada: "confirmo MCP do Supabase com escrita no projeto {projectRef}".
4. Só então registre `integrations.supabase.mcp.readOnly: false`. Sem a frase, mantenha somente leitura.

### 4. Montar e confirmar
1. `{{url}}` = `url` + query string dos `params` com valor; parâmetros vazios são omitidos. Exemplo: `https://mcp.supabase.com/mcp?project_ref=abcd1234&read_only=true`.
2. Para cada IDE, monte a entrada a partir de `ides.{ide}.entry`. IDE com `unsupported` → pule e mostre o motivo e a alternativa.
3. Mostre o plano e peça confirmação (alteração de MCP exige confirmação):

```text
━━━ MCP: supabase ━━━
URL:   https://mcp.supabase.com/mcp?project_ref=abcd1234&read_only=true
Auth:  OAuth (login no navegador; nenhum token em arquivo)
.mcp.json              mcpServers.supabase  {type: http, url}
.codex/config.toml     [mcp_servers.supabase]  url
.gemini/settings.json  mcpServers.supabase  {httpUrl}
.grok/config.toml      [mcp_servers.supabase]  url, enabled = true
```

**Ponto de elicitação:**
1. Gravar
2. Mudar as IDEs
3. Cancelar

### 5. Gravar com a CLI
```bash
sia mcp setup {id} --ide {lista}
```
Sem `sia` no PATH: `node .sia-core/cli/sia.js mcp setup {id} --ide {lista}`. A CLI lê o catálogo e o core-config, preserva o resto de cada arquivo e, nos TOML, grava a tabela entre `# >>> SIA MCP: {id}` e `# <<< SIA MCP: {id}`. Rode de novo para atualizar (por exemplo, depois de trocar `projectRef` ou `readOnly`).

### 6. Gravar à mão (sem a CLI)
Edite cada arquivo preservando o conteúdo existente; com o arquivo inválido (JSON ou TOML quebrado), pare e peça correção. Exemplos com o Supabase (para a Vercel, troque o nome por `vercel` e a URL por `https://mcp.vercel.com`):

Claude Code, `.mcp.json` (ou `claude mcp add --scope project --transport http supabase "{url}"`):
```json
{
  "mcpServers": {
    "supabase": { "type": "http", "url": "https://mcp.supabase.com/mcp?project_ref={ref}&read_only=true" }
  }
}
```

Codex, `.codex/config.toml` (o `codex mcp add` grava só na configuração global do usuário; para o projeto, edite o arquivo):
```toml
# >>> SIA MCP: supabase
[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref={ref}&read_only=true"
# <<< SIA MCP: supabase
```

Gemini CLI, `.gemini/settings.json` (ou `gemini mcp add -s project -t http supabase "{url}"`):
```json
{
  "mcpServers": {
    "supabase": { "httpUrl": "https://mcp.supabase.com/mcp?project_ref={ref}&read_only=true" }
  }
}
```

Grok Build, `.grok/config.toml` (ou `grok mcp add --transport http --scope project supabase "{url}"`):
```toml
# >>> SIA MCP: supabase
[mcp_servers.supabase]
url = "https://mcp.supabase.com/mcp?project_ref={ref}&read_only=true"
enabled = true
# <<< SIA MCP: supabase
```

### 7. Autenticar em cada IDE
Entregue ao usuário o texto de `ides.{ide}.login` (com `{{id}}` trocado) para cada IDE configurada:

| IDE | Autenticação |
|-----|--------------|
| Claude Code | aprove o servidor do `.mcp.json` ao abrir a sessão; `/mcp` → servidor → Authenticate |
| Codex | marque o projeto como confiável; `codex mcp login {id}`; confira com `/mcp` |
| Gemini CLI | versão 0.20.2 ou mais nova; pasta confiável; `/mcp auth {id}` |
| Grok Build | pasta confiável; `/mcps` → servidor → tecla `i` |

- Supabase: na tela de consentimento, escolha a organização que contém o projeto.
- Vercel: cada IDE pede o próprio consentimento, e a conexão recebe o mesmo acesso da conta do usuário.
- Os tokens OAuth ficam no perfil do usuário em cada IDE, nunca no repositório. Cada pessoa do time autentica na própria máquina.
- Sem navegador (CI, execução headless): o OAuth não roda. O Supabase aceita token pessoal com escopo (`auth: bearer-env`, variável `SUPABASE_ACCESS_TOKEN`; formato por IDE no cabeçalho de `mcp-servers.yaml`). A Vercel não documenta token para o MCP.

### 8. Verificar
1. `sia mcp status` (ou `node .sia-core/cli/sia.js mcp status`) mostra os servidores configurados em cada IDE.
2. Sem a CLI: confira os arquivos e use as ferramentas das IDEs: `claude mcp list`, `codex mcp list`, `/mcp` no Gemini CLI, `grok mcp list` e `grok mcp doctor {id}`.
3. Peça à IDE uma chamada inofensiva de leitura (Supabase: busca na documentação ou lista de tabelas; Vercel: lista de projetos).
4. Ferramentas novas só aparecem em sessão nova da IDE; no Grok, a tecla `r` no `/mcps` recarrega a lista.

### 9. Atualizar o core-config
Lembre e, com confirmação, ajuste `.sia-core/core-config.yaml`:
- `integrations.{id}.enabled: true`
- Supabase: `projectRef` e `mcp.readOnly`
- Vercel: `team` e `project`

### 10. Versionar
Com OAuth, os arquivos não têm segredos: recomende versioná-los para o time num commit operacional (`chore(mcp): conecta {id} nas IDEs`) e enviar com `*push`. Com `bearer-env`, confira que só o nome da variável foi gravado, nunca o valor.

## Saída
- Entrada `{id}` nos arquivos de MCP das IDEs escolhidas, conforme `data/mcp-servers.yaml`.
- `integrations.{id}` atualizado no core-config (com confirmação).
- Instruções de autenticação por IDE e resultado da verificação.

## Critérios de conclusão
- [ ] Servidor gravado em todas as IDEs escolhidas, ou motivo registrado para as que ficaram de fora
- [ ] Supabase com escopo de projeto e somente leitura, salvo exceção confirmada por escrito
- [ ] Nenhum token ou segredo gravado em arquivo do projeto
- [ ] Instruções de autenticação entregues para cada IDE
- [ ] `sia mcp status` (ou verificação manual) confirma a configuração
- [ ] Usuário lembrado de ajustar `integrations.{id}.enabled`

## Tratamento de erros

| Situação | Ação |
|----------|------|
| CLI `sia` indisponível | siga o passo 6 (edição manual) |
| Arquivo da IDE com JSON ou TOML inválido | não sobrescreva; mostre o erro e peça a correção |
| Servidor já existe na IDE com outra URL | mostre as duas e pergunte qual vale |
| Vercel recusa a autorização (cliente fora da lista) | use uma IDE aprovada ou a CLI `vercel`; registre em `agents/devops/MEMORY.md` |
| Gemini CLI não conecta na Vercel pelo `httpUrl` | troque pela ponte documentada pela Vercel: `{"command": "npx", "args": ["mcp-remote", "https://mcp.vercel.com"]}` |
| Codex ignora o arquivo do projeto | marque o projeto como confiável |
| Servidor aparece em dobro no Grok | o Grok também lê o `.mcp.json`; com o mesmo nome, vale o `.grok/config.toml` |
| Ferramentas não aparecem | reinicie a sessão da IDE |

## Handoff
- Supabase conectado: `@dev *db-setup` (chapéu Dados).
- Vercel conectada e projeto ainda não ligado: `@devops *vercel-setup`.
- Diagnóstico geral do ambiente: `@devops *health-check`.
