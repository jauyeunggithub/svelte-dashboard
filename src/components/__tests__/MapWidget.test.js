import { render, screen, act, waitFor } from '@testing-library/svelte';
import { test, expect, vi, beforeEach, afterEach } from 'vitest';
import MapWidget from '../MapWidget.svelte'; // Adjust path as needed
import axios from 'axios';
import L from 'leaflet'; // Import L directly as in the Svelte component

// Declare variables to hold the *current* mock instances for access in tests.
// These will be assigned new values in the beforeEach hook.
let currentMockMapInstance;
let currentMockTileLayerInstance;
let currentMockMarkerInstance;

// Explicitly mock Leaflet's exports.
// The factory functions here will be called by Vitest's mock resolver.
vi.mock('leaflet', () => {
  // This object will be the default export when `import L from 'leaflet'` is used
  const leafletMockExports = {
    map: vi.fn((container, options) => {
      currentMockMapInstance = {
        setView: vi.fn(),
        // Add other methods that might be called on the map instance if needed
      };
      return currentMockMapInstance;
    }),
    tileLayer: vi.fn((url, options) => {
      currentMockTileLayerInstance = {
        addTo: vi.fn(),
      };
      return currentMockTileLayerInstance;
    }),
    marker: vi.fn((latlng, options) => {
      currentMockMarkerInstance = {
        addTo: vi.fn(),
        setLatLng: vi.fn(),
      };
      return currentMockMarkerInstance;
    }),
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
    latLng: vi.fn((lat, lng) => ({ lat, lng })),
  };

  return {
    // The key fix: explicitly export 'default' which contains all the mocked L functions
    default: leafletMockExports,
    // Also export them individually for named imports if any part of your code uses them
    // though the component uses default import.
    ...leafletMockExports,
  };
});

vi.mock('axios', () => {
  // This structure ensures that `axios` (the default import) is a mock object
  // and it has a `get` method that is also a mock function.
  return {
    default: {
      get: vi.fn(),
      // Add other axios methods (e.g., post, put, delete) if your component uses them
    },
    __esModule: true, // Important for ESM compatibility
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
  vi.clearAllMocks();
  currentMockMapInstance = undefined;
  currentMockTileLayerInstance = undefined;
  currentMockMarkerInstance = undefined;
  axios.get.mockResolvedValue({ data: mockCountryData });
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

test('renders map container div', () => {
  render(MapWidget);
  const mapContainer = screen.getByTestId('map-container');
  expect(mapContainer).toBeInTheDocument();
  expect(mapContainer).toHaveStyle('height: 400px; width: 100%;');
});

test('initializes Leaflet map on mount', async () => {
  render(MapWidget);

  await act(async () => {
    await Promise.resolve();
  });

  expect(L.map).toHaveBeenCalledTimes(1);
  expect(currentMockMapInstance.setView).toHaveBeenCalledTimes(1);
  expect(currentMockMapInstance.setView).toHaveBeenCalledWith([20, 0], 2);

  expect(L.tileLayer).toHaveBeenCalledTimes(1);
  expect(L.tileLayer).toHaveBeenCalledWith('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  });


});

test('does not call updateMap if country is empty initially', async () => {
  render(MapWidget, { props: { country: '' } });

  await act(async () => {
    await Promise.resolve();
  });

  expect(axios.get).not.toHaveBeenCalled();
});


test('does not update map if country is set to empty string after initial load', async () => {
  const { rerender } = render(MapWidget, { props: { country: 'France' } });

  await act(async () => {
    await Promise.resolve();
  });

  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: mockCountryData });

  await act(async () => {
    rerender({ country: '' });
    await Promise.resolve();
  });

  expect(axios.get).not.toHaveBeenCalled();
  expect(currentMockMapInstance.setView).not.toHaveBeenCalled();


});
