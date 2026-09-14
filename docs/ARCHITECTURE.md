# Taskly — Architecture

## 1. Architectural intent

Taskly is designed as a small, production-minded fullstack product rather than a single-framework CRUD demo.

The architecture deliberately keeps PHP/Laravel as the authoritative backend and domain layer while using Next.js/React/TypeScript for the user experience.

This split reflects three goals:

1. keep business rules, authorization, validation, persistence, and API behavior centralized in Laravel;
2. use Next.js/React for a polished interactive frontend aligned with a modern product stack;
3. keep the boundaries explicit enough to be testable and explainable within a three-day technical challenge.

## 2. High-level view

```text
Browser
  |
  v
Next.js / React / TypeScript
  |
  | HTTPS + JSON
  v
Laravel REST API
  |
  +--> Authentication / Sanctum
  +--> Authorization / Policies
  +--> Validation / Form Requests
  +--> Application Actions / Services
  +--> File Storage
  +--> Logging
  |
  v
PostgreSQL
```

The frontend never accesses PostgreSQL directly.

## 3. Repository layout

Target monorepo structure:

```text
taskly/
├── apps/
│   ├── api/              # Laravel application
│   └── web/              # Next.js application
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── AI_USAGE.md
│   └── adr/
├── .github/
│   └── workflows/
├── docker/
├── docker-compose.yml
└── README.md
```

Framework directories are intentionally not created until the specification and initial architecture decisions exist in Git history.

## 4. Backend responsibilities — Laravel

Laravel is the source of truth for application behavior.

It owns:

- registration, login, logout, and authenticated session behavior;
- user identity;
- project and task ownership;
- all authorization decisions;
- request validation;
- task status rules;
- persistence;
- tags and task/tag relationships;
- attachment upload/download authorization;
- activity/event logging where implemented;
- REST API resource contracts;
- backend automated tests.

The backend must remain secure even if the frontend validation is bypassed entirely.

## 5. Frontend responsibilities — Next.js

Next.js owns the product experience.

It is responsible for:

- routes and layouts;
- authenticated application shell;
- project navigation;
- task list view;
- task Kanban view;
- forms and field-level feedback;
- loading/error/empty states;
- responsive behavior;
- drag-and-drop interactions;
- optimistic UI where rollback is safe;
- frontend type definitions and API-client concerns;
- frontend and end-to-end tests where applicable.

The frontend must not duplicate backend business rules as an authority. Client-side validation exists for usability; Laravel validation remains authoritative.

## 6. API boundary

Communication between `apps/web` and `apps/api` uses HTTP/JSON.

The API should favor conventional REST semantics:

- collection endpoints for projects/tasks/tags;
- resource endpoints for reads/updates/deletes;
- nested project/task endpoints where the parent relationship improves authorization clarity;
- explicit status/reorder endpoints only when they result in a clearer contract than generic resource updates.

API payloads should be transformed through Laravel Resources or equivalent stable serializers rather than exposing arbitrary model serialization.

## 7. Authentication

The preferred strategy is Laravel Sanctum with stateful, secure HTTP-only cookie/session authentication for the first-party Next.js frontend.

Reasons:

- first-party browser client;
- native Laravel integration;
- CSRF protection;
- reduced token exposure in browser JavaScript;
- straightforward revocation/session behavior;
- no product requirement justifies custom JWT complexity.

The final deployment topology (same parent domain versus local development origins) must be reflected in Sanctum stateful-domain, cookie, CORS, and CSRF configuration.

## 8. Authorization model

Ownership flows through the project relationship:

```text
User
  |
  +--> Project
          |
          +--> Task
                  |
                  +--> Attachment
```

Tags are also user-scoped.

Authorization should combine:

- Laravel Policies for explicit resource abilities;
- ownership-scoped queries for nested resources;
- tests covering horizontal privilege escalation/IDOR scenarios.

A URL containing valid resource IDs must never be sufficient to authorize access.

## 9. Application/service layer

The project should avoid both extremes:

- controllers containing all business logic;
- unnecessary enterprise abstractions for simple CRUD.

Baseline pattern:

```text
HTTP request
   |
   v
Form Request
   |
   v
Controller
   |
   v
Action / Service (when behavior is non-trivial)
   |
   +--> Policy / authorization
   +--> transaction if needed
   +--> Eloquent models
   +--> side effects / activity log
   |
   v
API Resource
```

Simple operations may remain concise in controllers when extracting them would not improve clarity.

## 10. Data layer

PostgreSQL is the selected relational database.

Eloquent remains the primary persistence abstraction.

Data-access rules:

- relationships must be explicit;
- foreign keys and indexes support ownership/status/deadline queries;
- avoid N+1 queries;
- use database transactions for multi-step state changes when consistency requires them;
- prefer database constraints where they protect invariants reliably.

No repository-pattern abstraction will be added unless an actual implementation need justifies it.

## 11. Task status model

Canonical backend values:

- `not_started`
- `in_progress`
- `completed`
- `cancelled`

PHP backed enums are preferred if supported naturally by the selected Laravel/PHP version.

When status changes to completed, the backend may set `completed_at`. When a completed task leaves that state, `completed_at` should be cleared.

## 12. Kanban behavior

The Kanban UI maps one column to each canonical task status.

Expected interaction:

```text
drag card
   |
   v
optimistic UI update
   |
   v
Laravel API request
   |
   +--> validation
   +--> authorization
   +--> persistence
   |
   v
success -> keep state
failure -> rollback + user feedback
```

Optimistic behavior is an enhancement, not permission to sacrifice correctness.

## 13. File uploads

Laravel owns upload validation and storage.

Security rules:

- validate MIME type and size server-side;
- never trust client paths;
- generate safe stored paths/names;
- authorize attachment reads/deletes through task ownership;
- avoid making private task attachments publicly enumerable by default.

The concrete storage backend may start with Laravel-compatible local storage and evolve to S3-compatible object storage for deployment if needed.

## 14. Testing architecture

### Backend

Pest or PHPUnit will cover:

- feature/API behavior;
- authorization boundaries;
- validation;
- resource ownership;
- task status/domain behavior;
- attachment security.

### Frontend

Vitest/React Testing Library may cover focused component and state behavior where it provides useful confidence.

### End-to-end

Playwright is preferred for the primary product journey across the real frontend/backend boundary.

The strategy prioritizes risk and behavior rather than chasing an arbitrary coverage percentage.

## 15. Docker and local development

The intended local/development topology is Docker Compose with separate services for at least:

- web;
- api;
- PostgreSQL;
- Redis only if justified by session/cache/queue usage.

A contributor should eventually be able to bootstrap the complete application from the repository README without depending on host-specific PHP/Node/PostgreSQL installations.

## 16. CI/CD direction

GitHub Actions should eventually validate at minimum:

- backend dependency installation;
- backend lint/static checks where selected;
- backend automated tests;
- frontend dependency installation;
- frontend lint/typecheck;
- frontend tests;
- production builds where practical.

Deployment automation is a stretch goal after the required application scope is stable.

## 17. AI-assisted engineering boundary

AI tools are part of the engineering workflow but never own architectural or security decisions.

AI may assist with:

- implementation;
- test generation;
- refactoring;
- code review;
- security review;
- documentation.

Human review remains mandatory, and relevant interactions/corrections are recorded in `docs/AI_USAGE.md`.

## 18. Explicit trade-offs

### Separate Laravel and Next.js runtimes

Cost:

- more deployment/configuration surface;
- cross-origin/session configuration must be correct;
- two build systems.

Benefit:

- clear frontend/backend responsibilities;
- genuine REST API implementation;
- demonstrates fullstack integration across the technologies selected for the challenge;
- backend remains independently testable and reusable.

### No Python service in the MVP

Python is deliberately not introduced only to demonstrate another language. The Taskly MVP has no domain problem that justifies a Python service.

If future requirements introduce document processing, AI/NLP workloads, analytical pipelines, or specialized background processing, a Python worker/service could be evaluated then.

### No premature microservices

The product is a small personal task manager. Laravel remains a modular monolith backend. Splitting domain capabilities into services during this challenge would add operational complexity without corresponding product value.

## 19. Evolution principles

Future changes should preserve these principles:

- domain/security rules remain server-side;
- frontend/backed contracts are explicit;
- new technology requires a product or engineering justification;
- avoid abstractions without concrete pressure;
- prefer observable, testable behavior;
- architecture should remain explainable in a technical review.
