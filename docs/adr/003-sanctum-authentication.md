# ADR-003 — Usar Laravel Sanctum para autenticação first-party

## Status

Aceito, com os detalhes de deploy a serem finalizados durante o bootstrap do ambiente.

## Contexto

O Taskly exige:

- cadastro próprio por e-mail/senha;
- login;
- sessões autenticadas persistentes;
- logout;
- um frontend Next.js first-party;
- uma API backend em Laravel.

Não há requisito de OAuth de terceiros nem de emissão de tokens de acesso portáveis para clientes externos.

## Decisão

Usar o Laravel Sanctum com autenticação stateful de navegador, baseada em sessões do Laravel e cookies seguros HTTP-only.

O frontend se autenticará no Laravel como cliente first-party.

Fluxo esperado:

1. o frontend inicializa a proteção CSRF;
2. a requisição de cadastro/login é enviada ao Laravel;
3. o Laravel cria a sessão autenticada;
4. o navegador armazena o cookie de sessão conforme a política de cookies seguros;
5. as chamadas de API seguintes se apoiam na sessão autenticada;
6. o logout invalida a sessão no servidor.

## Propriedades de segurança

- O hash de senha usa os padrões do framework Laravel.
- O estado de autenticação não é armazenado como um JWT próprio no local storage do navegador.
- A proteção CSRF permanece habilitada.
- Os cookies usam configurações seguras em produção.
- A autorização continua sendo avaliada de forma independente para cada recurso protegido.
- Estar autenticado nunca implica, por si só, ser dono de um project/task.

## Topologia local e de deploy

Os valores exatos serão finalizados quando o runtime for provisionado, incluindo:

- origem do frontend;
- origem da API;
- `SANCTUM_STATEFUL_DOMAINS`;
- `SESSION_DOMAIN`;
- origens permitidas em CORS;
- comportamento de HTTPS/cookies seguros;
- portas de desenvolvimento local.

O deploy preferencial é manter frontend e API sob o mesmo domínio pai registrável quando for prático, por exemplo:

```text
app.example.com
api.example.com
```

ou colocá-los atrás de um reverse proxy em uma topologia que preserve o comportamento direto de sessão first-party.

## Consequências

### Positivas

- modelo de autenticação nativo do Laravel;
- cookie de sessão seguro e HTTP-only;
- proteção CSRF explícita;
- nenhum protocolo próprio de refresh/revogação de token;
- exposição reduzida em comparação a armazenar JWTs bearer em storage acessível pelo navegador;
- adequado a uma aplicação de navegador first-party.

### Trade-offs

- CORS, domínios de cookie, política same-site e stateful domains precisam ser configurados com cuidado;
- o desenvolvimento local usa origens distintas para frontend e backend e exige configuração de ambiente deliberada;
- futuros clientes de API de terceiros ou mobile podem exigir uma estratégia de token diferente.

## Alternativas consideradas

### Autenticação com JWT próprio

Rejeitada para o produto atual. Adiciona emissão, armazenamento, rotação/revogação e refresh de token, além de decisões de segurança, sem um requisito que justifique a complexidade adicional.

### NextAuth/Auth.js como autoridade primária de autenticação

Rejeitada porque o Laravel é a camada autoritativa de backend/domínio e deve ser dono da autenticação de usuários nesta arquitetura.

### Autenticação apenas via OAuth

Rejeitada porque o desafio técnico exige explicitamente autenticação própria por e-mail/senha e não requer integração com Google ou Microsoft.

## Expectativas de teste

A cobertura automatizada deve verificar, no mínimo:

- cadastro bem-sucedido;
- validação de e-mail duplicado;
- login válido;
- credenciais inválidas;
- acesso com sessão autenticada;
- rejeição de acesso não autenticado;
- logout/invalidação de sessão;
- autorização entre usuários permanece bloqueada após a autenticação.

## Gatilho de revisão

Revisitar apenas se a infraestrutura de deploy impedir autenticação confiável por cookie first-party, ou se requisitos futuros de produto adicionarem clientes externos/mobile que se beneficiem materialmente de autenticação de API baseada em token.
