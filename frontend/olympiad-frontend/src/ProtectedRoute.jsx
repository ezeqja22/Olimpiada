import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import AnimatedLoader from "./components/AnimatedLoader";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <AnimatedLoader
        type="verify"
        message="Validating session..."
        size="large"
      />
    );
  }

  if (!currentUser) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          redirectTo: location.pathname + location.search,
        }}
      />
    );
  }

  return children;
}

export default ProtectedRoute;
