---
id: vercel-deploy
title: Deploy na Vercel (preview ou produção)
agent: devops
elicit: true
modes: [yolo, interactive]
inputs:
  - 'ambiente (opcional): preview | production; padrão: preview'
  - 'storyId (opcional): story entregue; exigido em produção quando não há pedido explícito do usuário'
  - '--staged (opcional, produção): cria o deploy sem apontar os domínios e promove depois da verificação'
outputs:
  - 'Deploy na Vercel com URL, resultado da verificação (inspect e logs) e plano de rollback no resumo'
depends_on:
  tasks: [pre-push.md]
  templates: [agent-handoff-tmpl.yaml]
  data: [vercel-patterns.md]
next: [close-story, release]
source: [new]
---

# Deploy na Vercel (preview ou produção)

## Objetivo
Publicar um deploy de preview (padrão) ou de produção na Vercel, verificar o resultado e deixar o rollback pronto. Deploy de produção é exclusivo do `@devops` (Constitution, Artigo II) e só sai com os portões do passo 3.

## Quando usar
- Preview: validar uma branch antes do PR ou do merge, ou compartilhar para revisão.
- Produção: entrega de story `Done`, hotfix ou release, quando o deploy não é automático, ou quando o risco pede deploy em etapas.
- Com integração Git ou CD ativos, a produção sai no merge: use esta task para acompanhar (passo 6) e, se preciso, reverter (passo 7).
- Nunca use para contornar o QA gate.

## Pré-condições
- [ ] `vercel whoami` autenticado (na CI: variável `VERCEL_TOKEN`)
- [ ] Projeto ligado: `.vercel/project.json`, ou `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` definidos juntos; senão, `*vercel-setup`
- [ ] `integrations.vercel.enabled: true`
- [ ] Árvore de trabalho limpa (`git status --porcelain` vazio)

## Modos

| Modo | Interação | Uso |
|------|-----------|-----|
| YOLO | preview sem perguntas; produção ainda exige a confirmação do passo 4 | previews frequentes |
| Interativo (padrão) | confirma alvo, build e verificação | produção e primeiros deploys |

## Passos

### 1. Contexto
1. Ambiente: argumento; padrão `preview`.
2. Branch e commit: `git branch --show-current` e `git rev-parse --short HEAD`.
3. Produção atual: `vercel ls --prod`. Anote a URL do deploy de produção mais recente: ela é o alvo do rollback.
4. Nenhum deploy listado → **o primeiro deploy do projeto será de produção, mesmo sem `--prod`**. Trate o pedido como produção (passos 3 a 5).

### 2. Preview
1. Build verificado (recomendado): `vercel pull --yes --environment=preview` e `vercel build`. Falhou → pare e encaminhe ao `@dev`.
2. Deploy: `vercel deploy --prebuilt`. Se o build depende das variáveis de sistema da Vercel ou de variáveis do tipo Secret (nenhuma das duas chega ao build local), use `vercel deploy`, que compila na Vercel.
3. Guarde a URL impressa na saída padrão e siga para o passo 6.

### 3. Portões de produção
Todos obrigatórios; qualquer falha bloqueia:

| Portão | Verificação |
|--------|-------------|
| Autoridade | agente ativo é o `@devops` |
| Story | story `Done` com QA gate `PASS`, `CONCERNS` ou `WAIVED` (passo 5 de `pre-push.md`); sem story, só com pedido explícito do usuário, citado no resumo |
| Branch | HEAD na branch de produção (`integrations.vercel.productionBranch`) e igual ao remoto: `git rev-parse HEAD` igual a `git rev-parse origin/{branch}` (o que vai ao ar já passou pelo `*push`) |
| Build | `vercel pull --yes --environment=production` e `vercel build --prod` sem erro |
| Preview | preview verificado do mesmo commit; sem ele, avise e peça confirmação explícita |
| Rollback | URL da produção atual anotada (passo 1) |

### 4. Confirmação
```text
━━━ Deploy de PRODUÇÃO na Vercel ━━━
Projeto:   {team}/{project}
Commit:    a1b2c3d (main = origin/main)
Story:     2.1 Done | Gate PASS
Build:     vercel build --prod ✅
Preview:   https://{preview}.vercel.app ✅ verificado
Comando:   vercel deploy --prebuilt --prod
Rollback:  vercel rollback → volta para https://{producao-atual}.vercel.app
```

**Ponto de elicitação:**
1. Publicar em produção
2. Publicar em etapas (sem apontar os domínios; promover depois da verificação)
3. Cancelar

A confirmação vale também no modo YOLO.

### 5. Publicar em produção
- Padrão: `vercel deploy --prebuilt --prod`, usando o build verificado no passo 3.
- Build na Vercel (framework que depende de variáveis de sistema no build): `vercel deploy --prod`.
- Em etapas: `vercel deploy --prebuilt --prod --skip-domain`, verificação do passo 6 na URL do deploy e, com nova confirmação, `vercel promote {url}`.
- Promover um preview já verificado: `vercel promote {url-do-preview}`. A Vercel pede confirmação e gera um build novo com as variáveis de produção; não use `--yes` para pular essa pergunta.
- Guarde a URL impressa na saída padrão.

### 6. Verificar
1. Status: `vercel inspect {url} --wait --timeout 5m`. Código de saída 124 = tempo esgotado com o deploy ainda em andamento; repita.
2. Falha de build: `vercel inspect {url} --logs`.
3. Erros de runtime: `vercel logs --deployment {url} --query 'level:error' --since 30m`.
4. Produção: `vercel logs requests --query 'httpStatus >= 500' --since 15m` e smoke test dos fluxos críticos no domínio. Previews com Vercel Authentication exigem login no navegador.
5. Não use as opções removidas do `vercel logs` (`--level`, `--status-code`, `--expand`).
6. Produção com erro → passo 7 imediatamente, com confirmação.

### 7. Plano de rollback
Inclua sempre no resumo de produção:

| Situação | Ação |
|----------|------|
| Produção quebrada | `vercel rollback` volta ao deploy de produção anterior; `vercel rollback {url}` escolhe outro (Hobby: só o anterior; Pro e Enterprise: qualquer deploy que já foi produção) |
| Acompanhar | `vercel rollback status` |
| Depois do rollback | a Vercel desliga a atribuição automática dos domínios de produção: novos pushes não entram no ar. Corrija pelo fluxo normal (story, portão, deploy) e normalize com `vercel promote {url-corrigida}` |
| Banco de dados | o rollback não desfaz migrações: `@dev [Dados] *db-rollback` |
| Variáveis de ambiente | o rollback não aplica variáveis alteradas depois; confira se a correção depende delas |

### 8. Registrar
1. Resumo: ambiente, URL, commit, story, resultado da verificação e plano de rollback.
2. Produção que encerra a entrega de uma story: grave um handoff em `.sia/handoffs/` com `templates/agent-handoff-tmpl.yaml` para o `@pm` (`last_command: vercel-deploy`).

## Saída
Deploy na Vercel (URL), verificação registrada no resumo e, em produção, plano de rollback e handoff para o `@pm`.

## Critérios de conclusão
- [ ] URL do deploy apresentada e `vercel inspect` com o deploy pronto
- [ ] Produção: todos os portões do passo 3 cumpridos e confirmação explícita registrada
- [ ] Logs sem erro novo depois do deploy, ou rollback executado
- [ ] Plano de rollback com a URL de produção anterior

## Tratamento de erros

| Situação | Ação |
|----------|------|
| `vercel` sem login | o usuário roda `vercel login` e repete |
| Projeto não ligado | `*vercel-setup` |
| Build falhou | `vercel inspect {url} --logs`; correção com o `@dev` |
| Build quebrado só com `--prebuilt` | use `vercel deploy` (build na Vercel) |
| Push na produção não entra no ar | o projeto está em rollback: `vercel promote {url}` |
| Hobby e rollback para deploy antigo | só o anterior é permitido; para outro alvo, publique de novo o commit desejado pelo fluxo normal |
| Variável nova não apareceu | variáveis só valem em deploys novos; faça outro deploy |

## Handoff
- Preview aprovado: `@devops *create-pr {storyId}` ou merge do PR.
- Produção publicada: `@pm *close-story {storyId}`; marco de versão: `@devops *release`.
- Falha de código: `@dev *apply-qa-fixes {storyId}`.
