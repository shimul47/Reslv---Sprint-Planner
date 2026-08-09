import { createContext, useState, useEffect } from "react";
import api from "../api/axios";

export const AuthContext = createContext(null);

function initialActiveRole(user) {
  if (!user?.roles?.length) return null;
  const stored = localStorage.getItem(`reslv_active_role_${user.id}`);
  return stored && user.roles.includes(stored) ? stored : user.roles[0];
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [activeRole, setActiveRoleState] = useState(null);
  const [plan, setPlan] = useState(null); // company plan/facilities; null for superadmins (no company)
  const [loading, setLoading] = useState(true); // Prevents flashes of unauthenticated content

  // Superadmins have no companyId/subscription, so a 400 here is expected
  // and just means "no plan to show" rather than a real error.
  const refreshPlan = async () => {
    try {
      const response = await api.get("/payments/subscription");
      setPlan(response.data.plan);
    } catch (error) {
      setPlan(null);
    }
  };

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
        setActiveRoleState(initialActiveRole(response.data));
        await refreshPlan();
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

  // Shared session hydration used by both a normal login and accepting an
  // invite (which already returns a token+user, no separate login call needed).
  const setSession = (token, userObj) => {
    localStorage.setItem("token", token);
    setUser(userObj);
    setActiveRoleState(initialActiveRole(userObj));
    refreshPlan();
  };

  const login = async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    setSession(response.data.token, response.data.user);
    return response.data.user; // Return user so the login screen can route them accordingly
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setActiveRoleState(null);
    setPlan(null);
  };

  // Switches which role's view the user is currently acting as — a session
  // preference, not a change to their actual roles in the database.
  const setActiveRole = (role) => {
    if (!user?.roles?.includes(role)) return;
    setActiveRoleState(role);
    localStorage.setItem(`reslv_active_role_${user.id}`, role);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, activeRole, setActiveRole, login, logout, setSession, plan, refreshPlan }}
    >
      {children}
    </AuthContext.Provider>
  );
};
