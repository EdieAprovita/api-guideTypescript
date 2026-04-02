import { HttpError, HttpStatusCode } from '../types/Errors.js';

const DANGEROUS_UPDATE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function visitKeys(value: unknown, path: string[] = []): string[] {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }

    const invalidPaths: string[] = [];

    for (const [key, nestedValue] of Object.entries(value)) {
        const currentPath = [...path, key];

        if (key.startsWith('$') || key.includes('.') || DANGEROUS_UPDATE_KEYS.has(key)) {
            invalidPaths.push(currentPath.join('.'));
            continue;
        }

        invalidPaths.push(...visitKeys(nestedValue, currentPath));
    }

    return invalidPaths;
}

export function assertSafeUpdatePayload(payload: Record<string, unknown>, context: string): void {
    const invalidPaths = visitKeys(payload);
    if (invalidPaths.length > 0) {
        throw new HttpError(
            HttpStatusCode.BAD_REQUEST,
            `Invalid ${context}: update operators or unsafe keys are not allowed`
        );
    }
}

interface BuildAllowedUpdatePayloadOptions<TField extends string> {
    allowedFields: readonly TField[];
    aliases?: Partial<Record<string, TField>>;
    extraAssignments?: Record<string, unknown>;
    context: string;
    emptyMessage?: string;
}

export function buildAllowedUpdatePayload<TField extends string>(
    payload: Record<string, unknown>,
    options: BuildAllowedUpdatePayloadOptions<TField>
): Record<string, unknown> {
    assertSafeUpdatePayload(payload, options.context);

    const allowed = new Set<string>(options.allowedFields);
    const update: Record<string, unknown> = {};

    for (const field of allowed) {
        if (field in payload) {
            update[field] = payload[field];
        }
    }

    if (options.aliases) {
        for (const [alias, targetField] of Object.entries(options.aliases)) {
            if (!targetField) {
                continue;
            }
            if (!(targetField in update) && alias in payload) {
                update[targetField] = payload[alias];
            }
        }
    }

    Object.assign(update, options.extraAssignments);

    const effectiveFieldCount = Object.keys(update).filter(key => !(options.extraAssignments && key in options.extraAssignments)).length;
    if (effectiveFieldCount === 0) {
        throw new HttpError(
            HttpStatusCode.BAD_REQUEST,
            options.emptyMessage ?? `No valid fields provided for ${options.context}`
        );
    }

    return update;
}
