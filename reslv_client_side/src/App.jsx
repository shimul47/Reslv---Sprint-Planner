import { useEffect, useState } from "react";
import AppShell from "./pages/AppShell.jsx";
import LoginScreen from "./pages/LoginScreen.jsx";

function getRoute(pathname) {
  return pathname.startsWith("/ticketsystem") ? "/ticketsystem" : "/";
}

export default function App() {
  const [route, setRoute] = useState(() => getRoute(window.location.pathname));

  useEffect(() => {
    const syncRoute = () => setRoute(getRoute(window.location.pathname));
    window.addEventListener("popstate", syncRoute);
    syncRoute();
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);

  const navigate = (path) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }
    setRoute(getRoute(path));
  };

  return route === "/ticketsystem" ? (
    <AppShell onLogout={() => navigate("/")} />
  ) : (
    <LoginScreen onLogin={() => navigate("/ticketsystem")} />
  );
}
