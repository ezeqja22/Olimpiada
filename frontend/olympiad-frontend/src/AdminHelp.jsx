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
    catch { setLoadError(true);setNotice("Could not load FAQ entries."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setNotice("");
    try {
      const url = editing ? `${faqUrl}/${editing}` : faqUrl;
      await axios({ method: editing ? "put" : "post", url, data: form, headers: headers() });
      setEditing(null); setForm(EMPTY_FAQ); setNotice("FAQ saved. It is public when active and reviewed.");
      await load();
    } catch { setNotice("Could not save the FAQ. Check the required fields and try again."); }
    finally { setSaving(false); }
  };
  const edit = (row) => {
    setEditing(row.id);
    setForm(Object.fromEntries(Object.keys(EMPTY_FAQ).map((key) => [key, row[key]])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <div className="publishing-workspace">
      <PublishingHeader eyebrow="Website / Help" title="FAQ management" description="Edit both languages, choose the display order and review visibility before publishing." to="/faq" linkLabel="Read the FAQ" />
      <div className="publishing-columns">
        <form onSubmit={save} className="publishing-section publishing-form">
          <h3>{editing ? `Edit FAQ #${editing}` : "Add a question"}</h3>
          <label>Category<input required minLength={2} maxLength={60} value={form.category} onChange={(e) => change("category", e.target.value)} /></label>
          <label>Question (Albanian)<input required minLength={5} maxLength={300} value={form.question_sq} onChange={(e) => change("question_sq", e.target.value)} /></label>
          <label>Answer (Albanian)<textarea required minLength={5} maxLength={12000} rows={4} value={form.answer_sq} onChange={(e) => change("answer_sq", e.target.value)} /></label>
          <label>Question (English)<input required minLength={5} maxLength={300} value={form.question_en} onChange={(e) => change("question_en", e.target.value)} /></label>
          <label>Answer (English)<textarea required minLength={5} maxLength={12000} rows={4} value={form.answer_en} onChange={(e) => change("answer_en", e.target.value)} /></label>
          <label>Order<input required type="number" min="0" max="10000" value={form.position} onChange={(e) => change("position", Number(e.target.value))} /></label>
          <label className="help-checkbox"><input type="checkbox" checked={form.active} onChange={(e) => change("active", e.target.checked)} /> Active / visible publicly after review</label>
          <div className="help-row"><button className="help-button" disabled={saving}>{saving ? "Saving…" : "Save FAQ"}</button>{editing && <button type="button" className="help-secondary" onClick={() => { setEditing(null); setForm(EMPTY_FAQ); }}>Cancel</button>}</div>
        </form>
        <section className="publishing-section publishing-history">
          <h3>Existing entries {loading ? "(loading…)" : `(${rows.length})`}</h3>
          {rows.map((row) => (
            <article key={row.id} className="publishing-faq-entry">
              <div><strong>{row.question_sq}</strong><p>{row.question_en}</p><span className="help-meta">{row.category} · {row.active ? "Active" : "Inactive"}</span>
                {row.needs_review && <span className="help-warning">Legacy draft — hidden publicly</span>}</div>
              <button type="button" className="help-secondary" onClick={() => edit(row)}>Edit</button>
            </article>
          ))}
          {!loading && !loadError && rows.length === 0 && <p>No questions yet. Add one using the form.</p>}
        </section>
      </div>
      {loadError&&<button type="button" className="help-secondary" onClick={load}>Retry loading</button>}
      {notice && <p role="status" className="help-info">{notice}</p>}
    </div>
  );
}

export function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError,setLoadError]=useState(false);
  const [savingId, setSavingId] = useState(null);
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);setLoadError(false);
    try { setTickets((await axios.get(ticketUrl, { headers: headers() })).data); }
    catch { setLoadError(true);setNotice("Could not load support tickets."); }
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
      <PublishingHeader eyebrow="Community / Support" title="Support tickets" description="Read the request, prepare a reply and update its status. A new or changed reply sends an email; a status-only change does not." to="/support" linkLabel="Open support" />
      {loading && <p className="help-info">Loading tickets…</p>}
      {!loading && !loadError && tickets.length === 0 && <p className="help-info">No support tickets yet.</p>}
      <div className="admin-help-tickets">
        {tickets.map((ticket) => (
          <article key={ticket.id} className="publishing-ticket">
            <div><div className="help-row"><h3>#{ticket.id} · {ticket.subject}</h3><span className="help-tag">{ticket.status}</span></div>
            <p className="help-meta">{ticket.name} · {ticket.email} · {ticket.category}</p>
            <p className="help-ticket-message">{ticket.message}</p>
            </div><div className="help-form"><label>Status<select value={draftFor(ticket).status} onChange={(e) => change(ticket, "status", e.target.value)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option></select></label>
              <label>Reply (optional — new/changed text is emailed)<textarea rows={3} maxLength={5000} value={draftFor(ticket).response} onChange={(e) => change(ticket, "response", e.target.value)} /></label>
              <button type="button" className="help-button" disabled={savingId !== null} onClick={() => save(ticket)}>{savingId === ticket.id ? "Saving…" : "Save ticket"}</button>
            </div>
          </article>
        ))}
      </div>
      {loadError&&<button type="button" className="help-secondary" onClick={load}>Retry loading</button>}
      {notice && <p role="status" className="help-info">{notice}</p>}
    </div>
  );
}
