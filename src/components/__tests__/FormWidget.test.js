import { render, screen, fireEvent } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { test, expect, vi, beforeEach } from "vitest";
import SearchInput from "../SearchInput.svelte"; // Assuming SearchInput.svelte is in the parent directory
import { createEventDispatcher } from "svelte"; // Import createEventDispatcher for mocking

// Mock svelte's createEventDispatcher to spy on dispatched events
vi.mock("svelte", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    createEventDispatcher: vi.fn(() => vi.fn()), // Mock it to return a spy function
  };
});

let mockDispatch;

beforeEach(() => {
  // Reset the mock before each test
  mockDispatch = vi.fn();
  createEventDispatcher.mockReturnValue(mockDispatch);
});

test("renders input and search button", () => {
  render(SearchInput);

  // Check if the input field is in the document
  const inputElement = screen.getByLabelText("search-input");
  expect(inputElement).toBeInTheDocument();
  expect(inputElement).toHaveAttribute("placeholder", "Enter country name");

  // Check if the search button is in the document
  const buttonElement = screen.getByRole("button", { name: "Search" });
  expect(buttonElement).toBeInTheDocument();
});

test('dispatches "search" event with trimmed value on button click', async () => {
  const user = userEvent.setup();
  render(SearchInput);

  const inputElement = screen.getByLabelText("search-input");
  const buttonElement = screen.getByRole("button", { name: "Search" });

  // Type a value with leading/trailing spaces
  await user.type(inputElement, "  United States  ");
  await user.click(buttonElement);

  // Expect the dispatch function to have been called once with the trimmed value
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledWith("search", "United States");
});

test('dispatches "search" event with trimmed value on Enter key press', async () => {
  const user = userEvent.setup();
  render(SearchInput);

  const inputElement = screen.getByLabelText("search-input");

  // Type a value and press Enter
  await user.type(inputElement, "  Germany ");
  await fireEvent.keyDown(inputElement, { key: "Enter", code: "Enter" }); // Use fireEvent for key presses

  // Expect the dispatch function to have been called once with the trimmed value
  expect(mockDispatch).toHaveBeenCalledTimes(1);
  expect(mockDispatch).toHaveBeenCalledWith("search", "Germany");
});

test('does not dispatch "search" event if input is empty', async () => {
  const user = userEvent.setup();
  render(SearchInput);

  const buttonElement = screen.getByRole("button", { name: "Search" });

  // Click the button without typing anything
  await user.click(buttonElement);

  // Expect the dispatch function not to have been called
  expect(mockDispatch).not.toHaveBeenCalled();
});

test('does not dispatch "search" event if input is only whitespace', async () => {
  const user = userEvent.setup();
  render(SearchInput);

  const inputElement = screen.getByLabelText("search-input");
  const buttonElement = screen.getByRole("button", { name: "Search" });

  // Type only whitespace and click the button
  await user.type(inputElement, "   ");
  await user.click(buttonElement);

  // Expect the dispatch function not to have been called
  expect(mockDispatch).not.toHaveBeenCalled();

  // Reset and test with Enter key
  mockDispatch.mockClear(); // Clear calls from previous assertion
  await user.type(inputElement, "{selectall}{backspace}   "); // Clear and type whitespace
  await fireEvent.keyDown(inputElement, { key: "Enter", code: "Enter" });

  expect(mockDispatch).not.toHaveBeenCalled();
});

test("input value is bound correctly", async () => {
  const user = userEvent.setup();
  render(SearchInput);

  const inputElement = screen.getByLabelText("search-input");

  // Type into the input
  await user.type(inputElement, "France");

  // Expect the input's value to reflect what was typed
  expect(inputElement.value).toBe("France");
});
