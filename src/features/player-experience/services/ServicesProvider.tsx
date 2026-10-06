import { createContext, useContext, type ReactNode } from "react";
import type { ExperienceServices } from "./ports";

// Injects the services into the React tree. The runtime and the Studio read them with
// useExperienceServices() and never create an adapter themselves (plan §7.4).

const ServicesContext = createContext<ExperienceServices | null>(null);

export interface ServicesProviderProps {
  services: ExperienceServices;
  children: ReactNode;
}

export function ServicesProvider({
  services,
  children,
}: ServicesProviderProps) {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

// The services when rendered inside a ServicesProvider, null otherwise: for a small piece of
// the runtime that also works on its own (the Hit It target resolving its image).
export function useOptionalExperienceServices(): ExperienceServices | null {
  return useContext(ServicesContext);
}

export function useExperienceServices(): ExperienceServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error(
      "useExperienceServices() must be used inside <ServicesProvider>. Wrap the experience in <ServicesProvider services={createLocalServices()}> (Studio, demos) or the Supabase services (public route).",
    );
  }
  return services;
}
