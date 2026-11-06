import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "../../contexts/ThemeContext";
import { DOC_CHAPTERS } from "./docsContent";
import DocumentationPage from "./DocumentationPage";

beforeEach(() => localStorage.clear());

let currentPath = "";
function LocationProbe() {
  currentPath = useLocation().pathname;
  return null;
}

function setup(path = "/docs") {
  const user = userEvent.setup();
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/docs" element={<DocumentationPage />} />
          <Route path="/docs/:pageId" element={<DocumentationPage />} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </ThemeProvider>,
  );
  const toc = () =>
    screen.getByRole("navigation", { name: "Documentation contents" });
  return { user, toc };
}

const title = (name: RegExp | string) =>
  screen.getByRole("heading", { level: 1, name });

describe("DocumentationPage", () => {
  it("lists every chapter in the contents and opens on the first page", () => {
    const { toc } = setup();
    for (const chapter of DOC_CHAPTERS) {
      expect(within(toc()).getByText(chapter.title)).toBeTruthy();
    }
    expect(title("What is Aktera?")).toBeTruthy();
  });

  it("opens the page named in the URL", () => {
    setup("/docs/roles");
    expect(title("Roles & permissions")).toBeTruthy();
  });

  it("falls back to the first page for an unknown page", () => {
    setup("/docs/nope");
    expect(title("What is Aktera?")).toBeTruthy();
  });

  it("jumps to a page from the contents, with its own URL", async () => {
    const { user, toc } = setup();
    await user.click(within(toc()).getByRole("link", { name: /Quickstart/ }));
    expect(title(/Quickstart/)).toBeTruthy();
    expect(currentPath).toBe("/docs/quickstart");
  });

  it("filters the contents with the search", async () => {
    const { user, toc } = setup();
    await user.type(screen.getByLabelText("Search the documentation"), "csv");
    expect(
      within(toc()).getByRole("link", { name: /Digital codes/ }),
    ).toBeTruthy();
    expect(
      within(toc()).queryByRole("link", { name: /Roles & permissions/ }),
    ).toBeNull();
  });

  it("goes to the next page and records feedback", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: /Next/ }));
    expect(title(/glossary/)).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Yes/ }));
    expect(screen.getByRole("status").textContent).toMatch(/Thanks/);
    expect(localStorage.getItem("dashboard-docs-feedback")).toContain(
      "glossary",
    );
  });
});
