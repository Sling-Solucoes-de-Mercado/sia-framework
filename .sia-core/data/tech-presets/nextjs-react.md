# Tech Preset Next.js + React

> Preset de arquitetura para desenvolvimento full stack com Next.js e React, pensado para que agentes de IA trabalhem com máxima eficiência e mínimo de bugs.

---

## Metadados

```yaml
preset:
  id: nextjs-react
  name: 'Preset Next.js + React (full stack)'
  version: 1.2.0
  description: 'Arquitetura para aplicações full stack com Next.js 16+, React, TypeScript e padrões que maximizam a eficiência dos agentes de IA'
  technologies:
    - Next.js 16+ (App Router + Proxy)
    - React 18+
    - TypeScript
    - Tailwind CSS
    - Zustand
    - React Query
    - Zod
    - Vitest
    - Playwright
  suitable_for:
    - 'Aplicações web full stack'
    - 'Produtos SaaS'
    - 'E-commerce'
    - 'Dashboards administrativos'
    - 'Aplicações com SSR/SSG'
  not_suitable_for:
    - 'Aplicações só mobile (use React Native)'
    - 'Microsserviços backend puros (use Node.js puro ou NestJS)'
    - 'Sites estáticos simples (use Astro)'
```

---

## Padrões de Design (os 5 essenciais)

> **Crítico:** estes 5 padrões eliminam a maior parte dos bugs (cerca de 95%) e deixam o agente trabalhar com máxima eficiência. São complementares e devem ser usados TODOS juntos.

### Padrão 1: Contract Pattern

**Propósito:** definir APIs públicas entre features para evitar bugs de integração

**Nota de execução:** 10/10 | **Nota anti-bug:** 10/10

````typescript
// src/features/auth/auth.contract.ts

/**
 * API pública da feature de autenticação.
 * As outras features dependem SÓ deste contrato, nunca da implementação.
 *
 * @example
 * ```ts
 * class CheckoutService {
 *   constructor(private auth: AuthContract) {}
 *
 *   async process() {
 *     const user = await this.auth.getCurrentUser()
 *   }
 * }
 * ```
 */
export interface AuthContract {
  /**
   * Autentica o usuário com as credenciais.
   * @throws {InvalidCredentialsError} Quando as credenciais estão erradas
   * @throws {UserBlockedError} Quando a conta está bloqueada
   */
  login(email: string, password: string): Promise<AuthResult>;

  /**
   * Retorna o usuário autenticado.
   * @throws {UnauthorizedError} Quando não há usuário autenticado
   */
  getCurrentUser(): Promise<User>;

  /**
   * Indica se há usuário autenticado.
   */
  isAuthenticated(): boolean;

  /**
   * Encerra a sessão do usuário.
   */
  logout(): Promise<void>;
}

export type AuthResult = {
  user: User;
  token: string;
  expiresAt: Date;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
};
````

**Bugs eliminados:**

- A feature A espera string e a feature B devolve número
- Método renomeado quebra todos os consumidores
- Parâmetros na ordem errada
- Tipos de retorno inesperados
- Dependência circular entre features

**Por que funciona bem com agentes de IA:**

- O TypeScript garante o contrato em tempo de compilação
- O agente lê o contrato (50 linhas) em vez da implementação (2.000 linhas)
- Não dá para quebrar o contrato sem erro de TypeScript

---

### Padrão 2: Service Pattern

**Propósito:** encapsular a regra de negócio em serviços testáveis e reutilizáveis

**Nota de execução:** 10/10 | **Nota anti-bug:** 9/10

```typescript
// src/features/auth/services/auth.service.ts

import { AuthContract, AuthResult, User } from '../auth.contract';
import { UserRepository } from '../repositories/user.repository';
import { EventBus } from '@/shared/events/eventBus';

export class AuthService implements AuthContract {
  constructor(
    private userRepo: UserRepository,
    private eventBus: EventBus
  ) {}

  async login(email: string, password: string): Promise<AuthResult> {
    // 1. Valida a entrada
    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    // 2. Busca o usuário
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // 3. Confere a senha
    const isValid = await this.verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new InvalidCredentialsError('Invalid credentials');
    }

    // 4. Confere se está bloqueado
    if (user.isBlocked) {
      throw new UserBlockedError('Account is blocked');
    }

    // 5. Gera o token
    const token = this.generateToken(user);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 6. Emite o evento
    this.eventBus.emit('auth:login', user);

    return {
      user: this.sanitizeUser(user),
      token,
      expiresAt,
    };
  }

  // ... demais métodos
}

// Exporta uma instância única
export const authService = new AuthService(userRepository, eventBus);
```

**Bugs eliminados:**

- Regra de negócio espalhada pelos componentes
- Código duplicado
- Impossível testar sem a UI
- Tratamento de erro inconsistente
- Efeitos colaterais em lugares inesperados

---

### Padrão 3: Repository Pattern

**Propósito:** isolar o acesso a dados da regra de negócio

**Nota de execução:** 9/10 | **Nota anti-bug:** 9/10

```typescript
// src/features/auth/repositories/user.repository.ts

import { db } from '@/lib/database';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    return db.user.findUnique({
      where: { email },
    });
  }

  async findById(id: string): Promise<User | null> {
    return db.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserDTO): Promise<User> {
    return db.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        role: data.role || 'user',
        createdAt: new Date(),
      },
    });
  }

  async update(id: string, data: UpdateUserDTO): Promise<User> {
    return db.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await db.user.delete({
      where: { id },
    });
  }
}

// Exporta uma instância única
export const userRepository = new UserRepository();
```

**Bugs eliminados:**

- SQL e consultas espalhados pelo código
- Impossível testar sem banco real
- Trocar o ORM quebra a aplicação inteira
- Padrões de acesso a dados inconsistentes

---

### Padrão 4: Event Bus Pattern (Observer)

**Propósito:** permitir acoplamento fraco entre features com arquitetura orientada a eventos

**Nota de execução:** 8/10 | **Nota anti-bug:** 10/10

```typescript
// src/shared/events/eventBus.ts

type EventHandler<T = any> = (data: T) => void | Promise<void>;

export class EventBus {
  private handlers = new Map<string, EventHandler[]>();

  on<T = any>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  off<T = any>(event: string, handler: EventHandler<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  async emit<T = any>(event: string, data: T): Promise<void> {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((handler) => {
      try {
        Promise.resolve(handler(data)).catch((error) => {
          console.error(`Error in handler for event "${event}":`, error);
        });
      } catch (error) {
        console.error(`Error in handler for event "${event}":`, error);
      }
    });
  }
}

export const eventBus = new EventBus();

// Eventos tipados
export type AppEvents = {
  'auth:login': User;
  'auth:logout': { userId: string };
  'order:created': Order;
  'order:paid': { orderId: string; amount: number };
};
```

**Uso:**

```typescript
// A feature A emite
this.eventBus.emit('order:created', order);

// A feature B reage (sem conhecer a feature A)
eventBus.on('order:created', async (order) => {
  await emailService.sendOrderConfirmation(order);
});

// A feature C também reage, de forma independente
eventBus.on('order:created', async (order) => {
  await analytics.track('purchase', { orderId: order.id });
});
```

**Bugs eliminados:**

- Dependência circular entre features
- Mudança na feature A quebra a feature B
- Acoplamento forte que impede refatorar
- Funcionalidade nova exigindo alterar código existente

---

### Padrão 5: Builder Pattern (só em testes)

**Propósito:** criar fixtures de teste com facilidade e consistência

**Nota de execução:** 10/10 | **Nota anti-bug:** 8/10

**IMPORTANTE:** use builders SÓ em TESTES, nunca em código de produção.

```typescript
// test/builders/user.builder.ts

export class UserBuilder {
  private data: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    createdAt: new Date(),
    isBlocked: false,
  };

  withId(id: string): this {
    this.data.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  asAdmin(): this {
    this.data.role = 'admin';
    return this;
  }

  asBlocked(): this {
    this.data.isBlocked = true;
    return this;
  }

  build(): User {
    return this.data as User;
  }
}
```

**Uso nos testes:**

```typescript
describe('OrderService', () => {
  it('should create order for authenticated user', async () => {
    const user = new UserBuilder().withEmail('customer@example.com').build();

    const admin = new UserBuilder().asAdmin().build();
    const blocked = new UserBuilder().asBlocked().build();

    // ... lógica do teste
  });
});
```

---

## Estrutura do Projeto

```
/src
  /features              # Organização por feature (NÃO por tipo)
    /auth
      /components       # Componentes de UI da feature
      /hooks            # Hooks da feature
      /services         # Regra de negócio
      /repositories     # Camada de acesso a dados
      /types            # Tipos e interfaces
      /utils            # Funções auxiliares
      auth.contract.ts  # API PÚBLICA (ponto de integração)
      index.ts          # Barrel export (fachada)
    /products
      [mesma estrutura]
    /checkout
      [mesma estrutura]
    /_reference         # Feature de referência (copie o bom código daqui)
      /contracts
      /repositories
      /services
      /hooks
      /components
      index.ts

  /shared               # SÓ o que é realmente compartilhado
    /components         # Componentes de UI reutilizáveis
    /hooks              # Hooks genéricos
    /utils              # Utilitários genéricos
    /types              # Tipos compartilhados
    /events             # Event bus

  /config               # Variáveis de ambiente e constantes
  /lib                  # Integrações com terceiros

/test
  /builders             # Builders de fixtures de teste
  /mocks                # Handlers e mocks do MSW
  /e2e                  # Testes E2E com Playwright
```

### Justificativa da estrutura

- **Features autocontidas:** o contexto fica fácil de entender
- **Integração por contrato:** features conversam só por contratos
- **Feature de referência:** modelo para features novas (copie os padrões)
- **Shared mínimo:** só o que é de fato reutilizável

---

## Stack Tecnológica

| Categoria           | Tecnologia      | Versão  | Propósito                                  |
| ------------------- | --------------- | ------- | ------------------------------------------ |
| Framework           | Next.js         | ^16.0.0 | Framework React full stack (com Proxy)     |
| Linguagem           | TypeScript      | ^5.0.0  | Segurança de tipos                         |
| Estilo              | Tailwind CSS    | ^3.4.0  | CSS utilitário                             |
| Componentes de UI   | shadcn/ui       | latest  | Componentes acessíveis                     |
| Estado (global)     | Zustand         | ^4.5.0  | Estado global simples                      |
| Estado (servidor)   | React Query     | ^5.0.0  | Gestão de estado do servidor               |
| Formulários         | React Hook Form | ^7.50.0 | Formulários                                |
| Validação           | Zod             | ^3.22.0 | Validação por schema                       |
| Testes (unitários)  | Vitest          | ^1.2.0  | Testes unitários rápidos                   |
| Testes (componente) | Testing Library | ^14.0.0 | Testes de componente                       |
| Testes (E2E)        | Playwright      | ^1.41.0 | Testes ponta a ponta                       |
| Mock de API         | MSW             | ^2.1.0  | Mock Service Worker                        |
| Banco               | Prisma          | ^5.9.0  | ORM com tipos                              |

### Dependências necessárias

```bash
# Principais
npm install next react react-dom typescript
npm install tailwindcss postcss autoprefixer
npm install @tanstack/react-query zustand
npm install react-hook-form @hookform/resolvers zod

# Desenvolvimento
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @playwright/test msw
npm install -D prisma @types/node @types/react
```

---

## Padrões de Código

### Convenções de nome

| Elemento     | Convenção                  | Exemplo                |
| ------------ | -------------------------- | ---------------------- |
| Componentes  | PascalCase                 | `ProductCard.tsx`      |
| Hooks        | useCamelCase               | `useProducts.ts`       |
| Serviços     | camelCase + `.service`     | `auth.service.ts`      |
| Repositórios | camelCase + `.repository`  | `user.repository.ts`   |
| Contratos    | camelCase + `.contract`    | `auth.contract.ts`     |
| Tipos        | PascalCase                 | `User`, `AuthResult`   |
| Constantes   | SCREAMING_SNAKE_CASE       | `MAX_ITEMS_PER_PAGE`   |
| Testes       | `*.test.ts` ou `*.spec.ts` | `auth.service.test.ts` |

### Regras críticas

1. **Contract Pattern:** features expõem algo SÓ pelos arquivos `.contract.ts`
2. **Sem import entre features:** importe só pelo índice `@/features/[nome]`
3. **Tipos primeiro:** defina schemas e tipos ANTES da implementação
4. **Tratamento de erros:** toda operação assíncrona tem tratamento de erro explícito
5. **Sem `any`:** use `unknown` quando o tipo for de fato desconhecido e depois estreite

### Next.js 16+: Proxy (substitui o Middleware)

> **IMPORTANTE:** no Next.js 16, a convenção `middleware.ts` foi depreciada e renomeada para `proxy.ts`. NÃO crie `middleware.ts`.

**Antes (Next.js 15 ou anterior, DEPRECADO):**

```typescript
// middleware.ts: NÃO USE MAIS
export function middleware(request: NextRequest) {
  // checagens de auth, redirecionamentos etc.
}
```

**Agora (Next.js 16+, USE O PROXY):**

```typescript
// proxy.ts (na raiz do projeto ou em src/, no mesmo nível de app/)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  if (!request.cookies.has('session')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

// Sem matcher, o proxy roda em TODA requisição, inclusive arquivos estáticos
export const config = {
  matcher: ['/dashboard/:path*'],
};
```

Projeto antigo com `middleware.ts`: migre com `npx @next/codemod@canary middleware-to-proxy .` (renomeia o arquivo e a função).

**Redirecionamentos e rewrites fixos continuam no `next.config.ts`** (rodam antes do proxy):

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://api.example.com/:path*',
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/old-route',
        destination: '/new-route',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
```

**Para autenticação, confira a sessão em Server Components e Route Handlers** (o proxy é só a primeira barreira; verifique autenticação e autorização dentro de cada Server Function e Route Handler):

```typescript
// app/dashboard/page.tsx
import { auth } from '@/features/auth'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return <Dashboard user={session.user} />
}
```

**Características do Proxy:**

- Roda no runtime Node.js por padrão (não no Edge Runtime limitado); a opção `runtime` não é aceita em `proxy.ts`
- Fronteira de rede explícita: executa antes da renderização das rotas
- Deve ser leve: para passar informação à aplicação, use cabeçalhos, cookies, rewrites, redirects ou a URL

### Configuração do TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true
  }
}
```

---

## Estratégia de Testes

### Pirâmide de testes

```
         /\
        /E2E\           10% - Só os fluxos críticos do usuário
       /------\
      /Integração\      20% - Features funcionando juntas
     /------------\
    /  Unitários   \    70% - Regra de negócio e componentes
   /----------------\
```

### O que testar

#### Sempre testar (crítico)

- [ ] Regra de negócio (serviços e utilitários): 90% ou mais de cobertura
- [ ] Validações e regras de negócio
- [ ] Casos de borda (nulo, vazio, valores máximos)

#### Considerar testar

- [ ] Hooks próprios
- [ ] Integração entre componentes
- [ ] Tratamento de erros de API

#### Nunca testar

- [ ] Internos do framework (React, Next.js)
- [ ] Bibliotecas externas (Zod, React Query)
- [ ] Getters e setters triviais
- [ ] CSS e estilo

### Metas de cobertura

```
- Regra de negócio (serviços e utilitários): 90%+
- Hooks: 80%+
- Componentes: 60%+
- Geral: 70%+

NÃO persiga 100%: o retorno diminui
```

### Template de teste

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('[Feature]Service', () => {
  let service: FeatureService;
  let mockRepo: MockType;

  beforeEach(() => {
    mockRepo = { method: vi.fn() };
    service = new FeatureService(mockRepo);
  });

  describe('methodName', () => {
    it('should handle happy path', async () => {
      // Arrange
      const input = {
        /* dados de teste */
      };
      mockRepo.method.mockResolvedValue({
        /* resposta do mock */
      });

      // Act
      const result = await service.methodName(input);

      // Assert
      expect(result).toEqual({
        /* esperado */
      });
    });

    it('should handle validation error', async () => {
      await expect(service.methodName(invalidInput)).rejects.toThrow('Error message');
    });
  });
});
```

---

## Estratégias de Economia de Tokens

> Como reduzir o consumo de tokens ao trabalhar com agentes de IA.

### Estratégia 1: mostre, não descreva

```
// RUIM: cerca de 1.000 tokens explicando padrões
"Crie um CheckoutService usando o Service Pattern com
injeção de dependência seguindo os princípios SOLID..."

// BOM: cerca de 300 tokens mostrando um exemplo
"Crie o CheckoutService seguindo o mesmo padrão do AuthService:
[cole o AuthService.ts]"
```

### Estratégia 2: feature de referência

Crie uma feature exemplar como modelo e depois peça:

```
"Crie o ProductService idêntico a _reference/services/reference.service.ts.
Mude só o nome da entidade e a regra de negócio."
```

### Estratégia 3: schemas como documentação

```typescript
// O schema substitui mais de 50 linhas de explicação
export const registerSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  name: z.string().min(2).max(100),
});
```

### Estratégia 4: testes como especificação

```typescript
// Testes são mais concisos que prosa
"Faça estes testes passarem:

describe('calculateShipping', () => {
  it('charges R$10 for < 1kg', () => {
    expect(calculateShipping(0.5, 50)).toBe(10)
  })
  it('adds 20% for distance > 100km', () => {
    expect(calculateShipping(1, 150)).toBe(12)
  })
})"
```

---

## Pilha de Prevenção de Bugs

| Camada               | Bugs evitados | Implementação                |
| -------------------- | ------------- | ---------------------------- |
| TypeScript estrito   | 60%           | `strict: true` no tsconfig   |
| Validação em runtime | 25%           | Schemas Zod nas fronteiras   |
| Contract Pattern     | 10%           | Contratos por interface      |
| Testes               | 5%            | Casos de borda e regressões  |

---

## Padrões a EVITAR

### Singleton clássico

**Problema:** difícil de testar; estado compartilhado entre testes

```typescript
// RUIM
class Database {
  private static instance: Database
  static getInstance() { ... }
}

// BOM
export const db = new Database()
```

### Decorators do TypeScript

**Problema:** experimentais, sintaxe confusa, difíceis de depurar

```typescript
// RUIM
@Log
@Validate
@Cache
class UserService {}

// BOM
const userService = rateLimit(cache(validate(new UserService())));
```

### Abstract Factory

**Problema:** excesso de engenharia para quase todos os casos

```typescript
// RUIM
abstract class VehicleFactory {
  abstract createCar(): Car;
}

// BOM
const vehicleFactory = {
  createCar: (region: string) => (region === 'US' ? new USCar() : new EUCar()),
};
```

---

## Templates de Arquivo

### Template de contrato

```typescript
// src/features/[feature]/[feature].contract.ts

/**
 * API pública da feature [feature]
 */
export interface [Feature]Contract {
  /**
   * Descrição do método
   * @throws {ErrorType} Quando o erro acontece
   */
  methodName(param: Type): Promise<ReturnType>
}

export type [Feature]Result = {
  // definição do tipo
}

export type [Feature]Events = {
  '[feature]:event-name': PayloadType
}
```

### Template de serviço

```typescript
// src/features/[feature]/services/[feature].service.ts

import { [Feature]Contract } from '../[feature].contract'

export class [Feature]Service implements [Feature]Contract {
  constructor(
    private dependency1: Dependency1Type,
    private eventBus: EventBus
  ) {}

  async methodName(param: Type): Promise<ReturnType> {
    // 1. Valida
    // 2. Executa
    // 3. Emite eventos
    // 4. Retorna
  }
}

export const [feature]Service = new [Feature]Service(dep1, eventBus)
```

### Template de índice

```typescript
// src/features/[feature]/index.ts

// Exporte SÓ a API pública
export type { [Feature]Contract, [Feature]Result } from './[feature].contract'
export { [feature]Service } from './services/[feature].service'

// NÃO exporte detalhes internos da implementação
```

---

## Integração com o SIA

### Fluxo recomendado

1. **Planejamento:**
   - `@dev` [Arquitetura] com `*create-architecture` (template `fullstack-architecture-tmpl.yaml`)
   - Use este preset para padrões e estrutura; a Stack Tecnológica e os Padrões de Código alimentam as seções `## Tech Stack` e `## Coding Standards` da arquitetura

2. **Desenvolvimento:**
   - `@dev *develop {storyId}` seguindo os 5 padrões essenciais
   - Features novas pela estratégia da feature de referência

3. **Qualidade:**
   - `@pm` [Qualidade] (`*test-design`, `*qa-gate`) e `@validator` com a estratégia de testes definida
   - Metas de cobertura atendidas

### Templates relacionados

- `fullstack-architecture-tmpl.yaml`: documento principal de arquitetura
- `front-end-architecture-tmpl.yaml`: detalhes de frontend
- `story-tmpl.yaml`: formato da story

### Comandos

```bash
# Criar a arquitetura usando este preset
@dev *create-architecture

# Referenciar o preset
@dev "Siga os padrões do preset nextjs-react"
```

---

## Checklist para Features Novas

```markdown
Ao criar uma feature nova:

- [ ] Definir o contrato, se outras features vão usá-la
- [ ] Criar o repository para todo acesso a dados
- [ ] Implementar o serviço com a regra de negócio
- [ ] Usar o event bus na comunicação entre features
- [ ] Criar builders para as fixtures de teste
- [ ] Exportar só a API pública pelo index.ts
- [ ] Escrever testes com contratos mockados
- [ ] Documentar os pontos de integração

Ao integrar com uma feature existente:

- [ ] Importar SÓ o contrato, nunca a implementação
- [ ] Usar o event bus quando não precisar de resposta síncrona
- [ ] Mockar contratos nos testes
- [ ] Não criar dependência circular
```

---

## Histórico de Mudanças

| Data       | Versão | Mudanças                                                                                 |
| ---------- | ------ | ---------------------------------------------------------------------------------------- |
| 2026-10-16 | 1.2.0  | Porte para o SIA; seção de Proxy alinhada à documentação oficial do Next.js 16 (`proxy.ts`) |
| 2026-01-28 | 1.1.0  | Atualização para Next.js 16+, troca do Middleware pelo Proxy                             |
| 2025-01-27 | 1.0.0  | Versão inicial                                                                           |

---

_Tech Preset do SIA_
