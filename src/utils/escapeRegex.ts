/**
 * Escapes all regex special characters in a user-supplied string before it is
 * used inside a MongoDB `$regex` query.
 *
 * Without this escaping, an attacker can inject arbitrary regex operators
 * (e.g. `.*`, `(?=)`, or catastrophic-backtracking patterns) leading to:
 *   - ReDoS (Regular Expression Denial of Service)
 *   - Unintended data exposure via overly broad matches
 *
 * @security OWASP A03:2021 - Injection
 * @see https://owasp.org/Top10/A03_2021-Injection/
 *
 * @param str - The raw user input to be escaped
 * @returns A string safe for use in `$regex` queries
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
