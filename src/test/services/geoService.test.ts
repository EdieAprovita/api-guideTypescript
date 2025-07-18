import { Client } from '@googlemaps/google-maps-services-js';
import { GeoService } from '../../services/GeoService';
import logger from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('GeoService', () => {
  const apiKey = 'test-key';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns lat/lng on successful geocode', async () => {
    const geocodeMock = jest.fn().mockResolvedValue({
      status: 200,
      data: { results: [{ geometry: { location: { lat: 10, lng: 20 } } }] },
    });
    const client = { geocode: geocodeMock } as unknown as Client;
    const service = new GeoService(client, apiKey);

    const result = await service.geocodeAddress('test address');

    expect(geocodeMock).toHaveBeenCalledWith({ params: { address: 'test address', key: apiKey } });
    expect(result).toEqual({ lat: 10, lng: 20 });
    expect(logger.info).toHaveBeenCalledWith('Geocoding response status: 200');
    expect(logger.info).toHaveBeenCalledWith('Geocoding successful: 10, 20');
  });

  it('returns null when no results', async () => {
    const geocodeMock = jest.fn().mockResolvedValue({ status: 200, data: { results: [] } });
    const client = { geocode: geocodeMock } as unknown as Client;
    const service = new GeoService(client, apiKey);

    const result = await service.geocodeAddress('missing');

    expect(result).toBeNull();
    expect(logger.info).toHaveBeenCalledWith('Geocoding response status: 200');
    expect(logger.error).toHaveBeenCalledWith('No geocoding results found for address: missing');
  });

  it('throws error when geocode call fails', async () => {
    const error = new Error('boom');
    const geocodeMock = jest.fn().mockRejectedValue(error);
    const client = { geocode: geocodeMock } as unknown as Client;
    const service = new GeoService(client, apiKey);

    await expect(service.geocodeAddress('fail')).rejects.toThrow(error);
    expect(logger.error).toHaveBeenCalledWith('Error during geocoding', { error: 'boom' });
  });

  it('throws if API key not configured', async () => {
    const client = { geocode: jest.fn() } as unknown as Client;
    const service = new GeoService(client, '');

    await expect(service.geocodeAddress('any')).rejects.toThrow('Google Maps API key is not configured');
  });
});