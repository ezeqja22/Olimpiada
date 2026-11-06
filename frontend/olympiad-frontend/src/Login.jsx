/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./components/ToastProvider";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { loginWithToken } = useAuth();
  const { showToast } = useToast();
  const redirectTo = location.state?.redirectTo || "/homepage";

  const handleLogin = async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

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

      const safeRedirect =
        redirectTo && redirectTo !== "/login" ? redirectTo : "/homepage";

      navigate(safeRedirect, { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      // FastAPI validation errors are arrays of objects; never render [object Object].
      const errorMessage =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((issue) =>
                typeof issue?.msg === "string" ? issue.msg : "Invalid input"
              ).join("; ")
            : detail && typeof detail === "object"
              ? (typeof detail.message === "string" ? detail.message
                  : typeof detail.code === "string" ? detail.code : "Request failed")
              : err.message || "Request failed";

      if (err.response?.status === 503) {
        showToast(
          " Site is currently under maintenance. Please try again later.",
          "error",
        );
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
        showToast(" " + errorMessage, "error");
      } else if (
        err.response?.status === 403 &&
        errorMessage.includes("Account has been deactivated")
      ) {
        showToast(errorMessage, "error");
      } else if (
        err.code === "ERR_NETWORK" ||
        err.message.includes("Network Error")
      ) {
        showToast(
          " Unable to connect to the server. Please check your internet connection and try again.",
          "error",
        );
      } else {
        showToast("Login failed: " + errorMessage, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
                disabled={isSubmitting}
                style={{
                  width: "100%",
                  padding: spacing.md,
                  border: `1px solid ${colors.gray[300]}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  fontFamily: typography.fontFamily,
                  boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                  opacity: isSubmitting ? 0.7 : 1,
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

              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
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
                    opacity: isSubmitting ? 0.7 : 1,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.gray[300])
                  }
                />

                <span
                  onClick={() => {
                    if (!isSubmitting) {
                      setShowPassword((prev) => !prev);
                    }
                  }}
                  style={{
                    cursor: isSubmitting ? "default" : "pointer",
                    position: "absolute",
                    right: "15px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: colors.gray[600],
                    padding: "8px",
                    userSelect: "none",
                    zIndex: 10,
                    opacity: isSubmitting ? 0.6 : 1,
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
              disabled={isSubmitting}
              style={{
                width: "100%",
                marginBottom: spacing.lg,
                opacity: isSubmitting ? 0.75 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
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
              marginTop: spacing.lg,
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
              disabled={isSubmitting}
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
