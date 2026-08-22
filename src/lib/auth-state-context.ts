import { createContext, useContext } from "react";

export const AuthStateContext = createContext<boolean | null>(null);

export function useIsAuthenticated() {
  const isAuthenticated = useContext(AuthStateContext);
  if (isAuthenticated === null) {
    throw new Error(
      "useIsAuthenticated must be used inside AuthStateContext.Provider",
    );
  }
  return isAuthenticated;
}
