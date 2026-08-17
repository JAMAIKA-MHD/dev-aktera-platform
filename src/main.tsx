import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AppRouter from "./AppRouter.tsx";
import { ThemeProvider } from "./contexts/ThemeContext.tsx";
import { LanguageProvider } from "./contexts/LanguageContext.tsx";
import "./index.css";
import "./i18n/i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AppRouter />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
