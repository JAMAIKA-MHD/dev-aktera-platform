import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// supabase.from("support_ticket_comments").select("*").eq("ticket_id", id).order(...)
const order = vi.fn();
const eq = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn((table: string) => {
  void table;
  return { select };
});
vi.mock("../lib/supabase", () => ({
  supabase: { from: (table: string) => from(table) },
}));

import { useSupportComments } from "./useSupportComments";

const ROW = (id: string, body: string) => ({
  id,
  ticket_id: "t1",
  author_id: "user-1",
  author_name: "Ops",
  author_type: "client",
  body,
  created_at: "2026-10-06T08:00:00Z",
});

beforeEach(() => {
  order.mockReset();
  eq.mockClear();
  select.mockClear();
  from.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("useSupportComments", () => {
  it("reads the thread of a ticket, oldest first", async () => {
    order.mockResolvedValue({
      data: [ROW("c1", "First"), ROW("c2", "Second")],
      error: null,
    });
    const { result } = renderHook(() => useSupportComments("t1"));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(from).toHaveBeenCalledWith("support_ticket_comments");
    expect(eq).toHaveBeenCalledWith("ticket_id", "t1");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result.current.comments.map((comment) => comment.body)).toEqual([
      "First",
      "Second",
    ]);
    expect(result.current.comments[0]).toMatchObject({
      ticketId: "t1",
      authorType: "client",
    });
    expect(result.current.error).toBeNull();
  });

  it("reads nothing while no ticket is open", async () => {
    const { result } = renderHook(() => useSupportComments(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(from).not.toHaveBeenCalled();
    expect(result.current.comments).toEqual([]);
  });

  it("says so when the thread cannot be read, and reads again on demand", async () => {
    order.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    const { result } = renderHook(() => useSupportComments("t1"));
    await waitFor(() =>
      expect(result.current.error).toBe("Failed to load the comments."),
    );
    expect(result.current.comments).toEqual([]);

    order.mockResolvedValueOnce({ data: [ROW("c1", "Back")], error: null });
    await result.current.refetch();
    await waitFor(() => expect(result.current.error).toBeNull());
    await waitFor(() => expect(result.current.comments).toHaveLength(1));
  });

  it("reads the thread of another ticket when the ticket changes", async () => {
    order.mockResolvedValue({ data: [], error: null });
    const { rerender } = renderHook(({ id }) => useSupportComments(id), {
      initialProps: { id: "t1" as string | null },
    });
    await waitFor(() => expect(eq).toHaveBeenCalledWith("ticket_id", "t1"));
    rerender({ id: "t2" });
    await waitFor(() => expect(eq).toHaveBeenCalledWith("ticket_id", "t2"));
  });
});
