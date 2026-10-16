---
id: write-spec
title: Escrever a spec (Spec Pipeline, fase 4)
agent: pm
hat: product
elicit: false
inputs:
  - 'storyId'
  - 'docs/stories/{storyId}/spec/requirements.json (obrigatório)'
  - 'docs/stories/{storyId}/spec/complexity.json (opcional; ausente em SIMPLE)'
  - 'docs/stories/{storyId}/spec/research.json (opcional; ausente em SIMPLE)'
  - 'docs/stories/{storyId}/spec/critique.json (na revisão, depois de um NEEDS_REVISION)'
outputs:
  - 'docs/stories/{storyId}/spec/spec.md no formato de templates/spec-tmpl.md'
depends_on:
  templates: [spec-tmpl.md]
next: [critique-spec]
source: [spec-write-spec.md]
---

# Escrever a spec (Spec Pipeline, fase 4)

## Objetivo
Produzir a especificação completa e executável a partir dos artefatos das fases anteriores. A `spec.md` é o documento definitivo que guia a implementação: nada é inventado, tudo é derivado dos insumos.

## Quando usar
- Fase 4 do Spec Pipeline: `@pm *write-spec {storyId}`.
- Revisão depois de uma crítica com veredito `NEEDS_REVISION` (e, em COMPLEX, na revisão obrigatória entre as duas críticas).

## Gate constitucional: Artigo IV (Sem Invenção), severidade BLOCK
Toda afirmação da spec rastreia para:
- um requisito funcional (`FR-*`);
- um requisito não funcional (`NFR-*`);
- uma restrição (`CON-*`);
- um achado de pesquisa verificado (`research.json`).

Violações:
- funcionalidade ausente do `requirements.json`;
- detalhe de implementação não pesquisado;
- tecnologia não validada no `research.json`;
- critério de aceite que não deriva dos insumos.

Na dúvida, a questão vai para "Perguntas em aberto", nunca para a spec como fato. Violação bloqueia a gravação da versão final:

```text
VIOLAÇÃO CONSTITUCIONAL: Artigo IV (Sem Invenção)
A spec contém conteúdo sem rastro nos insumos:
- §3.2 "cache Redis para sessões": nenhum FR, NFR ou CON nem achado de pesquisa
Correção: remova o trecho ou mova-o para Perguntas em aberto.
```

## Pré-condições
- [ ] `requirements.json` existe e tem pelo menos um FR
- [ ] Em STANDARD e COMPLEX, `complexity.json` e `research.json` existem

## Passos

### 1. Carregar os insumos
1. `requirements.json` (obrigatório), `complexity.json` e `research.json` (opcionais).
2. Leia e valide os JSONs; monte o mapa de rastreabilidade: cada ID com sua descrição e de onde veio.
3. Existe `critique.json` com `NEEDS_REVISION`? Então é revisão: siga também o passo 5.

### 2. Gerar cada seção
Use a estrutura de `templates/spec-tmpl.md`. Cabeçalho: Story ID, complexidade (classe ou "não avaliada"), data de geração, status `Draft` e iteração.

| Seção | Fonte | Regras |
|-------|-------|--------|
| Visão geral (objetivos e não objetivos) | `functional[*].description`, `constraints` | sintetize o objetivo a partir dos FR; não objetivos vêm das restrições ou do que foi explicitamente excluído |
| Resumo dos requisitos | `requirements.json` inteiro | cópia formatada, preservando os IDs |
| Abordagem técnica | padrões de `research.json` e dimensões de `complexity.json` | só padrões pesquisados; profundidade conforme o escopo avaliado |
| Dependências | `research.dependencies` | só as verificadas como fato; as não verificadas com ⚠️; versão vinda da pesquisa |
| Arquivos a criar e alterar | escopo de `complexity.json` e busca no código | refira os padrões existentes; risco por arquivo |
| Estratégia de testes | `functional[*].acceptance` e NFRs mensuráveis | critérios em Dado/Quando/Então; pelo menos um teste por FR; teste de NFR quando mensurável |
| Riscos e mitigações | flags de `complexity.json` e `unverifiedClaims` | cada flag e cada afirmação não verificada vira risco com mitigação |
| Perguntas em aberto | `openQuestions`, `unverifiedClaims` e dúvidas da análise | preserve as dos requisitos; marque as bloqueantes |

Feche cada trecho derivado com a marca de rastreio, por exemplo: `_Derivado de FR-1 e de research.json (google-auth-library)_`.

### 3. Validar a spec
| Verificação | Regra |
|-------------|-------|
| Rastreabilidade | nenhuma afirmação órfã |
| Completude | número de FR na spec igual ao do `requirements.json` |
| Testabilidade | a estratégia de testes cobre todos os FR |
| NFR | todo NFR tratado nos testes ou na abordagem |
| Restrições | todo CON refletido na abordagem |
| Dependências | toda dependência da pesquisa listada; escolhas técnicas vêm do `research.json` |

Resultado: válida ou não, itens faltantes e avisos. Afirmação órfã aciona o gate do Artigo IV.

### 4. Gravar
Grave `docs/stories/{storyId}/spec/spec.md`. Registre nos metadados os insumos usados e a iteração.

### 5. Revisar depois da crítica
1. Leia os problemas do `critique.json` (HIGH e MEDIUM primeiro) e as correções sugeridas em `autoFixes`.
2. Aplique cada correção ou registre por que não aplicou. Toda correção continua sujeita ao Artigo IV.
3. Incremente a iteração nos metadados.
4. No máximo 2 revisões. Se a crítica depois da segunda revisão ainda não aprovar, pare e escale ao usuário e ao `@dev` [Arquitetura].

Exemplo de trecho gerado:
```markdown
## 3. Abordagem técnica
### 3.1 Visão da arquitetura
Fluxo de autenticação com Google OAuth 2.0:
1. O usuário clica em "Entrar com Google"
2. Redirecionamento para a tela de consentimento do Google
3. Recebimento do código de autorização
4. Troca do código por tokens no servidor
5. Criação ou atualização da sessão do usuário
_Derivado de FR-1, CON-1 e dos padrões de google-auth-library em research.json_
```

## Saída
`docs/stories/{storyId}/spec/spec.md` na estrutura de `spec-tmpl.md`, com IDs preservados, marcas de rastreio, dependências com status de verificação e perguntas em aberto.

## Critérios de conclusão
- [ ] Todo FR, NFR e CON aparece na spec com o mesmo ID
- [ ] Todo FR tem pelo menos um cenário Dado/Quando/Então
- [ ] Nenhuma afirmação sem rastro (Artigo IV)
- [ ] Dependências não verificadas marcadas com ⚠️
- [ ] Na revisão, todo problema do `critique.json` foi tratado ou justificado
- [ ] Arquivo gravado

## Tratamento de erros
| Situação | Ação |
|----------|------|
| `requirements.json` ausente | Pare: rode `@pm *gather-requirements {storyId}` |
| Nenhum FR | Pare: a spec precisa de pelo menos um requisito funcional |
| Dependência usada mas ausente do `research.json` | Marque ⚠️ e registre aviso |
| FR sem critério de aceite | Vira pergunta em aberto, com critério sugerido |
| Conteúdo inventado | BLOCK do Artigo IV: remova ou mova para Perguntas em aberto |

## Handoff
Próximo: `@pm *critique-spec {storyId}` (fase 5, chapéu Qualidade).
