import { createContext, useContext, useState } from "react";
import { DARK, LIGHT } from "../theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark((d) => !d);
  const t = isDark ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ t, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
