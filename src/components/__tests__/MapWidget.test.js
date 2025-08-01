import { render, screen, act, waitFor } from '@testing-library/svelte';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import MapWidget from '../MapWidget.svelte'; // Adjust path as needed
import axios from 'axios';
import L from 'leaflet'; // Changed from * as L to L to match component's import style

// Mock axios to control API responses
vi.mock('axios');

// Define mock instances globally. These will be returned by the mocked Leaflet functions.
const mockMapInstance = {
  setView: vi.fn(),
  // Add other methods that might be called on the map instance if needed
};
const mockTileLayerInstance = {
  addTo: vi.fn(),
};
const mockMarkerInstance = {
  addTo: vi.fn(),
  setLatLng: vi.fn(),
};

// Explicitly mock Leaflet's exports to ensure they are vi.fn() spies
// The key here is to return an object that matches the structure of Leaflet's default export
vi.mock('leaflet', () => {
  return {
    // These are the top-level properties of the default 'L' object
    map: vi.fn(() => mockMapInstance),
    tileLayer: vi.fn(() => mockTileLayerInstance),
    marker: vi.fn(() => mockMarkerInstance),
    // Mock L.Icon.Default as it's often used internally by Leaflet for markers
    Icon: {
      Default: {
        imagePath: '', // Common workaround for missing marker images in JSDOM
        mergeOptions: vi.fn(),
        prototype: {
          options: {},
          _getIconUrl: vi.fn(() => ''),
        },
      },
    },
    // Mock L.latLng if your component uses it directly
    latLng: vi.fn((lat, lng) => ({ lat, lng })),
    // If 'leaflet' has a default export that is the 'L' object itself,
    // we need to explicitly include it here for `import L from 'leaflet';` to work.
    // In Vitest, if you mock the module, the default export will be the object you return.
    // So, `map`, `tileLayer`, etc. will be directly on `L`.
    default: {
      map: vi.fn(() => mockMapInstance),
      tileLayer: vi.fn(() => mockTileLayerInstance),
      marker: vi.fn(() => mockMarkerInstance),
      Icon: {
        Default: {
          imagePath: '',
          mergeOptions: vi.fn(),
          prototype: {
            options: {},
            _getIconUrl: vi.fn(() => ''),
          },
        },
      },
      latLng: vi.fn((lat, lng) => ({ lat, lng })),
    },
  };
});

// Mock data for successful country API calls
const mockCountryData = {
  data: [
    {
      name: {
        common: 'France',
      },
      latlng: [46.2276, 2.2137], // Lat, Lng for France
    },
  ],
};

const mockAnotherCountryData = {
  data: [
    {
      name: {
        common: 'Germany',
      },
      latlng: [51.1657, 10.4515], // Lat, Lng for Germany
    },
  ],
};

// Store the console.error to prevent it from polluting test output
let consoleErrorSpy;

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();

  // Re-set mock return values for axios.get
  axios.get.mockResolvedValue({ data: mockCountryData });

  // Re-spy on console.error
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console.error after each test
  consoleErrorSpy.mockRestore();
});

test('renders map container div', () => {
  render(MapWidget);
  // Use getByTestId to select the main map container div
  const mapContainer = screen.getByTestId('map-container');
  expect(mapContainer).toBeInTheDocument();
  expect(mapContainer).toHaveStyle('height: 400px; width: 100%;');
});

test('initializes Leaflet map on mount', async () => {
  render(MapWidget); // Render the component

  // Wait for onMount to complete and map initialization to occur
  // This is crucial for Leaflet's L.map to be called.
  await act(async () => {
    await Promise.resolve();
  });

  // Expect L.map to be called with the map container
  expect(L.map).toHaveBeenCalledTimes(1);
  const mapContainerElement = L.map.mock.calls[0][0];
  expect(mapContainerElement).toBeInstanceOf(HTMLDivElement);
  expect(L.map).toHaveBeenCalledWith(mapContainerElement, undefined); // No options passed initially

  // Expect setView to be called with initial coordinates and zoom
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(1);
  expect(mockMapInstance.setView).toHaveBeenCalledWith([20, 0], 2);

  // Expect L.tileLayer to be called and added to the map
  expect(L.tileLayer).toHaveBeenCalledTimes(1);
  expect(L.tileLayer).toHaveBeenCalledWith('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  });
  expect(mockTileLayerInstance.addTo).toHaveBeenCalledTimes(1);
  expect(mockTileLayerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);
});

test('does not call updateMap if country is empty initially', async () => {
  render(MapWidget, { props: { country: '' } });

  // Ensure any initial reactive statements have run
  await act(async () => {
    await Promise.resolve();
  });

  // axios.get should not be called if country is empty
  expect(axios.get).not.toHaveBeenCalled();
});

test('calls updateMap and sets view/marker when country prop changes', async () => {
  const { rerender } = render(MapWidget, { props: { country: 'France' } });

  // Wait for initial map setup and reactive statement to trigger
  await act(async () => {
    await Promise.resolve();
  });

  // Expect axios.get to be called for France
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith('https://restcountries.com/v3.1/name/France?fullText=true');

  // Expect map.setView to be called with France's coordinates
  // It's called once on mount, and once more for the country prop change
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(2);
  expect(mockMapInstance.setView).toHaveBeenCalledWith(mockCountryData.data[0].latlng, 5);

  // Expect marker to be created and added for the first country
  expect(L.marker).toHaveBeenCalledTimes(1);
  expect(L.marker).toHaveBeenCalledWith(mockCountryData.data[0].latlng);
  expect(mockMarkerInstance.addTo).toHaveBeenCalledTimes(1);
  expect(mockMarkerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);

  // Change country to Germany
  axios.get.mockResolvedValue({ data: mockAnotherCountryData.data }); // Mock new data for Germany
  await act(async () => {
    rerender({ country: 'Germany' }); // Use rerender for prop updates
    await Promise.resolve(); // Ensure reactive statement triggers
  });

  // Expect axios.get to be called again for Germany
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get).toHaveBeenCalledWith('https://restcountries.com/v3.1/name/Germany?fullText=true');

  // Expect map.setView to be called for Germany
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(3); // 2 previous calls + 1 for Germany
  expect(mockMapInstance.setView).toHaveBeenCalledWith(mockAnotherCountryData.data[0].latlng, 5);

  // Expect existing marker to be updated (setLatLng)
  expect(mockMarkerInstance.setLatLng).toHaveBeenCalledTimes(1);
  expect(mockMarkerInstance.setLatLng).toHaveBeenCalledWith(mockAnotherCountryData.data[0].latlng);
  expect(L.marker).toHaveBeenCalledTimes(1); // Marker should not be created again, only updated
});

test('handles API error gracefully and logs error to console', async () => {
  axios.get.mockRejectedValue(new Error('Country not found'));

  render(MapWidget, { props: { country: 'NonExistentCountry' } });

  // Wait for initial map setup and reactive statement to trigger
  await act(async () => {
    await Promise.resolve();
  });

  // Expect axios.get to be called
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith('https://restcountries.com/v3.1/name/NonExistentCountry?fullText=true');

  // Expect map.setView to have only been called once (initial mount)
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(1);

  // Expect L.marker not to be called (no valid country data)
  expect(L.marker).not.toHaveBeenCalled();

  // Expect console.error to have been called
  expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to update map:', expect.any(Error));
});

test('does not update map if country is set to empty string after initial load', async () => {
  const { rerender } = render(MapWidget, { props: { country: 'France' } });

  await act(async () => {
    await Promise.resolve();
  });

  // Clear mocks after initial load to check subsequent calls
  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: mockCountryData }); // Reset axios mock for next check

  await act(async () => {
    rerender({ country: '' }); // Use rerender for prop updates
    await Promise.resolve();
  });

  // Expect axios.get not to be called (because country is empty)
  expect(axios.get).not.toHaveBeenCalled();
  // Expect map.setView not to be called (after initial mount, no new country means no new setView)
  expect(mockMapInstance.setView).not.toHaveBeenCalled();
  // Expect marker methods not to be called
  expect(mockMarkerInstance.setLatLng).not.toHaveBeenCalled();
  expect(L.marker).not.toHaveBeenCalled();
});
