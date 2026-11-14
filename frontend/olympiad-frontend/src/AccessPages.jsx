import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import SitePageIntro from "./components/SitePageIntro";
import "./phase1.css";
import "./ResourceWorkspace.css";
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const authHeaders = () => ({
  Authorization: "Bearer " + localStorage.getItem("token"),
});
function Header({ contentKey, title, description }) {
  return (
    <SitePageIntro
      contentKey={contentKey}
      kicker="Olimpiada.al"
      title={title}
      subtitle={description}
      actionTo="/courses"
      actionLabel="Shiko materialet"
    />
  );
}
export function Explore() {
  const [forums, setForums] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const { currentUser } = useAuth();
  const [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setStatus("loading");
    Promise.all([
      axios.get(API + "/public/forums"),
      axios.get(API + "/core/weekly"),
    ])
      .then(([f, w]) => {
        if (live) {
          setForums(f.data);
          setWeekly(w.data.challenge?.problem || null);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (live) setStatus("error");
      });
    return () => {
      live = false;
    };
  }, [retry]);
  const canForum = !!currentUser;
  return (
    <main className="p1-wrap">
      <Header
        contentKey="page_explore"
        title="Eksploro Olimpiada"
        description="Zbulo problemen e javës dhe forumet."
      />
      {status === "loading" && <p role="status">Loading…</p>}
      {status === "error" && (
        <p role="alert">
          Could not load this overview.{" "}
          <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </p>
      )}
      {status === "ready" && (
        <>
          <section className="p1-card p1-group">
            <div className="p1-row">
              <h2>
                <Link to="/weekly">Problema e Javës</Link>
              </h2>
              <span className="p1-pill">FALAS</span>
            </div>
            {weekly ? (
              <>
                <h3>{weekly.title}</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{weekly.description}</p>
                <span className="p1-muted">
                  {weekly.subject} · {weekly.level}
                </span>
              </>
            ) : (
              <p className="p1-muted">
                Problema e javës nuk është publikuar ende.
              </p>
            )}
          </section>
          <div className="p1-row">
            <h2 className="p1-section-title">Forume publike</h2>
            <Link className="p1-btn alt" to="/forums">
              Shiko forumet
            </Link>
          </div>
          <div className="p1-grid">
            {forums.length ? (
              forums.map((f) => (
                <ContentItem
                  key={f.id}
                  title={f.title}
                  subtitle={f.subject}
                  url={canForum ? "/forum/" + f.id : "/forums"}
                />
              ))
            ) : (
              <p className="p1-muted">Ende nuk ka forume publike.</p>
            )}
          </div>
        </>
      )}
    </main>
  );
}
export function Learning() {
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    axios
      .get(API + "/access/resources", { headers: authHeaders() })
      .then((r) => {
        if (live) setRows(r.data);
      })
      .catch(() => {
        if (live) setError("Materialet nuk u ngarkuan.");
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [retry]);
  return (
    <main className="resource-workspace">
      <Header contentKey="page_materials" title="Materiale, Teste & Google Meet" description="Materiale mësimore për përdoruesit e regjistruar." />
      <div className="resource-workspace-layout"><aside className="resource-navigation"><h2>Mësimi</h2><Link to="/courses">Materiale & teste →</Link><Link to="/tutoring">Mentorim individual →</Link><Link to="/weekly">Sfida e javës →</Link><p>{rows.length} materiale të publikuara</p></aside><section className="resource-library" aria-label="Materialet">
        {loading&&<p role="status">Loading…</p>}
        {error&&<p role="alert">{error} <button onClick={()=>setRetry(x=>x+1)}>Retry</button></p>}
        {rows.map((r,index)=><details className="resource-document" key={r.id} open={rows.length===1?true:undefined}><summary><span className="resource-number">{String(index+1).padStart(2,'0')}</span><span><small>{r.kind.toUpperCase()} · {r.subject}</small><strong>{r.title}</strong>{r.scheduled_at&&<time dateTime={r.scheduled_at}>{new Date(r.scheduled_at).toLocaleString('sq-AL')}</time>}</span><span className="resource-expand" aria-hidden="true">+</span></summary><div className="resource-document-body">{r.kind==='meet'&&/^https:\/\/meet\.google\.com\//.test(r.body.trim())?<a href={r.body.trim()} target="_blank" rel="noopener noreferrer" className="resource-primary">Bashkohu në Google Meet ↗</a>:<p>{r.body}</p>}</div></details>)}
        {rows.length===0&&!error&&!loading&&<div className="resource-empty"><h2>Ende nuk ka materiale të publikuara.</h2><p>Shiko materialet dhe testet në seksionin e mësimit.</p><Link to="/courses">Materiale & teste →</Link></div>}
      </section></div>
    </main>
  );
}

export function Tutoring() {
  const [subject, setSubject] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [teacher, setTeacher] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState("");
  const [loadError, setLoadError] = useState(false),
    [retry, setRetry] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setLoadError(false);
    axios
      .get(API + "/access/teachers", { params: subject ? { subject } : {} })
      .then((r) => {
        if (live) setTeachers(r.data);
      })
      .catch(() => {
        if (live) setLoadError(true);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [subject, retry]);
  const subjects = [...new Set(teachers.map((t) => t.subject))];
  const submit = async (e) => {
    e.preventDefault();
    setResult("");
    try {
      const r = await axios.post(
        API + "/access/tutoring/requests",
        { subject, teacher_id: Number(teacher), message },
        { headers: authHeaders() },
      );
      setResult(
        "Kërkesa #" + r.data.id + " iu dërgua administratorit për miratim.",
      );
    } catch (e) {
      setResult("Kërkesa nuk mund të dërgohet.");
    }
  };
  return (
    <main className="resource-workspace">
      <Header contentKey="page_tutoring" title="Seanca 1-to-1" description="Zgjidh lëndën dhe profesorin, më pas kërko konfirmimin e administratorit."/>
      {loading&&<p role="status">Loading tutors…</p>}
      {loadError&&<p role="alert">Tutors could not load. <button onClick={()=>setRetry(x=>x+1)}>Retry</button></p>}
      <form className="tutoring-workspace" onSubmit={submit}>
        <section className="tutoring-directory"><span className="resource-kicker">01 / ZGJIDH PROFESORIN</span><label>Lënda<input placeholder="P.sh. Mathematics" value={subject} onChange={e=>{setSubject(e.target.value);setTeacher("");}} list="p1-subjects" required/></label><datalist id="p1-subjects">{subjects.map(s=><option key={s} value={s}/>)}</datalist>
          <div className="tutoring-teachers">{teachers.filter(t=>!subject||t.subject===subject).map((t,index)=><button type="button" key={`${t.teacher_id}-${t.subject}`} aria-pressed={String(teacher)===String(t.teacher_id)&&subject===t.subject} onClick={()=>{setSubject(t.subject);setTeacher(String(t.teacher_id));}}><span className="resource-number">{String(index+1).padStart(2,'0')}</span><span><strong>{t.teacher}</strong><small>{t.subject}</small></span><span aria-hidden="true">→</span></button>)}</div>
          {!loading&&!loadError&&teachers.length===0&&<p className="resource-empty">Nuk u gjetën profesorë për këtë lëndë.</p>}
        </section>
        <aside className="tutoring-request"><span className="resource-kicker">02 / KËRKESA JOTE</span><h2>Kërko një seancë</h2><label>Profesori<select value={teacher} onChange={e=>setTeacher(e.target.value)} required><option value="">Zgjidh profesorin</option>{teachers.filter(t=>t.subject===subject).map(t=><option value={t.teacher_id} key={t.teacher_id}>{t.teacher}</option>)}</select></label><label>Mesazh (opsional)<textarea rows={6} value={message} onChange={e=>setMessage(e.target.value)}/></label><p>Administratori shqyrton kërkesën dhe konfirmon seancën.</p><button className="resource-primary" disabled={!teacher} type="submit">Dërgo kërkesë te administratori</button>{result&&<p role="status">{result}</p>}</aside>
      </form>
    </main>
  );
}

function ContentItem({ title, subtitle, url }) {
  return (
    <article className="p1-card p1-item">
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <Link className="p1-btn" to={url}>
        Hap
      </Link>
    </article>
  );
}
