import { createContext, useContext, useState } from "react";

// Users defined in RAG2 data.yaml
export const USERS = [
  {
    userid: "user1",
    token: "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
    label: "CCB Risk Analyst",
    color: "#3a7aba",
  },
  {
    userid: "user2",
    token: "ZYXWVUTSRQPONMLKJIHGFEDCBA0987654321",
    label: "Equities Desk",
    color: "#3a9a5a",
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
