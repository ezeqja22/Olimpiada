import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { ArrowRight, BookOpen, MessagesSquare, CalendarDays, LifeBuoy } from "lucide-react";
import Header from "./components/Header";
import RichInlineText from "./components/RichInlineText";
import { useLanguage } from "./context/LanguageContext";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { SECTION_DEFAULTS } from "./siteContentConfig";
import mathIcon from "./assets/math_subject_iqigfx.svg";
import physicsIcon from "./assets/physics_subject_m90gto.svg";
import chemistryIcon from "./assets/chemistry_subject_r4n7jq.svg";
import biologyIcon from "./assets/Biology_subject_pcxmoa.svg";
import computingIcon from "./assets/computer_engineering_subject_u2m2ze.svg";
import otherIcon from "./assets/other_subject_nkoxvo.svg";
import "./HomepageRefined.css";

const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const subjects = [
  ["mathematics", "Matematikë", "Mathematics", mathIcon],
  ["physics", "Fizikë", "Physics", physicsIcon],
  ["chemistry", "Kimi", "Chemistry", chemistryIcon],
  ["biology", "Biologji", "Biology", biologyIcon],
  ["computer-science", "Informatikë", "Computer science", computingIcon],
  ["other", "Të tjera", "Other subjects", otherIcon],
];
const features = [
  ["home_feature_weekly", "/weekly", CalendarDays, "Shiko problemin", "View weekly problem"],
  ["home_feature_forums", "/forums", MessagesSquare, "Hap forumet", "Browse forums"],
  ["home_feature_courses", "/courses", BookOpen, "Shiko materialet", "Browse learning materials"],
  ["home_feature_support", "/support", LifeBuoy, "Kontakto suportin", "Contact support"],
];

function GeometryPractice({ sq }) {
  const [answer, setAnswer] = useState(false);
  return <aside className="home-practice" aria-labelledby="practice-title">
    <div className="home-practice-label"><span>{sq ? "Ushtrim i shkurtër" : "Quick practice"}</span><span>{sq ? "Gjeometri" : "Geometry"}</span></div>
    <svg viewBox="0 0 400 225" role="img" aria-label={sq ? "Trekëndëshi ABC me M në mes të brinjës BC. Segmenti AM ndan dy trekëndësha me baza të barabarta." : "Triangle ABC with M at the midpoint of BC. AM divides it into two triangles with equal bases."}>
      <path d="M200 30 L50 190 L200 190 Z" fill="#e9e2f2" />
      <path d="M200 30 L200 190 L350 190 Z" fill="#e5eee7" />
      <path d="M200 30 L50 190 L350 190 Z" fill="none" stroke="#1a4d3a" strokeWidth="2" />
      <path d="M200 30 V190" stroke="#7254a3" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M120 185 V195 M275 185 V195" stroke="#1a4d3a" strokeWidth="2" />
      <g fill="#1a4d3a" fontFamily="Georgia, serif" fontSize="18"><text x="194" y="21">A</text><text x="31" y="207">B</text><text x="351" y="207">C</text><text x="192" y="214">M</text><text x="124" y="153">24</text><text x="257" y="153">?</text></g>
    </svg>
    <h2 id="practice-title">{sq ? "Dy trekëndësha, një lartësi" : "Two triangles, one height"}</h2>
    <p>{sq ? "M është mesi i BC. Sipërfaqja e trekëndëshit ABM është 24 cm². Sa është sipërfaqja e ABC?" : "M is the midpoint of BC. Triangle ABM has an area of 24 cm². What is the area of ABC?"}</p>
    <button type="button" aria-expanded={answer} aria-controls="practice-answer" onClick={() => setAnswer(!answer)}>{answer ? (sq ? "Mbyll shpjegimin" : "Hide explanation") : (sq ? "Shiko shpjegimin" : "Show explanation")} <span aria-hidden="true">{answer ? '−' : '+'}</span></button>
    {answer && <p id="practice-answer" className="home-answer">{sq ? "Bazat BM dhe MC janë të barabarta dhe lartësia është e njëjtë. Të dy trekëndëshat kanë sipërfaqe 24 cm², prandaj ABC ka sipërfaqe 48 cm²." : "BM and MC are equal and share the same height. Each triangle has an area of 24 cm², so ABC has an area of 48 cm²."}</p>}
  </aside>;
}

export default function Homepage() {
  const { lang, t } = useLanguage();
  const sq = lang === "sq";
  const { siteSettings } = useSiteSettings();
  const [blocks, setBlocks] = useState({});
  const [teachers, setTeachers] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    axios.get(API + "/experience/content", { signal: controller.signal }).then(r => setBlocks(r.data && !Array.isArray(r.data) && typeof r.data === "object" ? r.data : {})).catch(() => {});
    axios.get(API + "/experience/teachers", { signal: controller.signal }).then(r => setTeachers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => { document.title = siteSettings.site_name || "Olimpiada"; }, [siteSettings.site_name]);
  const text = (key, field) => <RichInlineText text={blocks[key]?.[`${field}_${lang}`] || SECTION_DEFAULTS[key]?.[`${field}_${lang}`] || ""} />;
  const picture = (key, priority = false) => blocks[key]?.image_url ? <img className="home-cms-image" src={blocks[key].image_url} alt="" width="720" height="480" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" /> : null;
  return <div className="home-refined">
    <Header />
    <main id="main-content" tabIndex={-1}>
      <section className="home-hero home-wrap" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow">{sq ? "Matematikë · Shkenca · Olimpiada" : "Mathematics · Science · Olympiads"}</p>
          <h1 id="home-title">{text("hero", "title")}</h1>
          <p className="home-lead">{text("hero", "subtitle")}</p>
          <div className="home-actions"><Link className="home-button" to="/feed">{sq ? "Shfleto problemet" : "Browse problems"}<ArrowRight size={18} aria-hidden="true" /></Link><Link className="home-text-link" to="/weekly">{t("weekly")}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </div>
        {picture("hero", true) || <GeometryPractice sq={sq} />}
      </section>
      <section className="home-subject-section" aria-labelledby="subjects-title"><div className="home-wrap">
        <h2 id="subjects-title" className="home-eyebrow">{sq ? "Zgjidh lëndën" : "Choose a subject"}</h2>
        <div className="home-subjects">{subjects.map(([slug, al, en, icon]) => <Link to={`/subject/${slug}`} key={slug}><img src={icon} width="34" height="34" alt="" /><span>{sq ? al : en}</span><ArrowRight size={15} aria-hidden="true" /></Link>)}</div>
      </div></section>
      <section className="home-learning home-wrap" aria-labelledby="learning-title">
        <header><p className="home-eyebrow">{sq ? "Në platformë" : "On the platform"}</p><h2 id="learning-title">{text("home_intro", "title")}</h2><p>{text("home_intro", "subtitle")}</p>{picture("home_intro")}</header>
        <div className="home-learning-list">{features.filter(([, to]) => to !== "/forums" || siteSettings.forums_enabled !== false).map(([key, to, Icon, al, en]) => <article key={key}>
          <Icon className="home-feature-icon" size={23} aria-hidden="true" /><div>{picture(key)}<h3>{text(key, "title")}</h3><p>{text(key, "subtitle")}</p><Link className="home-text-link" to={to}>{sq ? al : en}<ArrowRight size={16} aria-hidden="true" /></Link></div>
        </article>)}</div>
      </section>
      <section className="home-community-section"><div className="home-wrap home-community-grid">
        {[['competition', '/weekly', sq ? 'Përgatitje' : 'Practice', sq ? 'Shiko problemin e javës' : 'View the weekly problem'], ['community', '/forums', sq ? 'Diskutime' : 'Discussion', sq ? 'Shfleto diskutimet' : 'Browse discussions']].filter(([, to]) => to !== '/forums' || siteSettings.forums_enabled !== false).map(([key, to, label, action]) => <article key={key}>{picture(key)}<p className="home-eyebrow">{label}</p><h2>{text(key, 'title')}</h2><p>{text(key, 'subtitle')}</p><Link className="home-text-link" to={to}>{action}<ArrowRight size={16} aria-hidden="true" /></Link></article>)}
      </div></section>
      {teachers.length > 0 && <section className="home-wrap home-mentors"><header><p className="home-eyebrow">{sq ? 'Udhëzim individual' : 'Individual guidance'}</p><h2>{text('home_mentors', 'title')}</h2><p>{text('home_mentors', 'subtitle')}</p>{picture('home_mentors')}<Link className="home-text-link" to="/tutoring">{sq ? 'Shiko seancat individuale' : 'View tutoring sessions'}<ArrowRight size={16} aria-hidden="true" /></Link></header><div>{teachers.slice(0, 3).map(person => <article key={person.user_id}><p className="home-eyebrow">{person.subject}</p><h3>{person.first_name} {person.last_name}</h3><p><RichInlineText text={person.bio} /></p></article>)}</div></section>}
      <section className="home-wrap home-partner"><div><p className="home-eyebrow">{t('partner')}</p><h2>{text('partner', 'title')}</h2></div><p>{text('partner', 'subtitle')}</p>{picture('partner')}</section>
      <section className="home-closing"><div className="home-wrap"><div><h2>{text('cta', 'title')}</h2><p>{text('cta', 'subtitle')}</p><Link className="home-button" to={blocks.cta?.button_url || '/explore'}>{sq ? 'Eksploro platformën' : 'Explore the platform'}<ArrowRight size={18} aria-hidden="true" /></Link></div>{picture('cta')}</div></section>
    </main>
    <footer className="home-footer home-wrap"><Link className="home-footer-brand" to="/homepage">{siteSettings.site_name || 'Olimpiada'}</Link><nav aria-label={sq ? 'Lidhje ndihmëse' : 'Helpful links'}><Link to="/faq">{t('faq')}</Link><Link to="/support">{t('support')}</Link><Link to="/tutoring">{sq ? 'Seanca individuale' : 'Tutoring'}</Link><Link to="/teacher/apply">{t('apply')}</Link></nav><small>© {new Date().getFullYear()} Olimpiada.al</small></footer>
  </div>;
}
