import { render, screen, act } from "@testing-library/svelte";
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import MapWidget from "../MapWidget.svelte"; // Adjust path as needed
import axios from "axios";
import L from "leaflet"; // Import Leaflet for type hinting and potential mock setup

// Mock axios to control API responses
vi.mock("axios");

// Mock Leaflet to prevent actual map rendering and interact with its methods
// We need to mock L.map, L.tileLayer, L.marker and their respective methods.
const mockMapInstance = {
  setView: vi.fn(),
};
const mockTileLayerInstance = {
  addTo: vi.fn(),
};
const mockMarkerInstance = {
  addTo: vi.fn(),
  setLatLng: vi.fn(),
};

vi.mock("leaflet", async (importOriginal) => {
  const actual = await importOriginal(); // Get actual Leaflet for types if needed
  return {
    ...actual, // Keep other Leaflet exports if they are used elsewhere
    map: vi.fn(() => mockMapInstance),
    tileLayer: vi.fn(() => mockTileLayerInstance),
    marker: vi.fn(() => mockMarkerInstance),
  };
});

// Mock data for successful country API calls
const mockCountryData = {
  data: [
    {
      name: {
        common: "France",
      },
      latlng: [46.2276, 2.2137], // Lat, Lng for France
    },
  ],
};

const mockAnotherCountryData = {
  data: [
    {
      name: {
        common: "Germany",
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
  // Set up default successful mock for axios.get
  axios.get.mockResolvedValue(mockCountryData);

  // Spy on console.error to check for error logging without failing tests
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  // Restore console.error after each test
  consoleErrorSpy.mockRestore();
});

test("renders map container div", () => {
  render(MapWidget);
  const mapContainer = screen.getByRole("generic", {
    // Assuming div with style is generic role, or you can add a test-id
    // For more robust selection, consider adding data-testid="map-container" to your div
    // For now, we'll rely on the style attribute or a more general query
    // A better approach would be to give it a data-testid="map-container"
    // For this example, we'll check for the style attribute which is unique.
    // In a real app, use data-testid for better test resilience.
  });
  // Since we don't have a specific role or accessible name, we can query by element and then check attributes
  const divElement = screen.getByTestId("map-container"); // Assuming you add data-testid="map-container"
  expect(divElement).toBeInTheDocument();
  expect(divElement).toHaveStyle("height: 400px; width: 100%;");
});

test("initializes Leaflet map on mount", () => {
  render(MapWidget);

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
  expect(L.tileLayer).toHaveBeenCalledWith(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
    }
  );
  expect(mockTileLayerInstance.addTo).toHaveBeenCalledTimes(1);
  expect(mockTileLayerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);
});

test("does not call updateMap if country is empty initially", async () => {
  render(MapWidget, { props: { country: "" } });

  // Ensure any initial reactive statements have run
  await act(async () => {
    await Promise.resolve();
  });

  // axios.get should not be called if country is empty
  expect(axios.get).not.toHaveBeenCalled();
});

test("calls updateMap and sets view/marker when country prop changes", async () => {
  const { component } = render(MapWidget, { props: { country: "France" } });

  // Wait for initial map setup and reactive statement to trigger
  await act(async () => {
    await Promise.resolve();
  });

  // Expect axios.get to be called for France
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith(
    "https://restcountries.com/v3.1/name/France?fullText=true"
  );

  // Expect map.setView to be called with France's coordinates
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(2); // Once for initial, once for country
  expect(mockMapInstance.setView).toHaveBeenCalledWith(
    mockCountryData.data[0].latlng,
    5
  );

  // Expect marker to be created and added for the first country
  expect(L.marker).toHaveBeenCalledTimes(1);
  expect(L.marker).toHaveBeenCalledWith(mockCountryData.data[0].latlng);
  expect(mockMarkerInstance.addTo).toHaveBeenCalledTimes(1);
  expect(mockMarkerInstance.addTo).toHaveBeenCalledWith(mockMapInstance);

  // Change country to Germany
  axios.get.mockResolvedValue(mockAnotherCountryData); // Mock new data for Germany
  await act(async () => {
    component.$set({ country: "Germany" });
    await Promise.resolve();
  });

  // Expect axios.get to be called again for Germany
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get).toHaveBeenCalledWith(
    "https://restcountries.com/v3.1/name/Germany?fullText=true"
  );

  // Expect map.setView to be called for Germany
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(3);
  expect(mockMapInstance.setView).toHaveBeenCalledWith(
    mockAnotherCountryData.data[0].latlng,
    5
  );

  // Expect existing marker to be updated (setLatLng)
  expect(mockMarkerInstance.setLatLng).toHaveBeenCalledTimes(1);
  expect(mockMarkerInstance.setLatLng).toHaveBeenCalledWith(
    mockAnotherCountryData.data[0].latlng
  );
  expect(L.marker).toHaveBeenCalledTimes(1); // Marker should not be created again
});

test("handles API error gracefully and logs error to console", async () => {
  axios.get.mockRejectedValue(new Error("Country not found"));

  render(MapWidget, { props: { country: "NonExistentCountry" } });

  // Wait for initial map setup and reactive statement to trigger
  await act(async () => {
    await Promise.resolve();
  });

  // Expect axios.get to be called
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith(
    "https://restcountries.com/v3.1/name/NonExistentCountry?fullText=true"
  );

  // Expect map.setView not to be called again (only initial call)
  expect(mockMapInstance.setView).toHaveBeenCalledTimes(1); // Only initial setView from onMount

  // Expect L.marker not to be called (no valid country data)
  expect(L.marker).not.toHaveBeenCalled();

  // Expect console.error to have been called
  expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    "Failed to update map:",
    expect.any(Error)
  );
});

test("does not update map if country is set to empty string after initial load", async () => {
  const { component } = render(MapWidget, { props: { country: "France" } });

  await act(async () => {
    await Promise.resolve();
  });

  // Clear mocks after initial load to check subsequent calls
  vi.clearAllMocks();
  axios.get.mockResolvedValue(mockCountryData); // Reset axios mock for next check

  await act(async () => {
    component.$set({ country: "" });
    await Promise.resolve();
  });

  // Expect axios.get not to be called
  expect(axios.get).not.toHaveBeenCalled();
  // Expect map.setView not to be called
  expect(mockMapInstance.setView).not.toHaveBeenCalled();
  // Expect marker methods not to be called
  expect(mockMarkerInstance.setLatLng).not.toHaveBeenCalled();
  expect(L.marker).not.toHaveBeenCalled();
});
