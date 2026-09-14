# Taskly — Product & Technical Specification

## 1. Overview

Taskly is a personal task-management web application built for the UEX technical selection challenge. The product allows each authenticated user to create and organize projects, manage tasks inside those projects, switch between list and Kanban views, and track task status, deadlines, tags, and attachments.

This specification is intentionally written before framework bootstrapping so the implementation can follow a clear, reviewable, spec-driven process.

## 2. Product goals

- Deliver the complete minimum scope requested by the challenge without critical defects.
- Provide a polished, responsive user experience that feels like a real product rather than a CRUD demo.
- Keep a clear technical boundary between frontend and backend responsibilities.
- Demonstrate secure authorization, validation, maintainable architecture, automated testing, and traceable AI-assisted development.
- Make the application easy to run locally and straightforward to deploy.

## 3. Non-goals for the MVP

The following capabilities are intentionally outside the initial scope unless time remains after the required experience is complete and stable:

- Multi-user collaboration inside the same project.
- Team workspaces, roles, or organization management.
- Google or Microsoft OAuth.
- Realtime multi-user synchronization.
- Chat, comments, mentions, or notifications.
- Native mobile applications.
- AI features inside the end-user product.
- Complex reporting or analytics dashboards.

These items may be documented as future evolution, but they must not compromise delivery of the required scope.

## 4. Target architecture

The application will use a monorepo with two primary applications:

- `apps/api`: PHP/Laravel backend responsible for authentication, authorization, validation, business rules, persistence, uploads, and the REST API.
- `apps/web`: Next.js/React/TypeScript frontend responsible for rendering, navigation, forms, list/Kanban interactions, optimistic UI, and overall user experience.

PostgreSQL is the source of truth for persisted application data.

The frontend must not connect directly to PostgreSQL. All domain operations go through the Laravel application.

## 5. Core user journeys

### 5.1 Registration and authentication

A visitor can:

1. Open the registration page.
2. Register with name, e-mail, and password.
3. Become authenticated after successful registration.
4. Log out.
5. Return later and log in using e-mail and password.
6. Keep an authenticated session according to the configured session lifetime.

OAuth is not required.

### 5.2 Project management

An authenticated user can:

1. View their projects.
2. Create a new project.
3. Rename/edit a project.
4. Organize multiple projects.
5. Select a project and see only tasks belonging to that project.
6. Delete a project after explicit confirmation.

A user must never be able to read or modify another user's projects.

### 5.3 Task management

Inside a project, an authenticated user can create a task with:

- title;
- short description;
- full description;
- deadline containing date and time;
- tags;
- attachments and/or photos;
- status.

Every task field must remain editable after creation.

The allowed statuses are:

- `not_started` — Não iniciada;
- `in_progress` — Em andamento;
- `completed` — Concluída;
- `cancelled` — Cancelada.

The user can update the task status at any time.

### 5.4 List and Kanban views

For a selected project, the user can switch between:

- List view;
- Kanban view.

A visible toggle controls the active view.

Kanban columns map to the four task statuses. Moving a card between columns updates its status. Reordering within a column may persist task position if included in the implementation.

## 6. Functional requirements

### FR-001 — Registration

The system shall allow account creation using e-mail and password without mandatory third-party authentication.

Acceptance criteria:

- e-mail must be unique;
- password must satisfy the configured minimum requirements;
- invalid input returns field-level validation feedback;
- successful registration creates exactly one user account;
- the password is never stored in plain text.

### FR-002 — Login and persistent session

The system shall authenticate an existing user using e-mail and password and maintain a secure session.

Acceptance criteria:

- valid credentials create an authenticated session;
- invalid credentials do not expose whether an account exists beyond safe validation messaging;
- authenticated routes reject unauthenticated requests;
- logout invalidates the active session.

### FR-003 — Project CRUD

The user shall be able to create, list, edit, organize, and delete their own projects.

Acceptance criteria:

- projects are always scoped to the authenticated user;
- project names are required;
- project deletion requires explicit confirmation in the UI;
- deleting a project handles associated tasks according to the database relationship strategy.

### FR-004 — Task CRUD

The user shall be able to create, read, edit, and delete tasks belonging to their own projects.

Acceptance criteria:

- title is required;
- short description supports concise summary text;
- full description supports longer content;
- deadline accepts date and time;
- status must be one of the four allowed values;
- all fields can be edited after task creation;
- project ownership is enforced for every task operation.

### FR-005 — Tags

The user shall be able to assign one or more tags to a task.

Acceptance criteria:

- a task may have multiple tags;
- tags presented to the user are scoped appropriately to that user;
- assigning a tag owned by another user is not allowed.

### FR-006 — Attachments and photos

The user shall be able to attach supported files and/or images to a task.

Acceptance criteria:

- uploads are validated for allowed MIME types and maximum size;
- stored filenames must not rely on unsafe user-provided paths;
- users can access only attachments belonging to tasks they are authorized to access;
- attachments can be removed from a task.

### FR-007 — List view

The selected project's tasks shall be available in a clear list view.

The list should expose enough task information to support quick scanning, including at minimum title and status, with deadline and tags when available.

### FR-008 — Kanban view

The selected project's tasks shall be available in a Kanban view grouped by status.

Acceptance criteria:

- the four required status columns are represented;
- moving a task between columns changes the persisted status;
- the UI handles request failure without leaving the client in an incorrect state.

### FR-009 — View toggle

The user shall be able to switch between list and Kanban views without losing the selected project context.

## 7. Domain rules

- A `User` owns many `Projects`.
- A `Project` belongs to exactly one `User`.
- A `Project` owns many `Tasks`.
- A `Task` belongs to exactly one `Project`.
- A `Task` may have zero or many `Tags`.
- A `Task` may have zero or many `Attachments`.
- Authorization is based on ownership through the project/user relationship.
- Task access must be scoped through its parent project or otherwise enforce equivalent ownership checks.
- `completed_at` may be recorded when a task becomes completed and cleared when it leaves the completed state.

## 8. Proposed data model

### users

Laravel authentication user model.

Key fields:

- id
- name
- email
- password
- timestamps

### projects

- id
- user_id
- name
- description nullable
- color nullable
- position nullable
- timestamps

Indexes should support ownership-scoped project retrieval.

### tasks

- id
- project_id
- title
- short_description nullable
- description nullable
- status
- due_at nullable
- position nullable
- completed_at nullable
- timestamps

Indexes should support project/status queries and deadline-oriented queries when useful.

### tags

- id
- user_id
- name
- color nullable
- timestamps

### task_tag

Pivot relation between tasks and tags.

### attachments

- id
- task_id
- original_name
- storage_path
- mime_type
- size
- timestamps

### activity_logs (stretch goal)

If implemented after the required scope is stable:

- id
- user_id
- subject_type
- subject_id
- action
- metadata JSON/JSONB nullable
- created_at

This table exists to support traceability of meaningful domain changes.

## 9. API boundary

The Laravel application is the authoritative backend. The Next.js application consumes a REST/JSON API.

Initial API surface is expected to include endpoints equivalent to:

- authentication/session endpoints;
- current authenticated user;
- project collection/resource endpoints;
- tasks scoped by project;
- task resource update/delete endpoints;
- explicit task status and/or ordering updates where useful;
- tags;
- task attachments.

Exact routes and payloads will be documented after Laravel bootstrapping and before frontend integration.

API responses should use stable resource shapes and appropriate HTTP status codes.

## 10. Authentication strategy

Laravel Sanctum is the intended authentication mechanism for the first-party web client.

Preferred approach:

- secure HTTP-only cookie/session-based authentication;
- CSRF protection;
- no custom JWT implementation unless a concrete deployment constraint requires it.

Authentication details will be finalized in an ADR before implementation.

## 11. Authorization rules

Authorization is mandatory on every private resource.

At minimum:

- users can only list their own projects;
- users can only view/update/delete their own projects;
- users can only create tasks inside projects they own;
- users can only view/update/delete tasks whose project they own;
- nested resources must verify both parent ownership and child relationship;
- users can only access task attachments for tasks they are authorized to access;
- users cannot attach another user's tag to a task.

Potential IDOR/horizontal privilege escalation paths must be covered by automated tests.

## 12. Validation rules

Detailed limits may be tuned during implementation, but the baseline is:

- project name: required, trimmed, bounded length;
- task title: required, trimmed, bounded length;
- short description: optional, bounded concise text;
- description: optional text;
- status: strict enum of the four supported values;
- deadline: valid date/time when present;
- tags: validated identifiers belonging to the authenticated user;
- attachments: validated MIME type and maximum file size;
- uploaded paths and filenames are generated/normalized server-side.

Validation rules must be authoritative in Laravel. The frontend may duplicate safe validation for user experience but must not be the security boundary.

## 13. UX requirements

- Responsive layout for desktop and mobile widths.
- Fast project switching.
- Clear empty states for new accounts/projects.
- Accessible labels and keyboard-friendly controls where practical.
- Visible loading, success, and failure feedback.
- Task creation should require minimal navigation.
- Task details may use a side panel/drawer to keep project context visible.
- Kanban interactions should feel immediate; optimistic updates are preferred when rollback behavior is implemented safely.
- Overdue deadlines should be visually distinguishable without relying only on color.

## 14. Non-functional requirements

### Security

- Password hashing uses Laravel defaults.
- CSRF protection remains enabled for stateful authentication.
- Authorization must be server-side.
- No secrets are committed to Git.
- File uploads are validated and safely stored.
- Mass-assignment boundaries are explicit.

### Performance

- Avoid obvious N+1 database queries.
- Use eager loading where relationships are displayed in collections.
- Avoid unnecessary client JavaScript and rerenders.
- Paginate or otherwise limit large collections if the implementation evolves beyond a small demo dataset.

### Maintainability

- Controllers/route handlers remain thin.
- Business operations are organized into appropriately scoped actions/services when complexity warrants it.
- Laravel validation uses Form Requests or equivalent focused validators.
- Authorization uses Policies and/or explicit ownership-scoped queries.
- React components separate UI primitives from feature-specific behavior.
- TypeScript strictness should be preserved.

### Observability

For the challenge scope, application logs must be sufficient to diagnose backend errors. Structured application events/activity history are optional enhancements, not prerequisites for MVP completion.

## 15. Testing strategy

Testing will prioritize business risk rather than arbitrary coverage percentage.

### Backend

Automated tests should cover at minimum:

- registration/login/logout behavior;
- user A cannot access user B's projects;
- user A cannot access user B's tasks;
- nested task/project ownership enforcement;
- project CRUD happy paths;
- task CRUD happy paths;
- allowed and invalid task status transitions/values;
- tag ownership validation;
- attachment validation and authorization.

### Frontend

Tests should focus on meaningful interaction and state behavior, including list/Kanban switching and relevant form behavior.

### End-to-end

A Playwright flow should cover the primary product journey when practical:

1. register/login;
2. create a project;
3. create a task;
4. edit the task;
5. move/update task status;
6. switch between list and Kanban;
7. log out.

## 16. AI-assisted engineering requirements

AI tools may be used for implementation, refactoring, test generation, architecture review, security review, and documentation.

AI output is never considered authoritative by itself.

Relevant interactions must be logged in `docs/AI_USAGE.md` with:

- tool/model when relevant;
- task/goal;
- prompt or summarized prompt;
- useful output;
- human review;
- corrections/rejections;
- final decision.

Special attention should be given to documenting cases where AI output was incomplete, unsafe, incorrect, or unnecessarily complex.

## 17. Definition of Done — required scope

The required scope is considered complete only when:

- registration works;
- login works;
- session persistence works;
- logout works;
- projects can be created, viewed, edited, organized, and deleted;
- tasks can be created and fully edited;
- task title, short description, full description, deadline, tags, attachments/photos, and status are supported;
- all four required statuses are supported;
- list view works;
- Kanban view works;
- view toggle works;
- authorization prevents cross-user access;
- required validation is enforced server-side;
- no known critical bug blocks the core flow;
- automated tests protect the most important domain/security behavior;
- README documents how to run the project;
- AI usage is documented;
- architecture decisions are documented.

## 18. Stretch goals

Only after the required scope is stable:

- drag-and-drop persistence and optimistic rollback refinement;
- task search and filters;
- overdue indicators;
- project progress summary;
- activity history;
- polished image previews;
- seeded demo account/data;
- OpenAPI documentation;
- CI pipeline;
- deployed environment.

Stretch work must not reduce reliability of the required scope.

## 19. Open decisions

The following decisions will be captured in ADRs before their implementation becomes difficult to reverse:

- monorepo organization;
- Laravel/Next.js responsibility boundary;
- Sanctum authentication topology and deployment-domain assumptions;
- storage strategy for attachments;
- Kanban drag-and-drop library;
- exact REST resource contract;
- CI/deployment strategy.
