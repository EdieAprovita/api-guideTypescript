import { Client } from "@googlemaps/google-maps-services-js";

export class GeoService {
        readonly client: Client;
        readonly apiKey: string;

        constructor(client: Client = new Client({}), apiKey: string = process.env.GOOGLE_MAPS_API_KEY as string) {
                this.client = client;
                this.apiKey = apiKey;
        }

        async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
                if (!this.apiKey) {
                        throw new Error("Google Maps API key is not configured");
                }

                try {
                        const response = await this.client.geocode({
                                params: {
                                        address,
                                        key: this.apiKey,
                                },
                        });

                        const result = response.data.results[0];
                        if (!result) return null;

                        const { lat, lng } = result.geometry.location;
                        return { lat, lng };
                } catch (error) {
                        console.error("Error during geocoding:", error);
                        return null;
                }
        }
}

export const geoService = new GeoService();
export default geoService;
