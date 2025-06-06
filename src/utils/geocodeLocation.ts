import geoService from "../services/GeoService";
import { IGeoJSONPoint } from "../types/GeoJSON";

export interface IGeocodeBody {
    address?: string;
    location?: IGeoJSONPoint;
}
export async function geocodeAndAssignLocation(body: IGeocodeBody): Promise<void> {
    if (body.address) {
        const coords = await geoService.geocodeAddress(body.address);
        if (coords) {
            const location: IGeoJSONPoint = {
                type: "Point",
                coordinates: [coords.lng, coords.lat],
            };
            body.location = location;
        }
    }
}

export default geocodeAndAssignLocation;
