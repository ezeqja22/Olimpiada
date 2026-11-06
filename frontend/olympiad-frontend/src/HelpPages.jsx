import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Layout from "./components/Layout";
import { useAuth } from "./context/AuthContext";
import "./HelpPages.css";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

function useHelpLanguage() {
  const [language, setLanguage] = useState(() =>
    window.localStorage.getItem("olimpiada-help-language") === "en" ? "en" : "sq",
  );
  const chooseLanguage = (value) => {
    setLanguage(value);
    window.localStorage.setItem("olimpiada-help-language", value);
  };
  return [language, chooseLanguage];
}

function Intro({ eyebrow, title, description, language, onLanguage }) {
  return (
    <div className="help-intro">
      <div>
        <span className="help-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="help-languages" aria-label="Page language">
        <button type="button" aria-pressed={language === "sq"} onClick={() => onLanguage("sq")}>SQ</button>
        <button type="button" aria-pressed={language === "en"} onClick={() => onLanguage("en")}>EN</button>
      </div>
    </div>
  );
}

function errorMessage(error, fallback) {
  return typeof error.response?.data?.detail === "string" ? error.response.data.detail : fallback;
}

export function FAQPage() {
  const [language, setLanguage] = useHelpLanguage();
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    axios.get(`${API}/experience/faq`)
      .then(({ data }) => { if (active) setItems(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <Layout maxWidth="1040px">
      <div className="help-page">
        <Intro eyebrow="OLIMPIADA / FAQ" language={language} onLanguage={setLanguage}
          title={language === "sq" ? "Pyetje të shpeshta" : "Frequently asked questions"}
          description={language === "sq" ? "Përgjigje për platformën dhe komunitetin tonë." : "Answers about our platform and community."} />
        {loading && <p className="help-info" role="status">{language === "sq" ? "Duke ngarkuar…" : "Loading…"}</p>}
        {error && <p className="help-info help-error" role="alert">{language === "sq" ? "Pyetjet nuk u ngarkuan. Provo përsëri më vonë." : "Could not load questions. Please try again later."}</p>}
        {!loading && !error && items.length === 0 && (
          <p className="help-info">{language === "sq" ? "Po përditësojmë përgjigjet. Ndërkohë, mund të na shkruash drejtpërdrejt." : "We're updating our answers. You can contact us directly in the meantime."}</p>
        )}
        <div className="help-faq-list">
          {items.map((item) => (
            <section key={item.id} className="help-faq-item">
              <button type="button" aria-expanded={expanded === item.id}
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                <span>{language === "sq" ? item.question_sq : item.question_en}</span>
                <span aria-hidden="true">{expanded === item.id ? "−" : "+"}</span>
              </button>
              {expanded === item.id && (
                <p className="help-faq-answer">{language === "sq" ? item.answer_sq : item.answer_en}</p>
              )}
            </section>
          ))}
        </div>
        <div className="help-cta">
          <div><strong>{language === "sq" ? "Nuk e gjete përgjigjen?" : "Still have questions?"}</strong>
            <p>{language === "sq" ? "Na shkruaj dhe do të përpiqemi të të ndihmojmë." : "Send us a message and we'll do our best to help."}</p></div>
          <Link className="help-button" to="/support">{language === "sq" ? "Kontakto suportin" : "Contact support"} →</Link>
        </div>
      </div>
    </Layout>
  );
}

export function SupportPage() {
  const [language, setLanguage] = useHelpLanguage();
  const { currentUser } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", category: "technical", subject: "", message: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setForm((old) => ({ ...old, name: old.name || currentUser.username || "", email: old.email || currentUser.email || "" }));
    }
  }, [currentUser]);

  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true); setNotice(""); setIsError(false);
    try {
      const { data } = await axios.post(`${API}/experience/support/tickets`, form);
      setNotice(language === "sq" ? `Kërkesa #${data.ticket_id} u regjistrua me sukses.` : `Ticket #${data.ticket_id} was received.`);
      setForm((old) => ({ ...old, subject: "", message: "" }));
    } catch (error) {
      setIsError(true);
      setNotice(errorMessage(error, language === "sq" ? "Dërgimi dështoi. Provo sërish." : "Could not send your request. Please try again."));
    } finally { setBusy(false); }
  };

  return (
    <Layout maxWidth="1040px">
      <div className="help-page">
        <Intro eyebrow="OLIMPIADA / SUPPORT" language={language} onLanguage={setLanguage}
          title={language === "sq" ? "Jemi këtu për të ndihmuar" : "How can we help?"}
          description={language === "sq" ? "Na shkruaj për probleme teknike ose pyetje rreth platformës." : "Contact us about technical issues or questions about the platform."} />
        <div className="help-columns">
          <form className="help-card help-form" onSubmit={submit}>
            <div className="help-honeypot" aria-hidden="true">
              <label htmlFor="support-website">Website (leave blank)</label>
              <input id="support-website" name="website" autoComplete="off" tabIndex={-1}
                value={form.website} onChange={(e) => update("website", e.target.value)} />
            </div>
            <label>{language === "sq" ? "Emri" : "Name"}<input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={(e) => update("name", e.target.value)} /></label>
            <label>Email<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></label>
            <label>{language === "sq" ? "Kategoria" : "Category"}<select value={form.category} onChange={(e) => update("category", e.target.value)}>
              <option value="technical">{language === "sq" ? "Problem teknik" : "Technical issue"}</option>
              <option value="content">{language === "sq" ? "Përmbajtja" : "Content"}</option>
              <option value="general">{language === "sq" ? "Pyetje e përgjithshme" : "General question"}</option>
            </select></label>
            <label>{language === "sq" ? "Subjekti" : "Subject"}<input required minLength={4} maxLength={200} value={form.subject} onChange={(e) => update("subject", e.target.value)} /></label>
            <label>{language === "sq" ? "Mesazhi" : "Message"}<textarea required minLength={12} maxLength={5000} rows={7} value={form.message} onChange={(e) => update("message", e.target.value)} /></label>
            <button type="submit" className="help-button" disabled={busy}>{busy ? (language === "sq" ? "Duke dërguar…" : "Sending…") : (language === "sq" ? "Dërgo kërkesën" : "Send request")}</button>
            {notice && <p role={isError ? "alert" : "status"} className={`help-info ${isError ? "help-error" : "help-success"}`}>{notice}</p>}
          </form>
          <aside className="help-aside">
            <span className="help-eyebrow">{language === "sq" ? "NDIHMA" : "HELP CENTER"}</span>
            <h2>{language === "sq" ? "Ndoshta e kemi përgjigjen" : "Your answer may already be here"}</h2>
            <p>{language === "sq" ? "Shiko pyetjet më të shpeshta ose na dërgo mesazh." : "Check our frequently asked questions, or send us a message."}</p>
            <Link to="/faq">{language === "sq" ? "Shiko FAQ" : "Read FAQ"} →</Link>
          </aside>
        </div>
      </div>
    </Layout>
  );
}
