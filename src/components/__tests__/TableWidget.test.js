import { render, waitFor } from "@testing-library/svelte";
import TableWidget from "../TableWidget.svelte";
import axios from "axios";

vi.mock("axios");

const mockData = {
  country: "France",
  cases: 123456,
  deaths: 7890,
  recovered: 100000,
};

test("TableWidget fetches and displays data", async () => {
  axios.get.mockResolvedValue({ data: mockData });

  const { getByText, queryByText, rerender } = render(TableWidget, {
    country: "France",
  });

  expect(getByText("Loading data...")).toBeInTheDocument();

  await waitFor(() => {
    expect(queryByText("Loading data...")).not.toBeInTheDocument();
    expect(getByText("France")).toBeInTheDocument();
    expect(getByText(mockData.cases.toLocaleString())).toBeInTheDocument();
  });

  // Test error state
  axios.get.mockRejectedValue(new Error("fail"));
  await rerender({ country: "Unknown" });

  await waitFor(() => {
    expect(getByText("Error fetching data.")).toBeInTheDocument();
  });
});
