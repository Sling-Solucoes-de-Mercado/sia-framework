---
id: vercel-setup
title: Ligar o projeto à Vercel
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'team (opcional): slug do time na Vercel; padrão: integrations.vercel.team'
  - 'project (opcional): slug do projeto na Vercel; padrão: integrations.vercel.project'
outputs:
  - '.vercel/project.json local (não versionado) com orgId e projectId'
  - 'integrations.vercel atualizado no core-config, com confirmação'
  - 'Branch de produção conferida, estratégia de deploy escolhida e variáveis de ambiente cadastradas por escopo'
depends_on:
  tasks: [configure-ci.md]
  templates: [github-actions-cd.yml]
  data: [vercel-patterns.md]
next: [vercel-deploy, configure-ci, setup-mcp]
source: [new]
---

# Ligar o projeto à Vercel

## Objetivo
Ligar o repositório a um projeto da Vercel, conferir a branch de produção, escolher a estratégia de deploy e cadastrar as variáveis de ambiente por escopo (development, preview, production) sem expor segredos. As regras de fundo estão em `data/vercel-patterns.md`.

## Quando usar
- Primeiro deploy de um projeto na Vercel.
- Projeto que já existe na Vercel e precisa ser ligado a este repositório ou a outra máquina.
- Revisão de variáveis de ambiente, da branch de produção ou da estratégia de deploy.

## Pré-condições
- [ ] CLI da Vercel instalada: `vercel --version` (instalação: `npm i -g vercel`)
- [ ] Login feito: `vercel whoami`; senão, o usuário roda `vercel login`
- [ ] Repositório git com remoto no GitHub, quando a estratégia for integração Git ou Actions
- [ ] Acesso ao time da Vercel dono do projeto

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | usa `integrations.vercel` e a integração Git; pergunta só os dados que faltam e as confirmações | projeto simples, valores já no core-config |
| Interativo (padrão) | decide link, estratégia e cada variável com o usuário | primeira configuração |

## Passos

### 1. Contexto
1. Leia `integrations.vercel` (`enabled`, `team`, `project`, `productionBranch`).
2. Já existe `.vercel/project.json`? Mostre `orgId` e `projectId` e pergunte:
   1. Manter o link atual
   2. Ligar de novo (outro time ou projeto)
   3. Cancelar

### 2. Ligar o projeto
- Interativo: `vercel link` (pergunta o time e se usa um projeto existente ou cria um novo).
- Com time e projeto conhecidos: `vercel link --yes --project {project} --scope {team}`.
- Monorepo com integração Git: `vercel link --repo` liga todos os projetos do repositório (recurso marcado como alpha); senão, rode o link na pasta de cada app.
- Resultado: `.vercel/project.json` com `orgId` e `projectId`. Confira que `.vercel` está no `.gitignore` (a CLI costuma incluir); se não estiver, acrescente.
- Registre `team` e `project` em `integrations.vercel` no core-config, com confirmação.

### 3. Branch de produção
1. A Vercel usa `main`; sem ela, `master`; sem as duas, a branch padrão do repositório.
2. Compare com `integrations.vercel.productionBranch`. Se divergirem, pergunte qual vale:
   1. Ajustar na Vercel: Project Settings → Environments → Production → Branch Tracking (passo feito pelo usuário no painel)
   2. Ajustar o core-config para a branch da Vercel
3. Lembre: tudo o que entra nessa branch vai para produção. Ela precisa de proteção de branch (`*setup-github`).

### 4. Estratégia de deploy
**Ponto de elicitação:**
1. Integração Git (recomendada): preview a cada push e PR, com a URL comentada no PR; produção no merge da branch de produção. Ligue com `vercel git connect`, que usa o remoto do git local.
2. GitHub Actions: CD por `templates/github-actions-cd.yml` (passo 8). Desligue o deploy automático da integração Git com `{"git": {"deploymentEnabled": false}}` no `vercel.json`, senão os dois deployam o mesmo commit.
3. Só CLI: sem integração Git; todo deploy passa por `*vercel-deploy`.

Registre a escolha em `agents/devops/MEMORY.md` (seção Decisões), com a data.

### 5. Variáveis de ambiente
1. **Inventário.** Junte os nomes do `.env.example` do projeto e do código (`grep -rhoE "process\.env\.[A-Z0-9_]+" src` e equivalentes). Compare com `vercel env ls`.
2. **Classificação.** Monte a tabela e confirme com o usuário:

| Variável | Pública | Development | Preview | Production | Tipo |
|----------|---------|-------------|---------|------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | sim | ✅ | ✅ | ✅ | Config |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | ✅ | ✅ | ✅ | Config |
| `SUPABASE_SECRET_KEY` | não | ✅ | ✅ | ✅ | Secret |

   - Prefixo público só para dado público (`data/vercel-patterns.md`, seção 3.4).
   - Recurso com ambiente separado (banco de produção, chave de pagamento real) recebe valor próprio em production; preview e development apontam para recursos de teste.
   - Valor de uma branch específica de preview: `vercel env add {NOME} preview {branch}`.
3. **Cadastro.**
   - Valor público e não sensível: o agente pode rodar `vercel env add {NOME} {ambiente} --value "{valor}" --no-sensitive --yes`.
   - Segredo: o usuário roda no próprio terminal `vercel env add {NOME} {ambiente}` (a CLI pede o valor; em preview e production o padrão já é Secret) ou `vercel env add {NOME} {ambiente} < {arquivo}`. Nunca `echo valor |` (fica no histórico do shell) e nunca cole o segredo na conversa.
4. **Conferência.** `vercel env ls` mostra nomes e ambientes; Secrets não têm valor legível.
5. Lembre: variável nova ou alterada só vale em deploys novos.

### 6. Desenvolvimento local
- `vercel env pull` grava as variáveis de Development em `.env.local` e o inclui no `.gitignore`. Secrets chegam como placeholder e precisam de valor local.
- Sem arquivo: `vercel env run -- npm run dev`.

### 7. Proteção dos previews
Recomende ao usuário, no painel (Project Settings → Deployment Protection), a Standard Protection com Vercel Authentication. Preview público só com decisão explícita, registrada na memória do agente.

### 8. CD pelo GitHub Actions (estratégia 2)
1. Execute `configure-ci.md` incluindo o CD (`templates/github-actions-cd.yml`).
2. Token: o usuário cria em vercel.com/account/tokens, com escopo de projeto, e grava no próprio terminal com `gh secret set VERCEL_TOKEN`.
3. IDs do `.vercel/project.json`: `gh secret set VERCEL_ORG_ID --body "{orgId}"` e `gh secret set VERCEL_PROJECT_ID --body "{projectId}"`.
4. Commit operacional do `vercel.json` com `git.deploymentEnabled: false` e do workflow, enviado por `*push`.

### 9. Fechar
1. Com confirmação, registre `integrations.vercel.enabled: true`.
2. Ofereça `*setup-mcp vercel`.
3. Avise: num projeto novo, o primeiro deploy é sempre de produção, mesmo sem `--prod`. Crie-o pela integração Git a partir da branch de produção ou por `*vercel-deploy production`, com todos os portões.

## Saída
- `.vercel/project.json` local (fora do git).
- `integrations.vercel` no core-config (`team`, `project`, `productionBranch`, `enabled`).
- Variáveis cadastradas por ambiente (só nomes no resumo), estratégia de deploy registrada e, na estratégia 2, workflow e segredos no GitHub.

## Critérios de conclusão
- [ ] Projeto ligado e `.vercel` fora do git
- [ ] Branch de produção igual na Vercel e no core-config
- [ ] Estratégia de deploy escolhida e registrada
- [ ] Todas as variáveis do inventário cadastradas nos ambientes certos, sem segredo com prefixo público
- [ ] Nenhum valor de segredo passou pela conversa
- [ ] `integrations.vercel.enabled` ajustado com confirmação

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `vercel` sem login | o usuário roda `vercel login` e repete |
| Time errado no link | `vercel link` de novo com `--scope {team}` |
| `vercel git connect` sem remoto | configure o remoto (`*environment-bootstrap` ou `*setup-github`) e repita |
| Variável pública com segredo | não cadastre; renomeie sem prefixo público e, se já vazou, revogue e gere outro segredo |
| Deploy em dobro (integração Git e Actions) | `git.deploymentEnabled: false` no `vercel.json` |
| Monorepo com raiz errada | ajuste o Root Directory do projeto no painel e ligue de novo na pasta do app |

## Handoff
- Primeiro preview: `@devops *vercel-deploy preview`.
- CD pelo GitHub Actions: `@devops *configure-ci`.
- MCP da Vercel nas IDEs: `@devops *setup-mcp vercel`.
