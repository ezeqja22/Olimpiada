import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { LockKeyhole, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useAuth } from "./context/AuthContext";
import SitePageIntro from "./components/SitePageIntro";
import "./phase1.css";
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const authHeaders = () => ({ Authorization: "Bearer " + localStorage.getItem("token") });
const plans = [
  { id: "basic", name: "Basic", price: 1000, features: ["Forumi me ushtrime"], subtitle: "Për praktikë të përditshme" },
  { id: "medium", name: "Medium", price: 2500, features: ["Forumi me ushtrime", "Google Meet", "Materiale mësimore", "Teste"], subtitle: "Për përgatitje serioze" },
  { id: "premium", name: "Premium", price: 2500, features: ["Gjithçka nga Medium", "Kërkesa për seanca individuale", "Pagesë shtesë për çdo seancë 1-to-1"], subtitle: "Mbështetje individuale" },
];
function Header({ contentKey, title, description }) {
  return <SitePageIntro contentKey={contentKey} kicker="Olimpiada.al" title={title}
    subtitle={description} actionTo="/explore" actionLabel="Shiko përmbajtjen" />;
}
export function Pricing() {
  const { currentUser, accessInfo, refreshAccess } = useAuth();
  const navigate = useNavigate();
  const [trialLoading, setTrialLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState("medium");
  const [months, setMonths] = useState(1);
  const [receipt, setReceipt] = useState(null);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const loadHistory = () => {
    if (currentUser) axios.get(API + "/access/payments/mine", { headers: authHeaders() })
      .then(r => setHistory(r.data)).catch(() => {});
  };
  useEffect(loadHistory, [currentUser]);
  const claimTrial = async () => {
    if (!currentUser) { navigate("/signup"); return; }
    setTrialLoading(true);setMessage("");
    try {
      await axios.post(API + "/access/trial/start", {}, { headers: authHeaders() });
      await refreshAccess();
      setMessage("Trial-i 1-mujor u aktivizua.");
    } catch (e) { setMessage(e.response?.data?.detail || "Trial-i nuk mund të aktivizohet."); }
    finally { setTrialLoading(false); }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!currentUser) { navigate("/signup"); return; }
    if (!receipt) { setMessage("Ngarko fotografinë e mandatit."); return; }
    setSending(true);setMessage("");
    const form = new FormData();
    form.append("receipt", receipt);
    try {
      await axios.post(API + "/access/payments?plan=" + selected + "&months=" + months,
        form, { headers: authHeaders() });
      setMessage("Mandati u ngarkua. Abonimi aktivizohet vetëm pas miratimit nga administratori.");
      setReceipt(null);loadHistory();
    } catch (e) { setMessage(typeof e.response?.data?.detail === "string" ? e.response.data.detail : "Ngarkimi dështoi."); }
    finally { setSending(false); }
  };
  return <main className="p1-wrap">
    <Header contentKey="page_pricing" title="Zgjidh planin tënd" description="Përgatitu për olimpiada me materiale, forume dhe profesorë. Përmbajtja premium hapet pas abonimit." />
    <div className="p1-grid">{plans.map(plan => <section className={"p1-card p1-plan " + (plan.id === "medium" ? "featured" : "")} key={plan.id}>
      {plan.id === "medium" && <span className="p1-pill">REKOMANDOHET</span>}
      <h2>{plan.name}</h2><p className="p1-muted">{plan.subtitle}</p>
      <div className="p1-price">{plan.price.toLocaleString("sq-AL")} ALL <span>/ muaj</span></div>
      <ul className="p1-features">{plan.features.map(feature => <li key={feature}><CheckCircle2 size={15} style={{ verticalAlign: "middle", color: "#177a60" }} /> {feature}</li>)}</ul>
      <button className="p1-btn" onClick={() => { setSelected(plan.id);document.getElementById("payment-form")?.scrollIntoView({behavior:"smooth"}); }}>Zgjidh {plan.name}</button>
    </section>)}</div>
    <section className="p1-note p1-group p1-row"><div><strong>Provo falas për 1 muaj</strong><div className="p1-muted">Aktivizo vetë trial-in. Nuk aktivizohet automatikisht pas regjistrimit; mund të përdoret vetëm një herë. Trial-i ofron funksionet Medium.</div></div>
      <button className="p1-btn alt" disabled={trialLoading || accessInfo?.trial_used || (accessInfo?.plan && accessInfo.plan !== "free" && accessInfo.plan !== "guest")}
        onClick={claimTrial}>{accessInfo?.trial_used ? "Trial i përdorur" : trialLoading ? "Duke aktivizuar..." : "Aktivizo Free Trial"}</button></section>
    {accessInfo && <p className="p1-muted">Aksesi yt aktual: <strong>{accessInfo.plan}</strong> {accessInfo.subscription_expires_at && " · deri më " + new Date(accessInfo.subscription_expires_at).toLocaleDateString("sq-AL")}</p>}
    <section className="p1-card p1-group p1-narrow" id="payment-form">
      <h2>Pagesë me mandat bankar</h2><p className="p1-muted">Kryej pagesën sipas udhëzimeve të administratorit dhe ngarko fotografinë e mandatit. Mos kryej pagesë pa marrë detajet bankare të konfirmuara. Verifikimi bëhet manualisht.</p>
      <form className="p1-form" onSubmit={submit}>
        <label>Plani<select className="p1-select" value={selected} onChange={e => setSelected(e.target.value)}>{plans.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
        <label>Numri i muajve<input className="p1-input" type="number" min="1" max="12" value={months} onChange={e => setMonths(Math.min(12,Math.max(1,Number(e.target.value)||1)))} /></label>
        <strong>Totali: {(plans.find(p=>p.id===selected).price * months).toLocaleString("sq-AL")} ALL</strong>
        <label>Fotografia e mandatit (JPG/PNG/WEBP, deri në 5 MB)<input className="p1-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setReceipt(e.target.files?.[0]||null)} /></label>
        <button className="p1-btn" type="submit" disabled={sending}>{sending ? "Duke ngarkuar..." : "Dërgo mandatin për verifikim"}</button>
      </form>{message && <p className="p1-note" role="status">{message}</p>}
    </section>
    {history.length > 0 && <section className="p1-group"><h2>Historiku i kërkesave të pagesës</h2><div className="p1-rows">{history.map(p=><div className="p1-card p1-row" key={p.id}><span>{p.plan} · {p.months} muaj · {p.amount_all.toLocaleString("sq-AL")} ALL</span><strong className="p1-status">{p.status}</strong></div>)}</div></section>}
  </main>;
}
function LockedItem({ title, subtitle, url }) {
  return <article className="p1-card p1-item"><div className="p1-locked"><h3>{title}</h3><p>{subtitle || "Përmbajtje e rezervuar për abonentët"}</p><p>Ushtrime, diskutime dhe zgjidhje të detajuara</p></div>
    <div className="p1-lock-overlay"><LockKeyhole size={22} /><span>{title}</span><Link to={url || "/pricing"}>Zhblloko me abonim</Link></div></article>;
}
export function Explore() {
  const [forums, setForums] = useState([]);
  const [library, setLibrary] = useState([]);
  const [weekly, setWeekly] = useState(null);
  const { accessInfo } = useAuth();
  useEffect(() => {axios.get(API + "/public/forums").then(r=>setForums(r.data)).catch(()=>{});
    axios.get(API + "/public/library").then(r=>setLibrary(r.data)).catch(()=>{});
    axios.get(API + "/public/problem-of-week").then(r=>setWeekly(r.data.problem)).catch(()=>{});
  },[]);
  const canForum = accessInfo?.features?.includes("forum");
  const canMaterial = accessInfo?.features?.includes("material");
  return <main className="p1-wrap">
    <Header contentKey="page_explore" title="Eksploro Olimpiada" description="Problema e javës është falas. Zbulo temat e forumeve dhe titujt e bibliotekës përpara se të abonohesh." />
    <section className="p1-card p1-group"><div className="p1-row"><h2>Problema e Javës</h2><span className="p1-pill">FALAS</span></div>
    {weekly ? <><h3>{weekly.title}</h3><p style={{whiteSpace:"pre-wrap"}}>{weekly.description}</p><span className="p1-muted">{weekly.subject} · {weekly.level}</span></> : <p className="p1-muted">Problema e javës nuk është publikuar ende.</p>}</section>
    <div className="p1-row"><h2 className="p1-section-title">Forume publike</h2><Link className="p1-btn alt" to={canForum?"/forums":"/pricing"}>{canForum?"Hyr në forume":"Shiko planet"}</Link></div>
    <div className="p1-grid">{forums.length ? forums.map(f=><LockedItem key={f.id} title={f.title} subtitle={f.subject} url={canForum?"/forum/"+f.id:"/pricing"}/>) : <p className="p1-muted">Ende nuk ka forume publike.</p>}</div>
    <div className="p1-row"><h2 className="p1-section-title">Biblioteka</h2><Link className="p1-btn alt" to={canMaterial?"/library":"/pricing"}>{canMaterial?"Hap bibliotekën":"Zhblloko bibliotekën"}</Link></div>
    <div className="p1-grid">{library.length ? library.map(r=><LockedItem key={r.id} title={r.title} subtitle={r.subject} url={canMaterial?"/library":"/pricing"}/>) : <p className="p1-muted">Materialet do të publikohen së shpejti.</p>}</div>
  </main>;
}
export function Learning() {
  const [rows,setRows] = useState([]);const [error,setError]=useState("");
  useEffect(()=>{axios.get(API+"/access/resources",{headers:authHeaders()}).then(r=>setRows(r.data)).catch(()=>setError("Materialet nuk u ngarkuan."));},[]);
  return <main className="p1-wrap"><Header contentKey="page_materials" title="Materiale, Teste & Google Meet" description="Përmbajtje për abonentët Medium dhe Premium."/>
    {error&&<p className="p1-alert">{error}</p>}
    <div className="p1-rows">{rows.map(r=><article className="p1-card" key={r.id}><span className="p1-pill">{r.kind.toUpperCase()}</span><h2>{r.title}</h2><div className="p1-muted">{r.subject} {r.scheduled_at ? " · "+new Date(r.scheduled_at).toLocaleString("sq-AL"):""}</div>{r.kind==="meet" && /^https:\/\/meet\.google\.com\//.test(r.body.trim()) ?
 <p><a href={r.body.trim()} target="_blank" rel="noopener noreferrer" className="p1-btn">Bashkohu në Google Meet</a></p> :
 <p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{r.body}</p>}</article>)}</div>
    {rows.length===0&&!error&&<p className="p1-muted">Ende nuk ka materiale të publikuara.</p>}</main>;
}
export function Tutoring() {
  const [subject,setSubject]=useState("");const [teachers,setTeachers]=useState([]);const [teacher,setTeacher]=useState("");const [message,setMessage]=useState("");const [result,setResult]=useState("");
  const { accessInfo }=useAuth();
  useEffect(()=>{axios.get(API+"/access/teachers",{params:subject?{subject}:{}}).then(r=>setTeachers(r.data)).catch(()=>{});setTeacher("");},[subject]);
  const subjects=[...new Set(teachers.map(t=>t.subject))];
  const submit=async e=>{e.preventDefault();setResult("");try{const r=await axios.post(API+"/access/tutoring/requests",{subject,teacher_id:Number(teacher),message},{headers:authHeaders()});setResult("Kërkesa #"+r.data.id+" iu dërgua administratorit për miratim.");}catch(e){setResult(e.response?.status===402?"Kërkohet abonim Premium.":"Kërkesa nuk mund të dërgohet.");}};
  return <main className="p1-wrap p1-narrow"><Header contentKey="page_tutoring" title="Seanca 1-to-1" description="Premium: zgjidh lëndën dhe profesorin, më pas kërko konfirmimin e administratorit. Çdo seancë paguhet veçmas."/>
    {accessInfo?.plan!=="premium"&&accessInfo?.plan!=="staff"&&<p className="p1-note">Kjo shërbim kërkon abonim Premium. <Link to="/pricing">Shiko planet</Link></p>}
    <form className="p1-card p1-form" onSubmit={submit}>
      <label>Lënda<input className="p1-input" placeholder="P.sh. Mathematics" value={subject} onChange={e=>setSubject(e.target.value)} list="p1-subjects" required/><datalist id="p1-subjects">{subjects.map(s=><option key={s} value={s}/>)}</datalist></label>
      <label>Profesori<select className="p1-select" value={teacher} onChange={e=>setTeacher(e.target.value)} required><option value="">Zgjidh profesorin</option>{teachers.filter(t=>t.subject===subject).map(t=><option value={t.teacher_id} key={t.teacher_id}>{t.teacher}</option>)}</select></label>
      <label>Mesazh (opsional)<textarea className="p1-input" rows={4} value={message} onChange={e=>setMessage(e.target.value)}/></label>
      <button className="p1-btn" disabled={!teacher} type="submit">Dërgo kërkesë te administratori</button>
      {result&&<p role="status">{result}</p>}
    </form></main>;
}
export function LockedPreview({ feature }) {
  return <main className="p1-wrap p1-narrow"><div className="p1-card" style={{textAlign:"center",padding:"48px 24px"}}>
    <LockKeyhole size={38} color="#16755b"/><h1>Ky seksion është i rezervuar për abonentët</h1>
    <p className="p1-muted">Përmbajtja është e kyçur. Zgjidh planin që përfshin {feature==="forum"?"forumet":"materialet dhe testet"}.</p>
    <div className="p1-row" style={{justifyContent:"center"}}><Link to="/pricing" className="p1-btn">Zhblloko aksesin</Link><Link to="/explore" className="p1-btn alt">Eksploro falas</Link></div></div></main>;
}
