import React, { useEffect, useState } from "react";
import axios from "axios";
import klevisaPhoto from "../assets/klevisa.jpeg";
import gangoPhoto from "../assets/gango1.jpeg";
import { useLanguage } from "../context/LanguageContext";
import { SECTION_DEFAULTS } from "../siteContentConfig";
import RichInlineText from "./RichInlineText";
import "./AboutFounders.css";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const people = [
  {key:"home_founder_klevisa",image:klevisaPhoto,role:"Co-founder"},
  {key:"home_founder_enio",image:gangoPhoto,role:"Co-founder"},
];

export default function AboutFounders() {
  const { lang } = useLanguage();
  const [blocks, setBlocks] = useState({});
  useEffect(() => {
    let mounted = true;
    axios.get(API + "/experience/content")
      .then(r => {if(mounted && r.data && typeof r.data === "object") setBlocks(r.data);})
      .catch(()=>{});
    return () => {mounted=false;};
  }, []);
  const copy = (key,field) =>
    blocks[key]?.[field+"_"+lang]?.trim() || SECTION_DEFAULTS[key]?.[field+"_"+lang] || "";

  return <section className="about-founders-section" aria-labelledby="about-founders-title">
    <div className="about-founders-shell">
      <div className="about-founders-header">
        <span className="about-eyebrow">{lang==="sq"?"Rreth nesh":"About Us"}</span>
        <h2 id="about-founders-title"><RichInlineText text={copy("home_founders","title")} /></h2>
        <p><RichInlineText text={copy("home_founders","subtitle")} /></p>
        {blocks.home_founders?.image_url &&
          <img className="about-founders-accent" src={blocks.home_founders.image_url}
            loading="lazy" alt={lang==="sq"?"Ekipi i platformës":"The platform team"} />}
      </div>
      <div className="founders-grid">
        {people.map(person=>{
          const allLines = copy(person.key,"subtitle").split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
          const name = copy(person.key,"title");
          return <article className="founder-card" key={person.key}>
            <div className="founder-image-wrap">
              <img src={blocks[person.key]?.image_url || person.image}
                alt={name + ", " + (lang==="sq"?"Bashkëthemelues":"Co-founder")}
                className="founder-image" loading="lazy" decoding="async" />
            </div>
            <div className="founder-content">
              <div className="founder-heading-row"><div>
                <h3><RichInlineText text={name}/></h3>
                <p className="founder-role">{lang==="sq"?"Bashkëthemelues/e":person.role}</p>
              </div></div>
              {allLines.length > 0 && <p className="founder-description"><RichInlineText text={allLines[0]} /></p>}
              {allLines.length > 1 && <ul className="founder-highlights">
                {allLines.slice(1).map((item,index)=><li key={index}><RichInlineText text={item}/></li>)}
              </ul>}
            </div>
          </article>;
        })}
      </div>
    </div>
  </section>;
}
