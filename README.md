# Taskly

O Taskly é uma aplicação web de gestão pessoal de tarefas, desenvolvida como desafio técnico para a vaga de Fullstack sênior.

O projeto segue intencionalmente um **processo de engenharia spec-driven, assistido por IA e revisado por humanos**. A especificação inicial do produto e as decisões de arquitetura foram commitadas antes do bootstrap dos frameworks, de modo que o histórico do repositório reflete como a implementação foi de fato planejada e revisada.

## Status atual

**Fase:** aplicação implementada, em acabamento.

As duas aplicações estão funcionais e orquestradas por Docker Compose: cadastro, login, projetos, tarefas, tags, anexos privados, visualizações em lista e Kanban com drag-and-drop, e a interface localizada em pt-BR.

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

## Como rodar localmente

Pré-requisitos: Docker e Docker Compose.

```bash
# 1. Configure o ambiente do backend
cp apps/api/.env.example apps/api/.env

# 2. Suba os serviços (postgres, api, web)
docker compose up -d --build

# 3. Gere a chave da aplicação e rode as migrations
docker compose exec api php artisan key:generate
docker compose exec api php artisan migrate
```

Com os serviços no ar:

- frontend: <http://127.0.0.1:3000>
- API: <http://127.0.0.1:18000>

### Testes e verificações

```bash
# Backend
docker compose exec api php artisan test

# Frontend
docker compose exec web npm run lint
docker compose exec web npm run build
```

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

- Recuperação de senha ("Esqueci minha senha"): ainda não há backend de password reset, então o fluxo não é oferecido na interface.
- Pipeline de CI (GitHub Actions).
- Ambiente publicado.
- Cobertura end-to-end com Playwright.
