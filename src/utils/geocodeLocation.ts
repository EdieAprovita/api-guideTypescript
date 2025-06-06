import geoService from "../services/GeoService";
import { IGeoJSONPoint } from "../types/GeoJSON";
import logger from "./logger";

export interface IGeocodeBody {
    address?: string;
    location?: IGeoJSONPoint;
}
export async function geocodeAndAssignLocation(body: IGeocodeBody): Promise<void> {
    if (body.address) {
        try {
            const coords = await geoService.geocodeAddress(body.address);
            if (coords) {
                const location: IGeoJSONPoint = {
                    type: "Point",
                    coordinates: [coords.lng, coords.lat],
                };
                body.location = location;
            }
        } catch (error) {
            logger.error("Error geocoding address", {
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }
}

export default geocodeAndAssignLocation;
