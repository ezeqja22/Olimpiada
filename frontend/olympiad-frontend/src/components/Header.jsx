import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { typography } from "../designSystem";
import { getUserInitial } from "../utils";
import NotificationBell from "./NotificationBell";
import ForumsSidebar from "./ForumsSidebar";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { useFeatureSettings } from "../hooks/useFeatureSettings";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const DEFAULT_LOGO =
  "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760809158/Olimpiada_Logo_hosmuj.png";

const SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Other",
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

const ChevronIcon = () => (
  <svg
    className="site-header-chevron"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m6 8 4 4 4-4" />
  </svg>
);

function Header({ showHomeButton = false }) {
  const { currentUser, authLoading, logout } = useAuth();

  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [myForums, setMyForums] = useState([]);
  const [loadingForums, setLoadingForums] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [pinnedForums, setPinnedForums] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  const { siteSettings } = useSiteSettings();
  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();

  const shouldHideFeedButton =
    isMobile &&
    (location.pathname === "/feed" || location.pathname.startsWith("/feed"));

  const shouldHideForumsButton =
    isMobile &&
    (location.pathname === "/forums" ||
      location.pathname.startsWith("/forum/"));

  const shouldHideSubjectDropdown =
    isMobile && location.pathname.startsWith("/subject/");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1020px)");

    const updateMobileState = () => {
      setIsMobile(mediaQuery.matches);
    };

    updateMobileState();
    mediaQuery.addEventListener("change", updateMobileState);

    return () => {
      mediaQuery.removeEventListener("change", updateMobileState);
    };
  }, []);

  useEffect(() => {
    setShowSubjectDropdown(false);
    setShowUserDropdown(false);
  }, [location.pathname]);

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
    const savedPinnedForums = localStorage.getItem("pinnedForums");

    if (!savedPinnedForums) return;

    try {
      setPinnedForums(JSON.parse(savedPinnedForums));
    } catch (error) {
      console.error("Error parsing pinned forums:", error);
      localStorage.removeItem("pinnedForums");
    }
  }, []);

  const fetchMyForums = async () => {
    if (!currentUser) return;

    setLoadingForums(true);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`${API_URL}/auth/forums/my-forums`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMyForums(response.data);
    } catch (error) {
      console.error("Error fetching my forums:", error);
      setMyForums([]);
    } finally {
      setLoadingForums(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserDropdown(false);
    setShowHamburgerMenu(false);
    navigate("/homepage", { replace: true });
  };

  const handleSubjectClick = (subject) => {
    navigate(`/subject/${subject.toLowerCase().replace(/\s+/g, "-")}`);
    setShowSubjectDropdown(false);
  };

  const handleHamburgerClick = () => {
    if (!showHamburgerMenu) {
      fetchMyForums();
    }

    setShowHamburgerMenu((previous) => !previous);
    setShowSubjectDropdown(false);
    setShowUserDropdown(false);
  };

  const handleForumClick = (forumId) => {
    if (!checkFeatureEnabled("forums_enabled")) {
      showFeatureDisabledAlert("Forums");
      return;
    }

    navigate(`/forum/${forumId}`);
    setShowHamburgerMenu(false);
  };

  const handleMenuClose = () => {
    setShowHamburgerMenu(false);
  };

  const togglePin = (forumId) => {
    setPinnedForums((previous) => {
      const isPinned = previous.includes(forumId);

      const newPinnedForums = isPinned
        ? previous.filter((id) => id !== forumId)
        : [...previous, forumId];

      localStorage.setItem("pinnedForums", JSON.stringify(newPinnedForums));

      return newPinnedForums;
    });
  };

  const handleForumsNavigation = () => {
    if (checkFeatureEnabled("forums_enabled")) {
      navigate("/forums");
      setShowSubjectDropdown(false);
      setShowUserDropdown(false);
      return;
    }

    showFeatureDisabledAlert("Forums");
  };

  const renderAuthLoadingDesktop = () => (
    <div className="site-header-auth-skeleton site-header-auth-skeleton--desktop" />
  );

  const renderAuthLoadingMobile = () => (
    <div className="site-header-auth-skeleton site-header-auth-skeleton--mobile" />
  );

  const renderUserAvatar = (
    size = 32,
    fontSize = typography.fontSize.sm,
    className = "",
  ) => {
    if (!currentUser) return null;

    if (currentUser.profile_picture) {
      return (
        <img
          src={currentUser.profile_picture}
          alt={`${currentUser.username}'s profile`}
          className={`site-header-avatar ${className}`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
          }}
        />
      );
    }

    return (
      <div
        className={`site-header-avatar-fallback ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          fontSize,
        }}
        aria-hidden="true"
      >
        {getUserInitial(currentUser.username)}
      </div>
    );
  };

  const renderSubjectDropdown = (mobile = false) => {
    if (!showSubjectDropdown) return null;

    return (
      <div
        className={`site-header-dropdown site-header-subject-dropdown ${
          mobile ? "site-header-dropdown--mobile" : ""
        }`}
      >
        {SUBJECTS.map((subject) => (
          <button
            key={subject}
            type="button"
            className="site-header-dropdown-row"
            onClick={() => handleSubjectClick(subject)}
          >
            <img src={getSubjectIcon(subject)} alt="" aria-hidden="true" />
            <span>{subject}</span>
          </button>
        ))}
      </div>
    );
  };

  const renderUserDropdown = (mobile = false) => {
    if (!showUserDropdown || !currentUser) return null;

    return (
      <div
        className={`site-header-dropdown site-header-user-dropdown ${
          mobile ? "site-header-user-dropdown--mobile" : ""
        }`}
      >
        <Link
          to="/profile"
          className="site-header-dropdown-row"
          onClick={() => setShowUserDropdown(false)}
        >
          <img
            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Profile_Icon_Green_t3zoz5.svg"
            alt=""
            aria-hidden="true"
          />
          <span>My Profile</span>
        </Link>

        <Link
          to="/settings"
          className="site-header-dropdown-row"
          onClick={() => setShowUserDropdown(false)}
        >
          <img
            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
            alt=""
            aria-hidden="true"
          />
          <span>Settings</span>
        </Link>

        {(currentUser.role === "admin" || currentUser.role === "moderator") && (
          <Link
            to="/admin"
            className="site-header-dropdown-row site-header-dropdown-row--admin"
            onClick={() => setShowUserDropdown(false)}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
              alt=""
              aria-hidden="true"
            />
            <span>Admin Panel</span>
          </Link>
        )}

        <button
          type="button"
          className="site-header-dropdown-row site-header-dropdown-row--danger"
          onClick={handleLogout}
        >
          <img
            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760802149/LOG_OUT_RED_d1wwc3.svg"
            alt=""
            aria-hidden="true"
          />
          <span>Logout</span>
        </button>
      </div>
    );
  };

  const renderDesktopAuthSection = () => {
    if (authLoading) {
      return renderAuthLoadingDesktop();
    }

    if (!currentUser) {
      return (
        <div className="site-header-desktop-auth-actions">
          <Link to="/login" className="site-header-login-link">
            Login
          </Link>

          <button
            type="button"
            className="site-header-signup-button"
            onClick={() => {
              if (checkFeatureEnabled("registration_enabled")) {
                navigate("/signup");
              } else {
                showFeatureDisabledAlert("Registration");
              }
            }}
          >
            Signup
          </button>
        </div>
      );
    }

    return (
      <div className="site-header-desktop-user-actions">
        <NotificationBell />

        <div className="site-header-user-wrap">
          <button
            type="button"
            className="site-header-user-trigger"
            onClick={(event) => {
              event.stopPropagation();
              setShowUserDropdown((previous) => !previous);
              setShowSubjectDropdown(false);
            }}
            aria-expanded={showUserDropdown}
            aria-haspopup="menu"
          >
            {renderUserAvatar(34, typography.fontSize.sm)}

            <span className="site-header-username">{currentUser.username}</span>

            <ChevronIcon />
          </button>

          {renderUserDropdown(false)}
        </div>
      </div>
    );
  };

  const renderMobileAuthSection = () => {
    if (authLoading) {
      return renderAuthLoadingMobile();
    }

    if (!currentUser) {
      return (
        <Link to="/login" className="site-header-mobile-login-link">
          Login
        </Link>
      );
    }

    return (
      <>
        <div className="site-header-mobile-notification-wrap">
          <NotificationBell />
        </div>

        <div className="site-header-user-wrap site-header-mobile-user-wrap">
          <button
            type="button"
            className="site-header-mobile-profile-button"
            onClick={() => {
              setShowUserDropdown((previous) => !previous);
              setShowSubjectDropdown(false);
            }}
            aria-label="Open profile menu"
            aria-expanded={showUserDropdown}
          >
            {renderUserAvatar(30, "0.78rem", "site-header-mobile-avatar")}
          </button>

          {renderUserDropdown(true)}
        </div>
      </>
    );
  };

  const mobileNavItems = [
    !shouldHideFeedButton
      ? {
          key: "feed",
          element: (
            <Link to="/feed" className="site-header-mobile-nav-link">
              Feed
            </Link>
          ),
        }
      : null,
    !shouldHideSubjectDropdown
      ? {
          key: "subject",
          element: (
            <div className="site-header-mobile-subject-wrap">
              <button
                type="button"
                className="site-header-mobile-nav-link site-header-mobile-nav-button"
                onClick={() => {
                  setShowSubjectDropdown((previous) => !previous);
                  setShowUserDropdown(false);
                }}
                aria-expanded={showSubjectDropdown}
              >
                Subject
                <ChevronIcon />
              </button>

              {renderSubjectDropdown(true)}
            </div>
          ),
        }
      : null,
    !shouldHideForumsButton
      ? {
          key: "forums",
          element: (
            <button
              type="button"
              className="site-header-mobile-nav-link site-header-mobile-nav-button"
              onClick={handleForumsNavigation}
            >
              Forums
            </button>
          ),
        }
      : null,
  ].filter(Boolean);

  return (
    <>
      <header className="site-header">
        <div className="site-header-desktop">
          <div className="site-header-desktop-inner">
            <div className="site-header-brand-area">
              {!authLoading && currentUser && (
                <button
                  type="button"
                  className="site-header-icon-button"
                  onClick={handleHamburgerClick}
                  aria-label="Open forums menu"
                >
                  <img
                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              )}

              <Link to="/homepage" className="site-header-brand-link">
                <img
                  src={
                    siteSettings.site_logo &&
                    siteSettings.site_logo.trim() !== ""
                      ? siteSettings.site_logo
                      : DEFAULT_LOGO
                  }
                  alt={siteSettings.site_name || "Olimpiada"}
                  className="site-header-logo"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_LOGO;
                  }}
                />

                <span className="site-header-site-name">
                  {siteSettings.site_name || "Olimpiada"}
                </span>
              </Link>
            </div>

            <nav className="site-header-desktop-nav">
              {showHomeButton && (
                <Link to="/homepage" className="site-header-nav-link">
                  <img
                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795078/Home_icon_gezrca.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  Home
                </Link>
              )}

              <Link to="/feed" className="site-header-nav-link">
                Feed
              </Link>

              <div className="site-header-subject-wrap">
                <button
                  type="button"
                  className="site-header-nav-link site-header-nav-button"
                  onClick={() => {
                    setShowSubjectDropdown((previous) => !previous);
                    setShowUserDropdown(false);
                  }}
                  aria-expanded={showSubjectDropdown}
                >
                  Subject
                  <ChevronIcon />
                </button>

                {renderSubjectDropdown(false)}
              </div>

              <button
                type="button"
                className="site-header-nav-link site-header-nav-button"
                onClick={handleForumsNavigation}
              >
                Forums
              </button>

              {renderDesktopAuthSection()}
            </nav>
          </div>
        </div>

        <div className="site-header-mobile">
          <div className="site-header-mobile-top-row">
            <div className="site-header-mobile-left-slot">
              {!authLoading && currentUser && (
                <button
                  type="button"
                  className="site-header-mobile-icon-button"
                  onClick={handleHamburgerClick}
                  aria-label="Open forums menu"
                >
                  <img
                    src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
                    alt=""
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            <Link to="/homepage" className="site-header-mobile-brand-link">
              <img
                src={
                  siteSettings.site_logo && siteSettings.site_logo.trim() !== ""
                    ? siteSettings.site_logo
                    : DEFAULT_LOGO
                }
                alt={siteSettings.site_name || "Olimpiada"}
                className="site-header-mobile-logo"
                onError={(event) => {
                  event.currentTarget.src = DEFAULT_LOGO;
                }}
              />

              <span>{siteSettings.site_name || "Olimpiada"}</span>
            </Link>

            <div className="site-header-mobile-right-slot">
              {renderMobileAuthSection()}
            </div>
          </div>

          {mobileNavItems.length > 0 && (
            <div
              className="site-header-mobile-nav-row"
              style={{
                gridTemplateColumns: `repeat(${mobileNavItems.length}, minmax(0, 1fr))`,
              }}
            >
              {mobileNavItems.map((item) => (
                <React.Fragment key={item.key}>{item.element}</React.Fragment>
              ))}
            </div>
          )}
        </div>

        {(showSubjectDropdown || showUserDropdown) && (
          <button
            type="button"
            className="site-header-dropdown-backdrop"
            onClick={() => {
              setShowSubjectDropdown(false);
              setShowUserDropdown(false);
            }}
            aria-label="Close menu"
          />
        )}
      </header>

      <ForumsSidebar
        open={showHamburgerMenu}
        onClose={handleMenuClose}
        forumsEnabled={checkFeatureEnabled("forums_enabled")}
        loading={loadingForums}
        forums={myForums}
        pinnedForums={pinnedForums}
        onForumClick={handleForumClick}
        onTogglePin={togglePin}
      />
    </>
  );
}

export default Header;
