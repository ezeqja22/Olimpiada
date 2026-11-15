import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./AccountWorkspace.css";
import {useLanguage} from "./context/LanguageContext";
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const headers = () => ({
  Authorization: "Bearer " + localStorage.getItem("token"),
});
export default function FamilyPage() {
  const {lang}=useLanguage();
  const label=(en,sq)=>lang==="sq"?sq:en;
  const [pending,setPending]=useState(null);
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
    if(pending) return;
    setPending(path);
    try {
      await axios.post(API + path, {}, { headers: headers() });
      setNotice(label("Your response was recorded.", "Përgjigjja u regjistrua."));
      load();
    } catch (e) {
      setNotice(typeof e.response?.data?.detail === "string" ? e.response.data.detail : label("Your response could not be saved.", "Përgjigjja nuk u ruajt."));
    } finally {setPending(null);}
  };
  const statusLabel=status=>({pending:label("Awaiting parent", "Në pritje të prindit"),parent_accepted:label("Awaiting student", "Në pritje të nxënësit"),approved:label("Approved", "Miratuar"),rejected:label("Declined", "Refuzuar")}[status]||status);
  return <main className="account-workspace family-workspace">
    <header className="account-heading"><div><p>{label("Privacy & permissions", "Privatësia dhe lejet")}</p><h1>{label("Family connections", "Lidhjet familjare")}</h1></div></header>
    <div className="account-columns"><aside className="family-context"><h2>{label("Consent comes first", "Miratimi vjen i pari")}</h2><p>{label("A family connection needs approval from both accounts before progress can be shared.", "Lidhja familjare kërkon miratimin e të dyja llogarive përpara se të ndahet progresi.")}</p><ol><li>{label("An administrator creates the invitation.", "Administratori krijon ftesën.")}</li><li>{label("The parent accepts the connection.", "Prindi pranon lidhjen.")}</li><li>{label("The student approves or declines.", "Nxënësi miraton ose refuzon.")}</li></ol><Link to="/support">{label("Request help with a connection", "Kërko ndihmë për një lidhje")} →</Link></aside>
      <section className="family-connections">
        {loading && <p role="status">{label("Loading family links…", "Duke ngarkuar lidhjet…")}</p>}
        {loadError && <div role="alert" className="account-error">{label("Could not load your family links.", "Lidhjet familjare nuk u ngarkuan.")} <button onClick={load}>{label("Retry", "Provo përsëri")}</button></div>}
        {notice && <p role="status" className="family-notice">{notice}</p>}
        {!loading && !loadError && [["parent",label("As a parent", "Si prind"),parent],["student",label("As a student", "Si nxënës"),student]].map(([type,title,links])=><section key={type}><h2>{title}</h2>{!links.length ? <p className="family-empty">{label("No connections or invitations yet.", "Ende nuk ka lidhje ose ftesa.")}</p> : links.map(link=><article className="family-link" key={link.id}><div><h3>{type==="parent"?label("Student", "Nxënësi"):label("Parent", "Prindi")} #{type==="parent"?link.student_id:link.parent_id}</h3><p>{statusLabel(link.status)}</p></div><div className="family-actions">
          {type==="parent" && link.status==="pending" && <button disabled={Boolean(pending)} onClick={()=>action(`/experience/parent/links/${link.id}/accept`)}>{label("Accept connection", "Prano lidhjen")}</button>}
          {type==="student" && link.status==="parent_accepted" && <><button disabled={Boolean(pending)} onClick={()=>action(`/experience/student/parent-links/${link.id}/approve?approve=true`)}>{label("Approve", "Lejo")}</button><button disabled={Boolean(pending)} onClick={()=>action(`/experience/student/parent-links/${link.id}/approve?approve=false`)}>{label("Decline", "Refuzo")}</button></>}
        </div></article>)}</section>)}
      </section>
    </div>
  </main>;
}
