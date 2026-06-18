/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { Link } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ForgotPassword from "./ForgotPassword";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithToken, currentUser, authLoading } = useAuth();
  // Get redirect path from location state
  const redirectTo = location.state?.redirectTo || "/homepage";

  useEffect(() => {
    if (!authLoading && currentUser) {
      const safeRedirect =
        redirectTo && redirectTo !== "/login" ? redirectTo : "/homepage";

      navigate(safeRedirect, { replace: true });
    }
  }, [authLoading, currentUser, navigate, redirectTo]);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/login`,
        {
          email,
          password,
        },
      );

      const token = response.data.token || response.data.access_token;

      if (!token) {
        throw new Error("No token returned from login");
      }

      await loginWithToken(token);

      navigate(redirectTo || "/homepage", { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message;

      if (err.response?.status === 503) {
        alert(" Site is currently under maintenance. Please try again later.");
      } else if (
        err.response?.status === 403 &&
        errorMessage.includes("Email not verified")
      ) {
        navigate("/verify-email", {
          state: {
            email: email,
            fromLogin: true,
          },
        });
      } else if (
        err.response?.status === 403 &&
        errorMessage.includes("Account has been banned")
      ) {
        alert(" " + errorMessage);
      } else if (
        err.response?.status === 403 &&
        errorMessage.includes("Account has been deactivated")
      ) {
        alert("⚠️ " + errorMessage);
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message.includes("Network Error")
      ) {
        alert(
          " Unable to connect to the server. Please check your internet connection and try again.",
        );
      } else {
        alert("Login failed: " + errorMessage);
      }
    }
  };

  if (authLoading || currentUser) {
    return (
      <Layout>
        <div
          style={{
            minHeight: "60vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.gray[600],
            fontWeight: typography.fontWeight.medium,
          }}
        >
          Checking session...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "60vh",
        }}
      >
        <Card style={{ width: "100%", maxWidth: "400px" }}>
          <div style={{ textAlign: "center", marginBottom: spacing.xl }}>
            <h1
              style={{
                fontSize: typography.fontSize["3xl"],
                fontWeight: typography.fontWeight.bold,
                color: colors.primary,
                marginBottom: spacing.sm,
              }}
            >
              Welcome Back
            </h1>
            <p
              style={{
                color: colors.gray[600],
                fontSize: typography.fontSize.base,
                margin: 0,
              }}
            >
              Sign in to your Olimpiada account
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: spacing.lg }}>
              <label
                style={{
                  display: "block",
                  marginBottom: spacing.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.dark,
                  fontSize: typography.fontSize.base,
                }}
              >
                Email
              </label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: spacing.md,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  fontFamily: typography.fontFamily,
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                  "&:focus": {
                    outline: "none",
                    borderColor: colors.primary,
                  },
                }}
                onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                onBlur={(e) => (e.target.style.borderColor = colors.gray[300])}
              />
            </div>

            <div style={{ marginBottom: spacing.xl }}>
              <label
                style={{
                  display: "block",
                  marginBottom: spacing.sm,
                  fontWeight: typography.fontWeight.medium,
                  color: colors.dark,
                  fontSize: typography.fontSize.base,
                }}
              >
                Password
              </label>
              {/* Add wrapper div for password field */}
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    paddingRight: "50px",
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.base,
                    fontFamily: typography.fontFamily,
                    boxSizing: "border-box",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.gray[300])
                  }
                />
                {/* Add custom eye icon */}
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    cursor: "pointer",
                    position: "absolute",
                    right: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: colors.gray[600],
                    padding: "8px",
                    userSelect: "none",
                    zIndex: 10,
                  }}
                >
                  <img
                    src={
                      showPassword
                        ? "https://res.cloudinary.com/dqmmgk88b/image/upload/v1762348022/SY_MBYLL_cioicv.svg"
                        : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1762348022/SY_HAP_yencim.svg"
                    }
                    alt={showPassword ? "Hide password" : "Show password"}
                    style={{
                      width: "20px",
                      height: "20px",
                      objectFit: "contain",
                    }}
                  />
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              style={{ width: "100%", marginBottom: spacing.lg }}
            >
              Sign In
            </Button>
          </form>
          <Link
            to="/forgot-password"
            style={{ color: "#1a4d3a", textDecoration: "underline" }}
          >
            Forgot Password?
          </Link>
          <div
            style={{
              textAlign: "center",
              paddingTop: spacing.lg,
              borderTop: `1px solid ${colors.gray[200]}`,
            }}
          >
            <p
              style={{
                margin: `0 0 ${spacing.sm} 0`,
                color: colors.gray[600],
                fontSize: typography.fontSize.base,
              }}
            >
              Don't have an account?
            </p>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate("/signup", { state: { redirectTo } })}
            >
              Create Account
            </Button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default Login;
