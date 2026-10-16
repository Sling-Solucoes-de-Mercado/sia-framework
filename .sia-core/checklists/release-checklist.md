# Checklist: Release

> Usado por: `@devops` em `*release`.
> Modo: interativo (item a item, padrão) ou YOLO (relatório completo de uma vez).

[[LLM: INICIALIZAÇÃO
1. Carregue antes: a análise de versão do passo 3 de `tasks/release.md` (última tag, commits desde ela, bump recomendado), o resultado do `*pre-push` na branch da release e a lista de stories incluídas.
2. Releases são marcos públicos: marque cada item como [x] cumprido, [ ] não cumprido ou [N/A] não se aplica, com observação quando não cumprido ou N/A.
3. Itens (BLOCK) impedem a release. Itens (WARN) exigem confirmação explícita do usuário.
4. Siga o Versionamento Semântico à risca. Na dúvida sobre o tipo de bump, pergunte.]]

## 1. Versão
- [ ] (BLOCK) Número no formato MAJOR.MINOR.PATCH
- [ ] (BLOCK) Tipo de bump coerente com as mudanças: MAJOR para breaking change, MINOR para funcionalidade compatível, PATCH só para correções
- [ ] (BLOCK) Versão atualizada em todos os manifestos do projeto (`package.json`, lockfile e outros que declaram versão)
- [ ] (BLOCK) Tag no formato `v{versão}` ainda inexistente no remoto

## 2. Portões de qualidade
- [ ] (BLOCK) `*pre-push` com PASS (ou CONCERNS confirmado) na branch da release
- [ ] (BLOCK) Todas as stories incluídas com status `Done` e QA gate `PASS`, `CONCERNS` ou `WAIVED`
- [ ] (BLOCK) Nenhuma inspeção reprovada em aberto nas stories incluídas
- [ ] (WARN) Nenhum bug bloqueante conhecido sem registro

## 3. Changelog
- [ ] (BLOCK) `CHANGELOG.md` com a seção `## [{versão}] - AAAA-MM-DD`
- [ ] (BLOCK) Breaking changes marcadas, com instrução de migração
- [ ] (WARN) Todas as mudanças relevantes registradas, com referência a story ou issue
- [ ] (WARN) Seção `Não publicado` esvaziada e links de comparação atualizados

## 4. Documentação
- [ ] (WARN) README reflete o estado atual
- [ ] (WARN) Instruções de instalação e de configuração verificadas
- [ ] (WARN) Guia de migração escrito (quando há breaking change)
- [ ] (WARN) Problemas conhecidos documentados

## 5. Testes pré-release
- [ ] (WARN) Candidata validada em ambiente de preview (deploy de preview da Vercel, quando houver)
- [ ] (WARN) Fluxos críticos verificados (smoke test)
- [ ] (WARN) Caminho de atualização a partir da versão anterior testado
- [ ] (N/A quando não há banco) Migrações de banco aplicáveis e com rollback (`@dev [Dados]`)

## 6. Comunicação
- [ ] (WARN) Notas da release prontas para o GitHub
- [ ] (WARN) Time avisado da release
- [ ] (WARN) Usuários avisados de breaking changes

## 7. Plano de rollback
- [ ] (BLOCK) Versão anterior com tag acessível
- [ ] (BLOCK) Procedimento de rollback descrito: deploy (`vercel rollback` ou `vercel promote` do deploy anterior), pacote (`npm deprecate` e `npm dist-tag`, nunca `unpublish`) e banco (script de rollback, quando houver)
- [ ] (WARN) Monitoramento e responsável definidos para o pós-release

## 8. Execução
- [ ] (BLOCK) Commit da release com manifestos e changelog
- [ ] (BLOCK) Tag anotada criada e enviada
- [ ] (BLOCK) Release criada no GitHub com as notas
- [ ] (N/A quando não é pacote) `npm publish` executado e versão visível no registro
- [ ] (WARN) Artefatos e deploy da release verificados

## Resultado

| Categoria | Status (✅ / ⚠️ / ❌) | Observações |
|-----------|----------------------|-------------|
| 1. Versão | | |
| 2. Portões de qualidade | | |
| 3. Changelog | | |
| 4. Documentação | | |
| 5. Testes pré-release | | |
| 6. Comunicação | | |
| 7. Plano de rollback | | |
| 8. Execução | | |

[[LLM: RESUMO FINAL
1. Resuma o conteúdo da release: versão, tipo de bump, stories e issues incluídas.
2. Liste problemas conhecidos e limitações.
3. Confirme a aprovação explícita do usuário antes de criar tag e release.
As seções 1 a 7 são avaliadas antes da execução; a seção 8 confirma o que foi feito.]]

**Decisão:** release bloqueada se qualquer item (BLOCK) das seções 1 a 7 não for cumprido. Itens (WARN) pendentes exigem confirmação explícita do usuário. A seção 8 só fecha quando todos os itens (BLOCK) foram executados e verificados.
