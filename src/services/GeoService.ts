import { Client } from '@googlemaps/google-maps-services-js';
import logger from '../utils/logger';

export class GeoService {
    readonly client: Client;
    readonly apiKey: string;

    constructor(client: Client = new Client({}), apiKey: string = process.env.GOOGLE_MAPS_API_KEY as string) {
        this.client = client;
        this.apiKey = apiKey;
    }

    async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
        if (!this.apiKey) {
            throw new Error('Google Maps API key is not configured');
        }

        try {
            const response = await this.client.geocode({
                params: {
                    address,
                    key: this.apiKey,
                },
            });

            logger.info(`Geocoding response status: ${response.status}`);

            const result = response.data.results[0];
            if (!result) {
                logger.error(`No geocoding results found for address: ${address}`);
                return null;
            }

            const { lat, lng } = result.geometry.location;
            logger.info(`Geocoding successful: ${lat}, ${lng}`);
            return { lat, lng };
        } catch (error) {
            logger.error('Error during geocoding', {
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }
}

export const geoService = new GeoService();
export default geoService;
