# Lentes de Inspeção

> Usado por: `@validator` na task `inspect.md` (passo 6).
> Cada comando aplica só as lentes do campo `lenses` dele em `agents/validator.md`.
> Origem: método do kit Validator (`.validator/METHOD.md`).

## Visão geral

| id | Lente | O que compara | Comandos |
|----|-------|---------------|----------|
| `gaps` | Gaps | o pedido com o que o código faz | `*revisar-feature`, `*gaps` |
| `falhas` | Falhas | o comportamento com o que o código anuncia | `*revisar-feature`, `*falhas` |
| `logica` | Lógica | condições, limites e estados da função alterada | `*revisar-feature`, `*logica` |
| `regressao` | Regressão | os chamadores com o contrato alterado | `*revisar-feature`, `*regressao` |
| `seguranca` | Segurança | a fronteira de confiança que o diff cruza | `*revisar-feature`, `*revisar-seguranca` |
| `arquitetura` | Estrutura e arquitetura | o arquivo com vizinhos que fazem o mesmo trabalho | `*revisar-feature`, `*revisar-todo`, `*revisar-arquitetura` |
| `codigo-morto` | Código morto | cada export novo com quem o importa | `*revisar-feature`, `*revisar-todo`, `*codigo-morto` |

Ordem no `*revisar-feature`: gaps, falhas, lógica, regressão, segurança, estrutura e arquitetura, código morto. No campo Lente do relatório, use o id.

## Severidade e confiança

| Severidade | Efeito no veredito, quando o achado conta |
|------------|-------------------------------------------|
| `bloqueante` | `reprovado` |
| `alto` | `reprovado` |
| `medio` | `aprovado com ressalvas` |
| `baixo` | `aprovado` |
| `nota` | `aprovado` |

Confiança: `alta`, `media` ou `baixa`. Só conta para o veredito achado com confiança `alta` ou `media`. Confiança baixa não vira `bloqueante`: desce para `nota` ou fica de fora.

No QA gate, o `@pm` [Qualidade] converte a severidade dos achados que contam: `bloqueante` e `alto` → `high`; `medio` → `medium`; `baixo` → `low`; `nota` fica fora de `top_issues`. Achado `bloqueante` nunca é dispensado com `WAIVED` (guia de autoria, seção 6.2).

### Âncoras de severidade do método

Quando o caso não estiver listado, compare o impacto com a âncora mais próxima.

| Severidade | Âncora | Lente de origem |
|------------|--------|-----------------|
| `bloqueante` | quebra silenciosa de dado exibido ou persistido, com o caminho mostrado na evidência | regressão |
| `bloqueante` | falha explorável com evidência no código | segurança |
| `alto` | quebra de chamador em compilação ou em runtime | regressão |
| `alto` | lacuna em autenticação, autorização, dado persistido ou pagamento | gaps |
| `medio` | lacuna de teste para critério comum | gaps |
| `medio` ou `nota` | endurecimento ausente sem caminho demonstrado | segurança |
| `nota` (ou omitir) | código morto com confiança baixa | código morto |

## Regras comuns

- Sem evidência, o achado não entra. Evidência é o trecho ou o fato observado mais a busca que o sustentou.
- Uma lente por achado, a mais específica. Ex.: id vindo do cliente sem checar o dono é segurança, não lógica; chamador quebrado por assinatura nova é regressão, não falhas.
- Um defeito, um achado. Não repita a mesma falha em duas lentes.
- Defeito anterior à mudança e não disparado por ela é `preexistente: sim` e não conta, exceto no `*revisar-todo` dentro do limite estrutural.
- Não invente requisito ausente do pedido e do código.

## Lente: gaps

Compare o pedido com o que o código faz.

- Critério de aceite sem código que o cumpra
- Caminho de erro prometido e ausente
- Tela, ação ou flag criada e não ligada
- Teste que não exerce o critério que diz cobrir
- `TODO` ou `FIXME` introduzido no diff
- Migração, tipo ou cópia pela metade

**Severidade:** lacuna de teste para critério comum é `medio`. Lacuna em autenticação, autorização, dado persistido ou pagamento é `alto`.

**Sem story:** os gaps são os que o próprio diff mostra: caminho de erro ausente, flag não lida, tela sem ação, tipo sem uso, `TODO` introduzido.

**Não marque:** requisito que não está no pedido nem no código.

## Lente: falhas

Comportamento errado no escopo.

- Operador, variável ou valor default trocados
- Entrada vazia, nula ou zero que quebra
- Promise rejeitada sem tratamento
- Condição que nunca permite o caminho que o nome da função anuncia
- Mensagem de erro que esconde a falha e segue como sucesso

**Severidade:** o método não fixa âncora própria; use as âncoras acima pelo impacto para quem usa a função.

## Lente: lógica

- Pré-condição, pós-condição e invariante da função alterada
- Limites: vazio, zero, nulo, tamanho máximo, off-by-one em slice e paginação
- Transição de estado impossível, ou estado que não volta
- `await` sem uso do resultado, ou estado gravado depois do `await` sem checar se a tela ainda é a mesma
- `catch` vazio ou que trata erro como sucesso
- Booleano invertido
- Operação que o usuário pode disparar duas vezes e que não é idempotente

**Severidade:** o método não fixa âncora própria; use as âncoras acima pelo impacto.

## Lente: regressão

Para cada função, tipo, componente ou policy alterada:

- Busque os chamadores
- Leia os call sites que passam argumento ou usam o retorno
- Verifique assinatura, nulabilidade, formato de erro e chave de cache
- Verifique teste que ainda afirma o contrato antigo

**Severidade:** quebra de chamador em compilação ou em runtime é `alto`. Quebra silenciosa de dado exibido ou persistido é `bloqueante` quando a evidência mostra o caminho.

## Lente: segurança

Modele a fronteira de confiança que o diff cruza: navegador para servidor, usuário para dado de outro usuário, segredo para cliente. Aplique STRIDE só onde a fronteira existe: spoofing, tampering, repudiation, information disclosure, denial of service, elevation of privilege.

Depois, OWASP no código tocado:

- Injeção em SQL, shell, HTML ou header
- XSS em conteúdo renderizado
- Autenticação e autorização ausentes na action ou na rota nova
- IDOR: id vindo do cliente sem checar o dono
- Segredo, service role ou token em código de cliente ou em log
- SSRF, path traversal, open redirect
- Mudança de estado sem checagem de sessão
- Policy de acesso a dado ausente ou mais aberta que as policies vizinhas da mesma tabela

**Severidade:** achado explorável com evidência no código é `bloqueante`. Endurecimento ausente sem caminho demonstrado é `medio` ou `nota`.

**Limite:** descreva o ponto do código e o impacto e pare aí. Sem exploit, sem payload, sem passo a passo de ataque, sem pedido de ferramenta de ataque.

## Lente: estrutura e arquitetura

Compare com um ou dois arquivos vizinhos que fazem o mesmo tipo de trabalho. O achado é o desvio, com o vizinho citado.

- UI buscando dado onde o vizinho passa por uma função de servidor
- Regra de negócio copiada em vez de usar a função que já existe
- Dependência nova no sentido contrário ao do módulo
- Arquivo que passou a fazer duas responsabilidades que o resto do módulo separa
- Nome de módulo que quebra o padrão da pasta

**Não marque:** estilo que o arquivo vizinho já usa; preferência sem vizinho de referência.

**Não proponha arquitetura nova:** aponte o desvio e a correção em uma frase. Se o desvio pede decisão estrutural, registre em Handoff (Decisão de arquitetura); quem decide é o `@dev` [Arquitetura], com ADR.

## Lente: código morto

Para cada export novo no diff, busque o nome no repositório fora do arquivo da definição.

- Export sem importador
- Arquivo novo sem nenhum import do caminho
- Ramo inalcançável depois de `return`, ou condição constante
- Função privada do arquivo sem chamada
- Flag, constante ou variável lida em lugar nenhum
- Bloco grande comentado no diff

**Não marque como morto** o símbolo que aparece em rota, registro por string, SQL ou arquivo de configuração. Nesse caso a confiança é baixa: omita ou classifique como `nota`.

No `*revisar-todo`, a lente também cobre linhas fora do diff dentro do limite estrutural.

## O que não marcar

| Situação | Tratamento |
|----------|------------|
| Requisito ausente do pedido e do código | Não marque; inventar requisito invalida a inspeção. |
| Achado sem arquivo e evidência | Não registre. |
| Lente fora do comando | Não aplique. |
| Mesma falha vista por outra lente | Registre uma vez, na lente mais específica. |
| Confiança baixa | Nunca `bloqueante`; `nota` ou fora. |
| Estilo que o vizinho já usa | Não marque. |
| Arquitetura nova como sugestão | Não proponha; aponte só o desvio e a correção em uma frase. |
| Símbolo em rota, registro por string, SQL ou configuração | Não é código morto; omita ou `nota`. |
| Defeito anterior à mudança | Registre com `preexistente: sim`; não conta, exceto no `*revisar-todo` dentro do limite estrutural. |
| Exploit, payload ou passo a passo de ataque | Nunca escreva; descreva o ponto e o impacto. |
