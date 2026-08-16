import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import Login from "./Login";

const mutateAsync = vi.hoisted(() => vi.fn());

// Mocked so the test doesn't need a QueryClientProvider or the Google identity script.
vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    loginMutation: { mutateAsync, isPending: false, isError: false }
  })
}));

vi.mock("../components/auth/GoogleSignInButton", () => ({
  default: () => null
}));

function renderLogin() {
  // VersionTag runs a real useQuery, so a provider is needed even though nothing asserts it.
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    </QueryClientProvider>
  );

  return {
    email: () => screen.getByLabelText("Email"),
    password: () => screen.getByLabelText("Password"),
    submit: () => fireEvent.click(screen.getByRole("button", { name: /log in/i }))
  };
}

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsync.mockResolvedValue({});
  });

  it("gives both fields an accessible name that survives typing", () => {
    const form = renderLogin();

    // getByLabelText fails if the only name is a placeholder, which disappears on input.
    fireEvent.change(form.email(), { target: { value: "mira@example.com" } });
    fireEvent.change(form.password(), { target: { value: "password123" } });

    expect(form.email()).toHaveValue("mira@example.com");
    expect(form.password()).toHaveValue("password123");
  });

  it("announces an inline error on empty submit instead of relying on the native bubble", () => {
    const form = renderLogin();

    form.submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Enter your email address.");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("rejects a malformed email inline now that native validation is off", () => {
    const form = renderLogin();

    fireEvent.change(form.email(), { target: { value: "not-an-email" } });
    fireEvent.change(form.password(), { target: { value: "password123" } });
    form.submit();

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("submits once both fields are filled", () => {
    const form = renderLogin();

    fireEvent.change(form.email(), { target: { value: "mira@example.com" } });
    fireEvent.change(form.password(), { target: { value: "password123" } });
    form.submit();

    expect(mutateAsync).toHaveBeenCalledWith({
      email: "mira@example.com",
      password: "password123"
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
