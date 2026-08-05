import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api/axios";

export default function GoogleCalendarConnect() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState({ connected: false, googleEmail: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const calendarParam = searchParams.get("calendar");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/calendar/status")
      .then((res) => { if (!cancelled) setStatus(res.data); })
      .catch(() => { if (!cancelled) setError("Could not load calendar status"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [calendarParam]);

  const handleConnect = async () => {
    setConnecting(true);
    setError("");
    try {
      const res = await api.get("/calendar/auth-url");
      window.location.href = res.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Could not start Google sign-in");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    setError("");
    try {
      await api.post("/calendar/disconnect");
      setStatus({ connected: false, googleEmail: null });
    } catch (err) {
      setError(err.response?.data?.message || "Could not disconnect");
    } finally {
      setConnecting(false);
    }
  };

  const dismissBanner = () => {
    searchParams.delete("calendar");
    setSearchParams(searchParams, { replace: true });
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
      {calendarParam === "connected" && (
        <Banner tone="green" onDismiss={dismissBanner}>
          Google Calendar connected successfully.
        </Banner>
      )}
      {calendarParam === "denied" && (
        <Banner tone="yellow" onDismiss={dismissBanner}>
          Google sign-in was cancelled — calendar not connected.
        </Banner>
      )}
      {calendarParam === "error" && (
        <Banner tone="red" onDismiss={dismissBanner}>
          Something went wrong connecting your calendar. Try again.
        </Banner>
      )}
      {error && (
        <Banner tone="red" onDismiss={() => setError("")}>
          {error}
        </Banner>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Google Calendar</p>
          {loading ? (
            <p className="text-xs opacity-60 mt-1">Checking connection…</p>
          ) : status.connected ? (
            <p className="text-xs opacity-60 mt-1">
              Connected as <span className="font-medium">{status.googleEmail}</span>
            </p>
          ) : (
            <p className="text-xs opacity-60 mt-1">
              Not connected — sprint capacity won't reflect your real availability.
            </p>
          )}
        </div>

        {!loading && (
          status.connected ? (
            <button
              onClick={handleDisconnect}
              disabled={connecting}
              className="text-xs px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] hover:bg-[var(--color-secondary)] disabled:opacity-50"
            >
              {connecting ? "Disconnecting…" : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="text-xs px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90 disabled:opacity-50"
            >
              {connecting ? "Redirecting…" : "Connect Google Calendar"}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function Banner({ tone, onDismiss, children }) {
  const tones = {
    green: "border-green-300 bg-green-50 text-green-800",
    yellow: "border-yellow-300 bg-yellow-50 text-yellow-800",
    red: "border-red-300 bg-red-50 text-red-700",
  };
  return (
    <div className={`mb-3 flex items-center justify-between rounded-md border px-3 py-2 text-xs ${tones[tone]}`}>
      <span>{children}</span>
      <button onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}