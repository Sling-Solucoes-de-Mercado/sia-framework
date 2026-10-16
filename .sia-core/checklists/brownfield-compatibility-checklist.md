# Checklist: Compatibilidade Brownfield

> Usado por: `@dev` [Arquitetura] ao adotar o SIA em um projeto existente (brownfield), com a task execute-checklist: antes, durante e depois da instalação.
> Modo: interativo (seção a seção) ou YOLO (relatório completo de uma vez).

Garante que adotar o SIA não quebre nada no projeto existente: a instalação só acrescenta arquivos, preserva configurações e pode ser desfeita.

[[LLM: INICIALIZAÇÃO

1. Confirme com o usuário que o projeto é brownfield (há código, configuração ou documentação anteriores ao SIA).
2. Rode as seções 1 a 4 antes da instalação, 5 a 7 durante e 8 a 10 depois.
3. Não execute operações destrutivas. Em qualquer conflito com arquivo existente, pare e apresente as opções numeradas ao usuário.
4. Push para o remoto é exclusivo do @devops: peça `@devops *push` quando o backup remoto for necessário.

Marque cada item como [x] verificado, [ ] pendente ou [N/A] não se aplica, com justificativa para [ ] e [N/A].]]

## 1. Controle de Versão (antes)

- [ ] Todas as mudanças estão commitadas
- [ ] Branch de trabalho criada a partir da main/master
- [ ] Backup remoto verificado (push feito pelo @devops antes da migração)

## 2. Preservação da Configuração Existente (antes)

- [ ] Arquivos `.env` copiados em backup (o SIA nunca os sobrescreve)
- [ ] Scripts do `package.json` preservados
- [ ] Configuração de lint existente detectada (`.eslintrc`, `.prettierrc`)
- [ ] Workflows de CI/CD inventariados (`.github/workflows`)

## 3. Compatibilidade de Dependências (antes)

- [ ] Versão do Node.js compatível (18 ou superior)
- [ ] Nenhuma dependência global conflitante
- [ ] Lockfile preservado (`package-lock.json` ou `yarn.lock`)

## 4. Análise da Estrutura de Pastas (antes)

- [ ] Situação da pasta `docs/` verificada (vazia ou com conteúdo)
- [ ] `.sia-core/` ausente (instalação nova)
- [ ] Nenhum conflito de nomes com as pastas do SIA (`.sia-core/`, `.sia/`, `squads/`)
- [ ] Conteúdo existente em `.claude/`, `.codex/`, `.gemini/` e `.grok/` inventariado antes do `sia sync`

## 5. Operações Não Destrutivas (durante)

- [ ] O SIA cria arquivos novos e nunca sobrescreve os existentes
- [ ] Conflitos de merge apresentados para decisão do usuário
- [ ] Em conflito, os originais são preservados com sufixo `.backup`

## 6. Estratégia de Merge da Configuração (durante)

- [ ] Entradas existentes do `.gitignore` preservadas e as do SIA acrescentadas (ex.: `.sia/`)
- [ ] `tsconfig` existente estendido, não substituído
- [ ] Regras de ESLint mescladas, não sobrescritas

## 7. Pontos de Rollback (durante)

- [ ] Hash do commit anterior à migração registrado
- [ ] Arquivos do SIA claramente identificáveis (removíveis sem resíduo)
- [ ] Nenhuma modificação no código-fonte existente durante a instalação

## 8. Funcionalidade Existente (depois)

- [ ] `npm test` passa (se havia testes antes)
- [ ] `npm run build` conclui (se havia build antes)
- [ ] A aplicação inicia normalmente

## 9. Integração do SIA (depois)

- [ ] `sia doctor` reporta o ambiente saudável
- [ ] `sia sync --check` sem divergência entre fonte e projeções
- [ ] A ativação dos agentes funciona (`@pm`, `@dev` etc.)
- [ ] A documentação existente não foi duplicada

## 10. Verificação de Rollback (depois)

- [ ] `git diff HEAD~1` mostra só acréscimos do SIA
- [ ] `git checkout HEAD~1 -- .` restauraria o estado anterior ao SIA
- [ ] Nenhum processo ou arquivo órfão do SIA

## Matriz de Compatibilidade

| Configuração existente | Comportamento do SIA | Ação do usuário |
|------------------------|----------------------|-----------------|
| `.eslintrc.*` | Detecta e preserva | Nenhuma |
| `.prettierrc.*` | Detecta e preserva | Nenhuma |
| `tsconfig.json` | Estende (não substitui) | Revisar o extends |
| `jest.config.*` | Detecta e preserva | Nenhuma |
| `docs/*.md` | Pula (não sobrescreve) | Mesclar manualmente, se necessário |
| `.github/workflows/*` | Só inventaria | Decidir a integração com o @devops (`*configure-ci`) |
| Scripts do `package.json` | Preserva todos | Nenhuma |

## Procedimento de Rollback

Se a migração falhar ou não for desejada, escolha com o usuário:

```bash
# Opção 1: rollback completo para o estado anterior à migração
git checkout HEAD~1 -- .

# Opção 2: remover só os arquivos do SIA
rm -rf .sia-core/ .sia/
rm -rf docs/architecture/ docs/prd/ docs/stories/   # só se foram criadas pelo SIA
# Revise e reverta as entradas do SIA no .gitignore e nas projeções das IDEs

# Opção 3: rollback parcial (mantém a documentação, remove o framework)
rm -rf .sia-core/ .sia/
```

Antes da migração, rode `sia doctor`. Depois, rode `sia doctor`, `npm test` (se houver testes) e `npm run build` (se houver build).

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1 a 4. Antes da migração | | |
| 5 a 7. Durante a migração | | |
| 8. Funcionalidade existente | | |
| 9. Integração do SIA | | |
| 10. Verificação de rollback | | |

**Decisão:** siga com a instalação só com todos os itens das seções 1 a 4 marcados (ou [N/A] justificado). Se qualquer item das seções 8 a 10 falhar depois da instalação, execute o procedimento de rollback e registre o motivo antes de tentar de novo.
