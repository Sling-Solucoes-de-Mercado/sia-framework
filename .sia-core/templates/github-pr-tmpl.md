<!--
Template de pull request do SIA.
Usado por: @devops em *create-pr (preenche os placeholders e remove as seções que não se aplicam)
e em *setup-github (copiado para .github/pull_request_template.md; ali os placeholders viram campos a preencher).

Placeholders:
  {{summary}}             1 a 3 frases sobre o que muda e por quê
  {{story_id}}            storyId (ex.: 2.1)        {{story_title}}  título da story
  {{story_url}}           link absoluto do arquivo da story na branch (https://github.com/{owner}/{repo}/blob/{branch}/{caminho})
  {{gate}}                veredito do QA gate (PASS | CONCERNS | WAIVED) e {{gate_date}} a data dele
  {{gate_url}}            link absoluto do arquivo do gate (docs/qa/gates/...)
  {{inspection_verdict}}  veredito da inspeção do @validator   {{inspection_url}}  link do relatório
  {{issues}}              uma linha "Closes #N" por issue resolvida; "Relacionada a #N" para as demais
  {{changes}}             lista das mudanças (File List da story e commits do intervalo)
  {{lint}} {{typecheck}} {{test}} {{build}} {{secrets}}  resultados do *pre-push (PASS, FAIL ou AUSENTE)
  {{preview_url}}         URL do deploy de preview da Vercel, quando houver
-->
## Resumo

{{summary}}

## Story e qualidade

- **Story:** [{{story_id}}: {{story_title}}]({{story_url}})
- **QA gate:** {{gate}} em {{gate_date}} ([arquivo do gate]({{gate_url}}))
- **Inspeção:** {{inspection_verdict}} ([relatório]({{inspection_url}}))

## Tipo de mudança

- [ ] Correção de bug (compatível)
- [ ] Nova funcionalidade (compatível)
- [ ] Breaking change (quebra compatibilidade; título com `!`)
- [ ] Documentação
- [ ] Refatoração (sem mudança funcional)
- [ ] Desempenho
- [ ] Testes
- [ ] CI/CD ou infraestrutura

## Issues relacionadas

{{issues}}

## Mudanças

{{changes}}

## Testes

- [ ] Testes unitários adicionados ou atualizados
- [ ] Testes de integração adicionados ou atualizados
- [ ] Teste manual realizado (descreva abaixo)

## Portão de qualidade (`*pre-push`)

| Verificação | Resultado |
|-------------|-----------|
| lint | {{lint}} |
| typecheck | {{typecheck}} |
| test | {{test}} |
| build | {{build}} |
| Varredura de segredos | {{secrets}} |

## Deploy de preview

{{preview_url}}

## Capturas de tela

<!-- Mudanças de interface: antes e depois. Remova a seção se não houver. -->

## Checklist

- [ ] O código segue os padrões do projeto (`docs/architecture/coding-standards.md`)
- [ ] Fiz uma autorrevisão do diff
- [ ] A documentação foi atualizada quando necessário
- [ ] A mudança não gera novos avisos
- [ ] Mudanças das quais esta depende já foram integradas

## Notas para revisão

<!-- Pontos que pedem atenção especial de quem revisa. -->

---
<!-- Gerado pelo @devops (*create-pr) do SIA. -->
