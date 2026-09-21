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

export function useExperienceServices(): ExperienceServices {
  const services = useContext(ServicesContext);
  if (!services) {
    throw new Error(
      "useExperienceServices() must be used inside <ServicesProvider>. Wrap the experience in <ServicesProvider services={createLocalServices()}> (Studio, demos) or the Supabase services (public route).",
    );
  }
  return services;
}
