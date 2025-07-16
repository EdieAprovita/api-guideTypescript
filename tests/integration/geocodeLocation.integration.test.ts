import geoService from '../../src/services/GeoService';
import { geocodeAndAssignLocation } from '../../src/utils/geocodeLocation';

jest.mock('../../src/services/GeoService', () => ({
    __esModule: true,
    default: { geocodeAddress: jest.fn() },
}));

describe('geocodeAndAssignLocation', () => {
    it('assigns location when geocoding succeeds', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue({ lat: 10, lng: 20 });
        const body: any = { address: 'test' };

        await geocodeAndAssignLocation(body);

        expect(geoService.geocodeAddress).toHaveBeenCalledWith('test');
        expect(body.location).toEqual({ type: 'Point', coordinates: [20, 10] });
    });

    it('does not assign location when geocoding fails', async () => {
        (geoService.geocodeAddress as jest.Mock).mockResolvedValue(null);
        const body: any = { address: 'none' };

        await geocodeAndAssignLocation(body);

        expect(body.location).toBeUndefined();
    });
});
