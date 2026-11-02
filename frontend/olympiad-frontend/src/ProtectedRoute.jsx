import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import AnimatedLoader from "./components/AnimatedLoader";
import { LockedPreview } from "./AccessPages";
import { useAuth } from "./context/AuthContext";

function ProtectedRoute({ children, feature }) {
  const { currentUser, authLoading, accessInfo } = useAuth();
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

  if (feature && !accessInfo?.features?.includes(feature)) {
    return <LockedPreview feature={feature} />;
  }
  return children;
}

export default ProtectedRoute;
