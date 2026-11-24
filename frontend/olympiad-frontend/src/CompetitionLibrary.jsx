import React, {useEffect, useState} from "react";
import axios from "axios";
import {ArrowUpRight, BookOpen, ChevronLeft, ChevronRight, Download, Search, Trophy} from "lucide-react";
import {Link, useParams} from "react-router-dom";
import {useAuth} from "./context/AuthContext";
import {useLanguage} from "./context/LanguageContext";
import {loginIntent} from "./navigation";
import SitePageIntro from "./components/SitePageIntro";
import "./CompetitionLibrary.css";

export const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
export const authHeaders = () => ({Authorization: "Bearer " + localStorage.getItem("token")});
export const textKey = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
const kinds = {
  book: ["Libër", "Book"], magazine: ["Revistë", "Magazine"], booklet: ["Broshurë", "Booklet"],
  training: ["Material trajnimi", "Training material"],
};
const scopes = {national: ["Kombëtare", "National"], regional: ["Rajonale", "Regional"], international: ["Ndërkombëtare", "International"]};

function useCatalogue(path) {
  const [state, setState] = useState({rows: null, failed: false});
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setState({rows: null, failed: false});
    axios.get(API + path).then(({data}) => {
      if (active) setState({rows: Array.isArray(data) ? data : [], failed: false});
    }).catch(() => {
      if (active) setState({rows: null, failed: true});
    });
    return () => { active = false; };
  }, [path, version]);
  return {...state, retry: () => setVersion(value => value + 1)};
}

function CatalogueState({state, sq}) {
  return state.failed
    ? <p role="alert">{sq ? "Katalogu nuk u ngarkua." : "The catalogue could not be loaded."}{" "}<button onClick={state.retry}>{sq ? "Provo përsëri" : "Retry"}</button></p>
    : <p role="status">{sq ? "Duke ngarkuar…" : "Loading…"}</p>;
}

function SearchBox({query, setQuery, label, placeholder}) {
  return <label className="catalog-search"><Search size={19} aria-hidden="true"/>
    <input type="search" aria-label={label} value={query} onChange={event => setQuery(event.target.value)} placeholder={placeholder}/>
  </label>;
}

export function Olympiads() {
  const sq = useLanguage().lang === "sq";
  const catalogue = useCatalogue("/public/olympiads");
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const {slug} = useParams();
  const rows = catalogue.rows || [];
  const subjects = [...new Set(rows.map(row => row.subject))];
  const filtered = rows.filter(row => (!subject || row.subject === subject)
    && textKey([row.name, row.acronym, row.subject, row.importance].join(" ")).includes(textKey(query.trim())));
  const selected = rows.find(row => row.slug === slug);
  return <main className="catalog-shell">
    <SitePageIntro contentKey="page_olympiads" title={sq?'Olimpiadat':'Olympiads'} subtitle={sq?'Njih garat dhe mënyrat për të marrë pjesë.':'Explore competitions and participation routes.'}/>
    {!catalogue.rows ? <CatalogueState state={catalogue} sq={sq}/> : selected ?
      <article className="guide-detail">
        <Link to="/olympiads">← {sq ? "Të gjitha olimpiadat" : "All olympiads"}</Link>
        <header><span className="catalog-tag">{selected.subject} · {scopes[selected.scope]?.[sq ? 0 : 1]}</span><h2>{selected.name} ({selected.acronym})</h2><p>{selected.audience}</p></header>
        <div className="guide-detail-grid">
          <div><h3>{sq ? "Pse ka rëndësi" : "Why it matters"}</h3><p>{selected.importance}</p>
            <h3>{sq ? "Historiku" : "History"}</h3><p>{selected.history}</p>
            <div className="catalog-links"><a href={selected.source_url} target="_blank" rel="noreferrer">{sq ? "Burimi" : "Source"} <ArrowUpRight size={16}/></a>
              {selected.local_url && selected.local_url !== selected.source_url && <a href={selected.local_url} target="_blank" rel="noreferrer">{sq ? "Njoftimet në Shqipëri" : "Albanian announcements"} <ArrowUpRight size={16}/></a>}</div>
          </div>
          <section className="guide-route"><h3>{sq ? "Rruga për të marrë pjesë" : "How to take part"}</h3>
            <ol>{selected.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
          </section>
        </div>
      </article> :
      <>
        {slug && <p role="status">{sq ? "Olimpiada nuk u gjet." : "Olympiad not found."}</p>}
        <div className="catalog-tools">
          <SearchBox query={query} setQuery={setQuery} label={sq ? "Kërko olimpiadat" : "Search olympiads"} placeholder={sq ? "Emri i garës, p.sh. IMO ose IOI" : "Competition name, e.g. IMO or IOI"}/>
          <div className="catalog-filters" aria-label={sq ? "Lëndët" : "Subjects"}>
            {["", ...subjects].map(value => <button key={value} type="button" aria-pressed={subject === value} onClick={() => setSubject(value)}>{value || (sq ? "Të gjitha" : "All")}</button>)}
          </div>
        </div>
        {!filtered.length && <p role="status">{sq ? "Nuk u gjet asnjë olimpiadë." : "No olympiads found."}</p>}
        {subjects.filter(value => filtered.some(row => row.subject === value)).map(value =>
          <section className="catalog-section" key={value}>
            <h2>{value}</h2>
            <div className="guide-grid">{filtered.filter(row => row.subject === value).map(row =>
              <Link className="guide-card" key={row.id} to={"/olympiads/" + row.slug}>
                <span className="guide-acronym">{row.acronym}<ArrowUpRight size={21} aria-hidden="true"/></span>
                <h3>{row.name}</h3><p>{row.importance}</p>
                <span className="catalog-tag">{scopes[row.scope]?.[sq ? 0 : 1]}</span>
              </Link>)}</div>
          </section>)}
      </>}
  </main>;
}

function Tags({doc}) {
  return <div className="catalog-tags">{[doc.subject, doc.discipline, doc.level].filter(Boolean).map((tag, index) =>
    <span className="catalog-tag" key={index}>{tag}</span>)}</div>;
}

function Reader({doc, sq}) {
  const {currentUser, authLoading} = useAuth();
  const [page, setPage] = useState(1);
  const [image, setImage] = useState(null);
  const [error, setError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!currentUser || !doc.available) return;
    const controller = new AbortController();
    let objectUrl;
    setImage(null);
    setError("");
    axios.get(API + "/core/library/" + doc.id + "/pages/" + page, {
      headers: authHeaders(), responseType: "blob", signal: controller.signal,
    }).then(({data}) => {
      if (controller.signal.aborted) return;
      objectUrl = URL.createObjectURL(data);
      setImage(objectUrl);
    }).catch(() => {
      if (!controller.signal.aborted) setError(sq ? "Faqja nuk u hap." : "The page failed to load.");
    });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentUser, doc.id, doc.available, page, retry, sq]);

  async function download() {
    setDownloading(true);
    setDownloadError("");
    try {
      const {data} = await axios.get(API + "/core/library/" + doc.id + "/download", {headers: authHeaders(), responseType: "blob"});
      const link = document.createElement("a");
      link.href = URL.createObjectURL(data);
      link.download = "olimpiada-material-" + doc.id + ".pdf";
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch {
      setDownloadError(sq ? "Shkarkimi dështoi. Provo përsëri." : "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (!doc.available) return <p>{sq ? "PDF-ja ende nuk është e disponueshme." : "The PDF is not available yet."}</p>;
  if (authLoading) return <p role="status">{sq ? "Duke ngarkuar…" : "Loading…"}</p>;
  if (!currentUser) return <Link className="catalog-button" to="/login" state={loginIntent("/library/" + doc.id)}>{sq ? "Hyr për të lexuar" : "Sign in to read"}</Link>;
  return <section className="reader" aria-label={sq ? "Lexuesi" : "Reader"}>
    <div className="reader-tools">
      <button aria-label={sq ? "Faqja e mëparshme" : "Previous page"} disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft size={20}/></button>
      <label>{sq ? "Faqja" : "Page"} <select value={page} onChange={e => setPage(Number(e.target.value))}>
        {Array.from({length: doc.page_count}, (_, index) => <option key={index} value={index + 1}>{index + 1}</option>)}
      </select> / {doc.page_count}</label>
      <button aria-label={sq ? "Faqja tjetër" : "Next page"} disabled={page >= doc.page_count} onClick={() => setPage(page + 1)}><ChevronRight size={20}/></button>
      {doc.kind === "training" && <button disabled={downloading} onClick={download}><Download size={18}/> {sq ? "Shkarko PDF me filigran" : "Download watermarked PDF"}</button>}
    </div>
    {downloadError && <p role="alert">{downloadError}</p>}
    {error ? <p role="alert">{error} <button onClick={() => setRetry(value => value + 1)}>{sq ? "Riprovo" : "Retry"}</button></p>
      : image ? <img src={image} draggable={false} alt={(sq ? "Faqja " : "Page ") + page + " · " + doc.title}/>
        : <p role="status">{sq ? "Duke ngarkuar faqen…" : "Loading page…"}</p>}
  </section>;
}

export function Library() {
  const sq = useLanguage().lang === "sq";
  const catalogue = useCatalogue("/public/library");
  const {id} = useParams();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({subject: "", discipline: "", level: ""});
  const rows = catalogue.rows || [];
  const doc = rows.find(row => String(row.id) === id);
  const filtered = rows.filter(row => Object.entries(filters).every(([key, value]) => !value || row[key] === value)
    && textKey([row.title, row.author, row.subject, row.discipline, row.level].join(" ")).includes(textKey(query.trim())));
  const filterNames = sq ? {subject: "Lënda", discipline: "Disiplina", level: "Niveli"} : {subject: "Subject", discipline: "Discipline", level: "Level"};
  return <main className="catalog-shell">
    <SitePageIntro contentKey="page_library" title={sq?'Biblioteka online':'Online library'} subtitle={sq?'Libra, revista dhe materiale trajnimi sipas lëndës dhe nivelit.':'Books, magazines and training materials by subject and level.'}/>
    {!catalogue.rows ? <CatalogueState state={catalogue} sq={sq}/> : id ?
      <article className="guide-detail"><Link to="/library">← {sq ? "Biblioteka" : "Library"}</Link>
        {doc ? <><h2>{doc.title}</h2>{doc.author && <p>{doc.author}</p>}<Tags doc={doc}/><p>{doc.description}</p><Reader key={doc.id} doc={doc} sq={sq}/></>
          : <h2>{sq ? "Dokumenti nuk u gjet" : "Document not found"}</h2>}</article> :
      <><div className="catalog-tools">
        <SearchBox query={query} setQuery={setQuery} label={sq ? "Kërko në bibliotekë" : "Search the library"} placeholder={sq ? "Titulli, autori ose tema" : "Title, author or topic"}/>
        <div className="catalog-filters">{Object.entries(filterNames).map(([key, label]) => <label key={key}>{label}
          <select value={filters[key]} onChange={event => setFilters({...filters, [key]: event.target.value})}>
            <option value="">{sq ? "Të gjitha" : "All"}</option>
            {[...new Set(rows.map(row => row[key]).filter(Boolean))].sort().map(value => <option key={value}>{value}</option>)}
          </select></label>)}</div>
      </div>
      {!filtered.length && <p role="status">{sq ? "Nuk u gjet asnjë dokument." : "No documents found."}</p>}
      {Object.entries(kinds).map(([kind, labels]) => {
        const shelf = filtered.filter(row => row.kind === kind);
        if (!shelf.length) return null;
        return <section className="catalog-section" key={kind}><h2>{labels[sq ? 0 : 1]}</h2>
          <div className="library-shelf" tabIndex={0} aria-label={labels[sq ? 0 : 1]}>{shelf.map(row =>
            <Link className="library-card" key={row.id} to={"/library/" + row.id}>
              <div className="library-cover"><BookOpen size={22} aria-hidden="true"/><h3>{row.title}</h3>{row.author && <p>{row.author}</p>}</div>
              <Tags doc={row}/>
            </Link>)}</div>
        </section>;
      })}</>}
  </main>;
}
