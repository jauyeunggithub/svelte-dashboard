import { render, screen, act } from "@testing-library/svelte";
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import ChartWidget from "../ChartWidget.svelte";
import axios from "axios";
import { Chart } from "chart.js";

// Mock axios to control API responses
vi.mock("axios");

// Mock Chart.js to prevent actual chart rendering and track its lifecycle
vi.mock("chart.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Chart: vi.fn(() => ({
      // Mock the Chart instance methods that the component uses
      destroy: vi.fn(),
    })),
    registerables: actual.registerables, // Keep actual registerables if needed, or mock if not
  };
});

// Mock data for successful API calls
const mockCountryData = {
  country: "Testland",
  cases: 1000,
  deaths: 50,
  recovered: 800,
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  // Set up a default successful mock for axios.get
  axios.get.mockResolvedValue({ data: mockCountryData });
});

afterEach(() => {
  // Ensure any rendered components are cleaned up after each test
  // This is often handled automatically by @testing-library/svelte's setupFiles,
  // but explicitly calling it here ensures cleanup.
  // cleanup(); // Uncomment if auto-cleanup is not configured via setupFiles
});

test("renders canvas element with correct aria-label", () => {
  render(ChartWidget);
  const canvas = screen.getByLabelText("covid-chart");
  expect(canvas).toBeInTheDocument();
  expect(canvas.tagName).toBe("CANVAS");
});

test("does not load chart initially if country prop is empty", () => {
  render(ChartWidget, { props: { country: "" } });

  // Expect axios.get not to be called
  expect(axios.get).not.toHaveBeenCalled();
  // Expect Chart constructor not to be called
  expect(Chart).not.toHaveBeenCalled();
});

test("loads chart when country prop is provided", async () => {
  render(ChartWidget, { props: { country: "USA" } });

  // Wait for the async operation (axios call) to complete and component to update
  await act(async () => {
    // Await any pending promises from the reactive statement
    await Promise.resolve();
  });

  // Expect axios.get to be called with the correct URL
  expect(axios.get).toHaveBeenCalledTimes(1);
  expect(axios.get).toHaveBeenCalledWith(
    "https://disease.sh/v3/covid-19/countries/USA"
  );

  // Expect Chart constructor to be called with the canvas and correct data
  expect(Chart).toHaveBeenCalledTimes(1);
  const chartCallArgs = Chart.mock.calls[0];
  expect(chartCallArgs[0]).toBeInstanceOf(HTMLCanvasElement); // First arg is the canvas
  expect(chartCallArgs[1].data.labels).toEqual([
    "Cases",
    "Deaths",
    "Recovered",
  ]);
  expect(chartCallArgs[1].data.datasets[0].data).toEqual([
    mockCountryData.cases,
    mockCountryData.deaths,
    mockCountryData.recovered,
  ]);
  expect(chartCallArgs[1].data.datasets[0].label).toBe(
    `COVID-19 Stats for ${mockCountryData.country}`
  );
});

test("destroys existing chart and loads new one when country changes", async () => {
  const { component } = render(ChartWidget, { props: { country: "USA" } });

  // Wait for initial chart load
  await act(async () => {
    await Promise.resolve();
  });

  expect(Chart).toHaveBeenCalledTimes(1);
  const initialChartInstance = Chart.mock.results[0].value; // Get the mocked chart instance

  // Change the country prop
  await act(async () => {
    component.$set({ country: "Canada" });
    await Promise.resolve(); // Allow reactive statement to trigger
  });

  // Expect the old chart to be destroyed
  expect(initialChartInstance.destroy).toHaveBeenCalledTimes(1);

  // Expect axios.get to be called again for the new country
  expect(axios.get).toHaveBeenCalledTimes(2);
  expect(axios.get).toHaveBeenCalledWith(
    "https://disease.sh/v3/covid-19/countries/Canada"
  );

  // Expect a new Chart to be created
  expect(Chart).toHaveBeenCalledTimes(2);
  const newChartInstance = Chart.mock.results[1].value;
  expect(newChartInstance.destroy).not.toHaveBeenCalled(); // New chart should not be destroyed yet
});

test("destroys chart on component unmount", async () => {
  const { unmount } = render(ChartWidget, { props: { country: "USA" } });

  // Wait for chart to load
  await act(async () => {
    await Promise.resolve();
  });

  expect(Chart).toHaveBeenCalledTimes(1);
  const chartInstance = Chart.mock.results[0].value;

  // Unmount the component
  await act(() => {
    unmount();
  });

  // Expect the chart to be destroyed
  expect(chartInstance.destroy).toHaveBeenCalledTimes(1);
});

test("handles API error gracefully and destroys chart", async () => {
  // Mock axios.get to reject
  axios.get.mockRejectedValue(new Error("Network Error"));

  render(ChartWidget, { props: { country: "InvalidCountry" } });

  // Wait for the async operation (axios call) to complete
  await act(async () => {
    await Promise.resolve();
  });

  // Expect axios.get to be called
  expect(axios.get).toHaveBeenCalledTimes(1);

  // Expect Chart constructor NOT to be called if API call fails
  expect(Chart).not.toHaveBeenCalled();
  if (Chart.mock.results.length > 0) {
    const chartInstance = Chart.mock.results[0].value;
    expect(chartInstance.destroy).toHaveBeenCalledTimes(0); // No chart was successfully created to destroy
  }
});
