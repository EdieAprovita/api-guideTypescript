import { Client } from "@googlemaps/google-maps-services-js";
import { GeoService } from "../../services/GeoService";

describe("GeoService", () => {
    it("geocodeAddress returns lat/lng", async () => {
        const geocode = jest.fn().mockResolvedValue({
            data: {
                results: [{ geometry: { location: { lat: 10, lng: 20 } } }]
            }
        });
        const mockClient: Partial<Client> = { geocode };
        const service = new GeoService(mockClient as Client, "test-key");

        const result = await service.geocodeAddress("test");

        expect(geocode).toHaveBeenCalledWith({
            params: { address: "test", key: "test-key" }
        });
        expect(result).toEqual({ lat: 10, lng: 20 });
    });

    it("returns null when no results", async () => {
        const geocode = jest.fn().mockResolvedValue({ data: { results: [] } });
        const mockClient: Partial<Client> = { geocode };
        const service = new GeoService(mockClient as Client, "test-key");

        const result = await service.geocodeAddress("missing");
        expect(result).toBeNull();
    });
});
