/**
 * Startup environment validation.
 *
 * Rules:
 *  - In production:  any violation throws, preventing the server from starting.
 *  - In development: violations emit warnings but the process continues.
 *  - In test:        entirely skipped so the test runner is never interrupted.
 *
 * A secret is considered a placeholder when it:
 *   - is missing / empty, OR
 *   - contains any of the banned substrings (case-insensitive), OR
 *   - is shorter than MIN_SECRET_LENGTH characters.
 */

import logger, { logWarn } from '../utils/logger.js';

const MIN_SECRET_LENGTH = 32;

/**
 * Lowercase substrings that indicate a value was never replaced from the
 * template / example .env. Any secret whose lower-cased value *includes* one
 * of these is rejected.
 */
const PLACEHOLDER_PATTERNS: readonly string[] = [
    'your',
    'secret',
    'change',
    'placeholder',
    'example',
    'insert',
    'replace',
    'changeme',
    'todo',
];

export interface SecretRule {
    /** Environment variable name */
    name: string;
    /** Minimum acceptable length (defaults to MIN_SECRET_LENGTH) */
    minLength?: number;
    /** If true, a missing value is only warned about, never fatal */
    warnOnly?: boolean;
    /**
     * If true, skip the placeholder-pattern check.
     * Use for values like connection strings where legitimate values may
     * contain words such as "example" or "replace" in hostnames/paths.
     */
    skipPatternCheck?: boolean;
}

const REQUIRED_SECRETS: readonly SecretRule[] = [
    { name: 'JWT_SECRET', minLength: MIN_SECRET_LENGTH },
    { name: 'JWT_REFRESH_SECRET', minLength: MIN_SECRET_LENGTH },
    { name: 'MONGODB_URI', minLength: 1, skipPatternCheck: true }, // format validated separately by Mongoose
    { name: 'SESSION_SECRET', minLength: MIN_SECRET_LENGTH, warnOnly: true },
];

const WARN_ONLY_SECRETS: readonly SecretRule[] = [
    { name: 'JWT_RESET_SECRET', minLength: MIN_SECRET_LENGTH, warnOnly: true },
];

// ─── helpers ────────────────────────────────────────────────────────────────

function isPlaceholder(value: string): boolean {
    const lower = value.toLowerCase();
    return PLACEHOLDER_PATTERNS.some(pattern => lower.includes(pattern));
}

function violationMessage(rule: SecretRule, value: string | undefined): string | null {
    const effectiveMinLength = rule.minLength ?? MIN_SECRET_LENGTH;

    if (!value || value.trim() === '') {
        return `${rule.name} is not set`;
    }
    if (!rule.skipPatternCheck && isPlaceholder(value)) {
        return `${rule.name} contains a placeholder value — replace it with a real secret`;
    }
    if (value.length < effectiveMinLength) {
        return `${rule.name} is too short (${value.length} chars, minimum ${effectiveMinLength})`;
    }
    return null;
}

// ─── public API ─────────────────────────────────────────────────────────────

export interface EnvValidationResult {
    errors: string[];
    warnings: string[];
}

/**
 * Validates secrets and returns a structured result.
 * Does NOT throw or call process.exit — that decision belongs to the caller.
 */
export function checkSecrets(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of REQUIRED_SECRETS) {
        const msg = violationMessage(rule, env[rule.name]);
        if (msg) {
            if (rule.warnOnly) {
                warnings.push(msg);
            } else {
                errors.push(msg);
            }
        }
    }

    for (const rule of WARN_ONLY_SECRETS) {
        const msg = violationMessage(rule, env[rule.name]);
        if (msg) {
            warnings.push(msg);
        }
    }

    return { errors, warnings };
}

/**
 * Runs secret validation and enforces the result based on NODE_ENV:
 *
 *  - 'test'        → no-op (returns immediately)
 *  - 'production'  → throws on any error
 *  - other         → logs warnings, never throws
 */
export function validateSecrets(env: NodeJS.ProcessEnv = process.env): void {
    const nodeEnv = env.NODE_ENV;

    if (nodeEnv === 'test') {
        return;
    }

    const { errors, warnings } = checkSecrets(env);

    for (const warning of warnings) {
        logWarn(`[env-validation] WARNING: ${warning}`);
    }

    if (errors.length === 0) {
        return;
    }

    const errorList = errors.map(e => `  • ${e}`).join('\n');
    const message =
        `[env-validation] Invalid or missing secrets detected:\n${errorList}\n` +
        (nodeEnv === 'production'
            ? 'Refusing to start in production with insecure configuration.'
            : 'Fix these before deploying to production.');

    if (nodeEnv === 'production') {
        logger.error(message);
        throw new Error(message);
    } else {
        logWarn(message);
    }
}
