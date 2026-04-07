# ADR-001: Professional Role Self-Signup Policy

| Field       | Value                    |
|-------------|--------------------------|
| **Status**  | Proposed                 |
| **Date**    | 2026-04-05               |
| **Authors** | Engineering Team         |
| **Ticket**  | B5 — Security Audit Finding |

---

## Context

The platform supports three user roles: `user`, `professional`, and `admin`. The `professional` role carries elevated trust within the application — it is expected to represent vetted practitioners (e.g., nutritionists, health professionals) who publish authoritative content visible to the broader user base.

Currently, any registering user can self-assign the `professional` role by including `"role": "professional"` in the registration request body. There is no identity verification, credential check, or manual approval step.

### Evidence

**`src/constants/roles.ts`, line 9**

```typescript
export const REGISTER_ALLOWED_ROLES = ['user', 'professional'] as const;
```

The constant that governs which roles are permitted at registration explicitly includes `'professional'`.

**`src/controllers/userControllers.ts`, lines 26–39**

```typescript
// Security: whitelist the roles a user may self-assign on registration.
// 'professional' is intentionally self-assignable — users declare their own role at sign-up
// with no vetting required. If an approval workflow is introduced later, remove 'professional'
// from this list and handle it via a separate /users/:id/upgrade-role endpoint.
// ...
const safeData = REGISTER_ALLOWED_ROLES.includes(requestedRole as ...)
    ? { ...restData, role: requestedRole }
    : restData; // defaults to 'user' via User model
```

The comment acknowledges the absence of vetting and defers the decision to product. The controller accepts any role present in `REGISTER_ALLOWED_ROLES` without further gating.

**`src/utils/validators.ts`, lines 111–113**

```typescript
role: Joi.string()
    .valid(...REGISTER_ALLOWED_ROLES)
    .optional(),
```

The Joi schema for `POST /api/users` spreads `REGISTER_ALLOWED_ROLES` directly into the `valid()` validator, meaning `'professional'` passes schema validation without any additional constraint.

### Business Risk

Any actor can obtain a `professional` account with a single unauthenticated HTTP request. If the `professional` role unlocks content-creation privileges, business listing ownership, or elevated API quotas, the platform is exposed to:

- Spam and low-quality professional listings
- Abuse of any `professional`-gated features
- Regulatory risk if the platform makes implicit trust claims about professional accounts

This is a **business policy gap**, not a code defect. The engineering implementation is correct given its current specification; the specification itself needs a decision.

---

## Decision Drivers

1. Minimize friction for legitimate professionals signing up.
2. Prevent unauthorized privilege escalation via self-assignment.
3. Preserve backward compatibility for existing clients that may already pass `role: professional`.
4. Keep the implementation reversible while awaiting stakeholder alignment.

---

## Options Considered

### Option A — Feature Flag `FEATURE_PRO_SELF_SIGNUP` (Recommended)

Introduce an environment variable `FEATURE_PRO_SELF_SIGNUP` that defaults to `"false"`.

**Behavior when `FEATURE_PRO_SELF_SIGNUP=false` (default / production default):**

- Registration requests that include `"role": "professional"` are rejected with `HTTP 400` and a clear error message: `"Self-registration as professional is not available. Register as user and request a role upgrade."`
- Users must register as `user` and then submit a role-upgrade request via a new admin-reviewed endpoint (`POST /api/users/:id/request-role-upgrade`).
- `REGISTER_ALLOWED_ROLES` constant is unchanged in source — `'professional'` remains in the array so that reverting the flag instantly restores the current behavior without a code deployment.

**Behavior when `FEATURE_PRO_SELF_SIGNUP=true` (transitional / opt-in):**

- Self-signup as `professional` is allowed, but the account is created with `professionalVerified: false`.
- The `professionalVerified` flag acts as a soft gate: `professional`-gated features can check this flag and prompt the user to complete verification.
- An admin endpoint (`PATCH /api/users/:id/verify-professional`) allows operators to approve accounts.

**Trade-offs:**

| Concern | Assessment |
|---------|------------|
| Implementation effort | Medium — flag check in controller + new model field + upgrade endpoint |
| Client compatibility | No breaking change for existing clients (flag defaults OFF, same behavior as removing from list) |
| Reversibility | Full — flip env var; no migration needed to restore self-signup |
| Auditability | Upgrade requests are logged; professional accounts are traceable to an approval event |

---

### Option B — Remove `professional` from `REGISTER_ALLOWED_ROLES` Immediately

Delete `'professional'` from the array at `src/constants/roles.ts:9`. No flag, no new fields.

**Trade-offs:**

| Concern | Assessment |
|---------|------------|
| Implementation effort | Minimal — single-line change |
| Client compatibility | Breaking — any client currently passing `role: professional` at registration will silently receive a `user` role (controller falls through to model default) or receive a `400` from Joi |
| Reversibility | Requires a new deployment to restore; no transitional path |
| Upgrade path | None provided; users who need the professional role have no self-service option |

Option B achieves the immediate security goal but offers no migration path and may break integrations. It is appropriate only if the product decision is to permanently retire self-signup with no replacement workflow in scope.

---

## Recommendation

**Option A** — implement the `FEATURE_PRO_SELF_SIGNUP` feature flag, shipped with the flag set to `false`.

When the flag is `false`, the observable API behavior is identical to Option B (professional self-signup is blocked). The difference is that:

- `REGISTER_ALLOWED_ROLES` is preserved, making a future reversal a configuration change rather than a code change.
- The codebase retains a clear path to a verified-professional workflow without a second architectural decision.
- The change is fully auditable via the git history and this ADR.

This recommendation prioritizes reversibility and preserves optionality while immediately closing the privilege-escalation vector.

---

## Decision

**Pending** — requires review and sign-off from product and stakeholders before implementation begins.

Questions for stakeholders:

1. Should existing accounts that already hold `role: professional` be retroactively flagged as `professionalVerified: false`, or are they grandfathered?
2. What is the desired upgrade request flow — in-app form, email to an admin, or a dedicated admin dashboard queue?
3. Is there a compliance or legal requirement (e.g., professional licence verification) that would change the verification model?

---

## Consequences

### If Option A is approved

- A separate implementation PR will introduce:
  - `FEATURE_PRO_SELF_SIGNUP` env var check in `src/controllers/userControllers.ts`
  - `professionalVerified: boolean` field on the `User` model (default `false` when flag is `true`)
  - `POST /api/users/:id/request-role-upgrade` endpoint (authenticated, `user` role)
  - `PATCH /api/users/:id/verify-professional` endpoint (admin only)
  - Unit and integration tests covering both flag states
- No changes to `src/constants/roles.ts` or `src/utils/validators.ts` in that PR.

### If Option B is approved

- A single-line change to `src/constants/roles.ts` removes `'professional'` from `REGISTER_ALLOWED_ROLES`.
- Clients currently passing `role: professional` must be updated or will silently receive `role: user`.
- A communication plan for affected clients is required before deployment.

### General

- This ADR must be re-evaluated if a new role is added to the `UserRole` union in `src/models/User.ts`.
- The `ROLE_RANK` map at `src/constants/roles.ts:18` is unaffected by either option.

---

## References

- `src/constants/roles.ts` — `REGISTER_ALLOWED_ROLES` constant
- `src/controllers/userControllers.ts` — `registerUser` controller, lines 25–39
- `src/utils/validators.ts` — `userSchemas.register` Joi schema, lines 100–114
- Security audit finding B5 (project_vegan_guide_audit_2026_04_05)
