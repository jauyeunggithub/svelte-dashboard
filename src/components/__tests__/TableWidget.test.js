import { render, screen, act, waitFor } from "@testing-library/svelte";
import { test, expect, vi, beforeEach } from "vitest";
import TableWidget from "../TableWidget.svelte"; // Adjust path as needed
import axios from "axios";

// Mock axios to control API responses
vi.mock("axios");

// Mock data for successful API calls
const mockCovidData = {
  country: "Testland",
  cases: 1234567,
  deaths: 98765,
  recovered: 1100000,
};

const mockAnotherCovidData = {
  country: "Anotherland",
  cases: 50000,
  deaths: 1000,
  recovered: 45000,
};

beforeEach(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
  // Set up a default successful mock for axios.get
  axios.get.mockResolvedValue({ data: mockCovidData });
});

test("renders initial message when country is empty", () => {
  render(TableWidget, { props: { country: "" } });
  expect(screen.getByText("Enter a country to see data.")).toBeInTheDocument();
  expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
  expect(screen.queryByText("Error fetching data.")).not.toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("shows loading message when fetching data", async () => {
  // Prevent the axios call from resolving immediately to observe loading state
  axios.get.mockReturnValue(new Promise(() => {})); // A promise that never resolves

  render(TableWidget, { props: { country: "USA" } });

  // Wait for the reactive statement to trigger fetchData and set loading to true
  await act(async () => {
    await Promise.resolve(); // Flush microtasks to ensure loading state is set
  });

  expect(screen.getByText("Loading data...")).toBeInTheDocument();
  expect(
    screen.queryByText("Enter a country to see data.")
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});

test("displays data correctly after successful fetch", async () => {
  render(TableWidget, { props: { country: "Testland" } });

  // Wait for the data to be fetched and the component to update
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "https://disease.sh/v3/covid-19/countries/Testland"
    );
  });

  // Check for the table and its content
  const table = screen.getByRole("table", { name: "covid-data-table" });
  expect(table).toBeInTheDocument();

  // Check table headers
  expect(screen.getByText("Country")).toBeInTheDocument();
  expect(screen.getByText("Cases")).toBeInTheDocument();
  expect(screen.getByText("Deaths")).toBeInTheDocument();
  expect(screen.getByText("Recovered")).toBeInTheDocument();

  // Check table data, ensuring toLocaleString() is handled
  expect(screen.getByText(mockCovidData.country)).toBeInTheDocument();
  expect(
    screen.getByText(mockCovidData.cases.toLocaleString())
  ).toBeInTheDocument();
  expect(
    screen.getByText(mockCovidData.deaths.toLocaleString())
  ).toBeInTheDocument();
  expect(
    screen.getByText(mockCovidData.recovered.toLocaleString())
  ).toBeInTheDocument();

  expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
  expect(screen.queryByText("Error fetching data.")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Enter a country to see data.")
  ).not.toBeInTheDocument();
});

test("displays error message on fetch failure", async () => {
  axios.get.mockRejectedValue(new Error("Network error"));

  render(TableWidget, { props: { country: "InvalidCountry" } });

  // Wait for the error to be handled and the component to update
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "https://disease.sh/v3/covid-19/countries/InvalidCountry"
    );
  });

  expect(screen.getByText("Error fetching data.")).toBeInTheDocument();
  expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Enter a country to see data.")
  ).not.toBeInTheDocument();
});

test("fetches new data when country prop changes", async () => {
  const { rerender } = render(TableWidget, {
    props: { country: "InitialCountry" },
  });

  // Wait for initial fetch to complete
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledWith(
      "https://disease.sh/v3/covid-19/countries/InitialCountry"
    );
  });

  // Clear mocks to check subsequent calls
  vi.clearAllMocks();
  axios.get.mockResolvedValue({ data: mockAnotherCovidData });

  // Change the country prop using rerender
  await act(async () => {
    rerender({ country: "Anotherland" });
    await Promise.resolve(); // Flush reactive statement
  });

  // Wait for the new fetch to complete
  await waitFor(() => {
    expect(axios.get).toHaveBeenCalledTimes(1);
    expect(axios.get).toHaveBeenCalledWith(
      "https://disease.sh/v3/covid-19/countries/Anotherland"
    );
  });

  // Verify the new data is displayed
  expect(screen.getByText(mockAnotherCovidData.country)).toBeInTheDocument();
  expect(
    screen.getByText(mockAnotherCovidData.cases.toLocaleString())
  ).toBeInTheDocument();
});

test("clears data and shows initial message when country is set to empty string", async () => {
  const { rerender } = render(TableWidget, { props: { country: "Testland" } });

  // Wait for initial data fetch
  await waitFor(() => {
    expect(screen.getByText(mockCovidData.country)).toBeInTheDocument();
  });

  // Set country to empty string using rerender
  await act(async () => {
    rerender({ country: "" });
    await Promise.resolve();
  });

  // Expect initial message to reappear
  expect(screen.getByText("Enter a country to see data.")).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
  // axios.get should not be called again when country is cleared
  expect(axios.get).toHaveBeenCalledTimes(1);
});
