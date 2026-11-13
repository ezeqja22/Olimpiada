/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import {loginIntent} from "./navigation";
import "./AdminLayout.css";
import {useDialogFocus} from "./hooks/useDialogFocus";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const AdminLayout = () => {
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

  const menuItems = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811298/Dashboard_admin_panel_omb7cw.svg",
      adminOnly: false,
    },
    {
      path: "/admin/users",
      label: "Users",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811397/Users_admin_panel_lzwnqx.svg",
      adminOnly: false,
    },
    {
      path: "/admin/forums",
      label: "Forums",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg",
      adminOnly: false,
    },
    {
      path: "/admin/reports",
      label: "Reports",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811440/Reports_admin_panel_mun0ix.svg",
      adminOnly: false,
    },
    {
      path: "/admin/user-history",
      label: "User History",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811353/Users_Hirstory_admin_panel_eqvfdf.svg",
      adminOnly: false,
    },
    {
      path: "/admin/settings",
      label: "Settings",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811439/Settings_admin_panel_cpayja.svg",
      adminOnly: true,
    },
    {
      path: "/admin/email",
      label: "Email",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811297/Email_admin_panel_zjmkz7.svg",
      adminOnly: true,
    },
    {path:"/admin/teachers",label:"Aplikimet e Mësuesve",icon:"https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811353/Users_Hirstory_admin_panel_eqvfdf.svg",adminOnly:false},
    {path:"/admin/site-content",label:"Përmbajtja e Website-it",icon:"https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811439/Settings_admin_panel_cpayja.svg",adminOnly:true},
    {path:"/admin/parents",label:"Raporte Prindërish",icon:"https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811397/Users_admin_panel_lzwnqx.svg",adminOnly:false},
    {path: "/admin/weekly",label: "Problema e Javës", icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg",adminOnly:false},
    {path: "/admin/courses",label: "Materiale & Teste", icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg",adminOnly:false},
    {
      path: "/admin/content",
      label: "Përmbajtja & Profesorët",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg",
      adminOnly: false,
    },
    {
      path: "/admin/tutoring",
      label: "Kërkesat 1-to-1",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811310/Analytics_admin_panel_en0409.svg",
      adminOnly: false,
    },
    {
      path: "/admin/faq",
      label: "FAQ",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811439/Settings_admin_panel_cpayja.svg",
      adminOnly: false,
    },
    {
      path: "/admin/support",
      label: "Support",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811297/Email_admin_panel_zjmkz7.svg",
      adminOnly: false,
    },
    {
      path: "/admin/analytics",
      label: "Analytics",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811310/Analytics_admin_panel_en0409.svg",
      adminOnly: false,
    },
  ];

  const filteredMenuItems = menuItems.filter(
    (item) => !item.adminOnly || ["admin", "super_admin"].includes(currentUser?.role),
  );

  const isActiveRoute = (path) => {
    if (path === "/admin") {
      return location.pathname === "/admin";
    }

    return location.pathname.startsWith(path);
  };

  if (loading) {
    return (
      <div className="admin-auth-loading">
        <div className="loading-spinner" />
        <span>Loading admin panel...</span>
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
          aria-label="Close admin navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside ref={sidebarRef} id="admin-navigation" role={isMobile && sidebarOpen ? "dialog" : undefined} aria-modal={isMobile && sidebarOpen ? true : undefined} aria-label="Admin navigation" inert={isMobile && !sidebarOpen ? true : undefined} className={`admin-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        <div className="admin-sidebar-header">
          {sidebarOpen && <h2>Admin Panel</h2>}

          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isMobile ? "×" : sidebarOpen ? "◀" : "▶"}
          </button>
        </div>

        <nav className="admin-nav" aria-label="Admin navigation">
          {filteredMenuItems.map((item) => (
            <button
              type="button"
              key={item.path}
              className={`admin-nav-item ${isActiveRoute(item.path) ? "active" : ""}`}
              onClick={() => navigate(item.path)}
              aria-current={isActiveRoute(item.path) ? "page" : undefined}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="nav-icon">
                <img src={item.icon} alt="" />
              </span>
              {sidebarOpen && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button
            type="button"
            className="back-to-site"
            onClick={() => navigate("/")}
            title={!sidebarOpen ? "Back to Site" : undefined}
          >
            <span className="nav-icon">
              <img
                src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795078/Home_icon_gezrca.svg"
                alt=""
              />
            </span>
            {sidebarOpen && <span className="nav-label">Back to Site</span>}
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
                aria-label="Open admin navigation"
                aria-expanded={sidebarOpen}
                aria-controls="admin-navigation"
              >
                ☰
              </button>
            )}

            <div className="admin-header-copy">
              <h1>Admin Panel</h1>
              <span className="user-role">
                {currentUser.role.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="admin-header-right">
            <span className="welcome-text">
              Welcome, {currentUser.username}
            </span>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
