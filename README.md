# Taskly

O Taskly é uma aplicação web de gestão pessoal de tarefas, desenvolvida como desafio técnico para a vaga de Fullstack sênior.

O projeto segue intencionalmente um **processo de engenharia spec-driven, assistido por IA e revisado por humanos**. A especificação inicial do produto e as decisões de arquitetura foram commitadas antes do bootstrap dos frameworks, de modo que o histórico do repositório reflete como a implementação foi de fato planejada e revisada.

## Status atual

**Fase:** aplicação implementada, em acabamento.

As duas aplicações estão funcionais e orquestradas por Docker Compose: cadastro, login, recuperação de senha, projetos, tarefas, tags, anexos privados, visualizações em lista e Kanban com drag-and-drop, e a interface localizada em pt-BR.

## Stack

### Backend

- PHP
- Laravel
- Laravel Sanctum
- PostgreSQL
- PHPUnit

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- lucide-react (ícones)
- @dnd-kit/core (drag-and-drop do Kanban)

### Engenharia

- API REST/JSON
- Docker Compose
- Mailpit (captura de e-mail em desenvolvimento)
- Desenvolvimento assistido por IA com rastreabilidade de revisão

## Arquitetura

```text
Next.js / React / TypeScript
            |
            | REST / JSON
            v
       PHP / Laravel
            |
            v
        PostgreSQL
```

O Laravel é a camada autoritativa de backend/domínio. Ele é dono de autenticação, autorização, validação, regras de negócio, persistência, uploads e do comportamento da API.

O Next.js é dono da experiência interativa do produto, incluindo navegação entre projetos, formulários de tarefa, visualizações de lista/Kanban, interface responsiva e interações no cliente.

O frontend não acessa o PostgreSQL diretamente.

## Instalação com Docker — recomendada

Pré-requisitos: Docker e Docker Compose.

As portas `3000`, `18000`, `8025` e `1025` precisam estar livres no host.

```bash
# 1. Configure o ambiente do backend
cp apps/api/.env.example apps/api/.env

# 2. Suba os serviços (postgres, api, web, mailpit)
docker compose up -d --build

# 3. Gere a chave da aplicação e crie o banco com dados de demonstração
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate --seed
```

Com os serviços no ar:

| Serviço | URL |
| --- | --- |
| Taskly | <http://127.0.0.1:3000> |
| API | <http://127.0.0.1:18000> |
| Mailpit | <http://127.0.0.1:8025> |

### Conta de demonstração

```text
demo@taskly.test
password
```

Criada pelo `DemoSeeder` com três projetos, cinco etiquetas e nove tarefas cobrindo os quatro status, incluindo uma tarefa atrasada.

> **Somente para desenvolvimento local e demonstração.** A senha é pública e o seeder não é executado quando `APP_ENV=production`.

### Testes e verificações

```bash
# Backend
docker compose exec api php artisan test
docker compose exec api ./vendor/bin/pint --test

# Frontend
docker compose exec web npm run lint
docker compose exec web npm run build
```

## Instalação sem Docker

Caminho alternativo, para rodar as duas aplicações diretamente no host.

### Pré-requisitos

Backend:

- PHP 8.3 ou superior (o `composer.json` exige `^8.3`);
- extensão `pdo_pgsql` — obrigatória para conectar ao PostgreSQL;
- Composer 2;
- PostgreSQL 18 em execução, com banco e usuário criados.

Frontend:

- Node.js 24 LTS;
- npm.

As demais extensões exigidas (`mbstring`, `openssl`, `tokenizer`, `xml`, `ctype`, `json`, `fileinfo`, `dom`, `filter`, `hash`, `iconv`, `libxml`, `pcre`, `phar`, `session`, `xmlwriter`) fazem parte de uma instalação padrão do PHP. Confira com:

```bash
cd apps/api && composer check-platform-reqs
```

### PostgreSQL

Crie o banco e o usuário que o `.env.example` espera:

```sql
CREATE USER taskly WITH PASSWORD 'taskly';
CREATE DATABASE taskly OWNER taskly;
```

### Backend

```bash
cd apps/api

composer install
cp .env.example .env
php artisan key:generate

# O .env.example já vem apontando para 127.0.0.1:5432
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=18000
```

### Frontend

Em outro terminal:

```bash
cd apps/web

npm ci
npm run dev -- --hostname 127.0.0.1 --port 3000
```

`NEXT_PUBLIC_API_URL` tem `http://127.0.0.1:18000` como padrão embutido, então não é obrigatório configurá-lo. Para deixar explícito:

```bash
cp .env.example .env.local
```

### E-mail no modo nativo

O `.env.example` usa `MAIL_MAILER=log`: a aplicação sobe sem nenhum servidor de e-mail e o link de redefinição de senha é gravado em `apps/api/storage/logs/laravel.log`.

Para clicar no link em uma interface de verdade, aponte para um Mailpit local:

```dotenv
MAIL_MAILER=smtp
MAIL_HOST=127.0.0.1
MAIL_PORT=1025
```

Isso funciona tanto com um Mailpit instalado no host quanto com o do `docker compose`, que publica a porta SMTP em `127.0.0.1:1025`.

## Recuperação de senha

O fluxo usa o Password Broker nativo do Laravel:

1. na tela de login, clique em **Esqueci minha senha**;
2. informe o e-mail (`demo@taskly.test` no ambiente de demonstração);
3. abra o Mailpit em <http://127.0.0.1:8025>;
4. abra a mensagem e clique em **Redefinir senha** — o link aponta para `/reset-password` no frontend;
5. defina a nova senha e faça login com ela.

Observações de segurança:

- a solicitação responde sempre a mesma mensagem genérica, exista ou não uma conta com aquele e-mail;
- os endpoints são limitados a 6 requisições por minuto;
- o token expira em 60 minutos e só pode ser usado uma vez;
- o token nunca é devolvido pela API.

## Escopo de produto exigido

O Taskly oferece:

- cadastro e login próprios por e-mail/senha;
- sessão autenticada persistente;
- múltiplos projetos pessoais;
- tarefas dentro dos projetos;
- título da tarefa;
- descrição curta;
- descrição completa;
- prazo com data e hora;
- tags;
- anexos e/ou fotos;
- campos de tarefa editáveis;
- visualização em lista;
- visualização em Kanban;
- valores de status:
  - não iniciada;
  - em andamento;
  - concluída;
  - cancelada.

Melhorias adicionais são tratadas como stretch goals e não podem comprometer a conclusão ou a confiabilidade do escopo obrigatório.

## Idioma

A experiência do produto e a documentação do projeto estão em português do Brasil (pt-BR).

Os contratos técnicos permanecem em inglês por serem contrato de API e de banco: valores de status (`not_started`, `in_progress`, `completed`, `cancelled`), campos de payload (`title`, `short_description`, `due_at`, `tag_ids`), rotas, chaves JSON, nomes de tabela e nomes de classe.

No backend, a localização usa os mecanismos nativos do Laravel: `APP_LOCALE=pt_BR` e os arquivos de tradução em `apps/api/lang/pt_BR/`.

## Documentação

- [Especificação de Produto e Técnica](docs/SPEC.md)
- [Arquitetura](docs/ARCHITECTURE.md)
- [Registro de Engenharia Assistida por IA](docs/AI_USAGE.md)
- [Architecture Decision Records](docs/adr/)

## Estrutura do repositório

```text
taskly/
├── apps/
│   ├── api/              # Laravel
│   └── web/              # Next.js
├── docs/
│   └── adr/
├── docker/
├── docker-compose.yml
└── README.md
```

## Princípios de engenharia

- Segurança e autorização são aplicadas no servidor.
- As regras de negócio permanecem no Laravel, não no navegador.
- Os contratos de API são explícitos e testáveis.
- Os testes automatizados focam em risco de negócio/segurança, não em um percentual arbitrário de cobertura.
- Tecnologia só é adicionada quando há justificativa concreta de produto ou de engenharia.
- Output gerado por IA é revisado, corrigido, testado e documentado antes de ser aceito.
- Decisões de arquitetura e trade-offs relevantes são registrados conforme o projeto evolui.

## Desenvolvimento assistido por IA

A IA é usada como acelerador de engenharia em tarefas como exploração de arquitetura, implementação, code review, geração de testes, refatoração, revisão de segurança e documentação.

Ela **não** é tratada como autoridade autônoma de engenharia.

As interações relevantes — especialmente sugestões rejeitadas ou corrigidas — estão registradas em [`docs/AI_USAGE.md`](docs/AI_USAGE.md).

## Melhorias futuras

- Pipeline de CI (GitHub Actions).
- Ambiente publicado.
- Cobertura end-to-end com Playwright.
