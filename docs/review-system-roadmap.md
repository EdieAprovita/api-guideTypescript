# Review System Improvement Roadmap

This document outlines a chronological, incremental plan to improve the Review system across all entities (Restaurants, Recipes, Markets, Businesses, Doctors, etc.). It starts with low-risk quick fixes and evolves into a robust, polymorphic architecture with clear rollout and migration steps.

## Goals
- Support reviews for multiple entity types (not only restaurants).
- Provide consistent APIs for create/read/update/delete, listing, stats, and helpful votes.
- Maintain backward compatibility during rollout, with safe deprecation.
- Improve data integrity, performance, caching, and documentation.

---

## Phase 0 — Quick Fixes (Hotfix to unblock)
Status: Completed
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
- [x] Add alias mapping in `src/services/ReviewService.ts` sanitize path.
- [x] Smoke test POST review on restaurants/recipes/markets.
References
- `src/services/ReviewService.ts:297` (alias mapping + backfill to legacy `restaurant`)

---

## Phase 1 — Model Generalization (Polymorphic reviews)
Status: Completed (migration dry‑run pending)
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
- [x] Update `src/models/Review.ts` schema with `entityType`, `entity (refPath)`, and new indexes.
- [x] Write migration script `scripts/migrations/2025-08-30-backfill-review-entity.js` to backfill old records.
- [ ] Dry-run migration in a staging dump.

Additions (not originally listed)
- Made the unique index safe during rollout using a partial filter to avoid E11000 on legacy docs missing polymorphic fields.
  - `src/models/Review.ts:99` — `partialFilterExpression` for `{ author, entityType, entity }`.

---

## Phase 2 — Service API Generalization
Status: Completed
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
- [x] Implement generic methods in `src/services/ReviewService.ts` (create/list/stats/findByUserAndEntity).
- [x] Maintain and mark legacy methods for deprecation (e.g., `listReviewsForModel`).
- [ ] Unit tests for alias mapping and generic queries.

Additions
- Reduced cognitive complexity and eliminated unsafe stringification (Sonar S6551) by factoring sanitizers and adding `tryExtractObjectIdHex`.
  - `src/services/ReviewService.ts:373` (extractor) and helpers (apply* methods).

---

## Phase 3 — Controllers & Routes Alignment
Status: Completed
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
- [x] Wire controllers to generic service.
- [x] Add/extend routes for list/stats per entity as required (Restaurants/Recipes/Markets).
- [x] Extend `src/utils/validators.ts` parameter schemas (used by routes for `recipeId`/`marketId`).

Additions
- Introduced reusable controller factory to cut duplication across entities (`add`, `list`, `stats`).
  - `src/controllers/factories/reviewEndpointsFactory.ts`
  - Applied to `recipesControllers.ts` and `marketsControllers.ts`.

---

## Phase 4 — API Docs (Swagger) Update
Status: Completed

- Component schemas
  - Update `Review` to include `entityType` and `entity`.
  - Mark `restaurant` as deprecated; keep temporarily for compatibility.
- Paths
  - Document review creation for each entity, or define a unified endpoint pattern and examples.
  - Add examples for filters (`rating`, `sort`, pagination) and helpful votes endpoints.
- Acceptance: Swagger reflects new contract and remains accurate for legacy endpoints during transition.

Checklist
- [x] Update `swagger.yaml` Review schema including `entityType` + `entity`, deprecate `restaurant`.
- [x] Document list/stats endpoints for Restaurants, Recipes, Markets.
- [x] Add helpful votes endpoints (POST/DELETE `reviews/{id}/helpful`).
- [x] Add examples for success and error responses (400/401/403/404/409/500) across endpoints.
- [x] Keep `src/swagger.ts` in sync; added equivalent routes and schemas.
- [x] Update Postman collection (`API_Guide_TypeScript_COMPLETE.postman_collection.json`) with new list/stats endpoints.

Notes
- Fixed YAML errors (duplicate keys / indentation) to unblock integration tests.

---

## Phase 5 — Data Consistency Across Entities
Status: Pending

- Standardize `reviews` storage in entity models:
  - Prefer `reviews: ObjectId[]` referencing `Review` in all models.
  - For `Restaurant`, migrate embedded `reviews` objects to references for consistency.
- Centralize rating aggregation:
  - On create/update/delete of `Review`, recompute and persist `entity.rating` and `entity.numReviews`.
  - Implement as service-level operations; optionally add Mongoose middleware if appropriate.
- Acceptance: All entities store reviews consistently; rating fields stay in sync.

Checklist
- [ ] Standardize `reviews: ObjectId[]` reference across all entity models (verify and migrate inconsistencies).
- [ ] Add service-level hooks on Review create/update/delete to recompute and persist `entity.rating` and `entity.numReviews`.
- [ ] Backfill existing aggregates to ensure parity.

Suggested implementation
- Prefer service-layer recomputation (transactional) over Mongoose middleware for clearer control and testability.
- Provide an idempotent script to recompute aggregates per entity type.

---

## Phase 6 — Caching & Performance
Status: Planned

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
- [ ] Implement cache layer in `ReviewService.getReviewsByEntity` and `getReviewStats` using keys like `reviews:{EntityType}:{id}:p={n}&l={k}&r={rating}&s={sort}` and `reviews:stats:{EntityType}:{id}`.
- [ ] Invalidate on review create/update/delete/helpful vote (tag invalidate by entity + reviews).
- [ ] Optional: prewarm hot entities via `CacheWarmingService`.

---

## Phase 7 — Security & Abuse Prevention
Status: Partially Completed

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
- [x] Enforce uniqueness with `{ author, entityType, entity }` (partial index for safe rollout).
- [x] Ownership checks for update/delete (403) in controllers.
- [x] Rate limiting applied on creation endpoints.
- [ ] Tests for duplicates and helpful votes edge cases.

Additions
- Partial unique index with `partialFilterExpression` to avoid E11000 blocking during migration.

---

## Phase 8 — Telemetry & Metrics
Status: Planned

- Logging
  - Structured logs on create/update/delete with `entityType`, `entityId`, `authorId`.
- Metrics
  - Counters: reviews_created_by_entityType, votes_helpful_added/removed.
  - Timers: p95 latency for list/stats endpoints.
  - Error rates by validation vs. persistence.
- Acceptance: Basic observability in place for monitoring rollout.

Checklist
- [ ] Structured logs on review mutations with `entityType`, `entityId`, `authorId`.
- [ ] Counters for reviews created and helpful votes added/removed.
- [ ] Latency metrics for list/stats (p95), error rates by validation vs persistence.

---

## Phase 9 — Deprecation & Cleanup
Status: Planned

- Remove deprecated `restaurant` field from `Review`.
- Remove legacy service methods (`getReviewsByRestaurant`, etc.).
- Remove legacy endpoints (e.g., `/add-review/:id` variants) if no longer used.
- Update tests to only use polymorphic paths.
- Acceptance: Codebase only uses polymorphic implementation; contracts clean.

Checklist
- [ ] Announce deprecation and schedule removal window.
- [ ] Remove deprecated `restaurant` field from `Review`.
- [ ] Remove legacy service methods and `/add-review/:id` endpoints once consumers migrated.
- [ ] Update tests and Postman to only use polymorphic paths.

---

## Phase 10 — Testing Strategy (spans multiple phases)
Status: In Progress

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
- [ ] Expand `src/test/controllers/*` and `src/test/integration/*` for Markets/Recipes review list & stats.
- [ ] Unit tests for alias mapping, ID extraction and sanitizers in `ReviewService`.
- [ ] Integration tests for helpful votes (duplicate vote, remove non-existent).
- [ ] Migration tests for backfill script idempotency.

---

## Extras Implemented (Out of Original Scope)

- Controller factories to remove duplication across entities: `src/controllers/factories/reviewEndpointsFactory.ts`.
- Sonar fixes (S6551) by removing unsafe `String(obj)` coercions and lowering `sanitizeReviewData` complexity.
- Comprehensive Swagger updates with error response examples (400/401/403/404/409/500) and example payloads for list/stats.
- Postman collection updated with new review list/stats endpoints for Markets and Recipes.
- Index safety: unique index made partial to avoid deployment-time E11000.

---

## Next Milestones

1) Phase 5 (data consistency): implement aggregate sync hooks + backfill script.
2) Phase 6 (caching): add cache for list/stats with invalidation on mutations.
3) Phase 7 tests: add duplicate/edge-case coverage for helpful votes and unique constraints.
4) Phase 9: plan deprecation timeline and consumer communication; remove legacy fields/routes when safe.

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
