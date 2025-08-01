import { render, fireEvent } from "@testing-library/svelte";
import FormWidget from "../FormWidget.svelte";
import { vi, test } from "vitest";

test("FormWidget dispatches search event with input value", async () => {
  const { getByPlaceholderText, getByText, component } = render(FormWidget);
  const input = getByPlaceholderText("Enter country name");
  const button = getByText("Search");

  const searchHandler = vi.fn();
  component.$on("search", searchHandler);

  await fireEvent.input(input, { target: { value: "France" } });
  await fireEvent.click(button);

  expect(searchHandler).toHaveBeenCalledTimes(1);
  expect(searchHandler.mock.calls[0][0].detail).toBe("France");
});
