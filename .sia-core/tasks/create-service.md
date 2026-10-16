---
id: create-service
title: Criar um serviço a partir do template
agent: dev
hat: dev
elicit: true
inputs:
  - 'nome (obrigatório): kebab-case (^[a-z][a-z0-9-]*$), único no destino'
  - 'tipo, autenticação, descrição, variáveis de ambiente e destino: coletados na elicitação'
outputs:
  - '{destino}/{nome}/ com README.md, index.ts, types.ts, errors.ts, package.json, tsconfig.json, jest.config.js, __tests__/index.test.ts e client.ts (só api-integration)'
  - 'Entradas novas no .env.example do projeto, quando houver variáveis'
  - 'File List da story atualizada e commit local feat: ... [Story {storyId}]'
depends_on:
  templates: [service/]
next: [develop, run-tests]
source: [create-service.md]
---

# Criar um serviço a partir do template

## Objetivo

Gerar um serviço TypeScript padronizado (tipos, erros, fábrica, testes, configuração e documentação) a partir de `templates/service/`, com cliente HTTP resiliente quando o serviço integra uma API externa.

## Quando usar

- Uma task da story pede um serviço novo (integração com API externa, utilitário interno ou ferramenta para agentes de IA do projeto).
- Recomendação de `*analyze-codebase` para uma feature nova.
- Não use para: componente de UI (`*ux-build-component`), mudança em serviço existente (`*develop`).

## Pré-condições

- [ ] Templates presentes em `.sia-core/templates/service/` (`README.md.hbs`, `index.ts.hbs`, `types.ts.hbs`, `errors.ts.hbs`, `client.ts.hbs`, `package.json.hbs`, `tsconfig.json`, `jest.config.js`, `__tests__/index.test.ts.hbs`).
- [ ] Story associada em `InProgress` (Artigo III); o `storyId` entra no contexto do template. Sem story: WARN e só continue com confirmação explícita.
- [ ] Nome em kebab-case e sem serviço homônimo no destino.

## Passos

### 1. Elicitar os dados

**Ponto de elicitação:** pergunte em ordem, com opções numeradas:

1. **Nome** do serviço (kebab-case, ex.: `github-api`, `file-processor`). Inválido ou já existente: repita a pergunta com o erro.
2. **Tipo:**
   1. `api-integration`: cliente de API externa com limite de taxa, retentativa e autenticação (gera `client.ts`)
   2. `utility` (padrão): utilitário interno
   3. `agent-tool`: ferramenta usada por agentes de IA do projeto
3. **Autenticação:** 1. Sim (configuração de credenciais e cabeçalhos seguros) 2. Não (padrão).
4. **Descrição** (até 200 caracteres; vai para o README e para o JSDoc).
5. **Variáveis de ambiente** (lista separada por vírgula ou "nenhuma", ex.: `API_KEY, BASE_URL, TIMEOUT_MS`). Para cada uma: obrigatória? sensível (não aparece em `getConfig()`)? valor de exemplo?
6. Só para `api-integration`: URL base da API; qual variável vai no cabeçalho de autenticação, com o nome do cabeçalho e o prefixo (ex.: `Authorization`, `Bearer`).
7. **Destino:** pasta de serviços definida em `docs/architecture/source-tree.md`. Sem definição, pergunte (sugestão: `services/{nome}/`).

### 2. Verificar duplicidade

Procure no código (grep/glob) um serviço com nome ou responsabilidade parecida: REUSE > ADAPT > CREATE. Encontrou: mostre e pergunte (1. reutilizar, 2. adaptar o existente, 3. criar mesmo assim). No YOLO, registre a decisão e siga.

### 3. Montar o contexto do template

| Variável | Conteúdo |
|----------|----------|
| `serviceName` | Nome em kebab-case |
| `description` | Descrição |
| `isApiIntegration` | `true` quando o tipo é `api-integration` |
| `hasAuth` | Resposta da pergunta de autenticação |
| `apiBaseUrl` | URL base da API (só `api-integration`) |
| `envVars` | Lista de `{ name, description, required, sensitive, example, isAuthHeader, headerName, headerPrefix }` |
| `storyId` | Story associada |
| `generatedAt` | Data da geração (`AAAA-MM-DD`) |

Helpers usados nos templates:

| Helper | Regra | Exemplos |
|--------|-------|----------|
| `pascalCase` | Separa em `-` e `_`, capitaliza cada parte | `github-api` → `GithubApi`; `API_KEY` → `ApiKey` |
| `camelCase` | Igual a `pascalCase`, com a primeira letra minúscula | `github-api` → `githubApi`; `API_KEY` → `apiKey` |
| `kebabCase` | Minúsculas separadas por `-` | `GithubApi` → `github-api`; `API_KEY` → `api-key` |
| `upperCase` | Maiúsculas, com `-` trocado por `_` | `github-api` → `GITHUB_API` |

### 4. Gerar os arquivos

1. Crie `{destino}/{nome}/` e `{destino}/{nome}/__tests__/`.
2. Renderize cada template `.hbs` com o contexto (semântica Handlebars: `{{var}}`, `{{#if}}`, `{{#unless}}`, `{{#each}}`; comentários `{{!-- --}}` somem) e grave sem a extensão `.hbs`. Arquivos estáticos são copiados como estão.

| Template | Arquivo gerado | Quando |
|----------|----------------|--------|
| `README.md.hbs` | `README.md` | sempre |
| `index.ts.hbs` | `index.ts` | sempre |
| `types.ts.hbs` | `types.ts` | sempre |
| `errors.ts.hbs` | `errors.ts` | sempre |
| `client.ts.hbs` | `client.ts` | só `api-integration` |
| `package.json.hbs` | `package.json` | sempre |
| `tsconfig.json` | `tsconfig.json` | sempre (cópia) |
| `jest.config.js` | `jest.config.js` | sempre (cópia) |
| `__tests__/index.test.ts.hbs` | `__tests__/index.test.ts` | sempre |

3. Geração atômica: qualquer falha remove a pasta criada e interrompe a task com o erro.

### 5. Pós-geração

1. Acrescente as variáveis ao `.env.example` do projeto, se ele existir, só com nomes e valores de exemplo (nunca segredos reais).
2. Na pasta do serviço, rode `npm install`, `npm run build` e `npm test`. Falha de instalação ou de build: avise e mostre os erros, sem desfazer a geração.
3. Acrescente os arquivos à File List da story e faça o commit local `feat: cria o serviço {nome} [Story {storyId}]`.

### 6. Resumir

```text
Serviço criado
Serviço: github-api · Tipo: api-integration · Local: services/github-api/
Arquivos: README.md, index.ts, types.ts, errors.ts, client.ts, package.json, tsconfig.json,
          jest.config.js, __tests__/index.test.ts
Próximos passos:
1. Revise o código gerado
2. Implemente execute() em index.ts (hoje lança NOT_IMPLEMENTED)
3. Acrescente testes em __tests__/
4. Ajuste no README os limites de taxa conforme a API real
5. Configure as variáveis de ambiente
```

## Saída

- Pasta do serviço com os arquivos da tabela do passo 4.
- `.env.example` atualizado (quando houver variáveis).
- File List da story e commit local.

## Critérios de conclusão

- [ ] Nome válido e único; tipo, descrição e variáveis definidos
- [ ] Todos os arquivos esperados gerados (`client.ts` só em `api-integration`)
- [ ] Nenhum placeholder `{{...}}` sobrando nos arquivos gerados
- [ ] Build e testes do serviço executados (falhas reportadas)
- [ ] File List e commit local registrados

## Tratamento de erros

| Situação | Ação |
|----------|------|
| Nome fora do kebab-case | Repita a pergunta com o padrão `^[a-z][a-z0-9-]*$` |
| Serviço já existe no destino | Peça outro nome |
| Template ausente em `templates/service/` | PARE: estrutura do framework incompleta (`sia doctor`) |
| Falha durante a geração | Remova a pasta criada e reporte |
| `npm install` falha | Avise e siga sem dependências instaladas |
| Build falha | Avise, mostre os erros e siga |

## Handoff

Próximo passo: continue a story com `*develop {storyId}` (implementar a lógica do serviço) e confira com `*run-tests`.
