/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import {useLanguage} from "./context/LanguageContext";
import "./AuthenticationWorkspace.css";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import { loginDestination, loginIntent } from "./navigation";
import { useToast } from "./components/ToastProvider";

const EmailVerification = () => {
  const {lang}=useLanguage();
  const label=(en,sq)=>lang==="sq"?sq:en;
  const navigate = useNavigate();
  const location = useLocation();

  // Get email from location state (passed from signup)
  const email = location.state?.email || "";
  const username = location.state?.username || "";
  const redirectTo = loginDestination(location.state);
  const token = location.state?.token || null;

  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resending, setResending] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const { loginWithToken } = useAuth();
  useEffect(() => {
    if (!success || !sessionReady) return;
    const timer = window.setTimeout(() => navigate(redirectTo, {replace:true, state:null}), 2000);
    return () => window.clearTimeout(timer);
  }, [success, sessionReady, navigate, redirectTo]);
  const { showToast } = useToast();

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/verify-email`,
        {
          email: email,
          verification_code: verificationCode,
        },
      );

      if (response.status === 200) {
        const sessionToken = token || localStorage.getItem("token");
        const user = sessionToken ? await loginWithToken(sessionToken) : null;
        setSessionReady(Boolean(user));
        setSuccess(true);
      }
    } catch (err) {
      console.error("Verification error:", err);
      if (err.response?.data?.detail) {
        // Handle both string and object responses
        const errorDetail = err.response.data.detail;
        setError(
          typeof errorDetail === "string"
            ? errorDetail
            : JSON.stringify(errorDetail),
        );
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    setError("");

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/send-verification`,
        {
          email: email,
        },
      );

      if (response.status === 200) {
        setError(""); // Clear any previous errors

        // Check if email sending failed and code is provided
        if (response.data.verification_code) {
          setError("Error sending verification code, please try again later");
        } else {
          showToast(
            "Verification code sent! Please check your email.",
            "success",
          );
        }
      }
    } catch (err) {
      console.error("Resend error:", err);
      if (err.response?.data?.detail) {
        // Handle both string and object responses
        const errorDetail = err.response.data.detail;
        setError(
          typeof errorDetail === "string"
            ? errorDetail
            : JSON.stringify(errorDetail),
        );
      } else {
        setError("Failed to resend verification code. Please try again.");
      }
    } finally {
      setResending(false);
    }
  };

  return <Layout><div className="authentication-workspace">
    <aside className="authentication-context"><p className="authentication-eyebrow">Olimpiada</p><h2>{label("Verify your email", "Verifiko emailin")}</h2><p>{label("Verification confirms that you can receive account messages at this address.", "Verifikimi konfirmon që mund të marrësh mesazhet e llogarisë në këtë adresë.")}</p><nav><Link to="/login">← {label("Back to sign in", "Kthehu te hyrja")}</Link><Link to="/support">{label("Get help", "Kërko ndihmë")} →</Link></nav></aside>
    <section className="authentication-form"><header><p className="authentication-eyebrow">{label("Email confirmation", "Konfirmimi i emailit")}</p><h1>{success?label("Email verified", "Emaili u verifikua"):label("Enter your code", "Shkruaj kodin")}</h1><p>{!email?label("Sign in or register first so we can identify the account to verify.", "Hyr ose regjistrohu fillimisht për të identifikuar llogarinë."):success?(sessionReady?label("Verification is complete. Continuing to your destination…", "Verifikimi përfundoi. Duke vazhduar…"):label("Your email is verified. Sign in to continue.", "Emaili u verifikua. Hyr për të vazhduar.")):label("Enter the verification code sent to ", "Shkruaj kodin e verifikimit të dërguar te ")+email}</p></header>
      {!email?<Link to="/signup">{label("Create Account", "Krijo llogari")} →</Link>:success?<Link to={sessionReady?redirectTo:"/login"} state={sessionReady?null:loginIntent(redirectTo)}>{sessionReady?label("Continue", "Vazhdo"):label("Sign in", "Hyr")} →</Link>:<><form onSubmit={handleVerify}><label htmlFor="verification-code">{label("Verification code", "Kodi i verifikimit")}</label><input id="verification-code" autoComplete="one-time-code" inputMode="numeric" value={verificationCode} onChange={e=>setVerificationCode(e.target.value)} required disabled={loading}/>{error&&<p role="alert" className="authentication-error">{error}</p>}<button type="submit" className="authentication-submit" disabled={loading}>{loading?label("Verifying…", "Duke verifikuar…"):label("Verify email", "Verifiko emailin")}</button></form><footer><p>{label("No code received?", "Nuk e ke marrë kodin?")}</p><button className="authentication-resend" onClick={handleResendCode} disabled={resending||loading}>{resending?label("Sending…", "Duke dërguar…"):label("Resend code", "Ridërgo kodin")}</button></footer></>}
    </section>
  </div></Layout>;
};
export default EmailVerification;
