/* eslint-disable no-unused-vars */
import "./AuthenticationWorkspace.css";
import {useLanguage} from "./context/LanguageContext";
import {loginDestination, loginIntent} from "./navigation";
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
  const {lang}=useLanguage();
  const label=(en,sq)=>lang==="sq"?sq:en;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { loginWithToken } = useAuth();
  const { showToast } = useToast();
  const redirectTo = loginDestination(location.state);

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

      const user = await loginWithToken(token);
      if (!user) throw new Error("Your session could not be verified. Please try again.");

      const safeRedirect =
        redirectTo && redirectTo !== "/login" ? redirectTo : "/homepage";

      navigate(safeRedirect, { replace: true, state: null });
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

  return <Layout><div className="authentication-workspace">
    <aside className="authentication-context"><p className="authentication-eyebrow">Olimpiada</p><h2>{label("Your learning, in one place.", "Mësimi yt, në një vend.")}</h2><p>{label("Return to your saved problems, discussions and course materials.", "Rikthehu te problemet e ruajtura, diskutimet dhe materialet mësimore.")}</p><nav aria-label={label("Explore before signing in", "Eksploro përpara hyrjes")}><Link to="/feed">{label("Browse problems", "Shfleto problemet")} →</Link><Link to="/forums">{label("Explore forums", "Eksploro forumet")} →</Link></nav></aside>
    <section className="authentication-form"><header><p className="authentication-eyebrow">{label("Account access", "Hyrja në llogari")}</p><h1>{label("Sign in to Olimpiada", "Hyr në Olimpiada")}</h1><p>{label("Use the email address associated with your account.", "Përdor adresën e emailit të llogarisë tënde.")}</p></header>
      <form onSubmit={handleLogin}>
        <label htmlFor="login-0">Email</label><input id="login-0" name="email" type="email" autoComplete="email" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required disabled={isSubmitting}/>
        <div className="authentication-label-row"><label htmlFor="login-1">{label("Password", "Fjalëkalimi")}</label><Link to="/forgot-password">{label("Forgot Password?", "Harrove fjalëkalimin?")}</Link></div>
        <div className="authentication-password"><input id="login-1" name="password" type={showPassword?"text":"password"} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={isSubmitting}/><button type="button" aria-label={showPassword?label("Hide password", "Fshih fjalëkalimin"):label("Show password", "Shfaq fjalëkalimin")} aria-pressed={showPassword} onClick={()=>setShowPassword(value=>!value)} disabled={isSubmitting}>{showPassword?label("Hide", "Fshih"):label("Show", "Shfaq")}</button></div>
        <button className="authentication-submit" type="submit" disabled={isSubmitting}>{isSubmitting?label("Signing in…", "Duke hyrë…"):label("Sign In", "Hyr")}</button>
      </form>
      <footer><p>{label("Don't have an account?", "Nuk ke llogari?")}</p><Link to="/signup" state={loginIntent(redirectTo)}>{label("Create Account", "Krijo llogari")} →</Link></footer>
    </section>
  </div></Layout>;
}
export default Login;
