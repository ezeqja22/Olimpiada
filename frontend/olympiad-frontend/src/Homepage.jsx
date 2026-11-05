import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronDown,
  ArrowUpRight,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { getUserInitial } from "./utils";
import NotificationBell from "./components/NotificationBell";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import { useAuth } from "./context/AuthContext";
import { useToast } from "./components/ToastProvider";
import AboutFounders from "./components/AboutFounders";
import ForumsSidebar from "./components/ForumsSidebar";
import "./Homepage.css";
import "./phase3.css";
import RichInlineText from "./components/RichInlineText";
import {useLanguage,LanguageSwitch} from "./context/LanguageContext";
import biologySubjectIcon from "./assets/Biology_subject_pcxmoa.svg";
import chemistrySubjectIcon from "./assets/chemistry_subject_r4n7jq.svg";
import computerEngineeringSubjectIcon from "./assets/computer_engineering_subject_u2m2ze.svg";
import communityIcon from "./assets/Comunity_lejla_1_kpxiv0.svg";
import mathSubjectIcon from "./assets/math_subject_iqigfx.svg";
import numratoreIcon from "./assets/numratore_xpudpv.svg";
import olimpiadaLogo from "./assets/Olimpiada_Logo_hosmuj.png";
import otherSubjectIcon from "./assets/other_subject_nkoxvo.svg";
import physicsSubjectIcon from "./assets/physics_subject_m90gto.svg";
import trophyIcon from "./assets/trofeu_px38ap.svg";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Other",
];

const featureCards = [
  {
    title: "Mathematical Excellence",
    description:
      "Solve complex mathematical problems with advanced LaTeX rendering and visual math editor tools.",
    icon: numratoreIcon,
  },
  {
    title: "Community Learning",
    description:
      "Connect with fellow problem-solvers, share solutions, and learn from the community's collective knowledge.",
    icon: communityIcon,
  },
  {
    title: "Olympiad Focus",
    description:
      "Practice with olympiad-style problems across multiple subjects and difficulty levels to prepare for competitions.",
    icon: trophyIcon,
  },
];

const getSubjectIcon = (subject) => {
  const subjectLower = subject?.toLowerCase() || "";

  if (subjectLower.includes("biology")) {
    return biologySubjectIcon;
  }
  if (subjectLower.includes("chemistry")) {
    return chemistrySubjectIcon;
  }
  if (subjectLower.includes("mathematics") || subjectLower.includes("math")) {
    return mathSubjectIcon;
  }
  if (subjectLower.includes("physics")) {
    return physicsSubjectIcon;
  }
  if (subjectLower.includes("computer")) {
    return computerEngineeringSubjectIcon;
  }

  return otherSubjectIcon;
};

function Homepage() {
  const {lang,t}=useLanguage();
  const [contentBlocks,setContentBlocks]=useState({});
  const [teacherProfiles,setTeacherProfiles]=useState([]);
  const copy=(key,field,fallback)=>contentBlocks[key]?.[field+"_"+lang]||fallback;
  const imageFor=(key)=>contentBlocks?.[key]?.image_url||"";
  useEffect(()=>{
     axios.get(API_URL+"/experience/content").then(r=>setContentBlocks(r.data && typeof r.data==="object" ? r.data : {})).catch(()=>{});
     axios.get(API_URL+"/experience/teachers").then(r=>setTeacherProfiles(Array.isArray(r.data) ? r.data : [])).catch(()=>{});
  },[]);
  const [currentUser, setCurrentUser] = useState(null);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [myForums, setMyForums] = useState([]);
  const [loadingForums, setLoadingForums] = useState(false);
  const [pinnedForums, setPinnedForums] = useState(() => {
    const saved = localStorage.getItem("pinnedForums");
    if (!saved) return [];
    try { const parsed=JSON.parse(saved); return Array.isArray(parsed) ? parsed : []; }
    catch { return []; }
  });

  const navigate = useNavigate();
  const { logout } = useAuth();
  const { showToast } = useToast();
  const { siteSettings = {}, loading: settingsLoading } = useSiteSettings();
  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  useEffect(() => {
    if (siteSettings.site_name) {
      document.title = siteSettings.site_name;
    }

    if (siteSettings.site_favicon) {
      const link =
        document.querySelector("link[rel*='icon']") ||
        document.createElement("link");

      link.type = "image/x-icon";
      link.rel = "shortcut icon";
      link.href = siteSettings.site_favicon;
      document.getElementsByTagName("head")[0].appendChild(link);
    }

    if (siteSettings.site_theme) {
      document.documentElement.setAttribute(
        "data-theme",
        siteSettings.site_theme,
      );
      document.body.className = `theme-${siteSettings.site_theme}`;
    }
  }, [
    siteSettings.site_name,
    siteSettings.site_favicon,
    siteSettings.site_theme,
  ]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchCurrentUser();
    }
  }, []);

  useEffect(() => {
    if (!currentUser || settingsLoading) return;

    const notificationAlertShown = sessionStorage.getItem(
      "notificationAlertShown",
    );

    if (
      !notificationAlertShown &&
      !checkFeatureEnabled("notifications_enabled")
    ) {
      const timeout = setTimeout(() => {
        showToast("Notifications are temporarily disabled", "error");
        sessionStorage.setItem("notificationAlertShown", "true");
      }, 1000);

      return () => clearTimeout(timeout);
    }

    return undefined;
  }, [currentUser, settingsLoading, checkFeatureEnabled, showToast]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setShowSubjectDropdown(false);
        setShowUserDropdown(false);
        setShowHamburgerMenu(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
      setCurrentUser(null);
    }
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setShowUserDropdown(false);
    setShowHamburgerMenu(false);
    navigate("/homepage", { replace: true });
  };

  const closeDropdowns = () => {
    setShowSubjectDropdown(false);
    setShowUserDropdown(false);
  };

  const handleSubjectClick = (subject) => {
    closeDropdowns();
    navigate(`/subject/${subject.toLowerCase().replace(/\s+/g, "-")}`);
  };

  const fetchMyForums = async () => {
    if (!currentUser) return;

    setLoadingForums(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/auth/forums/my-forums`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyForums(response.data);
    } catch (error) {
      console.error("Error fetching my forums:", error);
      setMyForums([]);
    } finally {
      setLoadingForums(false);
    }
  };

  const handleHamburgerClick = async () => {
    const willOpen = !showHamburgerMenu;
    setShowHamburgerMenu(willOpen);
    closeDropdowns();

    if (willOpen) {
      await fetchMyForums();
    }
  };

  const handleForumClick = (forumId) => {
    if (!checkFeatureEnabled("forums_enabled")) {
      showFeatureDisabledAlert("Forums");
      return;
    }

    navigate(`/forum/${forumId}`);
    setShowHamburgerMenu(false);
  };

  const togglePin = (forumId) => {
    const newPinnedForums = pinnedForums.includes(forumId)
      ? pinnedForums.filter((id) => id !== forumId)
      : [...pinnedForums, forumId];

    setPinnedForums(newPinnedForums);
    localStorage.setItem("pinnedForums", JSON.stringify(newPinnedForums));
  };

  const sortedForums = [
    ...myForums.filter((forum) => pinnedForums.includes(forum.id)),
    ...myForums.filter((forum) => !pinnedForums.includes(forum.id)),
  ];

  const siteName = siteSettings.site_name || "Olimpiada";
  const siteLogo =
    siteSettings.site_logo && siteSettings.site_logo.trim() !== ""
      ? siteSettings.site_logo
      : olimpiadaLogo;

  const openSubjectDropdown = () => {
    setShowSubjectDropdown((previous) => !previous);
    setShowUserDropdown(false);
  };

  const openUserDropdown = () => {
    setShowUserDropdown((previous) => !previous);
    setShowSubjectDropdown(false);
  };

  return (
    <div className="homepage-page">
      <header className="homepage-header">
        <div className="desktop-header-inner">
          <div className="desktop-brand-area">
            {currentUser && (
              <button
                className="header-icon-button"
                onClick={handleHamburgerClick}
                aria-label="Open my forums"
              >
                <Menu size={22} />
              </button>
            )}

            <Link to="/homepage" className="homepage-brand-link">
              <img
                src={siteLogo}
                alt={`${siteName} logo`}
                className="homepage-logo"
                onError={(event) => {
                  event.currentTarget.src = olimpiadaLogo;
                }}
              />
              <span className="homepage-site-name">{siteName}</span>
            </Link>
          </div>

          <nav className="desktop-nav" aria-label="Main navigation">
            <Link to="/weekly" className="nav-link">{t("weekly")}</Link>
            <Link to="/forum-catalog" className="nav-link">{t("forums")}</Link>
            <Link to="/library" className="nav-link">{t("library")}</Link>
            <div className="nav-dropdown-wrap">
              <button type="button" className="nav-link nav-button" onClick={openSubjectDropdown}
                aria-expanded={showSubjectDropdown}>{t("more")} <ChevronDown size={15}/></button>
              {showSubjectDropdown && <div className="header-dropdown subject-dropdown p3-more-dropdown">
                {[
                  ["/explore",t("explore")],["/courses",t("courses")],
                  ["/feed",t("feed")],["/faq",t("faq")],
                  ["/support",t("support")],["/teacher/apply",t("apply")]
                ].map(([url,title])=><Link key={url} className="dropdown-row" to={url} onClick={closeDropdowns}>{title}</Link>)}
                {currentUser?.role==="teacher"&&<Link className="dropdown-row" to="/teacher/workspace" onClick={closeDropdowns}>{t("teacher")}</Link>}
                <div className="p3-dropdown-separator">{t("subjects")}</div>
                {subjects.map(subject=><button key={subject} type="button" className="dropdown-row"
                    onClick={()=>handleSubjectClick(subject)}>{subject}</button>)}
              </div>}
            </div>
            {!currentUser ? (
              <div className="desktop-auth-actions">
                <Link to="/login" className="nav-link">
                  {t("login")}
                </Link>
                <button
                  className="signup-button"
                  onClick={() => {
                    if (checkFeatureEnabled("registration_enabled")) {
                      navigate("/signup");
                    } else {
                      showFeatureDisabledAlert("Registration");
                    }
                  }}
                >
                  {t("signup")}
                </button>
              </div>
            ) : (
              <div className="desktop-user-actions">
                <NotificationBell />

                <div className="nav-dropdown-wrap">
                  <button
                    className="user-menu-trigger"
                    onClick={openUserDropdown}
                    aria-expanded={showUserDropdown}
                  >
                    {currentUser.profile_picture ? (
                      <img
                        src={currentUser.profile_picture}
                        alt=""
                        className="header-avatar"
                      />
                    ) : (
                      <span className="header-avatar-fallback">
                        {getUserInitial(currentUser.username)}
                      </span>
                    )}
                    <span className="header-username">
                      {currentUser.username}
                    </span>
                    <ChevronDown size={14} />
                  </button>

                  {showUserDropdown && (
                    <UserDropdown
                      currentUser={currentUser}
                      onLogout={handleLogout}
                      onClose={() => setShowUserDropdown(false)}
                    />
                  )}
                </div>
              </div>
            )}
            <LanguageSwitch />
          </nav>
        </div>

        <div className="mobile-header">
          <div className="mobile-top-row">
            <div className="mobile-left-slot">
              {currentUser && (
                <button
                  className="mobile-icon-button"
                  onClick={handleHamburgerClick}
                  aria-label="Open my forums"
                >
                  <Menu size={21} />
                </button>
              )}
            </div>

            <Link to="/homepage" className="mobile-brand-link">
              <img
                src={siteLogo}
                alt={`${siteName} logo`}
                className="mobile-logo"
                onError={(event) => {
                  event.currentTarget.src = olimpiadaLogo;
                }}
              />
              <span>{siteName}</span>
            </Link>

            <div className="mobile-right-slot">
              {currentUser ? (
                <>
                  <div className="mobile-notification-wrap">
                    <NotificationBell />
                  </div>
                  <div className="mobile-user-wrap">
                    <button
                      className="mobile-profile-button"
                      onClick={openUserDropdown}
                      aria-label="Open account menu"
                      aria-expanded={showUserDropdown}
                    >
                      {currentUser.profile_picture ? (
                        <img
                          src={currentUser.profile_picture}
                          alt=""
                          className="mobile-avatar"
                        />
                      ) : (
                        <span className="mobile-avatar-fallback">
                          {getUserInitial(currentUser.username)}
                        </span>
                      )}
                    </button>

                    {showUserDropdown && (
                      <UserDropdown
                        currentUser={currentUser}
                        onLogout={handleLogout}
                        onClose={() => setShowUserDropdown(false)}
                        mobile
                      />
                    )}
                  </div>
                </>
              ) : (
                <Link to="/login" className="mobile-login-link">
                  Login
                </Link>
              )}
            </div>
          </div>

          <nav className="mobile-nav-row" aria-label="Mobile navigation">
            <LanguageSwitch />
            <Link to="/weekly" className="mobile-nav-link">{t("weekly")}</Link>
            <Link to="/forum-catalog" className="mobile-nav-link">{t("forums")}</Link>
            <Link to="/library" className="mobile-nav-link">{t("library")}</Link>
            <div className="mobile-subject-wrap">
              <button type="button" className="mobile-nav-link mobile-nav-button"
                onClick={openSubjectDropdown} aria-expanded={showSubjectDropdown}>{t("more")} <ChevronDown size={14}/></button>
              {showSubjectDropdown&&<div className="header-dropdown mobile-subject-dropdown">
                {[
                  ["/explore",t("explore")],["/courses",t("courses")],
                  ["/feed",t("feed")],["/faq",t("faq")],
                  ["/support",t("support")],["/teacher/apply",t("apply")]
                ].map(([url,title])=><Link key={url} to={url} className="dropdown-row" onClick={closeDropdowns}>{title}</Link>)}
                {currentUser?.role==="teacher"&&<Link className="dropdown-row" to="/teacher/workspace" onClick={closeDropdowns}>{t("teacher")}</Link>}
                <div className="p3-dropdown-separator">{t("subjects")}</div>
                {subjects.map(subject=><button key={subject} type="button" className="dropdown-row"
                  onClick={()=>handleSubjectClick(subject)}>{subject}</button>)}
              </div>}
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="homepage-hero">
          <div className="homepage-hero-inner">
            <div className="p3-hero-copy">
              <p className="hero-kicker">{t("heroLabel")}</p>
              <h1><RichInlineText text={copy("hero","title",t("heroTitle"))} /></h1>
              <p className="hero-description p3-rich-inline"><RichInlineText text={copy("hero","subtitle",t("heroDesc"))} /></p>
              <div className="hero-actions">
                <Link to="/explore" className="hero-button hero-button-primary">{t("start")}</Link>
                <Link to="/weekly" className="hero-button hero-button-secondary">{t("weekly")} →</Link>
              </div>
            </div>
            <div className="p3-hero-image">
              {imageFor("hero")?<img src={imageFor("hero")} fetchPriority="high" decoding="async" alt={lang==="sq"?"Nxënës duke zgjidhur detyra në një olimpiadë":"Student solving problems at a mathematics olympiad"} />:
              <div className="p3-hero-placeholder" aria-hidden="true"><span>∞</span></div>}
              <div className="p3-photo-caption">✦ {t("heroLabel")}</div>
            </div>
          </div>
        </section>
        <section className="p3-home-shell">
          <header className="p3-section-head p3-section-head--intro">
            <div className="p3-section-heading-copy">
              <span className="p3-eyebrow p3-section-label"><span className="p3-label-dot" aria-hidden="true" />{lang==="sq"?"Olimpiada.al · Hapësira jote":"Olimpiada.al · Your space"}</span>
              <h2><RichInlineText text={copy("home_intro","title",t("popular"))} /></h2>
            </div>
            <div className="p3-intro-aside">
              <p className="p3-section-summary p3-rich-inline"><RichInlineText text={copy("home_intro","subtitle",lang==="sq"
                ?"Nga Problema e Javës te forumet, materialet dhe testet: gjej mjetet që të ndihmojnë të përparosh."
                :"From the Problem of the Week to forums, lessons and tests: find the tools to take your next step.")} /></p>
              {imageFor("home_intro") && <img className="p3-section-thumb" loading="lazy" src={imageFor("home_intro")} alt="Olimpiada" />}
            </div>
          </header>
          <div className="p3-feature-grid">
            {[
              {key:"home_feature_weekly",icon:"✦",title:t("weekly"),description:lang==="sq"?"Një problem i ri çdo javë dhe publikim i zgjidhjeve.":"A new challenge every week with published solutions.",to:"/weekly"},
              {key:"home_feature_forums",icon:"◈",title:t("forums"),description:lang==="sq"?"Diskuto ide dhe puno me mësues e nxënës të tjerë.":"Discuss ideas with teachers and peers.",to:"/forum-catalog"},
              {key:"home_feature_library",icon:"▤",title:t("library"),description:t("libraryDesc"),to:"/library"},
              {key:"home_feature_courses",icon:"◷",title:t("courses"),description:lang==="sq"?"Teste të programuara dhe materiale të organizuara.":"Scheduled tests and structured study materials.",to:"/courses"},
              {key:"home_feature_support",icon:"☏",title:t("support"),description:lang==="sq"?"Ndihmë e shpejtë kur të duhet.":"Help when you need it.",to:"/support"}
            ].map(f=><article className="p3-feature-card" key={f.key}>
              {imageFor(f.key) && <img className="p3-feature-card__image" loading="lazy" decoding="async" src={imageFor(f.key)} alt="" />}
              <span aria-hidden="true">{f.icon}</span>
              <h3><RichInlineText text={copy(f.key,"title",f.title)} /></h3>
              <p className="p3-rich-inline"><RichInlineText text={copy(f.key,"subtitle",f.description)} /></p>
              <Link className="p3-feature-card__action" to={f.to}>{t("learn")} →</Link></article>)}
          </div>
          <div className="p3-visual-row">
            {imageFor("competition")?<img loading="lazy" decoding="async" src={imageFor("competition")} alt={lang==="sq"?"Salla e garës gjatë një olimpiade matematike":"Mathematics olympiad competition hall"}/>:
              <div className="p3-visual-fallback" aria-hidden="true">✧</div>}
            <div className="p3-visual-copy"><span className="p3-eyebrow">{lang==="sq"?"Fryma e olimpiadës":"Olympiad spirit"}</span>
              <h2><RichInlineText text={copy("competition","title",t("competition"))} /></h2>
              <p className="p3-rich-inline"><RichInlineText text={copy("competition","subtitle",t("competitionDesc"))} /></p><Link to="/weekly">{t("discover")} →</Link></div>
          </div>
          <div className="p3-visual-row reverse">
            <div className="p3-visual-copy"><span className="p3-eyebrow">{lang==="sq"?"Komuniteti ynë":"Our community"}</span>
              <h2><RichInlineText text={copy("community","title",t("community"))} /></h2>
              <p className="p3-rich-inline"><RichInlineText text={copy("community","subtitle",t("heroDesc"))} /></p><Link to="/forum-catalog">{t("meet")} →</Link></div>
            {imageFor("community")?<img loading="lazy" decoding="async" src={imageFor("community")} alt={lang==="sq"?"Ekipi shqiptar në Olimpiadën Ndërkombëtare të Matematikës":"Albanian team at the International Mathematical Olympiad"}/>:
              <div className="p3-visual-fallback" aria-hidden="true">★</div>}
          </div>
          <div className="p3-visual-row p3-book-row">
            {imageFor("library")?<img loading="lazy" decoding="async" src={imageFor("library")} alt={lang==="sq"?"Libri i olimpiadës së matematikës":"Mathematics olympiad booklet cover"}/>:
              <div className="p3-visual-fallback" aria-hidden="true">▤</div>}
            <div className="p3-visual-copy"><span className="p3-eyebrow">{lang==="sq"?"Biblioteka digjitale":"Digital library"}</span>
              <h2><RichInlineText text={copy("library","title",t("libraryTitle"))} /></h2>
              <p className="p3-rich-inline"><RichInlineText text={copy("library","subtitle",t("libraryDesc"))} /></p><Link to="/library">{t("library")} →</Link></div>
          </div>
          {teacherProfiles.length>0&&<section className="p3-mentors">
            <header className="p3-section-head p3-section-head--mentors">
              <div className="p3-section-heading-copy">
                <span className="p3-eyebrow p3-section-label"><span className="p3-label-dot" aria-hidden="true" />{lang==="sq"?"Mentorët tanë":"Meet your mentors"}</span>
                <h2><RichInlineText text={copy("home_mentors","title",lang==="sq"?"Përparimi yt nis me mentorin e duhur.":"Your next breakthrough starts with the right mentor.")} /></h2>
                <p className="p3-section-summary p3-rich-inline"><RichInlineText text={copy("home_mentors","subtitle",lang==="sq"
                  ?"Mëso hap pas hapi, sqaro pyetjet dhe përgatitu më mirë me udhëzim individual."
                  :"Ask better questions, build confidence and make progress with one-to-one guidance.")} /></p>
                {imageFor("home_mentors")&&<img className="p3-mentor-accent" src={imageFor("home_mentors")} loading="lazy" alt="" />}
              </div>
              <Link to="/tutoring" className="p3-mentor-action">
                {lang==="sq"?"Shiko seancat individuale":"Explore one-to-one sessions"}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </header>
            <div className="p3-feature-grid">{teacherProfiles.slice(0,3).map(person=><article className="p3-mentor-card" key={person.user_id}>
              <img decoding="async" src={API_URL+"/experience/teachers/"+person.user_id+"/portrait"}
                   loading="lazy" alt={person.first_name+" "+person.last_name}/>
              <div><span className="p3-eyebrow">{person.subject}</span><h3>{person.first_name} {person.last_name}</h3>
                <p className="p3-rich-inline"><RichInlineText text={person.bio} /></p></div></article>)}</div>
          </section>}
          <div className="p3-partner-section">
            <div><span>{t("partner")}</span><h3><RichInlineText text={copy("partner","title","Spark Education")} /></h3>
              <p className="p3-rich-inline"><RichInlineText text={copy("partner","subtitle",lang==="sq"?"Bashkë për më shumë mundësi në matematikë dhe shkenca.":"Building new opportunities in mathematics and science.")} /></p></div>
            {imageFor("partner")?<img loading="lazy" decoding="async" src={imageFor("partner")} alt="Logoja e SPARK Education" />:<div className="p3-spark-wordmark">SPARK</div>}
          </div>
          <section className="p3-final-cta" style={imageFor("cta")?{backgroundImage:`linear-gradient(90deg,rgba(7,36,56,.94),rgba(7,36,56,.54)),url("${imageFor("cta")}")`}:undefined}>
            <span className="p3-eyebrow">Olimpiada.al</span>
            <h2><RichInlineText text={copy("cta","title",lang==="sq"?"Gati për sfidën tjetër?":"Ready for your next challenge?")} /></h2>
            <p className="p3-rich-inline"><RichInlineText text={copy("cta","subtitle",lang==="sq"?"Fillo me Problemen e Javës dhe eksploro materialet.":"Start with the Problem of the Week and explore learning resources.")} /></p>
            <Link to={contentBlocks.cta?.button_url||"/explore"} className="p1-btn">{lang==="sq"?"Fillo tani":"Get started"} →</Link>
          </section>
        </section>
        <AboutFounders />
        <footer className="p3-footer"><span>© {new Date().getFullYear()} Olimpiada.al · {t("allRights")}</span>
          <div><Link to="/faq">{t("faq")}</Link><Link to="/support">{t("contact")}</Link><Link to="/teacher/apply">{t("apply")}</Link></div></footer>
      </main>

      {(showSubjectDropdown || showUserDropdown) && (
        <button
          className="page-backdrop dropdown-backdrop"
          onClick={closeDropdowns}
          aria-label="Close open menu"
        />
      )}

      <ForumsSidebar
        open={showHamburgerMenu}
        onClose={() => setShowHamburgerMenu(false)}
        forumsEnabled={checkFeatureEnabled("forums_enabled")}
        loading={loadingForums}
        forums={sortedForums}
        pinnedForums={pinnedForums}
        onForumClick={handleForumClick}
        onTogglePin={togglePin}
      />
    </div>
  );
}

function UserDropdown({ currentUser, onLogout, onClose, mobile = false }) {
  const {t}=useLanguage();
  return (
    <div className={`header-dropdown user-dropdown ${mobile ? "mobile" : ""}`}>
      <Link to="/profile" className="dropdown-row" onClick={onClose}>
        <UserRound size={17} />
        <span>{t("profile")}</span>
      </Link>

      <Link to="/family" className="dropdown-row" onClick={onClose}><UserRound size={17} /><span>{t("family")}</span></Link>

      <Link to="/settings" className="dropdown-row" onClick={onClose}>
        <Settings size={17} />
        <span>{t("settings")}</span>
      </Link>

      {currentUser && ["admin", "moderator", "reviewer", "super_admin"].includes(currentUser.role) && (
        <Link
          to="/admin"
          className="dropdown-row dropdown-row-admin"
          onClick={onClose}
        >
          <ShieldCheck size={17} />
          <span>{t("admin")}</span>
        </Link>
      )}

      <button className="dropdown-row dropdown-row-danger" onClick={onLogout}>
        <LogOut size={17} />
        <span>{t("logout")}</span>
      </button>
    </div>
  );
}

export default Homepage;
