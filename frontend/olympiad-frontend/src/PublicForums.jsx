import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import Layout from "./components/Layout";
import SitePageIntro from "./components/SitePageIntro";
import { loginIntent } from "./navigation";
import { useLanguage } from "./context/LanguageContext";
export default function PublicForums() {
  const { lang } = useLanguage();
  const [rows, setRows] = useState([]),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("loading"),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus("loading");
    axios
      .get(
        (process.env.REACT_APP_API_URL || "http://127.0.0.1:8000") +
          "/public/forums",
      )
      .then((r) => {
        if (active) {
          setRows(r.data);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [retry]);
  return (
    <Layout>
      <SitePageIntro
        contentKey="page_forums"
        title="Forums"
        subtitle="Find a community and join the discussion."
      />
      <p>
        {lang === "sq"
          ? "Shiko forumet publike. Hyr për t’u bashkuar, për të kërkuar anëtarësi ose për të krijuar një forum. Forumet private kërkojnë anëtarësi."
          : "Browse public forums. Log in to join, request membership or create a forum. Private discussions require membership."}
      </p>
      <label>
        {lang === "sq" ? "Kërko forume" : "Search forums"}
        <input
          className="p1-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {status === "loading" && <p role="status">Loading…</p>}
      {status === "error" && (
        <div className="ol-status" role="alert">
          Could not load forums.
          <button onClick={() => setRetry((x) => x + 1)}>Retry</button>
        </div>
      )}
      <div className="p1-grid">
        {rows
          .filter((f) =>
            (f.title + " " + f.subject)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((f) => (
            <article key={f.id} className="p1-card">
              <h2>{f.title}</h2>
              <p>
                {f.subject} · {f.level}
              </p>
              <Link to="/login" state={loginIntent("/forums")}>
                {lang === "sq" ? "Hyr për t’u bashkuar" : "Log in to join"}
              </Link>
            </article>
          ))}
      </div>
      {status === "ready" && !rows.length && (
        <p>
          No public forums yet. Sign in to see your memberships or create a
          community.
        </p>
      )}
      <p>
        <Link className="p1-btn" to="/login" state={loginIntent("/forums")}>
          {lang === "sq" ? "Hyr në komunitet" : "Join the community"}
        </Link>
      </p>
    </Layout>
  );
}
