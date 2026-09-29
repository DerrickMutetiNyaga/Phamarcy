"use client";

import { createContext, useCallback, useContext } from "react";
import { formatMoney } from "@/lib/format";
import type { Role } from "@/lib/auth/roles";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AppSettings {
  pharmacyName: string;
  address: string;
  phone: string;
  taxNumber: string;
  receiptFooter: string;
  currencySymbol: string;
  lowStockDefault: number;
}

interface AppContextValue {
  user: AppUser;
  settings: AppSettings;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ user, settings, children }: AppContextValue & { children: React.ReactNode }) {
  return <AppContext.Provider value={{ user, settings }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export function useMoney(): (value: number) => string {
  const { settings } = useApp();
  return useCallback((value: number) => formatMoney(value, settings.currencySymbol), [settings.currencySymbol]);
}
