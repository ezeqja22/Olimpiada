import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const TEN_MINUTES = 10 * 60 * 1000;
const REFRESH_INTERVAL = 3 * 60 * 1000;
const AuthContext = createContext(null);
const header = token => ({ Authorization: "Bearer " + token });

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const lastInteraction = useRef(Date.now());
  const lastRefresh = useRef(Date.now());
  const logout = useCallback(() => {
    const token = localStorage.getItem("token");
    localStorage.removeItem("token");
    setCurrentUser(null);
    if (token) {
      axios.post(API_URL + "/access/session/logout", {}, { headers: header(token) }).catch(() => {});
    }
  }, []);
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setCurrentUser(null);setAuthLoading(false);return null; }
    setAuthLoading(true);
    try {
      const user = await axios.get(API_URL + "/auth/me", { headers: header(token) });
      setCurrentUser(user.data);
      lastRefresh.current = Date.now();
      return user.data;
    } catch (error) {
      localStorage.removeItem("token");
      setCurrentUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);
  const loginWithToken = useCallback(async token => {
    lastInteraction.current = Date.now();
    lastRefresh.current = Date.now();
    localStorage.setItem("token", token);
    return refreshUser();
  }, [refreshUser]);

  useEffect(() => { refreshUser(); }, [refreshUser]);
  useEffect(() => {
    const recordActivity = () => { lastInteraction.current = Date.now(); };
    const eventTypes = ["click", "keydown", "pointerdown", "touchstart", "scroll"];
    eventTypes.forEach(type => window.addEventListener(type, recordActivity, { passive: true }));
    const tick = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      const now = Date.now();
      if (now - lastInteraction.current >= TEN_MINUTES) {
        logout();
        return;
      }
      if (document.visibilityState !== "visible" || now - lastRefresh.current < REFRESH_INTERVAL) return;
      lastRefresh.current = now;
      try {
        const response = await axios.post(API_URL + "/access/session/refresh", {}, { headers: header(token) });
        // Do not restore a session if user logged out while request was in flight.
        if (localStorage.getItem("token") === token) {
          localStorage.setItem("token", response.data.token);
        }
      } catch (error) {
        if (localStorage.getItem("token") === token) logout();
      }
    };
    const timer = window.setInterval(tick, 30000);
    const onVisibility = () => { if (document.visibilityState === "visible") tick(); };
    const onStorage = e => {
      if (e.key === "token" && !e.newValue) { setCurrentUser(null); }
      if (e.key === "token" && e.newValue) refreshUser();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearInterval(timer);
      eventTypes.forEach(type => window.removeEventListener(type, recordActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
    };
  }, [logout, refreshUser]);
  const value = useMemo(() => ({
    currentUser, setCurrentUser, authLoading,
    isAuthenticated: !!currentUser, refreshUser, loginWithToken, logout,
  }), [currentUser, authLoading, refreshUser, loginWithToken, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
