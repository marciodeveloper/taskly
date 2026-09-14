# ADR-002 — Laravel owns the domain; Next.js owns the product UI

## Status

Accepted.

## Context

Taskly must demonstrate senior fullstack capability while remaining deliverable within a short technical-challenge window.

Relevant constraints and context:

- PHP/Laravel is the candidate's primary backend stack and central to the target role.
- UEX uses React/Next.js frequently according to recruiting interview context.
- The challenge explicitly values fullstack implementation, APIs, code quality, architecture, and technical decisions.
- Using Next.js as the database/backend authority would underrepresent Laravel expertise.
- Using Laravel server-rendered UI only would not demonstrate the React/Next.js alignment discussed during the interview.

## Decision

Laravel is the authoritative application/domain backend.

Next.js is the dedicated frontend application and consumes Laravel through a REST/JSON boundary.

### Laravel owns

- authentication/session behavior;
- authorization;
- validation;
- business rules;
- persistence;
- task/project ownership;
- tags;
- attachments;
- API contracts/resources;
- backend logging and server-side security.

### Next.js owns

- routes/layouts and application shell;
- UI rendering;
- project navigation;
- task forms;
- list/Kanban presentation;
- drag-and-drop/client interactions;
- optimistic UI where appropriate;
- responsive/accessibility behavior;
- frontend API client and presentation state.

### PostgreSQL boundary

Next.js must not access PostgreSQL directly.

Every domain mutation and protected read is authorized and processed by Laravel.

## Consequences

### Positive

- PHP/Laravel remains central to the implementation narrative and engineering depth.
- React/Next.js experience is demonstrated using a real frontend boundary rather than decorative components.
- The REST API becomes a genuine application contract.
- Backend authorization remains centralized and independently testable.
- Frontend and backend concerns remain explainable during technical review.

### Trade-offs

- two runtimes must be configured and deployed;
- authentication/session topology across frontend and backend requires deliberate configuration;
- API contracts can drift unless types/tests/review keep them aligned;
- Docker/CI must support both PHP and Node ecosystems.

## Alternatives considered

### Next.js fullstack only

Rejected. It would simplify deployment but remove Laravel from the core architecture despite its relevance to the role and candidate profile.

### Laravel with Blade/Livewire only

Rejected for this challenge. It is a valid product architecture, but would not demonstrate the React/Next.js environment discussed in the recruiting interview.

### Laravel API + separate React SPA without Next.js

Viable, but Next.js was selected because it better matches the technology context provided by UEX and provides a structured modern React application environment.

## Guardrails

- Do not place authorization only in Next.js.
- Do not duplicate domain rules as competing sources of truth.
- Do not introduce backend logic into Next.js solely to avoid an API call.
- Do not create Laravel abstractions that exist only to appear architecturally sophisticated.
- Prefer explicit, testable contracts over hidden coupling.

## Review trigger

Revisit if a concrete requirement makes the HTTP boundary materially harmful or if deployment constraints prove stateful frontend/backend integration impractical. Any revision must preserve server-side domain/security ownership.
