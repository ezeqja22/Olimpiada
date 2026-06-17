import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
} from "../designSystem";
import { getUserInitial } from "../utils";
import NotificationBell from "./NotificationBell";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { useFeatureSettings } from "../hooks/useFeatureSettings";
import { useAuth } from "../context/AuthContext";

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
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

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

    setShowHamburgerMenu((prev) => !prev);
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

  const handleUserDropdownClose = () => {
    setShowUserDropdown(false);
  };

  const handlePinToggle = (forumId, event) => {
    event.stopPropagation();

    setPinnedForums((prev) => {
      const isPinned = prev.includes(forumId);

      const newPinnedForums = isPinned
        ? prev.filter((id) => id !== forumId)
        : [...prev, forumId];

      localStorage.setItem("pinnedForums", JSON.stringify(newPinnedForums));

      return newPinnedForums;
    });
  };

  const renderAuthLoadingDesktop = () => (
    <div
      style={{
        width: "150px",
        height: "40px",
        borderRadius: "999px",
        backgroundColor: "rgba(255, 255, 255, 0.18)",
      }}
    />
  );

  const renderAuthLoadingMobile = () => (
    <div
      style={{
        width: "28px",
        height: "28px",
        borderRadius: "50%",
        backgroundColor: "rgba(255, 255, 255, 0.18)",
      }}
    />
  );

  const renderUserAvatar = (size = 32, fontSize = typography.fontSize.sm) => {
    if (!currentUser) return null;

    if (currentUser.profile_picture) {
      return (
        <img
          src={currentUser.profile_picture}
          alt="Profile"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      );
    }

    return (
      <div
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundColor: colors.secondary,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: colors.white,
          fontSize,
          fontWeight: typography.fontWeight.bold,
        }}
      >
        {getUserInitial(currentUser.username)}
      </div>
    );
  };

  const renderSubjectDropdown = (mobile = false) => {
    if (!showSubjectDropdown) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: "100%",
          right: mobile ? 0 : "auto",
          left: mobile ? "auto" : 0,
          backgroundColor: colors.white,
          border: `1px solid ${colors.gray[300]}`,
          borderRadius: "6px",
          boxShadow: shadows.lg,
          zIndex: 1000,
          minWidth: mobile ? "150px" : "200px",
          marginTop: spacing.xs,
        }}
      >
        {SUBJECTS.map((subject) => (
          <button
            key={subject}
            onClick={() => handleSubjectClick(subject)}
            style={{
              width: "100%",
              padding: mobile ? "12px 16px" : `${spacing.md} ${spacing.md}`,
              border: "none",
              backgroundColor: "transparent",
              color: mobile ? "#374151" : colors.dark,
              textAlign: "left",
              cursor: "pointer",
              fontSize: mobile ? "14px" : typography.fontSize.base,
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = mobile
                ? "#f3f4f6"
                : colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src={getSubjectIcon(subject)}
              alt={subject}
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
              }}
            />
            {subject}
          </button>
        ))}
      </div>
    );
  };

  const renderUserDropdown = (mobile = false) => {
    if (!showUserDropdown || !currentUser) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          backgroundColor: colors.white,
          border: `1px solid ${colors.gray[300]}`,
          borderRadius: "6px",
          boxShadow: shadows.lg,
          zIndex: 1001,
          minWidth: mobile ? "140px" : "200px",
          marginTop: spacing.xs,
        }}
      >
        <Link to="/profile" style={{ textDecoration: "none" }}>
          <div
            style={{
              padding: mobile ? "8px 12px" : `${spacing.md} ${spacing.md}`,
              color: mobile ? "#374151" : colors.dark,
              cursor: "pointer",
              transition: "background-color 0.2s",
              borderBottom: `1px solid ${
                mobile ? "#f3f4f6" : colors.gray[200]
              }`,
              display: "flex",
              alignItems: "center",
              gap: mobile ? "6px" : "8px",
              fontSize: mobile ? "12px" : typography.fontSize.base,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = mobile
                ? "#f3f4f6"
                : colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Profile_Icon_Green_t3zoz5.svg"
              alt="Profile"
              style={{
                width: mobile ? "14px" : "16px",
                height: mobile ? "14px" : "16px",
                objectFit: "contain",
              }}
            />
            {mobile ? "Profile" : "My Profile"}
          </div>
        </Link>

        <Link to="/settings" style={{ textDecoration: "none" }}>
          <div
            style={{
              padding: mobile ? "8px 12px" : `${spacing.md} ${spacing.md}`,
              color: mobile ? "#374151" : colors.dark,
              cursor: "pointer",
              transition: "background-color 0.2s",
              borderBottom: `1px solid ${
                mobile ? "#f3f4f6" : colors.gray[200]
              }`,
              display: "flex",
              alignItems: "center",
              gap: mobile ? "6px" : "8px",
              fontSize: mobile ? "12px" : typography.fontSize.base,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = mobile
                ? "#f3f4f6"
                : colors.gray[100];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
              alt="Settings"
              style={{
                width: mobile ? "14px" : "16px",
                height: mobile ? "14px" : "16px",
                objectFit: "contain",
              }}
            />
            Settings
          </div>
        </Link>

        {(currentUser.role === "admin" || currentUser.role === "moderator") && (
          <Link to="/admin" style={{ textDecoration: "none" }}>
            <div
              style={{
                padding: mobile ? "8px 12px" : "12px 16px",
                color: "#667eea",
                cursor: "pointer",
                fontSize: mobile ? "12px" : "14px",
                borderBottom: `1px solid ${
                  mobile ? "#f3f4f6" : colors.gray[200]
                }`,
                display: "flex",
                alignItems: "center",
                gap: mobile ? "6px" : "8px",
                fontWeight: "500",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = mobile
                  ? "#f3f4f6"
                  : "#f8f9fa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <img
                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811043/Settings_Icon_rzokwo.svg"
                alt="Admin"
                style={{
                  width: mobile ? "14px" : "16px",
                  height: mobile ? "14px" : "16px",
                  objectFit: "contain",
                }}
              />
              Admin Panel
            </div>
          </Link>
        )}

        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            padding: mobile ? "8px 12px" : `${spacing.md} ${spacing.md}`,
            border: "none",
            backgroundColor: "transparent",
            color: mobile ? "#dc2626" : colors.danger,
            cursor: "pointer",
            fontSize: mobile ? "12px" : typography.fontSize.base,
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
            gap: mobile ? "6px" : spacing.sm,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = mobile
              ? "#fef2f2"
              : colors.gray[100];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <img
            src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760802149/LOG_OUT_RED_d1wwc3.svg"
            alt="Logout"
            style={{
              width: mobile ? "14px" : "16px",
              height: mobile ? "14px" : "16px",
              objectFit: "contain",
            }}
          />
          Logout
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
        <div style={{ display: "flex", gap: spacing.sm }}>
          <Link
            to="/login"
            style={{
              color: colors.white,
              textDecoration: "none",
              fontWeight: typography.fontWeight.medium,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "6px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Login
          </Link>

          <span
            onClick={() => {
              if (checkFeatureEnabled("registration_enabled")) {
                navigate("/signup");
              } else {
                showFeatureDisabledAlert("Registration");
              }
            }}
            style={{
              backgroundColor: colors.accent,
              color: colors.white,
              textDecoration: "none",
              fontWeight: typography.fontWeight.medium,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "6px",
              transition: "background-color 0.2s",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#218838";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = colors.accent;
            }}
          >
            Signup
          </span>
        </div>
      );
    }

    return (
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        <NotificationBell />

        <div style={{ position: "relative" }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUserDropdown((prev) => !prev);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: spacing.sm,
              backgroundColor: "transparent",
              border: "none",
              color: colors.white,
              cursor: "pointer",
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "6px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {renderUserAvatar(32, typography.fontSize.sm)}

            <span
              style={{
                fontSize: typography.fontSize.base,
                fontWeight: typography.fontWeight.medium,
              }}
            >
              {currentUser.username}
            </span>

            <span style={{ fontSize: typography.fontSize.xs }}>▼</span>
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
        <Link
          to="/login"
          style={{
            color: "white",
            textDecoration: "none",
            fontSize: "11px",
            fontWeight: "500",
            padding: "4px 6px",
            borderRadius: "4px",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
          }}
        >
          Login
        </Link>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          position: "relative",
        }}
      >
        <NotificationBell />

        <button
          onClick={() => setShowUserDropdown((prev) => !prev)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
          }}
        >
          {renderUserAvatar(24, "10px")}
        </button>

        {renderUserDropdown(true)}
      </div>
    );
  };

  const renderForumList = () => {
    if (loadingForums) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.xl,
            color: colors.gray[500],
          }}
        >
          Loading forums...
        </div>
      );
    }

    if (myForums.length === 0) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.xl,
            color: colors.gray[500],
            textAlign: "center",
          }}
        >
          No forums found.
          <br />
          Join or create a forum to see it here.
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: spacing.sm,
        }}
      >
        {[...myForums]
          .sort((a, b) => {
            const aPinned = pinnedForums.includes(a.id);
            const bPinned = pinnedForums.includes(b.id);

            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;

            return 0;
          })
          .map((forum) => {
            const isPinned = pinnedForums.includes(forum.id);

            return (
              <button
                key={forum.id}
                onClick={() => handleForumClick(forum.id)}
                style={{
                  width: "100%",
                  padding: spacing.md,
                  backgroundColor: "transparent",
                  border: "none",
                  borderRadius: borderRadius.lg,
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: typography.fontSize.base,
                  color: colors.dark,
                  transition: "all 0.2s ease",
                  borderBottom: `1px solid ${colors.gray[100]}`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: spacing.sm,
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#e8f5e8";
                  e.currentTarget.style.transform = "scale(1.02)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(26, 77, 58, 0.15)";
                  e.currentTarget.style.borderColor = colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = colors.gray[100];
                }}
              >
                <div
                  style={{
                    marginTop: "2px",
                    flexShrink: 0,
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={getSubjectIcon(forum.subject)}
                    alt={forum.subject || "Forum"}
                    style={{
                      width: "20px",
                      height: "20px",
                      objectFit: "contain",
                    }}
                  />
                </div>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      fontWeight: typography.fontWeight.semibold,
                      marginBottom: spacing.xs,
                      fontSize: typography.fontSize.base,
                      color: colors.dark,
                      lineHeight: 1.3,
                    }}
                  >
                    {forum.title}
                  </div>

                  {forum.description && (
                    <div
                      style={{
                        fontSize: typography.fontSize.sm,
                        color: colors.gray[600],
                        lineHeight: 1.4,
                        marginBottom: spacing.xs,
                      }}
                    >
                      {forum.description.length > 50
                        ? `${forum.description.substring(0, 50)}...`
                        : forum.description}
                    </div>
                  )}

                  {forum.subject && (
                    <div
                      style={{
                        display: "inline-block",
                        backgroundColor: colors.primary + "20",
                        color: colors.primary,
                        padding: `${spacing.xs} ${spacing.sm}`,
                        borderRadius: borderRadius.sm,
                        fontSize: typography.fontSize.xs,
                        fontWeight: typography.fontWeight.medium,
                        marginTop: spacing.xs,
                      }}
                    >
                      {forum.subject}
                    </div>
                  )}
                </div>

                {isPinned ? (
                  <button
                    onClick={(e) => handlePinToggle(forum.id, e)}
                    style={{
                      backgroundColor: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: spacing.xs,
                      borderRadius: borderRadius.sm,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      color: colors.primary,
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.gray[100];
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                    title="Unpin forum"
                  >
                    <img
                      src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811441/Pin_Icon_Green_ly3fxo.svg"
                      alt="Pin"
                      style={{
                        height: "14px",
                        width: "14px",
                        objectFit: "contain",
                      }}
                    />
                  </button>
                ) : (
                  <button
                    onClick={(e) => handlePinToggle(forum.id, e)}
                    style={{
                      backgroundColor: "transparent",
                      border: `1px solid ${colors.gray[300]}`,
                      cursor: "pointer",
                      padding: `${spacing.xs} ${spacing.sm}`,
                      borderRadius: borderRadius.sm,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: typography.fontSize.xs,
                      fontWeight: typography.fontWeight.medium,
                      color: colors.gray[500],
                      transition: "all 0.2s ease",
                      flexShrink: 0,
                      marginTop: "2px",
                      minWidth: "40px",
                      height: "24px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.gray[100];
                      e.currentTarget.style.borderColor = colors.primary;
                      e.currentTarget.style.color = colors.primary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = colors.gray[300];
                      e.currentTarget.style.color = colors.gray[500];
                    }}
                    title="Pin forum"
                  >
                    Pin
                  </button>
                )}
              </button>
            );
          })}
      </div>
    );
  };

  return (
    <header
      style={{
        backgroundColor: colors.primary,
        color: colors.white,
        padding: isMobile
          ? `${spacing.xs} ${spacing.sm}`
          : `${spacing.md} ${spacing.xl}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: shadows.md,
        position: "sticky",
        top: 0,
        zIndex: 1000,
        minHeight: isMobile ? "50px" : "auto",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
        {!authLoading && currentUser && !showHamburgerMenu && (
          <button
            onClick={handleHamburgerClick}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: colors.white,
              cursor: "pointer",
              padding: spacing.sm,
              borderRadius: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              transition: "background-color 0.2s",
              zIndex: 1001,
              position: "relative",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
              alt="Menu"
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
              }}
            />
          </button>
        )}

        <Link
          to="/homepage"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? "4px" : spacing.sm,
              marginLeft: isMobile ? "4px" : spacing.lg,
            }}
          >
            <img
              src={
                siteSettings.site_logo && siteSettings.site_logo.trim() !== ""
                  ? siteSettings.site_logo
                  : DEFAULT_LOGO
              }
              alt={siteSettings.site_name || "Olimpiada"}
              style={{
                height: isMobile ? "20px" : "32px",
                width: "auto",
                maxWidth: isMobile ? "80px" : "200px",
                objectFit: "contain",
              }}
              onError={(e) => {
                e.currentTarget.src = DEFAULT_LOGO;
              }}
            />

            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? "16px" : typography.fontSize["2xl"],
                fontWeight: typography.fontWeight.bold,
                cursor: "pointer",
                display: "block",
              }}
            >
              {siteSettings.site_name || "Olimpiada"}
            </h1>
          </div>
        </Link>
      </div>

      <nav
        style={{
          display: isMobile ? "none" : "flex",
          alignItems: "center",
          gap: spacing.md,
        }}
      >
        {showHomeButton && (
          <Link
            to="/homepage"
            style={{
              color: colors.white,
              textDecoration: "none",
              fontWeight: typography.fontWeight.medium,
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "6px",
              transition: "background-color 0.2s",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795078/Home_icon_gezrca.svg"
              alt="Home"
              style={{
                height: "16px",
                width: "16px",
                objectFit: "contain",
                marginRight: "6px",
              }}
            />
            Home
          </Link>
        )}

        <Link
          to="/feed"
          style={{
            color: colors.white,
            textDecoration: "none",
            fontWeight: typography.fontWeight.medium,
            padding: `${spacing.sm} ${spacing.md}`,
            borderRadius: "6px",
            transition: "background-color 0.2s",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Feed
        </Link>

        <div style={{ position: "relative" }}>
          <span
            onClick={() => setShowSubjectDropdown((prev) => !prev)}
            style={{
              backgroundColor: "transparent",
              color: colors.white,
              textDecoration: "none",
              padding: `${spacing.sm} ${spacing.md}`,
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: typography.fontWeight.medium,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.secondary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            Subject
            <span style={{ fontSize: typography.fontSize.xs }}>▼</span>
          </span>

          {renderSubjectDropdown(false)}
        </div>

        <span
          onClick={() => {
            if (checkFeatureEnabled("forums_enabled")) {
              navigate("/forums");
            } else {
              showFeatureDisabledAlert("Forums");
            }
          }}
          style={{
            color: colors.white,
            textDecoration: "none",
            fontWeight: typography.fontWeight.medium,
            padding: `${spacing.sm} ${spacing.md}`,
            borderRadius: "6px",
            transition: "background-color 0.2s",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = colors.secondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          Forums
        </span>

        {renderDesktopAuthSection()}
      </nav>

      {isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {!shouldHideFeedButton && (
            <Link
              to="/feed"
              style={{
                color: "white",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: "500",
                padding: "4px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              Feed
            </Link>
          )}

          {!shouldHideForumsButton && (
            <Link
              to="/forums"
              style={{
                color: "white",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: "500",
                padding: "4px 6px",
                borderRadius: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
              }}
            >
              Forums
            </Link>
          )}

          {!shouldHideSubjectDropdown && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowSubjectDropdown((prev) => !prev)}
                style={{
                  color: "white",
                  textDecoration: "none",
                  fontSize: "11px",
                  fontWeight: "500",
                  padding: "4px 6px",
                  borderRadius: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                Subject
                <span style={{ fontSize: "9px" }}>▼</span>
              </button>

              {renderSubjectDropdown(true)}
            </div>
          )}

          {renderMobileAuthSection()}
        </div>
      )}

      {showUserDropdown && (
        <div
          onClick={handleUserDropdownClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999,
          }}
        />
      )}

      {showHamburgerMenu && (
        <div
          onClick={handleMenuClose}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 999,
          }}
        />
      )}

      <div
        style={{
          position: "fixed",
          top: 0,
          left: showHamburgerMenu ? "0" : "-100%",
          width: isMobile ? "60%" : "25%",
          height: "100vh",
          backgroundColor: colors.white,
          boxShadow: shadows.xl,
          zIndex: 1000,
          transition: "left 0.3s ease-in-out",
          display: showHamburgerMenu ? "block" : "none",
          overflowY: "auto",
          padding: spacing.lg,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            marginBottom: spacing.lg,
            paddingBottom: spacing.md,
            borderBottom: `1px solid ${colors.gray[200]}`,
            backgroundColor: colors.primary,
            margin: `-${spacing.lg} -${spacing.lg} ${spacing.lg} -${spacing.lg}`,
            padding: spacing.lg,
            borderRadius: `${borderRadius.lg} ${borderRadius.lg} 0 0`,
            position: "relative",
          }}
        >
          <button
            onClick={handleMenuClose}
            style={{
              backgroundColor: "transparent",
              border: "none",
              color: colors.white,
              cursor: "pointer",
              padding: spacing.sm,
              borderRadius: borderRadius.sm,
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              transition: "background-color 0.2s",
              position: "absolute",
              left: spacing.sm,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                "rgba(255, 255, 255, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <img
              src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1761040303/sanwich_icon_hlmeja.svg"
              alt="Close Menu"
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
              }}
            />
          </button>

          <h3
            style={{
              margin: 0,
              fontSize: typography.fontSize.lg,
              fontWeight: typography.fontWeight.bold,
              color: colors.white,
            }}
          >
            {checkFeatureEnabled("forums_enabled")
              ? "My Forums"
              : "Forums Disabled"}
          </h3>
        </div>

        {checkFeatureEnabled("forums_enabled") && renderForumList()}
      </div>
    </header>
  );
}

export default Header;
