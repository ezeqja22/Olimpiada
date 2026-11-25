/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {loginIntent} from "./navigation";
import "./AdminLayout.css";
import "./AdministrationWorkspace.css";
import {useDialogFocus} from "./hooks/useDialogFocus";
import {useLanguage} from "./context/LanguageContext";
import {visibleAdminGroups, adminLabel, adminPathActive, adminRoleLabel} from "./adminNavigation";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const AdminLayout = () => {
  const {lang, setLang} = useLanguage();
  const t = (sq, en) => lang === "en" ? en : sq;
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useDialogFocus(isMobile && sidebarOpen, () => setSidebarOpen(false));

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");

    const syncLayout = (event) => {
      const mobile = event.matches;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    syncLayout(mediaQuery);
    mediaQuery.addEventListener("change", syncLayout);

    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login", { replace: true, state: loginIntent(location.pathname+location.search+location.hash) });
        return;
      }

      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!["admin", "moderator", "reviewer", "super_admin"].includes(response.data.role)) {
        navigate("/", { replace: true });
        return;
      }

      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
      navigate("/login", { replace: true, state: loginIntent(location.pathname+location.search+location.hash) });
    } finally {
      setLoading(false);
    }
  };

  const groups = visibleAdminGroups(currentUser?.role);
  const activeItem = groups.flatMap(group => group.items).find(item => adminPathActive(item.path, location.pathname));
  const isActiveRoute = path => adminPathActive(path, location.pathname);

  if (loading) {
    return (
      <div className="admin-auth-loading">
        <div className="loading-spinner" />
        <span>{t("Duke ngarkuar panelin…", "Loading admin panel…")}</span>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div
      className={`admin-layout ${sidebarOpen ? "sidebar-expanded" : "sidebar-collapsed"}`}
    >
      {isMobile && sidebarOpen && (
        <button
          type="button"
          className="mobile-overlay show"
          aria-label={t("Mbyll menunë e administrimit", "Close admin navigation")}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside ref={sidebarRef} id="admin-navigation" role={isMobile && sidebarOpen ? "dialog" : undefined} aria-modal={isMobile && sidebarOpen ? true : undefined} aria-label={t("Menuja e administrimit", "Admin navigation")} inert={isMobile && !sidebarOpen ? true : undefined} className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-header">
          {sidebarOpen && <h2>{t("Paneli i administrimit", "Admin Panel")}</h2>}

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? t("Mbyll menunë", "Collapse sidebar") : t("Hap menunë", "Expand sidebar")}
          >
            {isMobile ? "×" : sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="admin-nav administration-navigation" aria-label={t("Menuja e administrimit", "Admin navigation")}>
          {groups.map(group => (
            <div className="administration-nav-group" key={group.id}>
              {sidebarOpen && <h3>{adminLabel(group, lang)}</h3>}
              {group.items.map(item => (
                <Link key={item.path} to={item.path}
                  className={`admin-nav-item ${isActiveRoute(item.path) ? "active" : ""}`}
                  aria-current={isActiveRoute(item.path) ? "page" : undefined}
                  title={!sidebarOpen ? adminLabel(item, lang) : undefined}
                  aria-label={!sidebarOpen ? adminLabel(item, lang) : undefined}>
                  <span className="nav-icon"><img src={item.icon} alt="" /></span>
                  {sidebarOpen && <span className="nav-label">{adminLabel(item, lang)}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="back-to-site"
            onClick={() => navigate("/")}
            aria-label={t("Kthehu në faqe", "Back to Site")}
            title={!sidebarOpen ? t("Kthehu në faqe", "Back to Site") : undefined}
          >
            <span className="nav-icon">
              <img
                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795078/Home_icon_gezrca.svg"
                alt=""
              />
            </span>
            {sidebarOpen && <span className="nav-label">{t("Kthehu në faqe", "Back to Site")}</span>}
          </button>
        </div>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div className="admin-header-left">
            {isMobile && (
              <button
                type="button"
                className="mobile-menu-toggle"
                onClick={() => setSidebarOpen(true)}
                aria-label={t("Hap menunë e administrimit", "Open admin navigation")}
                aria-expanded={sidebarOpen}
                aria-controls="admin-navigation"
              >
                ☰
              </button>
            )}

            <div className="admin-header-copy">
              <div className="administration-breadcrumb"><Link to="/homepage">Olimpiada</Link><Link to="/admin">/ {t("Administrimi", "Administration")}</Link><h1>{activeItem ? adminLabel(activeItem, lang) : t("Administrimi", "Administration")}</h1></div>
              <span className="user-role">
                {adminRoleLabel(currentUser.role, lang)}
              </span>
            </div>
          </div>

          <div className="admin-header-right">
            <span className="welcome-text">{t("Mirë se erdhe", "Welcome")}, {currentUser.username}</span>
            <select className="administration-language" aria-label={t("Gjuha", "Language")} value={lang} onChange={event => setLang(event.target.value)}>
              <option value="sq">Shqip</option>
              <option value="en">English</option>
            </select>
          </div>
        </header>

        <main className="admin-main">
          <Outlet context={{role: currentUser.role}} />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
