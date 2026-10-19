import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useFetch } from "../useFetch";
import api from "../../services/api";
import { authService } from "../../services/auth.service";

vi.mock("../../services/api");
vi.mock("../../services/auth.service", () => ({
  authService: {
    getToken: vi.fn(() => "fake-token"),
  },
}));

describe("useFetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetch les données et met à jour le state", async () => {
    const mockData = [{ id: 1, name: "Test" }];
    vi.mocked(api.get).mockResolvedValue({ data: mockData });

    const { result } = renderHook(() =>
      useFetch({ url: "/test", dependencies: [] }),
    );

    // État initial
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();

    // Attendre que le fetch se termine
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe("");
    expect(api.get).toHaveBeenCalledWith("/test", {
      headers: { Authorization: "Bearer fake-token" },
      signal: expect.any(AbortSignal),
    });
  });

  it("gère les erreurs correctement", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() =>
      useFetch({ url: "/test", dependencies: [] }),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to fetch data");
    expect(result.current.data).toBeNull();
  });

  it("refetch recharge les données", async () => {
    const mockData1 = [{ id: 1 }];
    const mockData2 = [{ id: 2 }];

    vi.mocked(api.get)
      .mockResolvedValueOnce({ data: mockData1 })
      .mockResolvedValueOnce({ data: mockData2 });

    const { result } = renderHook(() =>
      useFetch({ url: "/test", dependencies: [] }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(mockData1);

    // Appeler refetch
    result.current.refetch();

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData2);
    });

    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
