import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage, LanguageSwitch } from "../context/LanguageContext";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { primaryNavigation, moreNavigation, subjects } from "../navigation";
import NotificationBell from "./NotificationBell";
import ForumsSidebar from "./ForumsSidebar";
import "./UnifiedNavigation.css";
import brandMark from "../assets/LOGO_SIPER_ge2sdy.svg";
const API = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
export default function Header() {
  const { currentUser, logout } = useAuth(),
    { lang, t } = useLanguage(),
    { siteSettings } = useSiteSettings();
  const location = useLocation(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [forumsOpen, setForumsOpen] = useState(false),
    [forums, setForums] = useState([]),
    [loading, setLoading] = useState(false);
  const [pins, setPins] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pinnedForums") || "[]");
    } catch {
      return [];
    }
  });
  const trigger = useRef(null),
    panel = useRef(null),
    forumTrigger = useRef(null);
  const forumsEnabled = siteSettings.forums_enabled !== false;
  useEffect(() => {
    if (siteSettings.site_favicon) {
      const link =
        document.querySelector('link[rel*="icon"]') ||
        document.createElement("link");
      link.rel = "icon";
      link.href = siteSettings.site_favicon;
      document.head.appendChild(link);
    }
    if (siteSettings.site_theme) {
      document.documentElement.dataset.theme = siteSettings.site_theme;
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add("theme-" + siteSettings.site_theme);
    }
  }, [siteSettings.site_favicon, siteSettings.site_theme]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  useEffect(() => {
    setOpen(false);
    setForumsOpen(false);
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    const outside = (e) => {
      if (
        !panel.current?.contains(e.target) &&
        !trigger.current?.contains(e.target)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", outside);
    panel.current?.querySelector("a")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  const myForums = async () => {
    setOpen(false);
    setForumsOpen(true);
    setLoading(true);
    try {
      const r = await axios.get(API + "/auth/forums/my-forums", {
        headers: { Authorization: "Bearer " + localStorage.getItem("token") },
      });
      setForums(r.data);
    } catch {
      setForums([]);
    } finally {
      setLoading(false);
    }
  };
  const nav = (item) =>
    item.to === "/forums" && !forumsEnabled ? null : (
      <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)}>
        {item[lang]}
      </NavLink>
    );
  const author =
    currentUser &&
    (currentUser.is_superuser ||
      ["teacher", "admin", "super_admin"].includes(currentUser.role));
  const staff =
    currentUser &&
    ["admin", "super_admin", "moderator", "reviewer"].includes(
      currentUser.role,
    );
  return (
    <>
      <header className="ol-nav">
        <a className="ol-skip" href="#main-content">
          {lang === "sq" ? "Kalo te përmbajtja" : "Skip to content"}
        </a>
        <div className="ol-nav-bar">
          <Link className="ol-brand" to="/homepage">
            <img
              width="30"
              height="36"
              alt=""
              src={
                siteSettings.site_logo ||
                brandMark
              }
            />
            <span>Olimpiada</span>
          </Link>
          <nav className="ol-primary" aria-label={lang === "sq" ? "Navigimi kryesor" : "Primary navigation"}>
            {primaryNavigation.map(nav)}
          </nav>
          <div className="ol-nav-actions">
            {currentUser && <NotificationBell />}
            {!currentUser && (
              <Link to="/login" state={null} className="ol-login">
                {t("login")}
              </Link>
            )}
            <button
              ref={trigger}
              type="button"
              aria-expanded={open}
              aria-controls="ol-menu"
              onClick={() => (open ? close() : setOpen(true))}
            >
              {open ? "×" : "☰"} <span>{lang === "sq" ? "Menu" : "Menu"}</span>
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="ol-menu"
            className="ol-menu"
            ref={panel}
            aria-label={lang === "sq" ? "Navigimi i plotë" : "All navigation"}
          >
            <div>
              <h2>{lang === "sq" ? "Platforma" : "Browse"}</h2>
              {primaryNavigation.map(nav)}
              {moreNavigation.map(nav)}
            </div>
            <div>
              <h2>{t("subjects")}</h2>
              {subjects.map((subject) => (
                <NavLink
                  key={subject}
                  to={"/subject/" + subject.toLowerCase().replace(/\s+/g, "-")}
                >
                  {subject}
                </NavLink>
              ))}
            </div>
            <div>
              <h2>{currentUser?.username || t("login")}</h2>
              {currentUser ? (
                <>
                  <Link to="/profile">{t("profile")}</Link>
                  <Link to="/profile?tab=drafts">
                    {lang === "sq" ? "Draftet" : "Drafts"}
                  </Link>
                  <Link to="/profile?tab=bookmarks">
                    {lang === "sq" ? "Të ruajturat" : "Bookmarks"}
                  </Link>
                  <button ref={forumTrigger} onClick={myForums}>
                    {lang === "sq" ? "Forumet e mia" : "My forums"}
                  </button>
                  <Link to="/family">{t("family")}</Link>
                  <Link to="/settings">{t("settings")}</Link>
                  {author && (
                    <>
                      <Link to="/teacher/workspace">{t("teacher")}</Link>
                      <Link to="/teacher/courses">
                        {lang === "sq"
                          ? "Publiko materiale"
                          : "Publish learning content"}
                      </Link>
                    </>
                  )}
                  {staff && <Link to="/admin">{t("admin")}</Link>}
                  <button
                    onClick={() => {
                      logout();
                      setOpen(false);
                      navigate("/homepage", { replace: true, state: null });
                    }}
                  >
                    {t("logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" state={null}>
                    {t("login")}
                  </Link>
                  <Link to="/signup">{t("signup")}</Link>
                </>
              )}
              <LanguageSwitch />
            </div>
          </nav>
        )}
      </header>
      {forumsOpen && (
        <ForumsSidebar
          open
          onClose={() => {
            setForumsOpen(false);
            trigger.current?.focus();
          }}
          forumsEnabled={forumsEnabled}
          loading={loading}
          forums={forums}
          pinnedForums={pins}
          onForumClick={(id) => navigate("/forum/" + id)}
          onTogglePin={(id) => {
            const next = pins.includes(id)
              ? pins.filter((x) => x !== id)
              : [...pins, id];
            setPins(next);
            localStorage.setItem("pinnedForums", JSON.stringify(next));
          }}
        />
      )}
    </>
  );
}
