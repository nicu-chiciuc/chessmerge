import type { ReactNode } from "react";

import { AuthStateContext } from "./auth-state-context";

export function AuthStateProvider({
  children,
  isAuthenticated,
}: Readonly<{ children: ReactNode; isAuthenticated: boolean }>) {
  return (
    <AuthStateContext.Provider value={isAuthenticated}>
      {children}
    </AuthStateContext.Provider>
  );
}
