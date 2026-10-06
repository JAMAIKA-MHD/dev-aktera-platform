import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useExperienceSummaries } from "./useExperienceSummaries";

// A fake Supabase client: from(table).select(columns) resolves to the given answer.
function fakeClient(answer: {
  data: unknown;
  error: { message: string } | null;
}) {
  const select = vi.fn().mockResolvedValue(answer);
  const from = vi.fn().mockReturnValue({ select });
  return { client: { from } as never, from, select };
}

describe("useExperienceSummaries", () => {
  it("maps each campaign to the date of its last saved design", async () => {
    const { client, from, select } = fakeClient({
      data: [
        { campaign_id: "c1", updated_at: "2026-09-30T10:00:00Z" },
        { campaign_id: "c2", updated_at: "2026-09-01T08:00:00Z" },
      ],
      error: null,
    });
    const { result } = renderHook(() =>
      useExperienceSummaries("org-1", client),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(from).toHaveBeenCalledWith("campaign_experiences");
    expect(select).toHaveBeenCalledWith("campaign_id, updated_at");
    expect(result.current.savedAt.get("c1")).toBe("2026-09-30T10:00:00Z");
    expect(result.current.savedAt.get("c2")).toBe("2026-09-01T08:00:00Z");
    expect(result.current.failed).toBe(false);
  });

  it("returns an empty map, without throwing, when the read fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = fakeClient({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() =>
      useExperienceSummaries("org-1", client),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.savedAt.size).toBe(0);
    expect(result.current.failed).toBe(true);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("does not query without an organization", async () => {
    const { client, from } = fakeClient({ data: [], error: null });
    const { result } = renderHook(() => useExperienceSummaries(null, client));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(from).not.toHaveBeenCalled();
  });

  it("reads again on refetch", async () => {
    const { client, select } = fakeClient({ data: [], error: null });
    const { result } = renderHook(() =>
      useExperienceSummaries("org-1", client),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    await result.current.refetch();
    expect(select).toHaveBeenCalledTimes(2);
  });
});
