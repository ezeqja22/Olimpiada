import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./AdminLayout.css";
import "./AdministrationWorkspace.css";

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

  return <div className="administration-overview">
    <header className="administration-heading"><div><p>Platform overview</p><h2>Community & learning</h2></div><button onClick={fetchDashboardStats}>Refresh overview</button></header>
    <div className="administration-summary">
      {[["Members",stats.users.total,`${stats.users.new_today} joined today`,"/admin/users"],["Active members",stats.users.active,`${stats.users.banned} banned`,"/admin/users"],["Problems",stats.problems.total,`${stats.problems.new_today} published today`,"/admin/content"],["Forums",stats.forums.total,`${stats.forums.public} public · ${stats.forums.private} private`,"/admin/forums"]].map(([title,value,note,path])=><Link key={title} to={path}><span>{title}</span><strong>{value}</strong><small>{note}</small></Link>)}
    </div>
    <div className="administration-columns">
      <section className="administration-activity"><header><h3>Recent members</h3><Link to="/admin/users">Manage users →</Link></header>
        {stats.recent_users.length ? <div className="administration-table" tabIndex={0} role="region" aria-label="Recent members"><table><thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Joined</th></tr></thead><tbody>{stats.recent_users.map(user=><tr key={user.id}><td><strong>{user.username}</strong><small>{user.email}</small></td><td>{user.role.replaceAll('_',' ')}</td><td><span className={user.is_active?'administration-status':'administration-status is-muted'}>{user.is_active?'Active':'Inactive'}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <p className="administration-empty">No recent members.</p>}
        <header><h3>Recent forums</h3><Link to="/admin/forums">Moderate forums →</Link></header>
        {stats.recent_forums.length ? <div className="administration-forum-list">{stats.recent_forums.map(forum=><article key={forum.id}><div><Link to={`/forum/${forum.id}`}>{forum.title}</Link><p>{forum.creator} · {new Date(forum.created_at).toLocaleDateString()}</p></div><span className="administration-status is-muted">{forum.is_private?'Private':'Public'}</span></article>)}</div> : <p className="administration-empty">No recent forums.</p>}
      </section>
      <aside className="administration-actions"><section className="administration-review"><p>Moderation queue</p><strong>{stats.reports.pending}</strong><h3>Reports awaiting review</h3><Link to="/admin/reports">Review reports →</Link></section><section><h3>Publishing</h3><Link to="/admin/weekly">Weekly competitions <span>→</span></Link><Link to="/admin/courses">Materials & tests <span>→</span></Link><Link to="/admin/content">Content management <span>→</span></Link></section><section><h3>Platform tools</h3><Link to="/admin/email">Email workspace <span>→</span></Link><Link to="/admin/analytics">Analytics <span>→</span></Link></section></aside>
    </div>
  </div>;
};
export default AdminDashboard;
