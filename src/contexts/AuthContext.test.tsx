import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The auth provider must not blank the dashboard when another same-origin page (a second tab,
// the Player Studio's preview iframe) announces the user already signed in (T7.1).

type Listener = (event: string, session: unknown) => void;
const auth = vi.hoisted(() => ({
  listener: null as Listener | null,
  session: { user: { id: "u1" } } as unknown,
}));

vi.mock("../lib/supabase", () => {
  const row = (data: unknown) => ({
    select: () => ({
      eq: () => ({ single: async () => ({ data, error: null }) }),
    }),
  });
  return {
    supabase: {
      auth: {
        getSession: async () => ({ data: { session: auth.session } }),
        onAuthStateChange: (listener: Listener) => {
          auth.listener = listener;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
      },
      from: (table: string) =>
        table === "profiles"
          ? row({ id: "u1", organization_id: "o1" })
          : row({ id: "o1", name: "Zeta" }),
    },
  };
});

import { AuthProvider, useAuth } from "./AuthContext";

const loadings: boolean[] = [];
function Probe() {
  const { loading, organization } = useAuth();
  loadings.push(loading);
  return <p>{loading ? "loading" : `ready ${organization?.name ?? ""}`}</p>;
}

async function renderReady() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
  await screen.findByText("ready Zeta");
  loadings.length = 0;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    loadings.length = 0;
    auth.listener = null;
  });

  it("stays ready when the same user is announced again or the token is refreshed", async () => {
    await renderReady();
    for (const event of ["SIGNED_IN", "TOKEN_REFRESHED", "INITIAL_SESSION"]) {
      await act(async () => {
        auth.listener?.(event, { user: { id: "u1" } });
      });
    }
    expect(loadings).not.toContain(true);
    expect(screen.getByText("ready Zeta")).toBeTruthy();
  });

  it("still loads the profile of another user", async () => {
    await renderReady();
    await act(async () => {
      auth.listener?.("SIGNED_IN", { user: { id: "u2" } });
    });
    expect(loadings).toContain(true);
    expect(await screen.findByText("ready Zeta")).toBeTruthy();
  });
});
