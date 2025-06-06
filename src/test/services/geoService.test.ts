import { Client } from "@googlemaps/google-maps-services-js";
jest.mock("../../utils/logger", () => ({
    __esModule: true,
    default: { error: jest.fn() },
}));
import logger from "../../utils/logger";
import { GeoService } from "../../services/GeoService";

const mockLogger = logger as unknown as { error: jest.Mock };

describe("GeoService", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
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

    it("logs and rethrows on geocoding error", async () => {
        const error = new Error("fail");
        const geocode = jest.fn().mockRejectedValue(error);
        const mockClient: Partial<Client> = { geocode };
        const service = new GeoService(mockClient as Client, "test-key");

        await expect(service.geocodeAddress("test")).rejects.toThrow(error);
        expect(mockLogger.error).toHaveBeenCalled();
    });
});
