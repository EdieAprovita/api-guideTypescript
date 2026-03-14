/**
 * Roles that a user may self-assign during registration.
 * 'admin' is intentionally excluded — it must be granted by an existing admin.
 * Shared between userControllers.ts (controller-level check) and
 * validators.ts (Joi schema) to keep both layers in sync automatically.
 */
export const REGISTER_ALLOWED_ROLES = ['user', 'professional'] as const;
export type RegisterAllowedRole = (typeof REGISTER_ALLOWED_ROLES)[number];
