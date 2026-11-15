/* eslint-disable no-unused-vars */
/* eslint-disable no-restricted-globals */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useToast } from "./components/ToastProvider";
import { useAuth } from "./context/AuthContext";
import "./AdminLayout.css";
import "./AdministrationWorkspace.css";
import {useConfirm} from "./components/ConfirmProvider";

const AdminUsers = () => {
  const {confirm}=useConfirm();
  const requestVersion=useRef(0);
  const [allUsers, setAllUsers] = useState([]); // Store all users for filtering
  const [users, setUsers] = useState([]); // Displayed users
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const { showToast } = useToast();
  const { currentUser: staffUser } = useAuth();
  const canAssignRoles = staffUser?.role === "super_admin" || staffUser?.is_superuser === true;
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    status: "",
    page: 1,
  });

  useEffect(() => {
    const timer=setTimeout(fetchUsers,filters.search?250:0);
    return ()=>{clearTimeout(timer);requestVersion.current+=1;};
  }, [filters.search, filters.role, filters.status, filters.page]);

  const fetchUsers = async () => {
    const version=++requestVersion.current;
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.role) params.append("role", filters.role);
      if (filters.status) params.append("status", filters.status);
      params.append("page", filters.page);
      params.append("limit", 20);

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/users?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if(version!==requestVersion.current)return;
      setAllUsers(response.data.users);
      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      if(version===requestVersion.current)setError("Failed to load users");
      console.error("Users error:", err);
    } finally {
      if(version===requestVersion.current)setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSearchChange = value => setFilters(previous=>({...previous,search:value,page:1}));

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleUserAction = async (userId, action, data = {}) => {
    try {
      const token = localStorage.getItem("token");

      if (action === "update") {
        await axios.put(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/users/${userId}`,
          data,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else if (action === "delete") {
        await axios.delete(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/users/${userId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else if (action === "unban") {
        await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/users/${userId}/unban`,
          {
            reason: "Unbanned from admin panel",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else if (action === "activate") {
        await axios.post(
          `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/admin/users/${userId}/activate`,
          {
            reason: "Activated from admin panel",
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      }

      // Refresh the users list
      fetchUsers();
    } catch (err) {
      console.error("User action error:", err);
      showToast("Failed to perform action", "error");
    }
  };

  const getStatusBadge = (user) => {
    if (user.is_banned) {
      return <span className="status-badge banned">Banned</span>;
    } else if (user.is_active) {
      return <span className="status-badge active">Active</span>;
    } else {
      return <span className="status-badge inactive">Inactive</span>;
    }
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: "active",
      moderator: "pending",
      user: "inactive",
    };

    return (
      <span className={`status-badge ${roleColors[role] || "inactive"}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="admin-page administration-directory">
      <header className="administration-heading"><div><p>Community directory</p><h2>User Management</h2></div><span>{pagination.total ?? users.length} members</span></header>
      <div className="administration-directory-columns">
        <aside className="administration-filters" aria-label="User filters">
          <h3>Find a member</h3>
          <label htmlFor="admin-user-search">Search all members</label><input id="admin-user-search" type="search" placeholder="Username or email" value={filters.search} onChange={e=>handleSearchChange(e.target.value)} />
          <label htmlFor="admin-user-role">Role</label><select id="admin-user-role" value={filters.role} onChange={e=>handleFilterChange("role",e.target.value)}><option value="">All roles</option>{["student","teacher","reviewer","admin","super_admin","moderator","user"].map(role=><option key={role} value={role}>{role.replaceAll('_',' ')}</option>)}</select>
          <label htmlFor="admin-user-status">Status</label><select id="admin-user-status" value={filters.status} onChange={e=>handleFilterChange("status",e.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="banned">Banned</option><option value="inactive">Inactive</option></select>
          <button onClick={()=>setFilters({search:"",role:"",status:"",page:1})}>Clear filters</button>
          <p>Role changes remain limited to super administrators. Moderation actions are recorded in the existing history.</p>
        </aside>
        <section className="administration-directory-results" aria-label="Members">
          {error && <p role="alert">{error} <button onClick={fetchUsers}>Retry</button></p>}
          {loading && <p role="status">Loading members…</p>}
          {!loading && !error && !users.length && <p className="administration-empty">No members match these filters.</p>}
      {/* Users Table */}
      <div>
        <div className="administration-table" tabIndex={0} role="region" aria-label="Member management table" aria-busy={loading}>
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div>
                      <strong>{user.username}</strong>
                      <br />
                      <small>{user.email}</small>
                    </div>
                  </td>
                  <td>{getRoleBadge(user.role)}</td>
                  <td>{getStatusBadge(user)}</td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="admin-table-actions">
                      <select
                        aria-label={`Role for ${user.username}`}
                        value={user.role}
                        onChange={(e) => {
                          if (e.target.value !== user.role) {
                            handleUserAction(user.id, "update", {
                              role: e.target.value,
                            });
                          }
                        }}
                        disabled={!canAssignRoles}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "2px solid #e9ecef",
                          backgroundColor:
                            !canAssignRoles ? "#f8f9fa" : "white",
                          color: !canAssignRoles ? "#6c757d" : "#495057",
                          fontSize: "0.8rem",
                          cursor:
                            !canAssignRoles ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="reviewer">Reviewer</option>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="moderator">Moderator (legacy)</option>
                        <option value="user">User (legacy)</option>
                      </select>

                      <button
                        className={`admin-btn ${user.is_banned ? "success" : "warning"}`}
                        onClick={() => {
                          if (user.is_banned) {
                            // Unban user
                            handleUserAction(user.id, "unban");
                          } else {
                            // Ban user - ask for reason
                            const reason = prompt(
                              "Enter ban reason (optional):",
                            );
                            if(reason===null)return;
                            handleUserAction(user.id, "update", {
                              is_banned: true,
                              ban_reason: reason || "Banned by admin",
                            });
                          }
                        }}
                      >
                        {user.is_banned ? "Unban" : "Ban"}
                      </button>

                      <button
                        className={`admin-btn ${user.is_active ? "warning" : "success"}`}
                        onClick={() => {
                          if (user.is_active) {
                            handleUserAction(user.id, "update", {
                              is_active: false,
                            });
                          } else {
                            handleUserAction(user.id, "activate");
                          }
                        }}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        className="admin-btn danger"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: "Delete user?",
                            message: `Are you sure you want to delete ${user.username}?`,
                            confirmText: "Delete",
                            cancelText: "Cancel",
                            variant: "danger",
                          });
                          if (confirmed) {
                            handleUserAction(user.id, "delete");
                          }
                        }}
                        disabled={user.role === "admin"}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811026/Delete_Icon_White_pjg21g.svg"
                          alt="Delete"
                          style={{
                            width: "16px",
                            height: "16px",
                            objectFit: "contain",
                            marginRight: "8px",
                          }}
                        />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div
            className="admin-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page <= 1}
            >
              Previous
            </button>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 15px",
                color: "#495057",
              }}
            >
              Page {filters.page} of {pagination.pages}
            </span>

            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.pages}
            >
              Next
            </button>
          </div>
        )}
      </div>
        </section>
      </div>
    </div>
  );
};

export default AdminUsers;
