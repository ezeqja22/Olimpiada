import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./phase1.css";
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const headers = () => ({
  Authorization: "Bearer " + localStorage.getItem("token"),
});
export default function FamilyPage() {
  const [parent, setParent] = useState([]),
    [student, setStudent] = useState([]),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false);
  const load = () => {
    setLoading(true);
    setLoadError(false);
    Promise.all([
      axios.get(API + "/experience/parent/links", { headers: headers() }),
      axios.get(API + "/experience/student/parent-links", {
        headers: headers(),
      }),
    ])
      .then(([p, s]) => {
        setParent(p.data);
        setStudent(s.data);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);
  const action = async (path) => {
    try {
      await axios.post(API + path, {}, { headers: headers() });
      setNotice("Miratimi u regjistrua.");
      load();
    } catch (e) {
      setNotice(e.response?.data?.detail || "Nuk u regjistrua.");
    }
  };
  return (
    <main className="p1-wrap">
      <h1>Prindërit & Raportet</h1>
      <p className="p1-muted">
        Raporte për progresin e një nxënësi dërgohen vetëm kur lidhja është
        miratuar nga të dyja llogaritë.
      </p>
      {loading && <p role="status">Loading family links…</p>}
      {loadError && (
        <p role="alert">
          Could not load your family links.{" "}
          <button onClick={load}>Retry</button>
        </p>
      )}
      {!loading &&
        !loadError &&
        parent.length === 0 &&
        student.length === 0 && <p>No family links or invitations yet.</p>}
      <div className="p1-grid two">
        <div className="p1-card">
          <h2>Ftesa si prind</h2>
          {parent.map((p) => (
            <div className="p3-assignment-row" key={p.id}>
              <span>
                Nxënësi #{p.student_id} · {p.status}
              </span>
              {p.status === "pending" && (
                <button
                  className="p1-btn"
                  onClick={() =>
                    action("/experience/parent/links/" + p.id + "/accept")
                  }
                >
                  Prano lidhjen
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="p1-card">
          <h2>Ftesa si nxënës</h2>
          {student.map((p) => (
            <div className="p3-assignment-row" key={p.id}>
              <span>
                Prindi #{p.parent_id} · {p.status}
              </span>
              {p.status === "parent_accepted" && (
                <div className="p1-row">
                  <button
                    className="p1-btn"
                    onClick={() =>
                      action(
                        "/experience/student/parent-links/" +
                          p.id +
                          "/approve?approve=true",
                      )
                    }
                  >
                    Lejo
                  </button>
                  <button
                    className="p1-btn alt"
                    onClick={() =>
                      action(
                        "/experience/student/parent-links/" +
                          p.id +
                          "/approve?approve=false",
                      )
                    }
                  >
                    Refuzo
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <p className="p1-muted">
        Për krijimin e lidhjes kontakto administratorin.{" "}
        <Link to="/support">Support</Link>
      </p>
      {notice && <p className="p1-note">{notice}</p>}
    </main>
  );
}
