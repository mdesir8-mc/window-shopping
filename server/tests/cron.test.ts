import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import supertest from "supertest";
import { refreshAllUsers } from "../src/services/refresh-all";

vi.mock("../src/services/refresh-all", () => ({
  refreshAllUsers: vi.fn(async () => ({
    users: 0,
    refreshed: 0,
    priceDrops: 0,
    outOfStock: 0
  }))
}));

const mockedRefreshAll = vi.mocked(refreshAllUsers);
const SECRET = "test-cron-secret";

describe("POST /api/cron/refresh", () => {
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    process.env.CRON_SECRET = SECRET;
    const { createApp } = await import("../src/index");
    request = supertest(createApp());
  });

  afterAll(() => {
    delete process.env.CRON_SECRET;
  });

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    mockedRefreshAll.mockReset();
    mockedRefreshAll.mockResolvedValue({
      users: 0,
      refreshed: 0,
      priceDrops: 0,
      outOfStock: 0
    });
  });

  it("rejects a missing token with 401", async () => {
    const response = await request.post("/api/cron/refresh");
    expect(response.status).toBe(401);
    expect(mockedRefreshAll).not.toHaveBeenCalled();
  });

  it("rejects a wrong token with 401", async () => {
    const response = await request
      .post("/api/cron/refresh")
      .set("Authorization", "Bearer not-the-secret");
    expect(response.status).toBe(401);
    expect(mockedRefreshAll).not.toHaveBeenCalled();
  });

  it("returns 503 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const response = await request
      .post("/api/cron/refresh")
      .set("Authorization", `Bearer ${SECRET}`);
    expect(response.status).toBe(503);
    expect(mockedRefreshAll).not.toHaveBeenCalled();
  });

  it("accepts a valid token with 202 and starts the refresh", async () => {
    const response = await request
      .post("/api/cron/refresh")
      .set("Authorization", `Bearer ${SECRET}`);
    expect(response.status).toBe(202);
    expect(response.body).toEqual({ started: true });
    expect(mockedRefreshAll).toHaveBeenCalledOnce();
  });

  it("rejects an overlapping run with 409", async () => {
    // Hold the first run pending so `running` stays true when the second fires.
    let release!: () => void;
    mockedRefreshAll.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ users: 0, refreshed: 0, priceDrops: 0, outOfStock: 0 });
        })
    );

    const first = await request
      .post("/api/cron/refresh")
      .set("Authorization", `Bearer ${SECRET}`);
    expect(first.status).toBe(202);

    const second = await request
      .post("/api/cron/refresh")
      .set("Authorization", `Bearer ${SECRET}`);
    expect(second.status).toBe(409);

    // Let the first run finish so the guard resets and later tests aren't blocked.
    release();
  });
});
