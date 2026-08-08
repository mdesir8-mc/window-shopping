import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Landing from "./Landing";

// The demo owns its own mutation hook; the heading assertion doesn't need it.
vi.mock("../components/items/LandingParseDemo", () => ({
  default: () => null
}));

describe("Landing", () => {
  it("keeps a space in the hero heading across the line break", () => {
    // VersionTag runs a real useQuery, so a provider is needed even though nothing asserts it.
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Landing />
        </MemoryRouter>
      </QueryClientProvider>
    );

    // JSX strips whitespace adjacent to <br />, which collapsed this to "meantto".
    // Landing renders several h1s (Display defaults to h1), so match the hero by name.
    expect(
      screen.getByRole("heading", { name: /every link you meant/i })
    ).toHaveAccessibleName("Every link you meant to come back to.");
  });
});
