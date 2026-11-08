import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius, shadows } from "./designSystem";

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            navigate("/login");
        }
    }, [token, navigate]);

    const handleResetPassword = async (e) => {
        e.preventDefault();

        if (!newPassword || !confirmPassword) {
            setError("All fields are required");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters long");
            return;
        }

        setLoading(true);
        setError("");

        try {
            await axios.post(
                `${process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000'}/auth/reset-password?token=${encodeURIComponent(token)}&new_password=${encodeURIComponent(newPassword)}`
            );

            setSuccess(true);

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate("/login");
            }, 3000);

        } catch (error) {
            console.error("Error resetting password:", error);
            setError(error.response?.data?.detail || "Failed to reset password");
        } finally {
            setLoading(false);
        }
    };

    const containerStyle = {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "80vh",
        padding: spacing.xl,
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        borderRadius: borderRadius.lg,
        margin: `${spacing.xl} 0`
    };

    const cardStyle = {
        maxWidth: "450px",
        width: "100%",
        padding: spacing.xxl,
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        boxShadow: shadows.xl,
        textAlign: "center"
    };

    const inputGroupStyle = {
        marginBottom: spacing.lg,
        textAlign: "left"
    };

    const labelStyle = {
        display: "block",
        marginBottom: spacing.sm,
        fontWeight: typography.fontWeight.semibold,
        color: colors.gray[800],
        fontSize: typography.fontSize.sm,
        textTransform: "uppercase",
        letterSpacing: "0.5px"
    };

    const inputStyle = {
        width: "100%",
        padding: spacing.md,
        paddingLeft: spacing.lg,
        border: `2px solid ${colors.gray[200]}`,
        borderRadius: borderRadius.lg,
        fontSize: typography.fontSize.base,
        outline: "none",
        transition: "all 0.3s ease",
        color: colors.gray[900],
        boxSizing: "border-box"
    };

    if (success) {
        return (
            <Layout
                background={`linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`}
                isFullWidth={true}
            >
                <div style={{ ...containerStyle, background: "transparent", margin: 0, width: "100%" }}>
                    <div style={cardStyle}>
                        <div style={{
                            width: "80px",
                            height: "80px",
                            backgroundColor: "#e6f4ea",
                            borderRadius: "50%",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            margin: "0 auto 24px"
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h1 style={{
                            color: colors.primary,
                            marginBottom: spacing.md,
                            fontSize: typography.fontSize["3xl"],
                            fontWeight: typography.fontWeight.bold
                        }}>
                            Success!
                        </h1>
                        <p style={{
                            color: colors.gray[600],
                            marginBottom: spacing.xl,
                            fontSize: typography.fontSize.lg,
                            lineHeight: 1.6
                        }}>
                            Your password has been successfully reset. Redirecting you to login...
                        </p>
                        <Button
                            onClick={() => navigate("/login")}
                            style={{
                                width: "100%",
                                backgroundColor: colors.primary,
                                color: colors.white,
                                padding: `${spacing.md} ${spacing.lg}`,
                                borderRadius: borderRadius.lg,
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.semibold,
                                border: "none"
                            }}
                        >
                            Back to Login
                        </Button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout
            background={`linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`}
            isFullWidth={true}
        >
            <div style={{ ...containerStyle, background: "transparent", margin: 0, width: "100%" }}>
                <div style={cardStyle}>
                    <div style={{ marginBottom: spacing.xl }}>
                        <h1 style={{
                            color: colors.primary,
                            marginBottom: spacing.sm,
                            fontSize: typography.fontSize["3xl"],
                            fontWeight: typography.fontWeight.bold
                        }}>
                            Set New Password
                        </h1>
                        <p style={{
                            color: colors.gray[500],
                            fontSize: typography.fontSize.base,
                            lineHeight: 1.5
                        }}>
                            Create a strong password to protect your account.
                        </p>
                    </div>

                    <form onSubmit={handleResetPassword}>
                        <div style={inputGroupStyle}>
                            <label htmlFor="resetpassword-0" style={labelStyle}>New Password</label>
                            <input id="resetpassword-0" name="resetpassword-0"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = colors.secondary;
                                    e.target.style.boxShadow = `0 0 0 4px ${colors.secondary}20`;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = colors.gray[200];
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                        </div>

                        <div style={inputGroupStyle}>
                            <label htmlFor="resetpassword-1" style={labelStyle}>Confirm New Password</label>
                            <input id="resetpassword-1" name="resetpassword-1"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat your new password"
                                style={inputStyle}
                                onFocus={(e) => {
                                    e.target.style.borderColor = colors.secondary;
                                    e.target.style.boxShadow = `0 0 0 4px ${colors.secondary}20`;
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = colors.gray[200];
                                    e.target.style.boxShadow = "none";
                                }}
                            />
                        </div>

                        {error && (
                            <div style={{
                                backgroundColor: "#fff5f5",
                                color: colors.danger,
                                padding: spacing.md,
                                borderRadius: borderRadius.md,
                                marginBottom: spacing.lg,
                                fontSize: typography.fontSize.sm,
                                borderLeft: `4px solid ${colors.danger}`,
                                textAlign: "left"
                            }}>
                                <strong>Error:</strong> {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: "100%",
                                backgroundColor: colors.primary,
                                color: colors.white,
                                padding: `${spacing.md} ${spacing.lg}`,
                                borderRadius: borderRadius.lg,
                                fontSize: typography.fontSize.base,
                                fontWeight: typography.fontWeight.bold,
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                transition: "all 0.3s ease",
                                border: "none",
                                boxShadow: shadows.md
                            }}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                </div>
            </div>
        </Layout>
    );
}

export default ResetPassword;
