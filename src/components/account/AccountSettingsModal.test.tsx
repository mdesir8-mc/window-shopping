import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountSettingsModal from "./AccountSettingsModal";
import type { Connection, User } from "../../types";

const { listConnections, revokeConnection } = vi.hoisted(() => ({
  listConnections: vi.fn(),
  revokeConnection: vi.fn()
}));

vi.mock("../../api/connections", () => ({ listConnections, revokeConnection }));

// The modal pulls the profile mutation from useAuth, which reaches the store and
// the network. Only the connected-apps section is under test here.
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    updateProfileMutation: {
      isPending: false,
      isError: false,
      mutate: vi.fn(),
      reset: vi.fn()
    }
  })
}));

vi.mock("../../api/export", () => ({
  downloadWishlistExport: vi.fn()
}));

const user: User = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  plan: "free"
} as User;

function connection(overrides: Partial<Connection> = {}): Connection {
  return {
    clientId: "ws_abc123",
    clientName: "Claude",
    scopes: ["profile", "closets:read", "closets:write"],
    createdAt: "2026-08-01T10:00:00.000Z",
    lastUsedAt: "2026-08-14T10:00:00.000Z",
    ...overrides
  };
}

function renderModal() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AccountSettingsModal
        open
        onClose={vi.fn()}
        user={user}
        theme="safe"
        dark={false}
        onSelectTheme={vi.fn()}
        onToggleDark={vi.fn()}
        onSignOut={vi.fn()}
      />
    </QueryClientProvider>
  );
}

describe("AccountSettingsModal — connected apps", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists a connected app with its permissions in plain language", async () => {
    listConnections.mockResolvedValue([connection()]);

    renderModal();

    expect(await screen.findByText("Claude")).toBeInTheDocument();
    expect(
      screen.getByText(/Can your profile · read your closets · edit your closets · last used/)
    ).toBeInTheDocument();
  });

  it("shows an empty state when nothing is connected", async () => {
    listConnections.mockResolvedValue([]);

    renderModal();

    expect(await screen.findByText("No apps connected yet.")).toBeInTheDocument();
  });

  it("requires a confirmation before disconnecting", async () => {
    listConnections.mockResolvedValue([connection()]);
    revokeConnection.mockResolvedValue(undefined);

    renderModal();

    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));

    // First click only arms the confirmation — nothing has been revoked yet.
    expect(revokeConnection).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Yes, disconnect" }));

    // React Query v5 appends its own { client } argument to mutationFn, so assert
    // on the first parameter rather than the whole call.
    await waitFor(() => expect(revokeConnection).toHaveBeenCalled());
    expect(revokeConnection.mock.calls[0][0]).toBe("ws_abc123");
  });

  it("backs out of the confirmation without revoking", async () => {
    listConnections.mockResolvedValue([connection()]);

    renderModal();

    fireEvent.click(await screen.findByRole("button", { name: "Disconnect" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(revokeConnection).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeInTheDocument();
  });

  it("surfaces a failure to load", async () => {
    listConnections.mockRejectedValue(new Error("boom"));

    renderModal();

    expect(await screen.findByText("Couldn't load connected apps.")).toBeInTheDocument();
  });
});
