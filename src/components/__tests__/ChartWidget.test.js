import { render, waitFor } from "@testing-library/svelte";
import ChartWidget from "../ChartWidget.svelte";
import axios from "axios";

vi.mock("axios");

const mockData = {
  country: "France",
  cases: 1000,
  deaths: 50,
  recovered: 900,
};

test("ChartWidget renders chart canvas", async () => {
  axios.get.mockResolvedValue({ data: mockData });

  const { getByLabelText } = render(ChartWidget, { country: "France" });
  const canvas = getByLabelText("covid-chart");
  expect(canvas).toBeInTheDocument();

  // Wait for data fetch and chart creation
  await waitFor(() => {
    // Chart.js draws to canvas, so no visible text to check.
    // Just ensure canvas still exists.
    expect(canvas).toBeInTheDocument();
  });
});
