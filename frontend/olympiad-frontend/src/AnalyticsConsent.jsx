import React,{useEffect,useState} from "react";
import axios from "axios";
const API=process.env.REACT_APP_API_URL||"http://127.0.0.1:8000";
export default function AnalyticsConsent(){
 const [id,setId]=useState("");
 const [choice,setChoice]=useState(localStorage.getItem("olimpiada_analytics_consent"));
 useEffect(()=>{axios.get(API+"/site-info").then(r=>{if(/^G-[A-Z0-9]+$/.test(r.data.ga4_measurement_id||""))setId(r.data.ga4_measurement_id);}).catch(()=>{});},[]);
 useEffect(()=>{if(!id||choice!=="granted")return;
  const script=document.createElement("script");
  script.async=true;script.src="https://www.googletagmanager.com/gtag/js?id="+encodeURIComponent(id);
  document.head.appendChild(script);
  window.dataLayer=window.dataLayer||[];
  window.gtag=function(){window.dataLayer.push(arguments);};
  window.gtag("js",new Date());
  window.gtag("config",id,{anonymize_ip:true});
  return()=>{script.remove();};
 },[id,choice]);
 if(!id||choice)return null;
 return <aside role="region" aria-label="Preferencat analitike" style={{position:"fixed",bottom:12,left:12,right:12,zIndex:9999,maxWidth:620,padding:18,borderRadius:14,background:"#fff",boxShadow:"0 6px 38px #0002",border:"1px solid #d9e3df"}}>
  <strong>Preferencat e privatësisë</strong><p>Me lejen tënde përdorim Google Analytics 4 për të përmirësuar përvojën. Nuk aktivizohet pa pëlqimin tënd.</p>
  <div style={{display:"flex",gap:12}}>{[["granted","Pranoj"],["denied","Refuzoj"]].map(([value,label])=><button type="button" key={value} onClick={()=>{localStorage.setItem("olimpiada_analytics_consent",value);setChoice(value);}} style={{padding:"10px 16px",cursor:"pointer"}}>{label}</button>)}</div></aside>;
}
