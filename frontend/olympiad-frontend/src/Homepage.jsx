import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ChevronDown,
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
    icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811441/numratore_xpudpv.svg",
  },
  {
    title: "Community Learning",
    description:
      "Connect with fellow problem-solvers, share solutions, and learn from the community's collective knowledge.",
    icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760812222/Comunity_lejla_1_kpxiv0.svg",
  },
  {
    title: "Olympiad Focus",
    description:
      "Practice with olympiad-style problems across multiple subjects and difficulty levels to prepare for competitions.",
    icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811741/trofeu_px38ap.svg",
  },
];

const getSubjectIcon = (subject) => {
  const subjectLower = subject?.toLowerCase() || "";

  if (subjectLower.includes("biology")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/Biology_subject_pcxmoa.svg";
  }
  if (subjectLower.includes("chemistry")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/chemistry_subject_r4n7jq.svg";
  }
  if (subjectLower.includes("mathematics") || subjectLower.includes("math")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/math_subject_iqigfx.svg";
  }
  if (subjectLower.includes("physics")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/physics_subject_m90gto.svg";
  }
  if (subjectLower.includes("computer")) {
    return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828176/computer_engineerin_subject_u2m2ze.svg";
  }

  return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760828151/other_subject_nkoxvo.svg";
};

function Homepage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [myForums, setMyForums] = useState([]);
  const [loadingForums, setLoadingForums] = useState(false);
  const [pinnedForums, setPinnedForums] = useState(() => {
    const saved = localStorage.getItem("pinnedForums");
    return saved ? JSON.parse(saved) : [];
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
      : "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809158/Olimpiada_Logo_hosmuj.png";

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
                  event.currentTarget.src =
                    "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809158/Olimpiada_Logo_hosmuj.png";
                }}
              />
              <span className="homepage-site-name">{siteName}</span>
            </Link>
          </div>

          <nav className="desktop-nav" aria-label="Main navigation">
            <Link to="/feed" className="nav-link">
              Feed
            </Link>

            <div className="nav-dropdown-wrap">
              <button
                className="nav-link nav-button"
                onClick={openSubjectDropdown}
                aria-expanded={showSubjectDropdown}
              >
                Subjects <ChevronDown size={15} />
              </button>

              {showSubjectDropdown && (
                <div className="header-dropdown subject-dropdown">
                  {subjects.map((subject) => (
                    <button
                      key={subject}
                      className="dropdown-row"
                      onClick={() => handleSubjectClick(subject)}
                    >
                      <img
                        src={getSubjectIcon(subject)}
                        alt=""
                        aria-hidden="true"
                      />
                      <span>{subject}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link to="/forums" className="nav-link">
              Forums
            </Link>

            {!currentUser ? (
              <div className="desktop-auth-actions">
                <Link to="/login" className="nav-link">
                  Login
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
                  Sign up
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
                  event.currentTarget.src =
                    "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809158/Olimpiada_Logo_hosmuj.png";
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
            <Link to="/feed" className="mobile-nav-link">
              Feed
            </Link>

            <div className="mobile-subject-wrap">
              <button
                className="mobile-nav-link mobile-nav-button"
                onClick={openSubjectDropdown}
                aria-expanded={showSubjectDropdown}
              >
                Subjects <ChevronDown size={14} />
              </button>

              {showSubjectDropdown && (
                <div className="header-dropdown mobile-subject-dropdown">
                  {subjects.map((subject) => (
                    <button
                      key={subject}
                      className="dropdown-row"
                      onClick={() => handleSubjectClick(subject)}
                    >
                      <img
                        src={getSubjectIcon(subject)}
                        alt=""
                        aria-hidden="true"
                      />
                      <span>{subject}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link to="/forums" className="mobile-nav-link">
              Forums
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="homepage-hero">
          <div className="homepage-hero-inner">
            <p className="hero-kicker">Learn. Solve. Grow.</p>
            <h1>Welcome to {siteName}</h1>
            <p className="hero-description">
              {siteSettings.site_description ||
                "Master the art of problem-solving through challenging olympiad problems. Join a community of passionate learners and sharpen your analytical skills."}
            </p>

            <div className="hero-actions">
              <Link to="/feed" className="hero-button hero-button-primary">
                Explore Problems
              </Link>
              <Link
                to="/create-problem?from=/homepage"
                className="hero-button hero-button-secondary"
              >
                Create Problem
              </Link>
            </div>
          </div>
        </section>

        <section className="homepage-features" aria-labelledby="features-title">
          <div className="section-shell">
            <div className="section-heading">
              <span>Why Olimpiada.al</span>
              <h2 id="features-title">Why choose {siteName}?</h2>
            </div>

            <div className="feature-grid">
              {featureCards.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <div className="feature-icon-wrap">
                    <img src={feature.icon} alt="" aria-hidden="true" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <AboutFounders />
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
  return (
    <div className={`header-dropdown user-dropdown ${mobile ? "mobile" : ""}`}>
      <Link to="/profile" className="dropdown-row" onClick={onClose}>
        <UserRound size={17} />
        <span>My Profile</span>
      </Link>

      <Link to="/settings" className="dropdown-row" onClick={onClose}>
        <Settings size={17} />
        <span>Settings</span>
      </Link>

      {currentUser && ["admin", "moderator"].includes(currentUser.role) && (
        <Link
          to="/admin"
          className="dropdown-row dropdown-row-admin"
          onClick={onClose}
        >
          <ShieldCheck size={17} />
          <span>Admin Panel</span>
        </Link>
      )}

      <button className="dropdown-row dropdown-row-danger" onClick={onLogout}>
        <LogOut size={17} />
        <span>Logout</span>
      </button>
    </div>
  );
}

export default Homepage;
