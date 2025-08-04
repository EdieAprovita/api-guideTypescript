import { randomBytes } from 'crypto';

/**
 * Generate a cryptographically secure random string
 * @param length - Length of the string to generate
 * @param charset - Character set to use (default: alphanumeric)
 * @returns Secure random string
 */
export const generateSecureRandomString = (
    length: number = 8,
    charset: string = 'abcdefghijklmnopqrstuvwxyz0123456789'
): string => {
    const bytes = randomBytes(length);
    let result = '';

    for (let i = 0; i < length; i++) {
        result += charset[bytes[i] % charset.length];
    }

    return result;
};

/**
 * Generate a secure random string suitable for JWT jti (JWT ID)
 * @returns Secure random string for JWT ID
 */
export const generateSecureJti = (): string => {
    return generateSecureRandomString(9, 'abcdefghijklmnopqrstuvwxyz0123456789');
};

/**
 * Generate a secure random string suitable for nonce
 * @returns Secure random string for nonce
 */
export const generateSecureNonce = (): string => {
    return generateSecureRandomString(7, 'abcdefghijklmnopqrstuvwxyz0123456789');
};

/**
 * Generate a secure random string for unique identifiers
 * @returns Secure random string for unique IDs
 */
export const generateSecureUniqueId = (): string => {
    return Date.now().toString() + generateSecureRandomString(6, 'abcdefghijklmnopqrstuvwxyz0123456789');
};

/**
 * Generate a secure random signature for mock JWT tokens
 * @returns Secure random signature string
 */
export const generateSecureSignature = (): string => {
    return 'mock-signature-' + generateSecureRandomString(9, 'abcdefghijklmnopqrstuvwxyz0123456789');
};
