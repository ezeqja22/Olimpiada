import {useLanguage} from "./context/LanguageContext";
import React, { useEffect, useState } from "react";
import {PublishingHeader,PublishingSection} from "./components/PublishingWorkspace";
import axios from "axios";
import "./HelpPages.css";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const faqUrl = `${API}/experience/admin/faq`;
const ticketUrl = `${API}/experience/admin/tickets`;
const EMPTY_FAQ = { category: "General", question_sq: "", answer_sq: "", question_en: "", answer_en: "", position: 0, active: true };

export function AdminFAQ() {
  const {lang} = useLanguage();
  const t = (sq,en) => lang === "en" ? en : sq;
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(EMPTY_FAQ);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);setLoadError(false);
    try { setRows((await axios.get(faqUrl, { headers: headers() })).data); }
    catch { setLoadError(true);setNotice(t("Pyetjet nuk u ngarkuan.", "Could not load FAQ entries.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setNotice("");
    try {
      const url = editing ? `${faqUrl}/${editing}` : faqUrl;
      await axios({ method: editing ? "put" : "post", url, data: form, headers: headers() });
      setEditing(null); setForm(EMPTY_FAQ); setNotice(t("Pyetja u ruajt. Ajo bëhet publike kur është aktive dhe e shqyrtuar.", "FAQ saved. It is public when active and reviewed."));
      await load();
    } catch { setNotice(t("Pyetja nuk u ruajt. Kontrollo fushat e detyrueshme dhe provo përsëri.", "Could not save the FAQ. Check the required fields and try again.")); }
    finally { setSaving(false); }
  };
  const edit = (row) => {
    setEditing(row.id);
    setForm(Object.fromEntries(Object.keys(EMPTY_FAQ).map((key) => [key, row[key]])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="publishing-workspace">
      <PublishingHeader eyebrow={t("Faqja / Ndihma", "Website / Help")} title={t("Menaxhimi i pyetjeve të shpeshta", "FAQ management")} description={t("Redakto të dyja gjuhët, cakto rendin e shfaqjes dhe kontrollo dukshmërinë para publikimit.", "Edit both languages, choose the display order and review visibility before publishing.")} to="/faq" linkLabel={t("Lexo pyetjet e shpeshta", "Read the FAQ")} />
      <div className="publishing-columns">
        <form onSubmit={save} className="publishing-section publishing-form">
          <h3>{editing ? t(`Redakto pyetjen #${editing}`, `Edit FAQ #${editing}`) : t("Shto pyetje", "Add a question")}</h3>
          <label>{t("Kategoria", "Category")}<input required minLength={2} maxLength={60} value={form.category} onChange={(e) => change("category", e.target.value)} /></label>
          <label>{t("Pyetja (shqip)", "Question (Albanian)")}<input required minLength={5} maxLength={300} value={form.question_sq} onChange={(e) => change("question_sq", e.target.value)} /></label>
          <label>{t("Përgjigjja (shqip)", "Answer (Albanian)")}<textarea required minLength={5} maxLength={12000} rows={4} value={form.answer_sq} onChange={(e) => change("answer_sq", e.target.value)} /></label>
          <label>{t("Pyetja (anglisht)", "Question (English)")}<input required minLength={5} maxLength={300} value={form.question_en} onChange={(e) => change("question_en", e.target.value)} /></label>
          <label>{t("Përgjigjja (anglisht)", "Answer (English)")}<textarea required minLength={5} maxLength={12000} rows={4} value={form.answer_en} onChange={(e) => change("answer_en", e.target.value)} /></label>
          <label>{t("Rendi", "Order")}<input required type="number" min="0" max="10000" value={form.position} onChange={(e) => change("position", Number(e.target.value))} /></label>
          <label className="help-checkbox"><input type="checkbox" checked={form.active} onChange={(e) => change("active", e.target.checked)} /> {t("Aktive / e dukshme për publikun pas shqyrtimit", "Active / visible publicly after review")}</label>
          <div className="help-row"><button className="help-button" disabled={saving}>{saving ? t("Duke ruajtur…", "Saving…") : t("Ruaj pyetjen", "Save FAQ")}</button>{editing && <button type="button" className="help-secondary" onClick={() => { setEditing(null); setForm(EMPTY_FAQ); }}>{t("Anulo", "Cancel")}</button>}</div>
        </form>
        <section className="publishing-section publishing-history">
          <h3>{t("Pyetjet ekzistuese", "Existing entries")} {loading ? t("(duke ngarkuar…)", "(loading…)") : `(${rows.length})`}</h3>
          {rows.map((row) => (
            <article key={row.id} className="publishing-faq-entry">
              <div><strong>{row.question_sq}</strong><p>{row.question_en}</p><span className="help-meta">{row.category} · {row.active ? t("Aktive", "Active") : t("Joaktive", "Inactive")}</span>
                {row.needs_review && <span className="help-warning">{t("Draft i mëparshëm — i fshehur nga publiku", "Legacy draft — hidden publicly")}</span>}</div>
              <button type="button" className="help-secondary" onClick={() => edit(row)}>{t("Redakto", "Edit")}</button>
            </article>
          ))}
          {!loading && !loadError && rows.length === 0 && <p>{t("Nuk ka ende pyetje. Shto një nga formulari.", "No questions yet. Add one using the form.")}</p>}
        </section>
      </div>
      {loadError&&<button type="button" className="help-secondary" onClick={load}>{t("Provo të ngarkosh përsëri", "Retry loading")}</button>}
      {notice && <p role="status" className="help-info">{notice}</p>}
    </div>
  );
}

export function AdminSupport() {
  const {lang} = useLanguage();
  const t = (sq,en) => lang === "en" ? en : sq;
  const [tickets, setTickets] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState(false);
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);setLoadError(false);
    try { setTickets((await axios.get(ticketUrl, { headers: headers() })).data); }
    catch { setLoadError(true);setNotice(t("Kërkesat për mbështetje nuk u ngarkuan.", "Could not load support tickets.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const draftFor = (ticket) => drafts[ticket.id] || { status: ticket.status, response: ticket.response || "" };
  const change = (ticket, key, value) => setDrafts((old) => ({
    ...old, [ticket.id]: { ...(old[ticket.id] || { status: ticket.status, response: ticket.response || "" }), [key]: value },
  }));
  const save = async (ticket) => {
    setSavingId(ticket.id); setNotice("");
    try {
      const response = await axios.put(`${ticketUrl}/${ticket.id}`, draftFor(ticket), { headers: headers() });
      const delivery = response.data.email_delivered;
      setNotice(delivery === false ? t(`Kërkesa #${ticket.id} u ruajt, por email-i i përgjigjes dështoi.`, `Ticket #${ticket.id} saved, but the reply email failed.`) : t(`Kërkesa #${ticket.id} u ruajt${delivery === true ? " dhe përgjigjja u dërgua me email" : ""}.`, `Ticket #${ticket.id} saved${delivery === true ? " and reply emailed" : ""}.`));
      await load();
    } catch { setNotice(t(`Kërkesa #${ticket.id} nuk u përditësua.`, `Could not update ticket #${ticket.id}.`)); }
    finally { setSavingId(null); }
  };
  return (
    <div className="publishing-workspace">
      <PublishingHeader eyebrow={t("Komuniteti / Mbështetja", "Community / Support")} title={t("Kërkesat për mbështetje", "Support tickets")} description={t("Lexo kërkesën, përgatit përgjigjen dhe përditëso statusin. Përgjigjja e re ose e ndryshuar dërgohet me email; ndryshimi vetëm i statusit nuk dërgon email.", "Read the request, prepare a reply and update its status. A new or changed reply sends an email; a status-only change does not.")} to="/support" linkLabel={t("Hap faqen e mbështetjes", "Open support")} />
      {loading && <p className="help-info">{t("Duke ngarkuar kërkesat…", "Loading tickets…")}</p>}
      {!loading && !loadError && tickets.length === 0 && <p className="help-info">{t("Nuk ka ende kërkesa për mbështetje.", "No support tickets yet.")}</p>}
      <div className="admin-help-tickets">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="publishing-ticket">
            <div><div className="help-row"><h3>#{ticket.id} · {ticket.subject}</h3><span className="help-tag">{({open:t("Hapur","Open"),in_progress:t("Në proces","In progress"),resolved:t("Zgjidhur","Resolved")})[ticket.status] || ticket.status}</span></div>
            <p className="help-meta">{ticket.name} · {ticket.email} · {ticket.category}</p>
            <p className="help-ticket-message">{ticket.message}</p>
            </div><div className="help-form"><label>{t("Statusi", "Status")}<select value={draftFor(ticket).status} onChange={(e) => change(ticket, "status", e.target.value)}><option value="open">{t("Hapur", "Open")}</option><option value="in_progress">{t("Në proces", "In progress")}</option><option value="resolved">{t("Zgjidhur", "Resolved")}</option></select></label>
              <label>{t("Përgjigjja (opsionale — teksti i ri ose i ndryshuar dërgohet me email)", "Reply (optional — new/changed text is emailed)")}<textarea rows={3} maxLength={5000} value={draftFor(ticket).response} onChange={(e) => change(ticket, "response", e.target.value)} /></label>
              <button type="button" className="help-button" disabled={savingId !== null} onClick={() => save(ticket)}>{savingId === ticket.id ? t("Duke ruajtur…", "Saving…") : t("Ruaj kërkesën", "Save ticket")}</button>
            </div>
          </article>
        ))}
      </div>
      {loadError&&<button type="button" className="help-secondary" onClick={load}>{t("Provo të ngarkosh përsëri", "Retry loading")}</button>}
      {notice && <p role="status" className="help-info">{notice}</p>}
    </div>
  );
}
