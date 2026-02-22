import { describe, expect, it } from 'vitest';
import { parseFiniteNumber, resolveCoords } from '../../utils/geoHelpers.js';

describe('Geo Helpers Unit Tests', () => {
    describe('parseFiniteNumber', () => {
        it('should correctly parse a valid numeric string', () => {
            expect(parseFiniteNumber('123.45')).toBe(123.45);
            expect(parseFiniteNumber('-10')).toBe(-10);
            expect(parseFiniteNumber('0')).toBe(0);
        });

        it('should return undefined for non-numeric strings', () => {
            expect(parseFiniteNumber('abc')).toBeUndefined();
            expect(parseFiniteNumber('123a')).toBeUndefined();
            expect(parseFiniteNumber('')).toBeUndefined();
        });

        it('should return undefined for array inputs (Express parsing protection)', () => {
            expect(parseFiniteNumber(['123', '456'])).toBeUndefined();
            expect(parseFiniteNumber(['123'])).toBeUndefined();
        });

        it('should return undefined for undefined/null inputs', () => {
            expect(parseFiniteNumber(undefined)).toBeUndefined();
            expect(parseFiniteNumber(null)).toBeUndefined();
        });

        it('should return undefined for Infinity', () => {
            expect(parseFiniteNumber('Infinity')).toBeUndefined();
        });
    });

    describe('resolveCoords', () => {
        it('should resolve full word coordinates (latitude, longitude)', () => {
            const [lat, lng] = resolveCoords('10.5', '20.5', undefined, undefined);
            expect(lat).toBe(10.5);
            expect(lng).toBe(20.5);
        });

        it('should resolve short word coordinates (lat, lng)', () => {
            const [lat, lng] = resolveCoords(undefined, undefined, '10.5', '20.5');
            expect(lat).toBe(10.5);
            expect(lng).toBe(20.5);
        });

        it('should throw an error if naming conventions are mixed (latitude/longitude with lat/lng)', () => {
            const expectError = 'Cannot mix latitude/longitude with lat/lng naming conventions';
            expect(() => resolveCoords('8', '9', '1', '2')).toThrow(expectError);
            expect(() => resolveCoords('8', undefined, undefined, '2')).toThrow(expectError);
            expect(() => resolveCoords(undefined, '9', '1', undefined)).toThrow(expectError);
        });

        it('should throw an error if only one coordinate from a pair is provided', () => {
            const expectError = 'Both latitude and longitude are required when filtering by coordinates';
            expect(() => resolveCoords('10', undefined, undefined, undefined)).toThrow(expectError);
            expect(() => resolveCoords(undefined, '10', undefined, undefined)).toThrow(expectError);
            expect(() => resolveCoords(undefined, undefined, '10', undefined)).toThrow(expectError);
            expect(() => resolveCoords(undefined, undefined, undefined, '10')).toThrow(expectError);
        });

        it('should throw specific errors for invalid numeric coordinates', () => {
            expect(() => resolveCoords('abc', '20.5', undefined, undefined)).toThrow(
                'latitude must be a valid finite number'
            );
            expect(() => resolveCoords('10.5', 'abc', undefined, undefined)).toThrow(
                'longitude must be a valid finite number'
            );
        });

        it('should return [undefined, undefined] if no coordinates are provided', () => {
            const [lat, lng] = resolveCoords(undefined, undefined, undefined, undefined);
            expect(lat).toBeUndefined();
            expect(lng).toBeUndefined();
        });
    });
});
