# Domain Errors Architecture

## Overview

Esta aplicação implementa um sistema robusto de erros de domínio seguindo os princípios da Arquitetura Hexagonal.

## Estrutura

### Shared Domain Errors (`src/shared/errors/`)

**Classe Base:**

- `DomainError` - Classe abstrata base para todos os erros de domínio

### Códigos Base:

Os códigos de erro do domínio representam **conceitos de negócio**, não protocolos:

| Domain Code                | Significado no Negócio                   | Exemplos                             |
| -------------------------- | ---------------------------------------- | ------------------------------------ |
| `VALIDATION_ERROR`         | Dados não atendem critérios de validação | Email malformado, campo obrigatório  |
| `AUTHENTICATION_REQUIRED`  | Identidade não verificada                | Admin não encontrado                 |
| `INSUFFICIENT_PERMISSIONS` | Operação negada por permissões           | Usuário comum tentando criar admin   |
| `RESOURCE_NOT_FOUND`       | Entidade solicitada inexistente          | Usuário não existe no sistema        |
| `RESOURCE_ALREADY_EXISTS`  | Tentativa de duplicação                  | Email já cadastrado                  |
| `BUSINESS_RULE_VIOLATION`  | Regra específica violada                 | Usuário inativo não pode fazer login |

### Module-Specific Errors (`src/modules/*/domain/errors/`)

**Cada módulo pode:**

1. **Reutilizar códigos base** do `DomainErrorCodes`
2. **Implementar erros customizados** que estendem `DomainError`

#### Exemplo - User Module:

```typescript
// Implementação de erros específicos usando códigos base
export class InvalidEmailFormatError extends DomainError {
  readonly code = DomainErrorCodes.VALIDATION_ERROR;

  constructor(email: string) {
    super(`Invalid email format: '${email}'`);
  }
}
```

## Fluxo de Tratamento de Erros

### 1. Camada de Domínio

- **Responsabilidade:** Expressar falhas em **termos de negócio**
- **NÃO conhece:** HTTP, REST, status codes, frameworks
- **Conhece apenas:** Regras de negócio, entidades, conceitos do domínio
- **Exemplo:**

```typescript
static validateUserCreationPermission(adminUser: UserModel | null): void {
  if (!adminUser) {
    // Erro de NEGÓCIO: administrador não foi encontrado
    throw new AdminNotFoundError();
  }

  if (!adminUser.hasRole(RoleEnum.ADMIN)) {
    // Erro de NEGÓCIO: permissões insuficientes para operação
    throw new InsufficientPermissionsError('create other users');
  }
}
```

### 2. Camada de Apresentação

- **Responsabilidade:** Traduzir erros de domínio para protocolos específicos (HTTP)
- **Conhece:** Protocolo de comunicação, não conceitos de negócio
- **Conversão:** `DomainError` → `HttpException` (ponte entre domínio e infraestrutura)
- **Resultado:** Cliente recebe resposta HTTP com status e mensagem padronizados

## Benefícios

### **Type Safety**

- Enums garantem códigos consistentes
- TypeScript previne erros de digitação

### **Reutilização**

- Códigos base compartilhados entre módulos
- Evita duplicação de lógica comum

### **Manutenibilidade**

- Fácil identificação de tipos de erro
- Tratamento centralizado e consistente

### **Extensibilidade**

- Novos módulos podem reutilizar códigos base
- Fácil adição de novos tipos de erro específicos

## Como Adicionar Novos Erros

### Para Erros Comuns (Todos os Módulos):

1. Adicione o código ao `DomainErrorCodes` com **semântica de negócio** (não HTTP)
2. Documente o significado de negócio no README

### Para Erros Específicos de Módulo:

1. Implemente a classe de erro estendendo `DomainError` usando códigos **semânticos**
2. Atualize o service de aplicação para **traduzir** o erro para HTTP adequado
3. Adicione testes para o novo comportamento

## Exemplo de Uso Completo

### 🔄 **Reutilização em Diferentes Protocolos**

```typescript
// Mesmo erro de domínio, protocolos diferentes:

// HTTP/REST
throw new ConflictException(error.message);

// GraphQL
throw new UserInputError(error.message);

// gRPC
throw { code: Status.ALREADY_EXISTS, message: error.message };
```
