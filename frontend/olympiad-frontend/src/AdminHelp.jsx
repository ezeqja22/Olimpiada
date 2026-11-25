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
  const {lang}=useLanguage();
  const tr=(en,sq)=>lang==='sq'?sq:en;

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
    catch { setLoadError(true);setNotice(tr("Could not load FAQ entries.","Pyetjet e shpeshta nuk u ngarkuan.")); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setNotice("");
    try {
      const url = editing ? `${faqUrl}/${editing}` : faqUrl;
      await axios({ method: editing ? "put" : "post", url, data: form, headers: headers() });
      setEditing(null); setForm(EMPTY_FAQ); setNotice(tr("FAQ saved. It is public when active and reviewed.","Pyetja u ruajt. Shfaqet publikisht kur është aktive dhe e shqyrtuar."));
      await load();
    } catch { setNotice(tr("Could not save the FAQ. Check the required fields and try again.","Pyetja nuk u ruajt. Kontrollo fushat e detyrueshme dhe provo përsëri.")); }
    finally { setSaving(false); }
  };
  const edit = (row) => {
    setEditing(row.id);
    setForm(Object.fromEntries(Object.keys(EMPTY_FAQ).map((key) => [key, row[key]])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="publishing-workspace">
      <PublishingHeader eyebrow={tr("Website / Help","Faqja / Ndihma")} title={tr("FAQ management","Administrimi i pyetjeve të shpeshta")} description={tr("Edit both languages, choose the display order and review visibility before publishing.","Redakto të dyja gjuhët, zgjidh renditjen dhe kontrollo dukshmërinë para publikimit.")} to="/faq" linkLabel={tr("Read the FAQ","Lexo pyetjet e shpeshta")} />
      <div className="publishing-columns">
        <form onSubmit={save} className="publishing-section publishing-form">
          <h3>{editing ? `Edit FAQ #${editing}` : tr("Add a question","Shto një pyetje")}</h3>
          <label>{tr("Category","Kategoria")}<input required minLength={2} maxLength={60} value={form.category} onChange={(e) => change("category", e.target.value)} /></label>
          <label>{tr("Question (Albanian)","Pyetja (shqip)")}<input required minLength={5} maxLength={300} value={form.question_sq} onChange={(e) => change("question_sq", e.target.value)} /></label>
          <label>{tr("Answer (Albanian)","Përgjigjja (shqip)")}<textarea required minLength={5} maxLength={12000} rows={4} value={form.answer_sq} onChange={(e) => change("answer_sq", e.target.value)} /></label>
          <label>{tr("Question (English)","Pyetja (anglisht)")}<input required minLength={5} maxLength={300} value={form.question_en} onChange={(e) => change("question_en", e.target.value)} /></label>
          <label>{tr("Answer (English)","Përgjigjja (anglisht)")}<textarea required minLength={5} maxLength={12000} rows={4} value={form.answer_en} onChange={(e) => change("answer_en", e.target.value)} /></label>
          <label>{tr("Order","Renditja")}<input required type="number" min="0" max="10000" value={form.position} onChange={(e) => change("position", Number(e.target.value))} /></label>
          <label className="help-checkbox"><input type="checkbox" checked={form.active} onChange={(e) => change("active", e.target.checked)} /> {tr("Active / visible publicly after review","Aktive / e dukshme publikisht pas shqyrtimit")}</label>
          <div className="help-row"><button className="help-button" disabled={saving}>{saving ? tr("Saving…","Duke ruajtur…") : tr("Save FAQ","Ruaj pyetjen")}</button>{editing && <button type="button" className="help-secondary" onClick={() => { setEditing(null); setForm(EMPTY_FAQ); }}>{tr("Cancel","Anulo")}</button>}</div>
        </form>
        <section className="publishing-section publishing-history">
          <h3>{tr("Existing entries","Pyetjet ekzistuese")} {loading ? tr("(loading…)","(duke ngarkuar…)") : `(${rows.length})`}</h3>
          {rows.map((row) => (
            <article key={row.id} className="publishing-faq-entry">
              <div><strong>{row.question_sq}</strong><p>{row.question_en}</p><span className="help-meta">{row.category} · {row.active ? tr("Active","Aktive") : tr("Inactive","Joaktive")}</span>
                {row.needs_review && <span className="help-warning">{tr("Legacy draft — hidden publicly","Draft i mëparshëm — i fshehur nga publiku")}</span>}</div>
              <button type="button" className="help-secondary" onClick={() => edit(row)}>{tr("Edit","Redakto")}</button>
            </article>
          ))}
          {!loading && !loadError && rows.length === 0 && <p>{tr("No questions yet. Add one using the form.","Nuk ka ende pyetje. Shto një përmes formularit.")}</p>}
        </section>
      </div>
      {loadError&&<button type="button" className="help-secondary" onClick={load}>{tr("Retry loading","Provo ngarkimin përsëri")}</button>}
      {notice && <p role="status" className="help-info">{notice}</p>}
    </div>
  );
}

export function AdminSupport() {
  const {lang}=useLanguage();
  const tr=(en,sq)=>lang==='sq'?sq:en;

  const [tickets, setTickets] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState(false);
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);setLoadError(false);
    try { setTickets((await axios.get(ticketUrl, { headers: headers() })).data); }
    catch { setLoadError(true);setNotice(tr("Could not load support tickets.","Kërkesat për mbështetje nuk u ngarkuan.")); }
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
      setNotice(delivery === false ? `Ticket #${ticket.id} saved, but the reply email failed.` : `Ticket #${ticket.id} saved${delivery === true ? " and reply emailed" : ""}.`);
      await load();
    } catch { setNotice(`Could not update ticket #${ticket.id}.`); }
    finally { setSavingId(null); }
  };
  return (
    <div className="publishing-workspace">
      <PublishingHeader eyebrow={tr("Community / Support","Komuniteti / Mbështetja")} title={tr("Support tickets","Kërkesat për mbështetje")} description={tr("Read the request, prepare a reply and update its status. A new or changed reply sends an email; a status-only change does not.","Lexo kërkesën, përgatit përgjigjen dhe përditëso statusin. Një përgjigje e re ose e ndryshuar dërgon email; vetëm ndryshimi i statusit nuk dërgon.")} to="/support" linkLabel={tr("Open support","Hap mbështetjen")} />
      {loading && <p className="help-info">{tr("Loading tickets…","Duke ngarkuar kërkesat…")}</p>}
      {!loading && !loadError && tickets.length === 0 && <p className="help-info">{tr("No support tickets yet.","Nuk ka ende kërkesa për mbështetje.")}</p>}
      <div className="admin-help-tickets">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="publishing-ticket">
            <div><div className="help-row"><h3>#{ticket.id} · {ticket.subject}</h3><span className="help-tag">{ticket.status}</span></div>
            <p className="help-meta">{ticket.name} · {ticket.email} · {ticket.category}</p>
            <p className="help-ticket-message">{ticket.message}</p>
            </div><div className="help-form"><label>{tr("Status","Statusi")}<select value={draftFor(ticket).status} onChange={(e) => change(ticket, "status", e.target.value)}><option value="open">{tr("Open","E hapur")}</option><option value="in_progress">{tr("In progress","Në proces")}</option><option value="resolved">{tr("Resolved","E zgjidhur")}</option></select></label>
              <label>{tr("Reply (optional — new/changed text is emailed)","Përgjigjja (opsionale — teksti i ri ose i ndryshuar dërgohet me email)")}<textarea rows={3} maxLength={5000} value={draftFor(ticket).response} onChange={(e) => change(ticket, "response", e.target.value)} /></label>
              <button type="button" className="help-button" disabled={savingId !== null} onClick={() => save(ticket)}>{savingId === ticket.id ? tr("Saving…","Duke ruajtur…") : tr("Save ticket","Ruaj kërkesën")}</button>
            </div>
          </article>
        ))}
      </div>
      {loadError&&<button type="button" className="help-secondary" onClick={load}>{tr("Retry loading","Provo ngarkimin përsëri")}</button>}
      {notice && <p role="status" className="help-info">{notice}</p>}
    </div>
  );
}
