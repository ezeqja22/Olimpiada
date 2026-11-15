import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./AuthenticationWorkspace.css";
import {useLanguage} from "./context/LanguageContext";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius, shadows } from "./designSystem";

function ResetPassword() {
    const {lang}=useLanguage();
    const label=(en,sq)=>lang==="sq"?sq:en;
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

    return <Layout><div className="authentication-workspace">
      <aside className="authentication-context"><p className="authentication-eyebrow">Olimpiada</p><h2>{label("Secure your account", "Siguro llogarinë tënde")}</h2><p>{label("Choose a new password that you do not use on another website.", "Zgjidh një fjalëkalim të ri që nuk e përdor në faqe të tjera.")}</p><nav><Link to="/login">← {label("Back to sign in", "Kthehu te hyrja")}</Link><Link to="/forgot-password">{label("Request another reset link", "Kërko një lidhje tjetër")} →</Link></nav></aside>
      <section className="authentication-form"><header><p className="authentication-eyebrow">{label("Account recovery", "Rikuperimi i llogarisë")}</p><h1>{success?label("Password updated", "Fjalëkalimi u përditësua"):label("Set a new password", "Vendos një fjalëkalim të ri")}</h1><p>{success?label("You can now sign in with your new password.", "Tani mund të hysh me fjalëkalimin e ri."):label("Enter your new password twice to confirm it.", "Shkruaj dy herë fjalëkalimin e ri për ta konfirmuar.")}</p></header>
        {success?<Link to="/login">{label("Sign in", "Hyr")} →</Link>:<form onSubmit={handleResetPassword}><label htmlFor="reset-new">{label("New password", "Fjalëkalimi i ri")}</label><input id="reset-new" type="password" autoComplete="new-password" minLength={6} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} disabled={loading}/><label htmlFor="reset-confirm">{label("Confirm password", "Konfirmo fjalëkalimin")}</label><input id="reset-confirm" type="password" autoComplete="new-password" minLength={6} required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} disabled={loading}/>{error&&<p role="alert" className="authentication-error">{typeof error==='string'?error:label("Password reset failed.", "Rivendosja dështoi.")}</p>}<button type="submit" className="authentication-submit" disabled={loading}>{loading?label("Saving…", "Duke ruajtur…"):label("Reset password", "Rivendos fjalëkalimin")}</button></form>}
      </section>
    </div></Layout>;
}
export default ResetPassword;
