# Padrões da Vercel no SIA

> Base de conhecimento do `@devops` para `*vercel-setup`, `*vercel-deploy`, `*configure-ci` (CD) e `*setup-mcp vercel`.
> Verificado em 2026-10-16 na documentação oficial (fontes no fim). Comandos da CLI `vercel` v64 ou mais nova.

## 1. Ambientes

| Ambiente | Como o deploy nasce | Variáveis usadas |
|----------|---------------------|------------------|
| Development | servidor local do framework, com `vercel env pull` ou `vercel env run` | Development |
| Preview | push em branch que não é a de produção (integração Git) ou `vercel` / `vercel deploy` | Preview, mais as específicas da branch |
| Production | push ou merge na branch de produção, `vercel --prod` ou `vercel promote` | Production |
| Customizado | `vercel deploy --target={nome}` | do ambiente customizado |

- O **primeiro deploy** de um projeto novo é sempre de produção, mesmo sem `--prod`. Trate-o como produção.
- Branch de produção: `main`; sem ela, `master`; sem as duas, a branch padrão do repositório. Para mudar: Project Settings → Environments → Production → Branch Tracking. No SIA, ela precisa ser igual a `integrations.vercel.productionBranch`.
- Trocar a branch de produção não tira do ar o deploy atual: ele fica até o próximo push ou merge na branch nova.

## 2. Caminhos de deploy (escolha um)

| Caminho | Como funciona | Quando usar |
|---------|---------------|-------------|
| Integração Git (Vercel for GitHub) | deploy de cada push; URL do preview comentada no PR; produção no merge da branch de produção | padrão da maioria dos projetos |
| GitHub Actions (`templates/github-actions-cd.yml`) | `vercel pull` → `vercel build` → `vercel deploy --prebuilt`, com segredos no GitHub | build na CI ou aprovação de produção pelo GitHub |
| CLI manual (`*vercel-deploy`) | deploy a partir da máquina do `@devops` | hotfix, deploy em etapas, projeto sem Git conectado |

- Com Actions, desligue o deploy automático da integração Git, senão os dois deployam o mesmo commit: `{"git": {"deploymentEnabled": false}}` no `vercel.json`. Também aceita objeto por branch, com glob: `{"git": {"deploymentEnabled": {"dev": false}}}`.
- Build na Actions sem `--prebuilt` faz a Vercel compilar de novo: dois builds do mesmo artefato.
- Com `--prebuilt`, as variáveis de sistema da Vercel não existem no build, porque ele roda fora da Vercel. Variáveis do tipo Secret também não são legíveis pela CLI (seção 3.2). Build que depende delas deve rodar na Vercel (`vercel deploy`).

## 3. Variáveis de ambiente

### 3.1 Escopo
- Toda variável pertence a um ou mais ambientes: development, preview, production ou customizado.
- Preview aceita valor por branch: `vercel env add NOME preview {branch}`. A variável da branch sobrepõe a de preview geral com o mesmo nome.
- Mudança de variável **não** afeta deploys existentes; só vale para deploys novos. Depois de mudar, faça novo deploy.
- Limite: 64 KB de variáveis por deploy (5 KB por variável em funções com runtime edge).

### 3.2 Tipos: Config e Secret

| Alvo | Tipo padrão no `vercel env add` |
|------|---------------------------------|
| Production | Secret |
| Preview | Secret |
| Development | Config |
| Customizado | Secret |

- Secret é só escrita depois de salvo: ninguém lê o valor de volta. O `vercel env pull` mantém o valor que já existe no arquivo local ou grava um placeholder.
- Variáveis com prefixo público (`NEXT_PUBLIC_`) são guardadas como Config.
- `--sensitive`, `--no-sensitive` ou `--type secret|config` forçam o tipo.

### 3.3 Comandos

| Ação | Comando |
|------|---------|
| Listar | `vercel env ls [ambiente] [branch]` |
| Adicionar (o valor é pedido no terminal) | `vercel env add NOME production` |
| Adicionar lendo de arquivo | `vercel env add NOME production < arquivo` |
| Adicionar valor público não secreto | `vercel env add NEXT_PUBLIC_X production --value "..." --no-sensitive --yes` |
| Atualizar | `vercel env update NOME production` |
| Remover | `vercel env rm NOME production` |
| Baixar para o desenvolvimento local | `vercel env pull` (grava `.env.local`) ou `vercel env pull --environment=preview` |
| Rodar um comando com as variáveis sem gravar arquivo | `vercel env run -- npm run dev` (`-e preview` ou `-e production`) |
| Preparar build local | `vercel pull --environment=preview` ou `production` (grava `.vercel/.env.{ambiente}.local` e `.vercel/project.json`) |

- Nunca use `echo valor | vercel env add ...` com segredo: o valor fica no histórico do shell.
- Segredo é digitado pelo usuário no próprio terminal. O agente não pede nem recebe o valor na conversa.

### 3.4 Públicas × secretas (`NEXT_PUBLIC_*`)
- O Next.js embute no build o valor de `process.env.NEXT_PUBLIC_*` no JavaScript enviado ao navegador. Depois do build, o valor fica congelado.
- Sem o prefixo, a variável só existe no servidor; no código de cliente ela vira string vazia.
- Regra do SIA: prefixo público só para dado público (URL do Supabase, chave publicável `sb_publishable_`, IDs de analytics). Chave secreta (`sb_secret_` ou `service_role` legado), tokens e senhas nunca levam prefixo público. O `*pre-push` bloqueia nomes públicos com `SECRET`, `SERVICE_ROLE`, `PRIVATE`, `TOKEN` ou `PASSWORD`.
- Variável pública alterada exige novo build: não basta reiniciar.

### 3.5 Variáveis de sistema
- `VERCEL_ENV` (production, preview ou development), `VERCEL_URL` (domínio do deploy, sem `https://`) e `VERCEL_GIT_COMMIT_REF` (branch do commit).
- Exigem a opção do projeto que expõe as variáveis de sistema. `VERCEL_URL` não funciona junto com a Standard Protection.
- A Vercel cria versões com o prefixo do framework (ex.: `NEXT_PUBLIC_VERCEL_ENV`) em preview e produção, mas não no desenvolvimento local.

## 4. Preview × produção: boas práticas
1. Todo trabalho passa por preview antes de produção.
2. Verifique o preview do mesmo commit: `vercel inspect`, logs e smoke test dos fluxos críticos.
3. Produção só a partir da branch de produção, com build verificado e story `Done` com QA gate aprovado (ou pedido explícito do usuário). Deploy de produção é exclusivo do `@devops` (Constitution, Artigo II).
4. Deploy em etapas quando o risco é alto: `vercel --prod --skip-domain` cria o deploy de produção sem apontar os domínios; depois de verificar, `vercel promote {url}`.
5. Promover um preview (`vercel promote {url-preview}`) gera um build novo e completo com as variáveis de produção. Variáveis de preview nunca vão para produção.
6. Proteja os previews: a Standard Protection protege todos os domínios menos os de produção, e a Vercel Authentication vem ligada por padrão em todos os deploys menos o de produção mais recente.

## 5. Verificação e observabilidade

| Objetivo | Comando |
|----------|---------|
| Detalhes e status do deploy | `vercel inspect {url-ou-id}` |
| Esperar o deploy terminar | `vercel inspect {url} --wait --timeout 5m` (sai com código 124 se o tempo acabar) |
| Logs de build | `vercel inspect {url} --logs` |
| Logs de runtime do deploy | `vercel logs --deployment {url-ou-id}` |
| Erros recentes de produção | `vercel logs --environment production --query 'level:error' --since 1h` |
| Requisições 5xx | `vercel logs requests --query 'httpStatus >= 500' --since 30m` |
| Deploys recentes | `vercel ls` (`--prod` para só produção) |

- O `vercel logs` mudou na v64: `--level`, `--status-code`, `--expand` e o deploy posicional foram removidos e falham com erro de uso; `--follow` ficou obsoleto. Algumas páginas antigas da documentação ainda usam essas opções.
- Em `vercel deploy` e `vercel redeploy`, a saída padrão (stdout) é sempre a URL do deploy.

## 6. Rollback

| Situação | Comando |
|----------|---------|
| Voltar ao deploy de produção anterior | `vercel rollback` ou `vercel rollback {url-ou-id}` |
| Acompanhar | `vercel rollback status` |
| Desfazer o rollback e voltar ao normal | `vercel promote {url-ou-id}` |

- Hobby: volta só para o deploy de produção imediatamente anterior. Pro e Enterprise: qualquer deploy que já foi de produção.
- Depois do rollback, a Vercel **desliga a atribuição automática dos domínios de produção**: novos pushes na branch de produção não entram no ar até um `vercel promote`.
- O rollback não aplica variáveis de ambiente alteradas depois (volta o build antigo como era) e reverte cron jobs ao estado daquele deploy. Migração de banco não volta sozinha: use o rollback do `@dev [Dados]`.
- Antes de todo deploy de produção, anote a URL do deploy de produção atual (`vercel ls --prod`): ela é o alvo do rollback.

## 7. Tokens, link e CI
- Tokens: crie em vercel.com/account/tokens, com escopo Full Account, Team ou Project. Escolha o menor escopo. O valor aparece uma única vez; tokens pessoais começam com `vcp_`.
- CI: passe o token pela variável `VERCEL_TOKEN` (a doc da CLI recomenda isso para não expor o token na lista de processos e nos logs) e defina `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` juntos.
- `vercel link` cria `.vercel/project.json` com `orgId` e `projectId`. A pasta `.vercel` não é versionada (a CLI a inclui no `.gitignore`; confira).
- `vercel env pull` inclui `.env.local` no `.gitignore`.
- `vercel git connect` liga o projeto ao repositório do remoto git local.

## 8. MCP da Vercel
- Endpoint `https://mcp.vercel.com`, só OAuth e só para clientes revisados pela Vercel. Formato por IDE e ressalvas em `data/mcp-servers.yaml`; configuração por `*setup-mcp vercel`.
- O MCP e a CLI têm autenticações separadas: o login OAuth do MCP não substitui o `vercel login`.

## 9. Armadilhas comuns

| Armadilha | Prevenção |
|-----------|-----------|
| Primeiro deploy via CLI cai em produção | trate como produção ou deixe a integração Git criar o primeiro deploy pela branch de produção |
| Variável alterada e o site não mudou | faça novo deploy; variável pública exige novo build |
| Segredo com prefixo `NEXT_PUBLIC_` | renomeie, revogue o segredo e gere outro |
| Deploy duplicado (integração Git e Actions) | `"git": {"deploymentEnabled": false}` no `vercel.json` |
| Push na branch de produção não entra no ar | o projeto está em rollback: `vercel promote` |
| Build com `--prebuilt` sem as variáveis de sistema | use `vercel deploy` (build na Vercel) |
| Token de conta inteira na CI | token com escopo de projeto |
| Opções antigas do `vercel logs` | use `--query` e `--deployment` |

## Fontes
- Ambientes e primeiro deploy: https://vercel.com/docs/cli/deploying-from-cli
- `vercel deploy`: https://vercel.com/docs/cli/deploy
- `vercel env`: https://vercel.com/docs/cli/env
- `vercel pull` e `vercel build`: https://vercel.com/docs/cli/pull e https://vercel.com/docs/cli/build
- Variáveis de ambiente: https://vercel.com/docs/environment-variables (tipos: https://vercel.com/docs/environment-variables/sensitive-environment-variables; sistema: https://vercel.com/docs/environment-variables/system-environment-variables)
- `NEXT_PUBLIC_`: https://nextjs.org/docs/app/guides/environment-variables
- Branch de produção e integração Git: https://vercel.com/docs/git e https://vercel.com/docs/git/vercel-for-github
- `git.deploymentEnabled`: https://vercel.com/docs/project-configuration/git-configuration
- GitHub Actions: https://vercel.com/kb/guide/how-can-i-use-github-actions-with-vercel
- Promote e rollback: https://vercel.com/docs/cli/promote, https://vercel.com/docs/cli/rollback e https://vercel.com/docs/instant-rollback
- `vercel inspect` e `vercel logs`: https://vercel.com/docs/cli/inspect e https://vercel.com/docs/cli/logs
- Tokens: https://vercel.com/docs/accounts/access-tokens; opções globais da CLI: https://vercel.com/docs/cli/global-options
- Deployment Protection: https://vercel.com/docs/deployment-protection
- MCP: https://vercel.com/docs/agent-resources/vercel-mcp e https://vercel.com/docs/cli/mcp
