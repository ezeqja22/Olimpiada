import {loginDestination, loginIntent} from "./navigation";
import React, { useState } from "react";
import "./AuthenticationWorkspace.css";
import {useLanguage} from "./context/LanguageContext";
import axios from "axios";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./components/ToastProvider";

function Signup() {
  const {logout}=useAuth();
  const {lang}=useLanguage();
  const label=(en,sq)=>lang==="sq"?sq:en;
  const [busy,setBusy]=useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { showToast } = useToast();

  // Get redirect path from location state
  const redirectTo = loginDestination(location.state);

  const handleSignup = async (e) => {
    e.preventDefault();
    if(busy)return;
    setBusy(true);
    try {
      // Clear any existing token first
      logout();
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/register`,
        {
          username,
          email,
          password,
          email_notifications: emailNotifications,
          marketing_emails: marketingEmails,
        },
      );

      // Check if we received a token (automatic login)
      if (response.data.access_token) {
        // Store the token for automatic login
        localStorage.setItem("token", response.data.access_token);

        // Redirect to verification page with email, username, redirect path, and token
        navigate("/verify-email", {
          state: {
            email: email,
            username: username,
            ...loginIntent(redirectTo),
            token: response.data.access_token,
          },
        });
      } else {
        // Fallback: redirect to verification page without token
        navigate("/verify-email", {
          state: {
            email: email,
            username: username,
            ...loginIntent(redirectTo),
          },
        });
      }
    } catch (err) {
      showToast(
        "Signup failed: " + (err.response?.data?.detail || err.message),
        "error",
      );
    } finally {setBusy(false);}
  };

  return <Layout><div className="authentication-workspace">
    <aside className="authentication-context"><p className="authentication-eyebrow">Olimpiada</p><h2>{label("Join the learning community", "Bashkohu me komunitetin mësimor")}</h2><p>{label("Save problems, participate in discussions and use the learning materials with one account.", "Ruaj probleme, merr pjesë në diskutime dhe përdor materialet mësimore me një llogari.")}</p><nav><Link to="/feed">{label("Browse problems first", "Shfleto fillimisht problemet")} →</Link><Link to="/login" state={loginIntent(redirectTo)}>{label("Already registered? Sign in", "Ke llogari? Hyr")} →</Link></nav></aside>
    <section className="authentication-form"><header><p className="authentication-eyebrow">{label("Registration", "Regjistrimi")}</p><h1>{label("Create your account", "Krijo llogarinë tënde")}</h1><p>{label("You will verify your email after registration.", "Pas regjistrimit do të verifikosh emailin.")}</p></header>
      <form onSubmit={handleSignup}><label htmlFor="signup-0">{label("Username", "Emri i përdoruesit")}</label><input id="signup-0" autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required disabled={busy}/><label htmlFor="signup-1">Email</label><input id="signup-1" type="email" autoComplete="email" spellCheck={false} value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy}/><label htmlFor="signup-2">{label("Password", "Fjalëkalimi")}</label><div className="authentication-password"><input id="signup-2" type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy}/><button type="button" aria-label={showPassword?label("Hide password", "Fshih fjalëkalimin"):label("Show password", "Shfaq fjalëkalimin")} onClick={()=>setShowPassword(value=>!value)}>{showPassword?label("Hide", "Fshih"):label("Show", "Shfaq")}</button></div>
        <fieldset className="authentication-preferences" disabled={busy}><legend>{label("Email preferences", "Preferencat e emailit")}</legend><p>{label("Optional. You can change these in Settings.", "Opsionale. Mund t'i ndryshosh te Cilësimet.")}</p><label><input type="checkbox" checked={emailNotifications} onChange={e=>setEmailNotifications(e.target.checked)}/><span>{label("Email about likes, comments and follows", "Email për pëlqime, komente dhe ndjekës")}</span></label><label><input type="checkbox" checked={marketingEmails} onChange={e=>setMarketingEmails(e.target.checked)}/><span>{label("Occasional platform news and updates", "Lajme dhe përditësime nga platforma")}</span></label></fieldset>
        <button type="submit" className="authentication-submit" disabled={busy}>{busy?label("Creating account…", "Duke krijuar llogarinë…"):label("Create Account", "Krijo llogari")}</button>
      </form>
    </section>
  </div></Layout>;
}
export default Signup;
