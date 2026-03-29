/**
 * Strips keys that could lead to prototype pollution attacks.
 * Applied after sanitizeNoSQLInput as defense-in-depth since
 * express body-parser already blocks __proto__ by default.
 *
 * @security OWASP A03:2021 - Injection / Prototype Pollution
 * @see https://owasp.org/Top10/A03_2021-Injection/
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'] as const;

export function stripPrototypePollutionKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const safe: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
        if (!DANGEROUS_KEYS.includes(key as (typeof DANGEROUS_KEYS)[number])) {
            safe[key] = obj[key];
        }
    }
    return safe;
}
