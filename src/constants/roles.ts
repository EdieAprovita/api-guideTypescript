import type { UserRole } from '../models/User.js';

/**
 * Roles that a user may self-assign during registration.
 * 'admin' is intentionally excluded — it must be granted by an existing admin.
 * Shared between userControllers.ts (controller-level check) and
 * validators.ts (Joi schema) to keep both layers in sync automatically.
 */
export const REGISTER_ALLOWED_ROLES = ['user', 'professional'] as const;
export type RegisterAllowedRole = (typeof REGISTER_ALLOWED_ROLES)[number];

/**
 * Numeric rank for each role, used to classify role changes as escalations or demotions.
 * Higher value = more privilege. Evaluated once at module load — not per-request.
 * Typed as Record<UserRole, number> so TypeScript catches drift if a new role is added
 * to the User model without updating this map.
 */
export const ROLE_RANK: Record<UserRole, number> = { user: 0, professional: 1, admin: 2 };
