import React, { useState } from "react";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import dryriImage from "./assets/dryri_wvbhuh.svg";
import emailSentImage from "./assets/EMAIL_SENT_rmh0e0.svg";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      //sending as form data
      const formData = new FormData();
      formData.append("email", email);

      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forgot-password?email=${encodeURIComponent(email)}`,
      );
      setSuccess(true);
    } catch (err) {
      console.error("Full error:", err);

      // SAFE ERROR HANDLING
      let errorMessage = "Failed to send reset link";

      // Check if the error data exists and is renderable
      const errorDetail = err.response?.data?.detail;
      if (errorDetail) {
        if (typeof errorDetail === "string") {
          errorMessage = errorDetail;
        } else if (typeof errorDetail === "object") {
          // Handle object errors safely
          errorMessage = "Invalid email address";
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "60vh",
            padding: spacing.lg,
          }}
        >
          <Card style={{ maxWidth: "500px", textAlign: "center" }}>
            <div style={{ fontSize: "64px", marginBottom: "20px" }}>
              <img
                src={emailSentImage}
                alt="Menu"
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain",
                }}
              />
            </div>
            <h1
              style={{
                color: colors.success,
                marginBottom: "20px",
                fontSize: typography.fontSize.xxl,
                fontWeight: typography.fontWeight.bold,
              }}
            >
              Email Sent!
            </h1>
            <p
              style={{
                color: colors.gray[600],
                marginBottom: "30px",
                fontSize: typography.fontSize.lg,
                lineHeight: 1.6,
              }}
            >
              If the email exists, a password reset link has been sent to your
              inbox.
            </p>
            <Button
              onClick={() => (window.location.href = "/login")}
              style={{
                backgroundColor: colors.primary,
                color: colors.white,
                border: `1px solid ${colors.primary}`,
                padding: `${spacing.md} ${spacing.lg}`,
                borderRadius: borderRadius.md,
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
                cursor: "pointer",
              }}
            >
              Go to Login
            </Button>
          </Card>
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
          padding: spacing.lg,
        }}
      >
        <Card style={{ maxWidth: "500px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>
              <img
                src={dryriImage}
                alt="Menu"
                style={{
                  width: "80px",
                  height: "80px",
                  objectFit: "contain",
                }}
              />
            </div>
            <h1
              style={{
                color: colors.primary,
                marginBottom: "20px",
                fontSize: typography.fontSize.xxl,
                fontWeight: typography.fontWeight.bold,
              }}
            >
              Forgot Password
            </h1>
            <p
              style={{
                color: colors.gray[600],
                marginBottom: "30px",
                fontSize: typography.fontSize.base,
                lineHeight: 1.6,
              }}
            >
              Enter your registered email address below to receive a password
              reset link.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: spacing.lg, textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.sm,
                    fontWeight: typography.fontWeight.medium,
                    color: colors.gray[700],
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  style={{
                    width: "100%",
                    padding: spacing.md,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.fontSize.base,
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = colors.primary)}
                  onBlur={(e) =>
                    (e.target.style.borderColor = colors.gray[300])
                  }
                />
              </div>

              {error && (
                <div
                  style={{
                    color: colors.danger,
                    marginBottom: spacing.md,
                    fontSize: typography.fontSize.sm,
                    textAlign: "center",
                  }}
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  backgroundColor: colors.primary,
                  color: colors.white,
                  border: `1px solid ${colors.primary}`,
                  padding: `${spacing.md} ${spacing.lg}`,
                  borderRadius: borderRadius.md,
                  fontSize: typography.fontSize.base,
                  fontWeight: typography.fontWeight.medium,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </Layout>
  );
}

export default ForgotPassword;
