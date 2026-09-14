# Taskly

Taskly is a personal task-management web application being developed as a senior Fullstack technical challenge.

The project is intentionally following a **spec-driven, AI-assisted, human-reviewed engineering process**. The initial product specification and architecture decisions were committed before framework bootstrapping so the repository history reflects how the implementation was actually planned and reviewed.

## Current status

**Phase:** specification and architecture.

No application framework has been bootstrapped yet.

## Planned stack

### Backend

- PHP
- Laravel
- Laravel Sanctum
- PostgreSQL
- Pest/PHPUnit

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Playwright for end-to-end coverage

### Engineering

- REST/JSON API
- Docker Compose
- GitHub Actions
- AI-assisted development with review traceability

## Architecture

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

Laravel is the authoritative backend/domain layer. It owns authentication, authorization, validation, business rules, persistence, uploads, and API behavior.

Next.js owns the interactive product experience, including project navigation, task forms, list/Kanban views, responsive UI, and client interactions.

The frontend does not access PostgreSQL directly.

## Required product scope

Taskly will provide:

- own e-mail/password registration and login;
- persistent authenticated session;
- multiple personal projects;
- tasks inside projects;
- task title;
- short description;
- full description;
- deadline with date and time;
- tags;
- attachments and/or photos;
- editable task fields;
- list view;
- Kanban view;
- status values:
  - not started;
  - in progress;
  - completed;
  - cancelled.

Additional enhancements are treated as stretch goals and must not compromise completion or reliability of the required scope.

## Documentation

- [Product & Technical Specification](docs/SPEC.md)
- [Architecture](docs/ARCHITECTURE.md)
- [AI-Assisted Engineering Log](docs/AI_USAGE.md)
- [Architecture Decision Records](docs/adr/)

## Repository direction

The target monorepo structure is:

```text
taskly/
├── apps/
│   ├── api/              # Laravel
│   └── web/              # Next.js
├── docs/
│   └── adr/
├── .github/
│   └── workflows/
├── docker/
├── docker-compose.yml
└── README.md
```

The `apps/` directories will be created when the framework bootstrap phase begins.

## Engineering principles

- Security and authorization are enforced server-side.
- Business rules remain in Laravel, not in the browser.
- API contracts are explicit and testable.
- Automated tests focus on business/security risk, not arbitrary coverage percentage.
- Technology is added only when it has a concrete product or engineering justification.
- AI-generated output is reviewed, corrected, tested, and documented before acceptance.
- Architectural decisions and meaningful trade-offs are recorded as the project evolves.

## AI-assisted development

AI is used as an engineering accelerator for tasks such as architecture exploration, implementation, code review, test generation, refactoring, security review, and documentation.

It is **not** treated as an autonomous engineering authority.

Meaningful AI interactions — especially rejected or corrected suggestions — are recorded in [`docs/AI_USAGE.md`](docs/AI_USAGE.md).

## Next milestone

The next milestone is framework/environment bootstrap:

1. create the Laravel application under `apps/api`;
2. create the Next.js application under `apps/web`;
3. define Docker Compose services;
4. configure PostgreSQL;
5. finalize the authentication ADR;
6. implement the first vertical slice: registration/authentication.

Local setup instructions will be added as soon as the runtime environment exists.
