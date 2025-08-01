import { render, waitFor } from '@testing-library/svelte';
import MapWidget from '../MapWidget.svelte';
import axios from 'axios';
import { vi } from 'vitest';

vi.mock('axios');
const mockMap = {
  setView: vi.fn().mockReturnThis(),
  addLayer: vi.fn().mockReturnThis(),
  remove: vi.fn().mockReturnThis(),
  invalidateSize: vi.fn().mockReturnThis(),
};

const mockTileLayer = {
  addTo: vi.fn().mockReturnThis(),
};

const mockMarker = {
  addTo: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  openPopup: vi.fn().mockReturnThis(),
};

vi.mock('leaflet', async (importOriginal) => {
  const originalModule = await importOriginal();

  return {
    ...originalModule,
    default: {
      ...originalModule.default,
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => mockTileLayer),
      marker: vi.fn(() => mockMarker),
      latLng: originalModule.default.latLng || ((lat, lng) => ({ lat, lng })),
      Icon: originalModule.default.Icon || {
        Default: {
          imagePath: '',
          mergeOptions: vi.fn(),
          prototype: {
            options: {},
            _getIconUrl: vi.fn(() => ''),
          },
        },
      },
    },
  };
});
describe('MapWidget component', () => {
  test('initializes Leaflet map on mount', () => {
    render(MapWidget);

    // Access default export from leaflet mock
    const L = require('leaflet').default;

    const mockMapInstance = L.map.mock.results[0].value;
    const mockTileLayerInstance = L.tileLayer.mock.results[0].value;

    expect(mockMapInstance.setView).toHaveBeenCalled();
    expect(mockTileLayerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);
  });

  test('calls updateMap and sets view/marker when country prop changes', async () => {
    axios.get.mockResolvedValueOnce({
      data: [{
        latlng: [46.2276, 2.2137],
        name: { common: 'France' },
      }],
    });

    const { rerender } = render(MapWidget, { country: '' });
    await rerender({ country: 'France' });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'https://restcountries.com/v3.1/name/France?fullText=true'
      );
    });

    const L = require('leaflet').default;
    const mockMapInstance = L.map.mock.results[0].value;
    const mockMarkerInstance = L.marker.mock.results[0].value;

    expect(mockMarkerInstance.setLatLng).toHaveBeenCalledWith([46.2276, 2.2137]);
    expect(mockMapInstance.setView).toHaveBeenCalledWith([46.2276, 2.2137], expect.any(Number));
  });

  test('handles API error gracefully and logs error to console', async () => {
    const error = new Error('API error');
    axios.get.mockRejectedValueOnce(error);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { rerender } = render(MapWidget, { country: '' });
    await rerender({ country: 'NonExistentCountry' });

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to update map:", error);
    });

    consoleErrorSpy.mockRestore();
  });

  test('does not update map if country is set to empty string after initial load', async () => {
    axios.get.mockResolvedValueOnce({
      data: [{
        latlng: [46.2276, 2.2137],
        name: { common: 'France' },
      }],
    });

    const { rerender } = render(MapWidget, { country: 'France' });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'https://restcountries.com/v3.1/name/France?fullText=true'
      );
    });

    axios.get.mockClear();

    await rerender({ country: '' });

    expect(axios.get).not.toHaveBeenCalled();
  });
});
