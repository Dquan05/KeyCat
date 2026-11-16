
# AI Agent Instructions

## Project context
This repository is a Fullstack portfolio project.

Before making changes, inspect the relevant code and consult:
- docs/requirements.md
- docs/architecture.md
- docs/database.md
- docs/api-spec.md
- docs/tasks.md

Read only the sections relevant to the current task.

## Engineering principles
- Follow existing project architecture and conventions.
- Prefer simple, maintainable solutions.
- Avoid unnecessary abstraction and dependencies.
- Reuse existing modules and components.
- Keep frontend, backend, and database contracts consistent.
- Preserve backward compatibility unless a change is approved.
- Do not implement out-of-scope features.

## Implementation workflow
For each task:
1. Inspect the relevant code and documentation.
2. Identify dependencies and potential impacts.
3. Propose an implementation plan.
4. Wait for approval before implementing major changes.
5. Implement only the approved scope.
6. Add or update appropriate tests.
7. Run applicable checks and report results.
8. Summarize changed files and remaining issues.

## Backend
- Separate business logic from HTTP controllers.
- Validate all external input.
- Enforce authorization on protected operations.
- Handle expected errors consistently.
- Use migrations for database schema changes.
- Do not hardcode credentials or secrets.

## Frontend
- Prefer reusable, focused components.
- Keep API calls separate from presentation logic.
- Handle loading, error, empty, and success states.
- Ensure responsive layouts and accessible controls.
- Follow established design conventions.

## Testing and quality
- Test meaningful business logic and critical flows.
- Run relevant lint, typecheck, build, and tests.
- Do not claim a command passed unless it was executed.
- Report failures and commands that could not run.
- Do not bypass or delete tests to hide failures.

## Safety boundaries
- Do not modify unrelated files.
- Do not delete data or run destructive migrations
  without explicit approval.
- Do not commit, push, deploy, or write to external
  services without explicit approval.
- Never expose or commit secrets.
- Stop and ask before major architectural changes.

## Communication
- Explain technical decisions in Vietnamese.
- Keep code identifiers in English.
- Report:
  1. What changed
  2. Files changed
  3. Validation results
  4. Remaining issues
  5. Recommended next task
