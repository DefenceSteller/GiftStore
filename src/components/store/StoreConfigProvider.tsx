"use client";

import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { STORE_CONFIG_DEFAULTS, type StoreConfig } from "@/lib/store-config";

const StoreConfigContext = createContext<StoreConfig>(STORE_CONFIG_DEFAULTS);

export function StoreConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<StoreConfig>(STORE_CONFIG_DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/store/config", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled && data) setConfig(data); })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <StoreConfigContext.Provider value={config}>
      {children}
    </StoreConfigContext.Provider>
  );
}

export function useStoreConfig() {
  return useContext(StoreConfigContext);
}