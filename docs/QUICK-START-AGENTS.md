# Quick Start: Agents Workflow

## Purpose
Use role-based execution to keep delivery fast and safe.

## Recommended Sequences

### New Feature
1. Architect: create design and contracts.
2. Developer: implement + tests.
3. QA: audit regressions/security.

### Bug Fix
1. Developer: reproduce and patch.
2. QA: validate fix and non-regression.

### Refactor
1. Architect: refactor plan and safety constraints.
2. Developer: incremental refactor + tests.
3. QA: validate unchanged behavior.

## Shortcut Documents
- `docs/AGENT-ARCHITECT.md`
- `docs/AGENT-DEVELOPER.md`
- `docs/AGENT-QA.md`
- `docs/AGENTS.md`

## Baseline Commands
- `npm run dev`
- `npm run type-check`
- `npm run test:unit`
- `npm run test:integration`
- `npm run lint`

