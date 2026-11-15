import {Link} from "react-router-dom";
import {useLanguage} from "./context/LanguageContext";
import "./AuthenticationWorkspace.css";
import React, { useState } from "react";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import dryriImage from "./assets/dryri_wvbhuh.svg";
import emailSentImage from "./assets/EMAIL_SENT_rmh0e0.svg";

function ForgotPassword() {
  const {lang}=useLanguage();
  const label=(en,sq)=>lang==="sq"?sq:en;
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

  return <Layout><div className="authentication-workspace">
    <aside className="authentication-context"><p className="authentication-eyebrow">Olimpiada</p><h2>{label("Account recovery", "Rikuperimi i llogarisë")}</h2><p>{label("Use your registered email to request a password reset link.", "Përdor emailin e regjistruar për të kërkuar lidhjen e rivendosjes së fjalëkalimit.")}</p><nav><Link to="/login">← {label("Back to sign in", "Kthehu te hyrja")}</Link><Link to="/support">{label("Need help?", "Të duhet ndihmë?")} →</Link></nav></aside>
    <section className="authentication-form"><header><p className="authentication-eyebrow">{label("Password reset", "Rivendosja e fjalëkalimit")}</p><h1>{success?label("Check your inbox", "Kontrollo emailin"):label("Forgot your password?", "Harrove fjalëkalimin?")}</h1><p>{success?label("If this email is registered, a reset link has been sent. Check your spam folder too.", "Nëse ky email është i regjistruar, lidhja e rivendosjes është dërguar. Kontrollo edhe dosjen spam."):label("Enter the email address associated with your account.", "Shkruaj adresën e emailit të llogarisë tënde.")}</p></header>
      {success?<Link to="/login">{label("Return to sign in", "Kthehu te hyrja")} →</Link>:<form onSubmit={handleSubmit}><label htmlFor="recovery-email">Email</label><input id="recovery-email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading}/>{error&&<p role="alert" className="authentication-error">{error}</p>}<button type="submit" className="authentication-submit" disabled={loading}>{loading?label("Sending…", "Duke dërguar…"):label("Send reset link", "Dërgo lidhjen")}</button></form>}
    </section>
  </div></Layout>;
}
export default ForgotPassword;
