# Como documentar endpoints com Swagger

---

## 1. Controller

```typescript
@ApiBearerAuth() // remova se o controller for público
@Controller('users') // inglês, igual ao padrão REST
export class UserController {}
```

---

## 2. Endpoint

Busca por ID:

```typescript
@Get(':id')
@ApiOperation({ summary: 'Descrição curta em português' })
@ApiParam({ name: 'id', description: 'UUID do recurso', example: '550e8400-e29b-41d4-a716-446655440000' })
@ApiOkResponse({ type: ResourceResponseDto })
@ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
@ApiNotFoundResponse({ description: 'Recurso não encontrado.' })
findOne(@Param('id') id: string) {}
```

Listagem com paginação:

```typescript
@Get()
@ApiOperation({ summary: 'Descrição curta em português' })
@ApiQuery({ name: 'page', required: false, example: 1 })
@ApiQuery({ name: 'limit', required: false, example: 20 })
@ApiOkResponse({ type: [ResourceResponseDto] })
@ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
findAll() {}
```

**Decorator de sucesso e respostas de erro por método HTTP:**

| Método      | Sucesso                                    | Erros comuns                             |
| ----------- | ------------------------------------------ | ---------------------------------------- |
| GET         | `@ApiOkResponse`                           | 401, 404 (por ID)                        |
| POST        | `@ApiCreatedResponse`                      | 400 (`@ApiBadRequestResponse`), 401      |
| PATCH / PUT | `@ApiOkResponse`                           | 400 (`@ApiBadRequestResponse`), 401, 404 |
| DELETE      | `@ApiNoContentResponse` + `@HttpCode(204)` | 401, 404                                 |

---

## 3. DTOs de request

```typescript
export class CreateResourceDto {
  @ApiProperty({ description: 'Em português', example: 'example value' })
  field: string;

  @ApiPropertyOptional({
    description: 'Em português',
    example: 'example value',
  })
  optionalField?: string;
}
```

Enum — sempre passe `enumName` para evitar schemas duplicados na UI:

```typescript
@ApiProperty({ enum: UserRole, enumName: 'UserRole' })
role: UserRole;
```

DTO aninhado e array de objetos — use `type: () =>` (lazy) para o Swagger resolver a referência corretamente:

```typescript
@ApiProperty({ type: () => AddressDto })
address: AddressDto;

@ApiProperty({ type: () => AddressDto, isArray: true })
addresses: AddressDto[];
```

Campo nullable:

```typescript
@ApiProperty({ nullable: true, example: null })
deletedAt: Date | null;
```

DTO de atualização — importe `PartialType` de `@nestjs/swagger` (não de `@nestjs/mapped-types`):

```typescript
import { PartialType } from '@nestjs/swagger';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {}
```

---

## 4. DTOs de response

```typescript
export class ResourceResponseDto {
  @ApiProperty({ description: 'Em português', example: 'example value' })
  field: string;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  role: UserRole;

  @ApiProperty({ type: () => AddressDto })
  address: AddressDto;

  @ApiProperty({ nullable: true, example: null })
  deletedAt: Date | null;

  @ApiHideProperty()
  passwordHash: string; // não aparece na UI
}
```

---

## Exemplo completo (CRUD)

```typescript
@ApiBearerAuth()
@Controller('users')
export class UserController {
  @Post()
  @ApiOperation({ summary: 'Cria um novo usuário' })
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  create(@Body() dto: CreateUserDto) {}

  @Get()
  @ApiOperation({ summary: 'Lista todos os usuários' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiOkResponse({ type: [UserResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  findAll() {}

  @Get(':id')
  @ApiOperation({ summary: 'Busca um usuário pelo ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  findOne(@Param('id') id: string) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza parcialmente um usuário' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiOkResponse({ type: UserResponseDto })
  @ApiBadRequestResponse({ description: 'Dados inválidos.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {}

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove um usuário pelo ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiNoContentResponse()
  @ApiUnauthorizedResponse({ description: 'Token inválido ou ausente.' })
  @ApiNotFoundResponse({ description: 'Usuário não encontrado.' })
  remove(@Param('id') id: string) {}
}
```
