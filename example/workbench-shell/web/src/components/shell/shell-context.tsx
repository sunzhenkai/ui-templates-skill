import { createContext, useContext } from "react";

export type ShellMode = "expanded" | "collapsed" | "overlay";

export interface ShellContextValue {
  mode: ShellMode;
  openSearch: () => void;
  openCreate: () => void;
  openHelp: () => void;
  openNav: () => void;
}

export const ShellContext = createContext<ShellContextValue>({
  mode: "expanded",
  openSearch: () => {},
  openCreate: () => {},
  openHelp: () => {},
  openNav: () => {},
});

export const useShell = () => useContext(ShellContext);
