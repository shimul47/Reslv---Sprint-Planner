import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Prevents flashes of unauthenticated content

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Ping the backend to verify token and fetch user details
        const response = await api.get("/auth/me");
        setUser(response.data);
      } catch (error) {
        console.error("Session expired or invalid token");
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });

    // Save the JWT to local storage
    localStorage.setItem("token", response.data.token);

    // Set user in state
    setUser(response.data.user);

    return response.data.user; // Return user so the login screen can route them accordingly
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
