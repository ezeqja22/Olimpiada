import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setCurrentUser(null);
      setAuthLoading(false);
      return null;
    }

    setAuthLoading(true);

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setCurrentUser(response.data);
      return response.data;
    } catch (error) {
      console.error("Error refreshing current user:", error);

      localStorage.removeItem("token");
      setCurrentUser(null);
      return null;
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const loginWithToken = useCallback(
    async (token) => {
      localStorage.setItem("token", token);
      return await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setCurrentUser(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      authLoading,
      isAuthenticated: !!currentUser,
      refreshUser,
      loginWithToken,
      logout,
    }),
    [currentUser, authLoading, refreshUser, loginWithToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
