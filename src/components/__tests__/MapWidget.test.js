import { render } from "@testing-library/svelte";
import MapWidget from "../MapWidget.svelte";

test("MapWidget renders map container", () => {
  const { container } = render(MapWidget, { country: "France" });
  const div = container.querySelector("div");
  expect(div).toBeInTheDocument();
});
