import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";

// Pressing the browser's Back button from the dashboard lands on /login: someone already signed
// in must go straight back to the dashboard instead of seeing the form.
const auth = vi.hoisted(() => ({
  value: {
    session: null as unknown,
    loading: false,
    signIn: vi.fn(),
  },
}));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => auth.value }));
vi.mock("../../contexts/LanguageContext", () => ({
  useLanguage: () => ({ t: (_key: string, fallback: string) => fallback }),
}));
vi.mock("../../lib/supabase", () => ({ supabase: { auth: {} } }));

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<p>dashboard</p>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("auth pages", () => {
  it.each(["/login", "/register"])(
    "send a signed-in user from %s to the dashboard",
    (path) => {
      auth.value = { ...auth.value, session: { user: { id: "u1" } } };
      renderAt(path);
      expect(screen.getByText("dashboard")).toBeTruthy();
    },
  );

  it("still show the sign-in form to a visitor", () => {
    auth.value = { ...auth.value, session: null };
    renderAt("/login");
    expect(screen.queryByText("dashboard")).toBeNull();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("wait for the session to load before deciding", () => {
    auth.value = {
      ...auth.value,
      session: { user: { id: "u1" } },
      loading: true,
    };
    renderAt("/login");
    expect(screen.queryByText("dashboard")).toBeNull();
  });
});
