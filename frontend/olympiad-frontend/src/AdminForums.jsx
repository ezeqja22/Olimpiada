import {useLanguage} from "./context/LanguageContext";
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState, useRef } from "react";
import {Link} from "react-router-dom";
import "./AdministrationWorkspace.css";
import axios from "axios";
import { useToast } from "./components/ToastProvider";
import { useConfirm } from "./components/ConfirmProvider";
import "./AdminLayout.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const AdminForums = () => {
  const {lang}=useLanguage();
  const tr=(en,sq)=>lang==='sq'?sq:en;

  const requestVersion = useRef(0);
  const [search, setSearch] = useState("");
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    privacy: "",
    page: 1,
  });

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchForums();
  }, [filters]);

  useEffect(() => {
    const timer=setTimeout(()=>setFilters(previous=>previous.search===search?previous:({...previous,search,page:1})),250);
    return ()=>clearTimeout(timer);
  }, [search]);

  const fetchForums = async () => {
    const version=++requestVersion.current;
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.privacy) params.append("privacy", filters.privacy);
      params.append("page", filters.page);
      params.append("limit", 20);

      const response = await axios.get(`${API_URL}/admin/forums?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if(version!==requestVersion.current)return;
      setForums(response.data.forums);
      setPagination(response.data.pagination);
    } catch (err) {
      if(version!==requestVersion.current)return;
      setError(tr("Failed to load forums","Forumet nuk u ngarkuan"));
      console.error("Forums error:", err);
    } finally {
      if(version===requestVersion.current)setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleDeleteForum = async (forumId, forumTitle) => {
    const confirmed = await confirm({
      title: "Delete forum?",
      message: `Are you sure you want to delete the forum "${forumTitle}"? This action cannot be undone.`,
      confirmText: "Delete forum",
      cancelText: "Cancel",
      variant: "success",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/admin/forums/${forumId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Forum deleted successfully", "success");
      fetchForums();
    } catch (err) {
      console.error("Delete forum error:", err);
      showToast("Failed to delete forum", "error");
    }
  };

  const getPrivacyBadge = (isPrivate) => (
    <span className={`status-badge ${isPrivate ? "inactive" : "active"}`}>
      {isPrivate ? tr("Private","Privat") : tr("Public","Publik")}
    </span>
  );

  const formatDate = (dateString) => {
    if (!dateString) return "—";

    return new Date(dateString).toLocaleDateString(lang==="sq"?"sq-AL":"en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="administration-directory">
      <header className="administration-heading"><div><p>{tr("Community / Forums","Komuniteti / Forumet")}</p><h2>{tr("Forum Management","Administrimi i forumeve")}</h2></div><Link to="/forums">{tr("Open forum directory →","Hap listën e forumeve →")}</Link></header>
      <div className="administration-directory-columns">
        <aside className="administration-filters"><h3>{tr("Find a forum","Gjej një forum")}</h3>
          <label htmlFor="forum-search">{tr("Search all forums","Kërko të gjitha forumet")}</label><input id="forum-search" type="search" value={search} onChange={event=>setSearch(event.target.value)} placeholder={tr("Forum title…","Titulli i forumit…")}/>
          <label htmlFor="forum-privacy">{tr("Privacy","Privatësia")}</label><select id="forum-privacy" value={filters.privacy} onChange={event=>handleFilterChange("privacy",event.target.value)}><option value="">{tr("All forums","Të gjitha forumet")}</option><option value="public">{tr("Public","Publik")}</option><option value="private">{tr("Private","Privat")}</option></select>
          <button onClick={()=>{setSearch("");setFilters({search:"",privacy:"",page:1});}}>{tr("Clear filters","Pastro filtrat")}</button>
          <p>{tr("Review forum visibility and ownership. Open a forum to manage its discussions and memberships.","Shqyrto dukshmërinë dhe pronësinë e forumeve. Hap një forum për të administruar diskutimet dhe anëtarësimet.")}</p>
        </aside>
        <section className="administration-directory-results" aria-label={tr("Forum results","Rezultatet e kërkimit")} aria-busy={loading}>
          {loading&&<p role="status">{tr("Loading forums…","Duke ngarkuar forumet…")}</p>}
          {error&&<p role="alert">{error} <button onClick={fetchForums}>{tr("Try again","Provo përsëri")}</button></p>}
        <div className="administration-table" tabIndex={0} aria-label={tr("Forums table, scroll horizontally for more columns","Tabela e forumeve; lëviz horizontalisht për më shumë kolona")}>

          <table>
            <thead>
              <tr>
                <th>{tr("Forum","Forumi")}</th>
                <th>{tr("Creator","Krijuesi")}</th>
                <th>{tr("Type","Lloji")}</th>
                <th>{tr("Members","Anëtarët")}</th>
                <th>{tr("Created","Krijuar")}</th>
                <th>{tr("Last Activity","Aktiviteti i fundit")}</th>
                <th>{tr("Actions","Veprimet")}</th>
              </tr>
            </thead>
            <tbody>
              {forums.map((forum) => (
                <tr key={forum.id}>
                  <td>
                    <div className="admin-primary-cell admin-wide-cell">
                      <Link to={`/forum/${forum.id}`}>{forum.title}</Link>
                      {forum.description && (
                        <small>
                          {forum.description.length > 100
                            ? `${forum.description.substring(0, 100)}...`
                            : forum.description}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{forum.creator}</strong>
                  </td>
                  <td>{getPrivacyBadge(forum.is_private)}</td>
                  <td>
                    <span className="admin-neutral-badge">
                      {forum.max_members} max
                    </span>
                  </td>
                  <td>{formatDate(forum.created_at)}</td>
                  <td>{formatDate(forum.last_activity)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <Link className="admin-btn secondary admin-btn-small" to={`/forum/${forum.id}`}>{tr("View","Shiko")}</Link>

                      <button
                        className="admin-btn danger admin-btn-small"
                        onClick={() => handleDeleteForum(forum.id, forum.title)}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811026/Delete_Icon_White_pjg21g.svg"
                          alt=""
                        />
                        {tr("Delete","Fshi")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && !error && forums.length === 0 && (
          <div className="empty-state">
            <h3>{tr("No forums found","Nuk u gjet asnjë forum")}</h3>
            <p>{tr("No forums match your current filters.","Asnjë forum nuk përputhet me filtrat e zgjedhur.")}</p>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-text">
              {tr('Page','Faqja')} {filters.page} {tr('of','nga')} {pagination.pages}
            </span>

            <div className="admin-pagination-actions">
              <button
                className="admin-btn secondary"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page <= 1}
              >
                {tr("Previous","Mëparshmja")}
              </button>

              <button
                className="admin-btn secondary"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page >= pagination.pages}
              >
                {tr("Next","Tjetra")}
              </button>
            </div>
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

export default AdminForums;
