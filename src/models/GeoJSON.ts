export interface IGeoJSONPoint {
    type: 'Point';
    coordinates: [number, number];
}

export const geoJSONPointSchema = {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: {
        type: [Number],
        validate: {
            validator: (value: number[]) => value.length === 2,
            message: 'Coordinates must contain exactly two elements: [longitude, latitude].',
        },
    },
};
