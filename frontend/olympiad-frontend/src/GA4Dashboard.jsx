import React,{useEffect,useState} from "react";
import axios from "axios";
import "./phase1.css";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
export default function GA4Dashboard(){
 const [data,setData]=useState(null),[error,setError]=useState("");
 useEffect(()=>{axios.get(API+"/access/admin/ga4",{headers:{Authorization:"Bearer "+localStorage.getItem("token")}})
 .then(r=>setData(r.data)).catch(()=>setError("Nuk mund të lexohen aktualisht të dhënat e GA4."));},[]);
 return <section className="p1-card p1-group">
  <div className="p1-row"><h2>Google Analytics 4</h2><a href="https://analytics.google.com/analytics/web/" target="_blank" rel="noopener noreferrer">Hap Google Analytics</a></div>
  {error?<p className="p1-alert">{error}</p>: !data?<p className="p1-muted">Duke lexuar GA4...</p> : !data.configured?<p className="p1-muted">Integrimi është gati. Për të shfaqur statistikat këtu, konfiguro GA4_PROPERTY_ID dhe GA4_SERVICE_ACCOUNT_JSON në backend dhe jepi service account-it akses Viewer në property-n GA4.</p>:
  <div className="p1-grid"><div><strong>Përdorues aktivë</strong><div className="p1-price">{data.active_users}</div></div>
  <div><strong>Seanca</strong><div className="p1-price">{data.sessions}</div></div>
  <div><strong>Shikime faqesh</strong><div className="p1-price">{data.page_views}</div></div>
  <div><strong>Përdorues të rinj</strong><div className="p1-price">{data.new_users}</div></div>
  <p className="p1-muted">30 ditët e fundit · Burimi: Google Analytics 4 Data API</p></div>}
 </section>;
}
