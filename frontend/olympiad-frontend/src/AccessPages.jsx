import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./context/AuthContext";
import SitePageIntro from "./components/SitePageIntro";
import "./phase1.css";
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
    <main className="p1-wrap">
      <Header
        contentKey="page_materials"
        title="Materiale, Teste & Google Meet"
        description="Materiale mësimore për përdoruesit e regjistruar."
      />
      {loading && <p role="status">Loading…</p>}
      {error && (
        <p className="p1-alert" role="alert">
          {error} <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </p>
      )}
      <div className="p1-rows">
        {rows.map((r) => (
          <article className="p1-card" key={r.id}>
            <span className="p1-pill">{r.kind.toUpperCase()}</span>
            <h2>{r.title}</h2>
            <div className="p1-muted">
              {r.subject}{" "}
              {r.scheduled_at
                ? " · " + new Date(r.scheduled_at).toLocaleString("sq-AL")
                : ""}
            </div>
            {r.kind === "meet" &&
            /^https:\/\/meet\.google\.com\//.test(r.body.trim()) ? (
              <p>
                <a
                  href={r.body.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p1-btn"
                >
                  Bashkohu në Google Meet
                </a>
              </p>
            ) : (
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {r.body}
              </p>
            )}
          </article>
        ))}
      </div>
      {rows.length === 0 && !error && !loading && (
        <p className="p1-muted">Ende nuk ka materiale të publikuara.</p>
      )}
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
    setTeacher("");
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
    <main className="p1-wrap p1-narrow">
      <Header
        contentKey="page_tutoring"
        title="Seanca 1-to-1"
        description="Zgjidh lëndën dhe profesorin, më pas kërko konfirmimin e administratorit."
      />
      {loading && <p role="status">Loading tutors…</p>}
      {loadError && (
        <p role="alert">
          Tutors could not load.{" "}
          <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </p>
      )}
      <form className="p1-card p1-form" onSubmit={submit}>
        <label>
          Lënda
          <input
            className="p1-input"
            placeholder="P.sh. Mathematics"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            list="p1-subjects"
            required
          />
          <datalist id="p1-subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label>
          Profesori
          <select
            className="p1-select"
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            required
          >
            <option value="">Zgjidh profesorin</option>
            {teachers
              .filter((t) => t.subject === subject)
              .map((t) => (
                <option value={t.teacher_id} key={t.teacher_id}>
                  {t.teacher}
                </option>
              ))}
          </select>
        </label>
        <label>
          Mesazh (opsional)
          <textarea
            className="p1-input"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <button className="p1-btn" disabled={!teacher} type="submit">
          Dërgo kërkesë te administratori
        </button>
        {result && <p role="status">{result}</p>}
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
