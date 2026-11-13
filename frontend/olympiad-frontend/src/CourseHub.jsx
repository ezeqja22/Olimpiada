import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import MathRenderer from "./MathRenderer";
import VisualMathEditor from "./components/VisualMathEditor";
import "./phase1.css";
import SitePageIntro from "./components/SitePageIntro";
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000",
  hdr = () => ({ Authorization: "Bearer " + localStorage.getItem("token") });
const toUTC = (local) => new Date(local).toISOString().slice(0, 19);
const utcMillis = (s) =>
  Date.parse(/[zZ]|[+-]\d{2}:\d{2}$/.test(s) ? s : s + "Z");
const readUTC = (s) =>
  new Date(utcMillis(s)).toLocaleString("sq-AL", { timeZone: "Europe/Tirane" });
export default function CourseHub() {
  const [items, setItems] = useState([]),
    [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0),
    [query, setQuery] = useState(""),
    [subject, setSubject] = useState("");
  const [notice, setNotice] = useState(""),
    [active, setActive] = useState(null),
    [attempt, setAttempt] = useState(null),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now()),
    [clockOffset, setClockOffset] = useState(0);
  useEffect(() => {
    let live = true;
    setStatus("loading");
    axios
      .get(API + "/core/courses/items", { headers: hdr() })
      .then((r) => {
        if (live) {
          setItems(r.data);
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
  useEffect(() => {
    if (!active || !attempt || attempt.submitted || active.my_attempt?.submitted_at) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, attempt]);
  useEffect(() => {
    const before = (e) => {
      if (answer) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [answer]);
  const leave = () =>
    !answer || window.confirm("Leave this answer without submitting?");
  const open = (item) => {
    if (!leave()) return;
    setActive(item);
    setAttempt(null);
    setAnswer("");
    setNotice("");
  };
  const start = async () => {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const r = await axios.post(
        API + "/core/courses/items/" + active.id + "/start",
        {},
        { headers: hdr() },
      );
      setClockOffset(utcMillis(r.data.server_now) - Date.now());
      setNow(Date.now());
      setAttempt(r.data);
      setActive({ ...active, body: r.data.body });
    } catch (e) {
      setNotice(
        e.response?.data?.detail || "Could not start the test. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await axios.post(
        API + "/core/courses/items/" + active.id + "/submit",
        { answers: answer },
        { headers: hdr() },
      );
      setAnswer("");
      setActive(null);
      setNotice(
        "Answer submitted. Your result and feedback will appear with this item after review.",
      );
      setRetry((x) => x + 1);
    } catch (e) {
      setNotice(
        e.response?.data?.detail ||
          "Could not submit. Your answer is still here; please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const seconds = attempt
    ? Math.max(
        0,
        Math.floor((utcMillis(attempt.deadline) - (now + clockOffset)) / 1000),
      )
    : null;
  const submitted = active?.my_attempt?.submitted_at || attempt?.submitted;
  const visible = items.filter(
    (i) =>
      (!subject || i.subject === subject) &&
      (i.title + " " + i.subject).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <main id="main-content" className="p1-wrap">
      <SitePageIntro
        contentKey="page_courses"
        title="Materials, homework and tests"
        subtitle="Choose a subject, read materials and review your progress."
      />
      <p>
        <Link to="/learning-resources">
          More learning resources and meeting links
        </Link>{" "}
        · <Link to="/tutoring">Request tutoring</Link>
      </p>
      <div className="p1-row">
        <label>
          Search materials
          <input
            className="p1-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          Subject
          <select
            className="p1-select"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">All subjects</option>
            {[...new Set(items.map((i) => i.subject))].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {notice && (
        <p className="ol-status" role="status">
          {notice}
        </p>
      )}
      {status === "loading" && <p role="status">Loading materials…</p>}
      {status === "error" && (
        <div role="alert" className="ol-status">
          Materials could not load.{" "}
          <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </div>
      )}
      {active && (
        <section className="p1-card p1-group">
          <div className="p1-row">
            <h2>{active.title}</h2>
            <button
              className="p1-btn alt"
              onClick={() => {
                if (leave()) {
                  setActive(null);
                  setAnswer("");
                }
              }}
            >
              Back to materials
            </button>
          </div>
          <p>{active.instructions}</p>
          {active.due_at && <p>Due: {readUTC(active.due_at)}</p>}
          {active.kind === "test" && !attempt && !submitted ? (
            <>
              <p>
                Duration: {active.duration_minutes} minutes. Starting begins a
                server-controlled timer. Leaving this page does not pause it.
              </p>
              <button className="p1-btn" disabled={busy} onClick={start}>
                {busy
                  ? "Starting…"
                  : active.my_attempt
                    ? "Resume test"
                    : "Start timed test"}
              </button>
            </>
          ) : (
            <div className="course-reading-body" style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}><MathRenderer text={active.body} /></div>
          )}
          {attempt && !submitted && (
            <p role="timer">
              Time remaining: {Math.floor(seconds / 60)}:
              {String(seconds % 60).padStart(2, "0")}
            </p>
          )}
          {submitted ? (
            <div className="ol-status">
              <strong>Submitted</strong>
              {active.my_attempt?.graded_at ? (
                <p>
                  Score: {active.my_attempt.score}/100 ·{" "}
                  {active.my_attempt.feedback}
                </p>
              ) : (
                <p>Awaiting review.</p>
              )}
            </div>
          ) : (
            active.kind !== "material" &&
            (active.kind !== "test" || attempt) && (
              <form className="p1-form" onSubmit={submit}>
                <label>
                  Your answer
                  <textarea
                    className="p1-input"
                    rows={8}
                    required
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                </label>
                <button
                  className="p1-btn"
                  disabled={busy || (active.kind === "test" && seconds <= 0)}
                >
                  {busy
                    ? "Submitting…"
                    : seconds === 0
                      ? "Time expired"
                      : "Submit answer"}
                </button>
              </form>
            )
          )}
        </section>
      )}
      <div className="p1-grid">
        {visible.map((item) => (
          <article className="p1-card" key={item.id}>
            <span className="p1-pill">{item.kind}</span>
            <h2>{item.title}</h2>
            <p>
              {item.subject} ·{" "}
              {item.duration_minutes ? item.duration_minutes + " min · " : ""}
              {item.due_at ? "Due " + readUTC(item.due_at) : "No deadline"}
            </p>
            <p>
              {item.my_attempt?.graded_at
                ? "Reviewed · " + item.my_attempt.score + "/100"
                : item.my_attempt?.submitted_at
                  ? "Submitted · awaiting review"
                  : item.my_attempt
                    ? "In progress"
                    : ""}
            </p>
            <button className="p1-btn" onClick={() => open(item)}>
              View {item.kind}
            </button>
          </article>
        ))}
      </div>
      {status === "ready" && !visible.length && (
        <p>No materials match this selection.</p>
      )}
    </main>
  );
}
export function AdminCourses() {
  const [classes, setClasses] = useState([]),
    [published, setPublished] = useState([]),
    [loadError, setLoadError] = useState(false),
    [busy, setBusy] = useState(false);
  const [item, setItem] = useState({
      forum_id: null,
      kind: "material",
      title: "",
      subject: "Mathematics",
      instructions: "",
      body: "",
      published_at: "",
      due_at: "",
      duration_minutes: 60,
    }),
    [notice, setNotice] = useState("");
  const reload = () => {
    setLoadError(false);
    Promise.all([
      axios.get(API + "/experience/teacher/classes", { headers: hdr() }),
      axios.get(API + "/core/courses/admin/items", { headers: hdr() }),
    ])
      .then(([c, i]) => {
        setClasses(c.data);
        setPublished(i.data);
      })
      .catch(() => setLoadError(true));
  };
  useEffect(() => {
    reload();
  }, []);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = {
        ...item,
        published_at: toUTC(item.published_at),
        due_at: item.due_at ? toUTC(item.due_at) : null,
        duration_minutes:
          item.kind === "test" ? Number(item.duration_minutes) : null,
      };
      await axios.post(API + "/core/courses/admin/items", payload, {
        headers: hdr(),
      });
      setNotice("Materiali/detyra/testi u programua me sukses.");
      reload();
    } catch (e) {
      setNotice(e.response?.data?.detail || "Nuk u ruajt përmbajtja.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="p1-wrap" style={{ maxWidth: "none" }}>
      <h1>Materiale dhe Teste · Administrimi</h1>
      <p className="p1-muted">
        Data e publikimit dhe afati futen në orën lokale të pajisjes; në server
        ruhen në UTC.
      </p>
      <form className="p1-card p1-form" onSubmit={submit}>
        {classes.length > 0 && (
          <label>
            Klasa/forumi (i detyrueshëm për mësuesit)
            <select
              className="p1-select"
              required
              value={item.forum_id || ""}
              onChange={(e) =>
                setItem({ ...item, forum_id: Number(e.target.value) || null })
              }
            >
              <option value="">Zgjidh klasën</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Format
          <select
            className="p1-select"
            value={item.kind}
            onChange={(e) => setItem({ ...item, kind: e.target.value })}
          >
            <option value="material">Material</option>
            <option value="homework">Detyrë</option>
            <option value="test">Test me kohëmatës</option>
          </select>
        </label>
        <label>
          Titulli
          <input
            className="p1-input"
            required
            value={item.title}
            onChange={(e) => setItem({ ...item, title: e.target.value })}
          />
        </label>
        <label>
          Lënda
          <input
            className="p1-input"
            required
            value={item.subject}
            onChange={(e) => setItem({ ...item, subject: e.target.value })}
          />
        </label>
        <label>
          Udhëzimet
          <textarea
            className="p1-input"
            value={item.instructions}
            onChange={(e) => setItem({ ...item, instructions: e.target.value })}
          />
        </label>
        <label>
          Përmbajtja (formulat shtohen vizualisht)
          <VisualMathEditor
            value={item.body}
            onChange={(body) => setItem({ ...item, body })}
            minHeight={200}
          />
        </label>
        <label>
          Publikimi
          <input
            type="datetime-local"
            className="p1-input"
            required
            value={item.published_at}
            onChange={(e) => setItem({ ...item, published_at: e.target.value })}
          />
        </label>
        {item.kind !== "material" && (
          <label>
            Afati (opsional)
            <input
              type="datetime-local"
              className="p1-input"
              value={item.due_at}
              onChange={(e) => setItem({ ...item, due_at: e.target.value })}
            />
          </label>
        )}
        {item.kind === "test" && (
          <label>
            Kohëzgjatja (minuta)
            <input
              className="p1-input"
              required
              type="number"
              min="1"
              max="360"
              value={item.duration_minutes}
              onChange={(e) =>
                setItem({ ...item, duration_minutes: Number(e.target.value) })
              }
            />
          </label>
        )}
        <button type="submit" disabled={busy} className="p1-btn">
          {busy ? "Saving…" : "Programo publikimin"}
        </button>
      </form>
      {loadError && (
        <p role="alert">
          Publishing history or classes could not load.{" "}
          <button onClick={reload}>Retry</button>
        </p>
      )}
      <section className="p1-card">
        <h2>Your publishing history</h2>
        <p>
          Scheduled items become visible after publication to learners with
          access to the selected forum. <Link to="/courses">Open learning</Link>
        </p>
        {published.map((i) => (
          <p key={i.id}>
            <strong>{i.title}</strong> · {i.kind} · {readUTC(i.published_at)}
          </p>
        ))}
      </section>
      {notice && (
        <p className="p1-note" role="status">
          {notice}
        </p>
      )}
    </main>
  );
}
