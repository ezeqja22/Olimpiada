import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLayout.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/admin/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(response.data);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error("Dashboard error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="admin-card admin-error-card">
        <h2>Error</h2>
        <p>{error || "Dashboard data is unavailable."}</p>
        <button className="admin-btn" onClick={fetchDashboardStats}>
          Try Again
        </button>
      </div>
    );
  }

  const quickActions = [
    {
      label: "Manage Users",
      path: "/admin/users",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811397/Users_admin_panel_lzwnqx.svg",
    },
    {
      label: "Moderate Forums",
      path: "/admin/forums",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg",
    },
    {
      label: "Review Reports",
      path: "/admin/reports",
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811440/Reports_admin_panel_mun0ix.svg",
    },
    {
      label: "Send Email",
      path: "/admin/email",
      secondary: true,
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811297/Email_admin_panel_zjmkz7.svg",
    },
    {
      label: "View Analytics",
      path: "/admin/analytics",
      secondary: true,
      icon: "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811310/Analytics_admin_panel_en0409.svg",
    },
  ];

  return (
    <div className="admin-page admin-dashboard-page">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Users</h3>
          <p className="stat-value">{stats.users.total}</p>
          <p className="stat-change positive">+{stats.users.new_today} today</p>
        </div>

        <div className="stat-card">
          <h3>Active Users</h3>
          <p className="stat-value">{stats.users.active}</p>
          <p className="stat-change">{stats.users.banned} banned</p>
        </div>

        <div className="stat-card">
          <h3>Forums</h3>
          <p className="stat-value">{stats.forums.total}</p>
          <p className="stat-change">
            {stats.forums.public} public, {stats.forums.private} private
          </p>
        </div>

        <div className="stat-card">
          <h3>Problems</h3>
          <p className="stat-value">{stats.problems.total}</p>
          <p className="stat-change positive">
            +{stats.problems.new_today} today
          </p>
        </div>

        <div className="stat-card">
          <h3>Pending Reports</h3>
          <p className="stat-value">{stats.reports.pending}</p>
          <p className="stat-change">Need review</p>
        </div>
      </div>

      <section className="admin-card">
        <h2>Quick Actions</h2>
        <div className="admin-quick-actions">
          {quickActions.map((action) => (
            <button
              key={action.path}
              className={`admin-btn ${action.secondary ? "secondary" : ""}`}
              onClick={() => navigate(action.path)}
            >
              <img src={action.icon} alt="" />
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <div className="admin-two-column-grid">
        <section className="admin-card">
          <h2>Recent Users</h2>
          {stats.recent_users.length > 0 ? (
            <div className="admin-table admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="admin-primary-cell">
                          <strong>{user.username}</strong>
                          <small>{user.email}</small>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            user.role === "admin"
                              ? "active"
                              : user.role === "moderator"
                                ? "pending"
                                : "inactive"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            user.is_active ? "active" : "inactive"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state admin-compact-empty-state">
              <h3>No recent users</h3>
              <p>No new users have joined recently.</p>
            </div>
          )}
        </section>

        <section className="admin-card">
          <h2>Recent Forums</h2>
          {stats.recent_forums.length > 0 ? (
            <div className="admin-table admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Forum</th>
                    <th>Creator</th>
                    <th>Type</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_forums.map((forum) => (
                    <tr key={forum.id}>
                      <td>
                        <strong>{forum.title}</strong>
                      </td>
                      <td>{forum.creator}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            forum.is_private ? "inactive" : "active"
                          }`}
                        >
                          {forum.is_private ? "Private" : "Public"}
                        </span>
                      </td>
                      <td>{new Date(forum.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state admin-compact-empty-state">
              <h3>No recent forums</h3>
              <p>No new forums have been created recently.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
