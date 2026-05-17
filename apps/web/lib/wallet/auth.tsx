"use client";

import * as React from "react";

const PrivyEnabledContext = React.createContext(false);

export function PrivyEnabledProvider({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  return <PrivyEnabledContext.Provider value={enabled}>{children}</PrivyEnabledContext.Provider>;
}

export function usePrivyEnabled() {
  return React.useContext(PrivyEnabledContext);
}
