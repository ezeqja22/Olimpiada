import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import axios from "axios";
import { useLanguage } from "./context/LanguageContext";
import { adminLabel, adminRoleLabel, visibleAdminGroups } from "./adminNavigation";
import "./AdminLayout.css";
import "./AdministrationWorkspace.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

export function AdminDirectory({role}) {
  const {lang} = useLanguage();
  const t = (sq, en) => lang === "en" ? en : sq;
  const [query, setQuery] = useState("");
  const groups = visibleAdminGroups(role, query);
  return <section className="administration-tools-directory" aria-labelledby="admin-directory-title">
    <header>
      <div><h3 id="admin-directory-title">{t("Mjetet e administrimit", "Administration tools")}</h3>
        <p>{t("Zgjidh një seksion ose kërko sipas emrit.", "Choose a section or search by name.")}</p></div>
      <label className="administration-search">{t("Kërko seksionet", "Find a section")}
        <input type="search" value={query} onChange={event => setQuery(event.target.value)}
          placeholder={t("p.sh. Olimpiadat, biblioteka", "e.g. Olympiads, library")}/>
      </label>
    </header>
    {groups.length ? <div className="administration-tool-groups">
      {groups.map(group => <section key={group.id}>
        <h4>{adminLabel(group,lang)}</h4>
        {group.items.map(item => <Link key={item.path} to={item.path}>
          <span>{adminLabel(item,lang)}</span><span aria-hidden="true">→</span>
        </Link>)}
      </section>)}
    </div> : <p role="status">{t("Nuk u gjet asnjë seksion.", "No matching sections.")}</p>}
  </section>;
}

const AdminDashboard = () => {
  const {lang} = useLanguage();
  const t = (sq, en) => lang === "en" ? en : sq;
  const {role} = useOutletContext() || {};
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => { fetchDashboardStats(); }, []);
  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(false);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (err) {
      setError(true);
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };
  const date = value => new Date(value).toLocaleDateString(lang === "en" ? "en-GB" : "sq-AL");
  return <div className="administration-overview">
    <header className="administration-heading"><div><p>{t("Përmbledhja e platformës", "Platform overview")}</p><h2>{t("Komuniteti dhe të nxënit", "Community & learning")}</h2></div>
      <button onClick={fetchDashboardStats} disabled={loading}>{t("Rifresko përmbledhjen", "Refresh overview")}</button>
    </header>
    {loading ? <p role="status">{t("Duke ngarkuar statistikat…", "Loading statistics…")}</p> :
     error || !stats ? <p role="alert">{t("Statistikat nuk u ngarkuan. Mund të përdorësh ende mjetet e administrimit.", "Statistics could not be loaded. Administration tools are still available.")}</p> :
      <div className="administration-summary">
        {[
          [t("Anëtarë","Members"),stats.users.total,t(`${stats.users.new_today} u regjistruan sot`,`${stats.users.new_today} joined today`),"/admin/users"],
          [t("Anëtarë aktivë","Active members"),stats.users.active,t(`${stats.users.banned} të bllokuar`,`${stats.users.banned} banned`),"/admin/users"],
          [t("Problema","Problems"),stats.problems.total,t(`${stats.problems.new_today} të publikuara sot`,`${stats.problems.new_today} published today`),"/admin/content"],
          [t("Forume","Forums"),stats.forums.total,t(`${stats.forums.public} publike · ${stats.forums.private} private`,`${stats.forums.public} public · ${stats.forums.private} private`),"/admin/forums"],
        ].map(([title,value,note,path])=><Link key={title} to={path}><span>{title}</span><strong>{value}</strong><small>{note}</small></Link>)}
      </div>}
    <AdminDirectory role={role}/>
    {!loading && !error && stats && <div className="administration-columns">
      <section className="administration-activity">
        <header><h3>{t("Anëtarët e fundit","Recent members")}</h3><Link to="/admin/users">{t("Menaxho përdoruesit","Manage users")} →</Link></header>
        {stats.recent_users.length ? <div className="administration-table" tabIndex={0} role="region" aria-label={t("Anëtarët e fundit","Recent members")}>
          <table><thead><tr><th scope="col">{t("Anëtari","Member")}</th><th scope="col">{t("Roli","Role")}</th><th scope="col">{t("Statusi","Status")}</th><th scope="col">{t("Regjistruar më","Joined")}</th></tr></thead>
            <tbody>{stats.recent_users.map(user=><tr key={user.id}><td><strong>{user.username}</strong><small>{user.email}</small></td><td>{adminRoleLabel(user.role,lang)}</td><td><span className={user.is_active?'administration-status':'administration-status is-muted'}>{user.is_active?t("Aktiv","Active"):t("Joaktiv","Inactive")}</span></td><td>{date(user.created_at)}</td></tr>)}</tbody>
          </table></div> : <p className="administration-empty">{t("Nuk ka anëtarë të rinj.","No recent members.")}</p>}
        <header><h3>{t("Forumet e fundit","Recent forums")}</h3><Link to="/admin/forums">{t("Modero forumet","Moderate forums")} →</Link></header>
        {stats.recent_forums.length ? <div className="administration-forum-list">{stats.recent_forums.map(forum=><article key={forum.id}><div><Link to={`/forum/${forum.id}`}>{forum.title}</Link><p>{forum.creator} · {date(forum.created_at)}</p></div><span className="administration-status is-muted">{forum.is_private?t("Privat","Private"):t("Publik","Public")}</span></article>)}</div> : <p className="administration-empty">{t("Nuk ka forume të reja.","No recent forums.")}</p>}
      </section>
      <aside className="administration-actions"><section className="administration-review"><p>{t("Radha e moderimit","Moderation queue")}</p><strong>{stats.reports.pending}</strong><h3>{t("Raportime në pritje të shqyrtimit","Reports awaiting review")}</h3><Link to="/admin/reports">{t("Shqyrto raportimet","Review reports")} →</Link></section></aside>
    </div>}
  </div>;
};
export default AdminDashboard;
