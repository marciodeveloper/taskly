# Taskly API

Backend autoritativo do Taskly, responsável por autenticação, autorização, validação, regras de negócio, persistência, anexos privados e contratos da API REST.

## Stack

- PHP 8.3+
- Laravel
- Laravel Sanctum
- PostgreSQL
- PHPUnit

## Responsabilidades principais

- cadastro, login, logout e sessão autenticada;
- recuperação de senha com Password Broker do Laravel;
- ownership de projetos, tarefas, tags e anexos;
- autorização com Policies;
- validação com Form Requests;
- serialização da API com Laravel Resources;
- upload e download autorizado de anexos privados;
- persistência em PostgreSQL;
- testes automatizados de backend.

O frontend Next.js não acessa o banco diretamente. Toda operação de domínio passa pela API Laravel.

## Estrutura relevante

```text
apps/api/
├── app/
│   ├── Actions/
│   ├── Http/
│   │   ├── Controllers/
│   │   ├── Requests/
│   │   └── Resources/
│   ├── Models/
│   └── Policies/
├── database/
│   ├── factories/
│   ├── migrations/
│   └── seeders/
├── routes/
└── tests/
```

## Desenvolvimento local

O caminho recomendado é subir o monorepo pela raiz:

```bash
cp apps/api/.env.example apps/api/.env
docker compose up -d --build
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed
```

A API fica disponível em:

```text
http://127.0.0.1:18000
```

## Testes e estilo

```bash
docker compose exec api php artisan test
docker compose exec api ./vendor/bin/pint --test
```

## Produção

Em produção, o Laravel roda em container próprio atrás do Nginx e não expõe diretamente o PostgreSQL. Os anexos ficam em armazenamento privado persistente e o deploy usa exatamente o SHA aprovado pela pipeline do GitHub Actions.

A documentação principal do projeto está no [`README.md`](../../README.md), com detalhes adicionais em [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) e [`docs/AI_USAGE.md`](../../docs/AI_USAGE.md).
