# Review System Improvement Roadmap

This document outlines a chronological, incremental plan to improve the Review system across all entities (Restaurants, Recipes, Markets, Businesses, Doctors, etc.). It starts with low-risk quick fixes and evolves into a robust, polymorphic architecture with clear rollout and migration steps.

## Goals
- Support reviews for multiple entity types (not only restaurants).
- Provide consistent APIs for create/read/update/delete, listing, stats, and helpful votes.
- Maintain backward compatibility during rollout, with safe deprecation.
- Improve data integrity, performance, caching, and documentation.

---

## Phase 0 — Quick Fixes (Hotfix to unblock)
Scope: Days 0–1

- Map incoming alias fields to current Review model to avoid immediate breakage:
  - Accept `restaurantId | restaurant | recipeId | recipe | marketId | market | businessId | business` in `ReviewService.addReview` and temporarily map to `restaurant` if provided.
  - Keep current schema untouched; document that non-restaurant entities are temporarily stored under `restaurant` for compatibility (short-lived workaround).
- Ensure controller endpoints send expected fields:
  - `restaurantControllers.addReviewToRestaurant`: send `restaurant` (or rely on alias mapping).
  - `recipesControllers.addReviewToRecipe` and `marketsControllers.addReviewToMarket`: rely on alias mapping.
- Acceptance: Recipes/Markets review creation no longer fails; existing restaurant flows unchanged.
- Risks: Semantic mismatch (non-restaurant reviews stored under `restaurant`). Time-boxed and to be replaced in Phase 1+.

Checklist
- [ ] Add alias mapping in `src/services/ReviewService.ts` sanitize path.
- [ ] Smoke test POST review on restaurants/recipes/markets.

---

## Phase 1 — Model Generalization (Polymorphic reviews)
Scope: Days 1–3

- Extend `Review` model with polymorphic target fields:
  - Add `entityType: enum('Restaurant','Recipe','Market','Business','Doctor', ...)`.
  - Add `entity: ObjectId` with `refPath: 'entityType'`.
  - Add compound unique index: `{ author: 1, entityType: 1, entity: 1 }` to prevent duplicate reviews by same user on same entity.
  - Keep existing `restaurant?: ObjectId` for backward compatibility during migration; mark as deprecated in comments.
- Data migration (backfill): set `entityType = 'Restaurant'` and `entity = restaurant` for existing documents.
- Update existing indexes to include new usage patterns; retain legacy indexes until cleanup.
- Acceptance: New documents can be written with `entityType + entity`. Existing restaurant reviews remain valid.

Checklist
- [ ] Update `src/models/Review.ts` schema with `entityType`, `entity (refPath)`, and new indexes.
- [ ] Write migration script `scripts/migrations/2025-xx-xx-backfill-review-entity.js` to backfill old records.
- [ ] Dry-run migration in a staging dump.

---

## Phase 2 — Service API Generalization
Scope: Days 3–5

- Introduce generic service methods (keep legacy wrappers):
  - `addReview(reviewData, { entityType, entityId })` or single payload accepting aliases; internally resolve to `entityType + entity`.
  - `getReviewsByEntity(entityType, entityId, { page, limit, rating, sort })`.
  - `getReviewStats(entityType, entityId)`.
  - `findByUserAndEntity(userId, entityType, entityId)`.
- Keep legacy methods delegating to the new ones:
  - `getReviewsByRestaurant`, `getReviewStats(restaurantId)`, `findByUserAndRestaurant`.
- Harden sanitization:
  - Validate `entityType` whitelist.
  - Validate `entityId` as ObjectId.
  - Whitelist sort fields: `rating`, `createdAt`, `helpfulCount`, `visitDate`.
- Acceptance: All entity types supported through service; restaurant-specific methods still function.

Checklist
- [ ] Implement generic methods in `src/services/ReviewService.ts`.
- [ ] Maintain and mark legacy methods for deprecation.
- [ ] Unit tests for alias mapping and generic queries.

---

## Phase 3 — Controllers & Routes Alignment
Scope: Days 5–7

- Restaurants
  - Keep existing endpoints. Internally call generic service methods.
  - Add GET `/:restaurantId/reviews` and `/:restaurantId/reviews/stats` already present; ensure they use generic methods.
- Recipes
  - Update `recipesControllers.addReviewToRecipe` to pass `entityType='Recipe'` and `entityId`.
  - Add GET endpoints similar to restaurants if needed: list and stats.
- Markets
  - Update `marketsControllers.addReviewToMarket` similarly with `entityType='Market'`.
  - Optionally add GET list/stats endpoints.
- Validators
  - Extend `paramSchemas` to include `recipeId`, `marketId`, etc., mirroring `restaurantId`.
  - Keep `reviewSchemas` (create/update) as-is.
- Acceptance: Controllers for all entities create and fetch reviews via polymorphic service; validation covers new IDs.

Checklist
- [ ] Wire controllers to generic service.
- [ ] Add/extend routes for list/stats per entity as required.
- [ ] Extend `src/utils/validators.ts` parameter schemas.

---

## Phase 4 — API Docs (Swagger) Update
Scope: Days 7–8

- Component schemas
  - Update `Review` to include `entityType` and `entity`.
  - Mark `restaurant` as deprecated; keep temporarily for compatibility.
- Paths
  - Document review creation for each entity, or define a unified endpoint pattern and examples.
  - Add examples for filters (`rating`, `sort`, pagination) and helpful votes endpoints.
- Acceptance: Swagger reflects new contract and remains accurate for legacy endpoints during transition.

Checklist
- [ ] Update `swagger.yaml` Review schema and paths under tags: Restaurants, Recipes, Markets, Reviews.
- [ ] Regenerate any derived `src/swagger.ts` if applicable.

---

## Phase 5 — Data Consistency Across Entities
Scope: Days 8–10

- Standardize `reviews` storage in entity models:
  - Prefer `reviews: ObjectId[]` referencing `Review` in all models.
  - For `Restaurant`, migrate embedded `reviews` objects to references for consistency.
- Centralize rating aggregation:
  - On create/update/delete of `Review`, recompute and persist `entity.rating` and `entity.numReviews`.
  - Implement as service-level operations; optionally add Mongoose middleware if appropriate.
- Acceptance: All entities store reviews consistently; rating fields stay in sync.

Checklist
- [ ] Update `src/models/Restaurant.ts` to reference `Review` (if desired) and migrate data.
- [ ] Add service hooks to update `rating/numReviews` on write paths.

---

## Phase 6 — Caching & Performance
Scope: Days 10–12

- Cache keys
  - Per-entity list pages, e.g., `reviews:Restaurant:<id>:p=<n>&l=<k>&r=<rating>&s=<sort>`.
  - Per-entity stats, e.g., `reviews:stats:Restaurant:<id>`.
- Invalidation
  - Invalidate entity-specific keys on review mutations.
  - Keep TTL aligned with `reviews` TTL in `CacheService`.
- Prewarming (optional)
  - Extend `CacheWarmingService` to prewarm top entities’ reviews and stats.
- Acceptance: Faster reads for hot entities; cache invalidates correctly on write.

Checklist
- [ ] Implement cache layer in generic service list/stats.
- [ ] Invalidate keys in controllers after mutations.
- [ ] Optional: prewarm.

---

## Phase 7 — Security & Abuse Prevention
Scope: Days 12–13

- Ownership
  - Ensure only authors can update/delete their reviews (already present for generic review routes, extend to entity-specific flows if any).
- Duplicate prevention
  - Enforce unique index `{ author, entityType, entity }`.
- Helpful votes
  - Keep deduplication by `userId`; enforce at service level and guard rails.
- Rate limiting
  - Apply `rateLimits.api` on review creation endpoints.
- Acceptance: No duplicate reviews per user/entity; safe helpful voting; endpoints rate-limited.

Checklist
- [ ] Verify indexes created.
- [ ] Tests for duplicates and helpful votes edge cases.

---

## Phase 8 — Telemetry & Metrics
Scope: Days 13–14

- Logging
  - Structured logs on create/update/delete with `entityType`, `entityId`, `authorId`.
- Metrics
  - Counters: reviews_created_by_entityType, votes_helpful_added/removed.
  - Timers: p95 latency for list/stats endpoints.
  - Error rates by validation vs. persistence.
- Acceptance: Basic observability in place for monitoring rollout.

Checklist
- [ ] Add log lines in controllers/services.
- [ ] Wire simple counters using existing logging or a lightweight metrics helper.

---

## Phase 9 — Deprecation & Cleanup
Scope: After stable period

- Remove deprecated `restaurant` field from `Review`.
- Remove legacy service methods (`getReviewsByRestaurant`, etc.).
- Remove legacy endpoints (e.g., `/add-review/:id` variants) if no longer used.
- Update tests to only use polymorphic paths.
- Acceptance: Codebase only uses polymorphic implementation; contracts clean.

Checklist
- [ ] Announce deprecation, track consumers, schedule removal window.
- [ ] Code removal and final schema cleanup.

---

## Phase 10 — Testing Strategy (spans multiple phases)

- Unit Tests
  - Sanitization: rating/title/content/date/tags; alias mapping.
  - Generic queries: pagination, sort whitelist, rating filter, invalid inputs.
  - Helpful votes: duplicates, remove non-existent.
- Integration Tests
  - Create/list/stats for Restaurant/Recipe/Market with shared helpers.
  - Ownership checks for update/delete.
- Migration Tests
  - Backfill script idempotency; verify counts, distributions, and stats equality before/after.

Checklist
- [ ] Expand `src/test/controllers/*` and `src/test/integration/*` for new entity types.
- [ ] Add service unit tests under `src/test/services/ReviewService.test.ts` (or expand existing).

---

## Rollout Plan Summary

1) Phase 0 hotfix to unblock non-restaurant routes (time-boxed).
2) Phase 1–2 add polymorphic model + generic service, keep backward compatibility.
3) Phase 3 align controllers/routes/validators for all entities.
4) Phase 4 docs, Phase 5 consistency, Phase 6 performance, Phase 7 security.
5) Monitor with Phase 8 telemetry; then Phase 9 deprecate legacy pieces.

---

## Acceptance Criteria per Milestone

- Milestone A (End Phase 2)
  - Can create and read reviews for Restaurant/Recipe/Market via generic service.
  - Backward compatible restaurant routes pass.
- Milestone B (End Phase 4)
  - Swagger reflects polymorphic contract; example payloads provided.
- Milestone C (End Phase 6)
  - Cache reduces p95 latency for reviews list by >40% for hot entities.
- Milestone D (End Phase 9)
  - No references to deprecated `restaurant` field remain; tests fully polymorphic.

---

## Pointers (Files to Modify)

- `src/models/Review.ts`
- `src/services/ReviewService.ts`
- `src/controllers/reviewControllers.ts`
- `src/controllers/restaurantControllers.ts`
- `src/controllers/recipesControllers.ts`
- `src/controllers/marketsControllers.ts`
- `src/routes/restaurantRoutes.ts`
- `src/routes/recipesRoutes.ts`
- `src/routes/marketsRoutes.ts`
- `src/utils/validators.ts`
- `swagger.yaml`
- `src/services/CacheWarmingService.ts` (optional prewarm)

---

## Notes
- Keep the migration reversible. Take backups before Phase 1 migration.
- Prefer doing read-path changes first guarded behind defensive code that tolerates both old/new shapes during transition.
- Communicate API changes early; provide SDK or examples for clients.
