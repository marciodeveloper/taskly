# Taskly — AI-Assisted Engineering Log

## Purpose

Taskly uses AI as an engineering accelerator, not as an autonomous software-development authority.

AI tools may assist with architecture exploration, implementation, refactoring, automated tests, security review, documentation, and debugging. Every relevant output is subject to human review before it becomes a project decision or is integrated into the codebase.

This document records meaningful AI-assisted work with emphasis on:

- engineering context;
- the prompt/goal;
- the useful contribution;
- human review;
- incorrect, incomplete, or excessive suggestions;
- the final decision.

The goal is traceability rather than recording every trivial autocomplete.

---

## Logging format

Each relevant interaction uses the following structure:

```text
AI-XXX — Title
Date:
Tool/model:
Goal:
Prompt/context:
AI contribution:
Human review:
Correction/rejection:
Final decision:
Related files/commits:
```

---

## AI-001 — Interpret the technical challenge and define an evaluation strategy

**Date:** 2026-09-14  
**Tool/model:** ChatGPT  
**Goal:** Analyze the UEX technical challenge before implementation and identify what the submission must demonstrate beyond basic CRUD functionality.

### Prompt/context

The challenge document was supplied in full. The requested analysis focused on how to create a submission that performs strongly against the visible evaluation criteria rather than merely satisfying the minimum functional scope.

Relevant context included:

- the role is senior Fullstack;
- the challenge is Taskly, a personal task-management system;
- the delivery window is three calendar days;
- the company explicitly evaluates functionality, architecture/code quality, AI usage, documentation, technical communication, and work beyond the minimum scope;
- the submission must include source code, README, technical Spec, prompt records, deployment when possible, and a technical video.

### AI contribution

The analysis recommended treating the project as a production-minded MVP and aligning the engineering process with the scoring model. It highlighted that documentation and AI traceability should be created during development instead of reconstructed retrospectively at the end.

It also recommended:

- writing a technical specification before implementation;
- maintaining architecture decisions in Git;
- protecting authorization boundaries with automated tests;
- prioritizing a polished Kanban/list experience;
- keeping extras focused on product/engineering value instead of feature quantity.

### Human review

Accepted. The strategy is consistent with the explicit challenge criteria and does not add unsupported product requirements to the mandatory scope.

### Correction/rejection

None for the high-level evaluation strategy.

### Final decision

Use a spec-driven, traceable development workflow and optimize the submission for completeness, engineering quality, AI review evidence, documentation, and presentation — not raw feature count.

### Related files/commits

- `docs/SPEC.md`

---

## AI-002 — Frontend/backend stack exploration and correction

**Date:** 2026-09-14  
**Tool/model:** ChatGPT  
**Goal:** Select a stack that reflects both the candidate's strongest expertise and technology context disclosed during the recruiting interview.

### Prompt/context

Additional interview context was provided after the initial challenge analysis:

- UEX uses React/Next.js frequently;
- Python is used occasionally;
- PHP/Laravel is central to the target role;
- the candidate explicitly told recruiting that PHP is his primary language and Laravel is his strongest backend stack.

### AI contribution

An intermediate recommendation suggested using Next.js/React/TypeScript as the main fullstack application because of the company's React/Next.js usage.

### Human review

The candidate challenged this recommendation. Removing Laravel would create a mismatch between:

- the core of the role;
- the candidate's stated primary expertise during the interview;
- the technical narrative presented to evaluators.

That feedback materially changed the architecture.

### Correction/rejection

**Rejected:** Next.js replacing Laravel as the main backend/application architecture.

The correction was to keep Laravel as the authoritative backend/domain layer and use Next.js/React/TypeScript as a dedicated frontend consuming the Laravel REST API.

Python was deliberately excluded from the MVP because no current Taskly requirement justifies a Python service. Adding it only to demonstrate another language would increase complexity without product value.

### Final decision

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

Responsibilities:

- Laravel: authentication, authorization, validation, business rules, persistence, uploads, API.
- Next.js: rendering, navigation, forms, Kanban/list interactions, responsive product experience.
- PostgreSQL: relational source of truth.

### Why this interaction matters

This is an example where AI output was not accepted at face value. Human project/interview context exposed a strategic weakness in the initial recommendation, and the architecture was revised before implementation.

### Related files/commits

- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/adr/001-use-monorepo.md`

---

## AI-003 — Draft the pre-implementation technical specification

**Date:** 2026-09-14  
**Tool/model:** ChatGPT with GitHub integration  
**Goal:** Convert the challenge requirements and agreed architecture into an implementation-ready technical specification before framework bootstrapping.

### Prompt/context

The specification needed to preserve the challenge's mandatory scope:

- own e-mail/password authentication;
- projects;
- tasks per project;
- title;
- short description;
- full description;
- deadline with date/time;
- tags;
- attachments/photos;
- editable task fields;
- list and Kanban views;
- statuses: not started, in progress, completed, cancelled.

The spec was also asked to document authorization, validation, testing, non-functional requirements, non-goals, and Definition of Done without installing Laravel or Next.js yet.

### AI contribution

Generated the initial `docs/SPEC.md` and separated:

- mandatory requirements;
- proposed implementation decisions;
- non-goals;
- stretch goals;
- security/authorization requirements;
- test strategy.

### Human review

The document is intended to be reviewed continuously against implementation. Proposed fields such as activity history are explicitly marked as stretch goals rather than silently presented as challenge requirements.

### Correction/rejection

No framework code was generated at this stage. This was deliberate: the specification and architecture must precede framework-driven implementation choices in the repository history.

### Final decision

The repository begins with documentation/specification commits. Framework bootstrapping follows only after the initial decisions are visible and reviewable.

### Related files/commits

- `docs/SPEC.md`
- commit `606b57e` — `docs: define Taskly product and technical specification`

---

## Review policy for future AI-generated code

Before AI-generated or AI-modified code is accepted, review should consider the relevant items below:

### Correctness

- Does the code implement the stated requirement?
- Does it introduce behavior that was not requested?
- Are edge cases handled deliberately?

### Security

- Is authentication required where expected?
- Is authorization performed server-side?
- Can resource IDs be changed to access another user's data?
- Are nested resources scoped to their parents?
- Are uploads safely validated?
- Are secrets or unsafe defaults introduced?

### Laravel

- Are Eloquent queries properly scoped?
- Is mass assignment controlled?
- Are Form Requests/Policies used where they improve clarity?
- Are transactions needed?
- Are relationships/eager loading correct?
- Is framework functionality being reimplemented unnecessarily?

### React / Next.js

- Is client state actually necessary?
- Are Client Components limited to interactive boundaries where practical?
- Are unnecessary rerenders/effects introduced?
- Does optimistic UI have a failure/rollback path?
- Are API error/loading states represented?

### Tests

- Do generated tests assert meaningful behavior rather than implementation details?
- Do authorization tests attempt cross-user access?
- Could a generated test pass while the actual requirement remains broken?

### Architecture

- Does the proposed abstraction solve a real current problem?
- Is complexity being added only because the AI recognizes a pattern?
- Is there a simpler Laravel/React-native solution?

---

## Principle

> AI can propose code and decisions. The developer remains responsible for understanding, validating, correcting, testing, and owning the final result.
