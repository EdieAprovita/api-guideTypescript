/**
 * Safely parse a query string value to a finite number.
 * Returns undefined if the value is missing or results in NaN/Infinity,
 * preventing non-numeric inputs (e.g. lat=abc) from reaching MongoDB geo queries.
 */
export const parseFiniteNumber = (value: unknown): number | undefined => {
    if (value === undefined || value === null || value === '' || Array.isArray(value)) return undefined;

    let toConvert: unknown = value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed === '') {
            return undefined;
        }
        toConvert = trimmed;
    }

    const n = Number(toConvert);
    return Number.isFinite(n) ? n : undefined;
};

/**
 * Resolve coordinate pair from query params that support two naming conventions:
 * `latitude`/`longitude` (standard) and `lat`/`lng` (legacy/shorthand).
 * Returns [lat, lng] as finite numbers or [undefined, undefined] if invalid/missing.
 * Both values must be valid finite numbers to form a usable coordinate pair.
 * Throws an error (handled by controllers, or throws a simple Error here) if only one coordinate is provided.
 */
export const resolveCoords = (
    latitude: unknown,
    longitude: unknown,
    lat: unknown,
    lng: unknown
): [number | undefined, number | undefined] => {
    const hasFull = latitude !== undefined || longitude !== undefined;
    const hasShort = lat !== undefined || lng !== undefined;

    if (hasFull && hasShort) {
        throw new Error('Cannot mix latitude/longitude with lat/lng naming conventions');
    }

    const hasExplicitLatitude = latitude !== undefined && latitude !== null && latitude !== '';
    const hasExplicitLat = lat !== undefined && lat !== null && lat !== '';
    let resolvedLat: number | undefined;
    if (hasExplicitLatitude) {
        resolvedLat = parseFiniteNumber(latitude);
        if (resolvedLat === undefined) throw new Error('latitude must be a valid finite number');
    } else if (hasExplicitLat) {
        resolvedLat = parseFiniteNumber(lat);
        if (resolvedLat === undefined) throw new Error('lat must be a valid finite number');
    }

    const hasExplicitLongitude = longitude !== undefined && longitude !== null && longitude !== '';
    const hasExplicitLng = lng !== undefined && lng !== null && lng !== '';
    let resolvedLng: number | undefined;
    if (hasExplicitLongitude) {
        resolvedLng = parseFiniteNumber(longitude);
        if (resolvedLng === undefined) throw new Error('longitude must be a valid finite number');
    } else if (hasExplicitLng) {
        resolvedLng = parseFiniteNumber(lng);
        if (resolvedLng === undefined) throw new Error('lng must be a valid finite number');
    }

    const hasLat = resolvedLat !== undefined;
    const hasLng = resolvedLng !== undefined;

    if (hasLat && hasLng) {
        return [resolvedLat, resolvedLng];
    }

    if (hasLat !== hasLng) {
        throw new Error('Both latitude and longitude are required when filtering by coordinates');
    }

    return [undefined, undefined];
};
