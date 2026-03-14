# Redis Key Format Migration — Sprint 4

**Date:** 2026-03-14
**Affects:** Blacklist namespace in Redis
**Risk level:** Low

---

## What Changed

The fallback key format used when blacklisting a token that lacks a `jti` claim changed between Sprint 3 and Sprint 4.

| | Sprint 3 | Sprint 4 |
|---|---|---|
| Primary key (token has `jti`) | `blacklist:<jti>` | `blacklist:<jti>` (no change) |
| Fallback key (token missing `jti`) | `blacklist:<raw_token>` | `blacklist:hash:<sha256(token)>` |

In `TokenService.blacklistToken`, when `jwt.decode` returns a payload without a `jti` field, the service now computes a SHA-256 hex digest of the raw token string and stores the entry under `blacklist:hash:<digest>`. The corresponding lookup in `isTokenBlacklisted` follows the same logic, so blacklist checks remain consistent within the new code.

---

## What Is Lost

Any blacklist entry written by Sprint 3 code using the raw-token fallback format (`blacklist:<raw_token>`) will not be matched by Sprint 4's `isTokenBlacklisted`. The new code looks up `blacklist:hash:<sha256(token)>`, which will be absent for those old entries.

In practice this means: if a token was blacklisted before the Sprint 4 deploy using the legacy fallback path, the new code will treat it as valid until it expires naturally.

---

## Why the Risk Is Low

1. **All app-generated tokens carry a `jti`.** `createTokenPayload` unconditionally sets `jti: randomUUID()`. The fallback path is only exercised for tokens that are missing this field — i.e., tokens not issued by this service (legacy clients, hand-crafted tokens, or third-party tokens).

2. **Short TTL.** Blacklist entries are written with `setex` using the token's remaining lifetime, with a minimum of 3600 seconds (1 hour). Any legacy-format entry still in Redis will expire according to the TTL that was set when it was created (at least one hour, up to the token's original remaining lifetime).

3. **The primary path is unaffected.** Normal logout and token-refresh flows use `blacklist:<jti>`, which did not change.

No automated migration script is required.

---

## Recommended Deploy Procedure

### Option A — Wait for natural expiry (preferred)

Deploy Sprint 4 normally. Any legacy-format blacklist entries (`blacklist:<raw_token>`) will expire according to their existing TTLs. No action is required after they naturally expire.

### Option B — Flush the blacklist namespace before deploy

If your threat model requires certainty that no revoked legacy token can slip through during the transition window, flush all blacklist keys immediately before the cutover:

```bash
# Preview keys that will be removed
redis-cli --scan --pattern "blacklist:*" | head -20

# Delete all blacklist keys (use with caution in production)
redis-cli --scan --pattern "blacklist:*" | xargs redis-cli del
```

Flushing forces any user holding a revoked legacy token to re-authenticate, which is the safe failure mode.

### Verifying the current state

To check whether any legacy-format keys are still present after the deploy:

```bash
# List all blacklist keys
redis-cli --scan --pattern "blacklist:*" | head

# A clean post-Sprint-4 system should show only:
#   blacklist:<uuid>          (jti-based, primary format)
#   blacklist:hash:<hex>      (sha256-based, new fallback format)
#
# Keys that look like:
#   blacklist:eyJhbGciOi...   (long base64 strings)
# are legacy Sprint 3 fallback entries and will expire according to their original TTLs.
```

---

## No Action Required After Expiry Window

Once all legacy-format entries have naturally expired according to their TTLs, the Redis blacklist namespace will contain only entries in the current formats. No follow-up cleanup is needed.
