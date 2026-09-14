# ADR-001 — Use a monorepo for Taskly

## Status

Accepted.

## Context

Taskly is one product with two application runtimes:

- a Laravel/PHP backend;
- a Next.js/React/TypeScript frontend.

The technical challenge has a short delivery window and requires the complete source code, documentation, prompts, and architecture decisions to be easy to review.

Using separate repositories would add coordination overhead without providing a meaningful product benefit for this scope.

## Decision

Taskly will use a single Git repository containing both applications and shared project documentation.

Target layout:

```text
taskly/
├── apps/
│   ├── api/
│   └── web/
├── docs/
├── .github/
├── docker/
├── docker-compose.yml
└── README.md
```

## Consequences

### Positive

- one clone contains the complete technical case;
- frontend/backend changes can be reviewed together;
- CI can validate both applications from one workflow boundary;
- documentation and AI-development logs remain close to the code they describe;
- local Docker orchestration is simpler to explain and operate;
- release/demo preparation is easier within the challenge timeframe.

### Trade-offs

- the repository contains different ecosystems and dependency managers;
- CI jobs must be scoped so PHP and Node pipelines remain independent;
- tooling should avoid assuming that all packages share one runtime.

## Alternatives considered

### Separate `taskly-api` and `taskly-web` repositories

Rejected for this challenge because it adds repository, versioning, documentation, and review overhead without a requirement for independent ownership or release cycles.

### Laravel-only repository with server-rendered frontend

Rejected as the target architecture intentionally demonstrates Laravel as the backend/domain layer and Next.js/React as the frontend product layer.

## Review trigger

Revisit this decision only if the product evolves into independently owned/deployed services where repository separation creates measurable operational or organizational value.
