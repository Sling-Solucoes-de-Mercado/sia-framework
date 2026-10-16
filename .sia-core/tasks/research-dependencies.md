---
id: research-dependencies
title: Pesquisar dependências (Spec Pipeline, fase 3)
agent: pm
hat: analyst
elicit: false
inputs:
  - 'storyId'
  - 'docs/stories/{storyId}/spec/requirements.json (obrigatório)'
  - 'docs/stories/{storyId}/spec/complexity.json (obrigatório; gerado por @dev *assess-complexity)'
  - '--force (opcional): pesquisa mesmo com complexidade SIMPLE'
outputs:
  - 'docs/stories/{storyId}/spec/research.json'
depends_on:
  data: [technical-preferences.md]
next: [write-spec]
source: [spec-research-dependencies.md]
---

# Pesquisar dependências (Spec Pipeline, fase 3)

## Objetivo
Pesquisar e validar as dependências externas (bibliotecas, APIs, serviços, infraestrutura) que a implementação vai exigir e produzir uma lista verificada, com versões, documentação, padrões de uso e compatibilidade. A spec só pode usar tecnologia validada aqui (Artigo IV).

## Quando usar
- Fase 3 do Spec Pipeline, em complexidade STANDARD ou COMPLEX: `@pm *research-deps {storyId}`.
- Não use para pesquisa de mercado ou de produto: isso é `create-deep-research-prompt` (`*research`).

## Condições de pulo
| Condição | Ação |
|----------|------|
| Complexidade SIMPLE (sem `--force`) | Grave um `research.json` mínimo, só com as dependências que o projeto já usa |
| Nenhuma dependência externa nos requisitos | Grave `research.json` com `researchNotes: "sem dependências externas"` |

## Pré-condições
- [ ] `requirements.json` existe
- [ ] `complexity.json` existe (ou o usuário aceitou seguir assumindo STANDARD)

## Passos

### 1. Extrair os alvos da pesquisa
Leia os requisitos e liste cada alvo com tipo e origem:

| Tipo | Exemplos |
|------|----------|
| `library` | zustand, tanstack-query, zod |
| `api` | OAuth, Stripe, SendGrid |
| `concept` | sincronização em tempo real, atualização otimista |
| `infrastructure` | Redis, PostgreSQL, Vercel |

Para cada alvo: `target`, `type` e `mentioned_in` (IDs `FR-*`, `NFR-*`, `CON-*` que o citam).

### 2. Verificar o código existente
Para cada alvo, com busca no código (grep/glob):
- manifesto de dependências (ex.: `package.json`): já instalado? qual versão?
- imports: já é usado?
- implementações parecidas: onde (`arquivo:linha`)?

### 3. Consultar a documentação oficial
Para bibliotecas, use a ferramenta de documentação disponível na IDE (ex.: MCP Context7: resolva o id da biblioteca e consulte "como {caso de uso do requisito}"). Extraia: instruções de setup, exemplos de código, URL da documentação e padrões relevantes. Marque `source: docs`.

### 4. Recorrer à busca web quando preciso
Quando a documentação não trouxer resultado, ou quando o alvo for API ou conceito, faça busca web:
- "{alvo} documentation {ano atual}"
- "{alvo} {framework} integration example"
- "{alvo} best practices"

Marque `source: web` e `verified: false` sempre que houver incerteza.

### 5. Conferir as preferências técnicas
Compare com `.sia-core/data/technical-preferences.md` e, se existir, `docs/architecture/tech-stack.md`:
- a dependência é preferida?
- há alternativa preferida?
- há conflito conhecido?

### 6. Gerar o research.json
```json
{
  "storyId": "2.1",
  "researchedAt": "2026-10-16T15:00:00-03:00",
  "researchedBy": "@pm [Análise]",
  "complexity": "STANDARD",
  "dependencies": [
    {
      "name": "zustand",
      "type": "library",
      "version": "^4.5.0",
      "verified": true,
      "source": "docs",
      "existing": { "installed": false, "currentVersion": null, "usageLocations": [] },
      "documentation": { "url": "https://docs.pmnd.rs/zustand/", "relevantSections": ["Getting Started", "Middleware"] },
      "patterns": [
        { "name": "createStore", "description": "criação básica de store", "codeExample": "const useStore = create((set) => ({ count: 0 }))" }
      ],
      "compatibility": { "preferred": true, "alternatives": ["jotai"], "conflicts": [] }
    }
  ],
  "unverifiedClaims": [
    { "claim": "A API aceita 1.000 requisições por minuto", "reason": "limite não encontrado na documentação", "action": "needs_validation" }
  ],
  "recommendations": [
    { "type": "prefer", "subject": "zustand", "rationale": "já é o padrão de estado do projeto" }
  ],
  "researchNotes": ""
}
```

Regras do formato:
- Obrigatórios: `storyId`, `researchedAt`, `dependencies`; em cada dependência, `name`, `type`, `verified` e `source`.
- `type`: `library`, `api`, `service` ou `infrastructure`.
- `source`: `docs`, `web`, `codebase` ou `manual`.
- `verified: true` só com fonte consultada (URL da documentação ou local no código).
- `unverifiedClaims.action`: `needs_validation`, `acceptable_risk` ou `blocked`.
- `recommendations.type`: `prefer`, `avoid` ou `consider`.

Grave em `docs/stories/{storyId}/spec/research.json` e resuma: "{n} dependências ({n} verificadas), {n} afirmações não verificadas".

## Saída
`docs/stories/{storyId}/spec/research.json` no formato do passo 6.

## Critérios de conclusão
- [ ] Todo alvo citado nos requisitos foi pesquisado ou explicitamente marcado como não verificado
- [ ] Toda dependência tem `verified` e `source`
- [ ] Compatibilidade conferida com as preferências técnicas
- [ ] Arquivo gravado no caminho da spec

## Tratamento de erros
| Situação | Ação |
|----------|------|
| Ferramenta de documentação indisponível | Use a busca web como fonte principal e registre o aviso em `researchNotes` |
| Sem documentação para uma dependência | `verified: false` e entrada em `unverifiedClaims` |
| Dependência conflita com outra existente | Recomendação do tipo `avoid` |
| Documentação e busca web falharam | `research.json` mínimo com `researchNotes: "pesquisa manual necessária"` |
| `complexity.json` ausente | Indique `@dev *assess-complexity {storyId}`; se o usuário preferir seguir, assuma STANDARD e registre em `researchNotes` |

## Handoff
Próximo: `@pm *write-spec {storyId}` (fase 4, chapéu Produto).
