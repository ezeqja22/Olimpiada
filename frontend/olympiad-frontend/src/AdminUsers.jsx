import {adminRoleLabel} from "./adminNavigation";
import {useLanguage} from "./context/LanguageContext";
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
  const {lang} = useLanguage();
  const tr = (en,sq) => lang === "en" ? en : sq;
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
      if(version===requestVersion.current)setError(tr("Failed to load users","Përdoruesit nuk u ngarkuan"));
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
      showToast(tr("Failed to perform action","Veprimi dështoi"), "error");
    }
  };

  const getStatusBadge = (user) => {
    if (user.is_banned) {
      return <span className="status-badge banned">{tr("Banned","Bllokuar")}</span>;
    } else if (user.is_active) {
      return <span className="status-badge active">{tr("Active","Aktiv")}</span>;
    } else {
      return <span className="status-badge inactive">{tr("Inactive","Joaktiv")}</span>;
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
        {adminRoleLabel(role,lang)}
      </span>
    );
  };

  return (
    <div className="admin-page administration-directory">
      <header className="administration-heading"><div><p>{tr("Community directory","Lista e komunitetit")}</p><h2>{tr("User Management","Menaxhimi i përdoruesve")}</h2></div><span>{pagination.total ?? users.length} {tr("members","anëtarë")}</span></header>
      <div className="administration-directory-columns">
        <aside className="administration-filters" aria-label={tr("User filters","Filtrat e përdoruesve")}>
          <h3>{tr("Find a member","Gjej një anëtar")}</h3>
          <label htmlFor="admin-user-search">{tr("Search all members","Kërko të gjithë anëtarët")}</label><input id="admin-user-search" type="search" placeholder={tr("Username or email","Emri i përdoruesit ose email-i")} value={filters.search} onChange={e=>handleSearchChange(e.target.value)} />
          <label htmlFor="admin-user-role">{tr("Role","Roli")}</label><select id="admin-user-role" value={filters.role} onChange={e=>handleFilterChange("role",e.target.value)}><option value="">{tr("All roles","Të gjitha rolet")}</option>{["student","teacher","reviewer","admin","super_admin","moderator","user"].map(role=><option key={role} value={role}>{adminRoleLabel(role,lang)}</option>)}</select>
          <label htmlFor="admin-user-status">{tr("Status","Statusi")}</label><select id="admin-user-status" value={filters.status} onChange={e=>handleFilterChange("status",e.target.value)}><option value="">{tr("All statuses","Të gjitha statuset")}</option><option value="active">{tr("Active","Aktiv")}</option><option value="banned">{tr("Banned","Bllokuar")}</option><option value="inactive">{tr("Inactive","Joaktiv")}</option></select>
          <button onClick={()=>setFilters({search:"",role:"",status:"",page:1})}>{tr("Clear filters","Pastro filtrat")}</button>
          <p>{tr("Role changes remain limited to super administrators. Moderation actions are recorded in the existing history.","Ndryshimet e roleve lejohen vetëm për superadministratorët. Veprimet e moderimit regjistrohen në historikun ekzistues.")}</p>
        </aside>
        <section className="administration-directory-results" aria-label={tr("Members","Anëtarët")}>
          {error && <p role="alert">{error} <button onClick={fetchUsers}>{tr("Retry","Provo përsëri")}</button></p>}
          {loading && <p role="status">{tr("Loading members…","Duke ngarkuar anëtarët…")}</p>}
          {!loading && !error && !users.length && <p className="administration-empty">{tr("No members match these filters.","Asnjë anëtar nuk përputhet me filtrat.")}</p>}
      {/* Users Table */}
      <div>
        <div className="administration-table" tabIndex={0} role="region" aria-label={tr("Member management table","Tabela e menaxhimit të anëtarëve")} aria-busy={loading}>
          <table>
            <thead>
              <tr>
                <th>{tr("User","Përdoruesi")}</th>
                <th>{tr("Role","Roli")}</th>
                <th>{tr("Status","Statusi")}</th>
                <th>{tr("Joined","Regjistruar më")}</th>
                <th>{tr("Actions","Veprimet")}</th>
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
                  <td>{new Date(user.created_at).toLocaleDateString(lang === "en" ? "en-GB" : "sq-AL")}</td>
                  <td>
                    <div className="admin-table-actions">
                      <select
                        aria-label={tr(`Role for ${user.username}`, `Roli i ${user.username}`)}
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
                        <option value="student">{tr("Student","Nxënës")}</option>
                        <option value="teacher">{tr("Teacher","Mësues")}</option>
                        <option value="reviewer">{tr("Reviewer","Vlerësues")}</option>
                        <option value="admin">{tr("Admin","Administrator")}</option>
                        <option value="super_admin">{tr("Super Admin","Superadministrator")}</option>
                        <option value="moderator">{tr("Moderator (legacy)","Moderator (rol i mëparshëm)")}</option>
                        <option value="user">{tr("User (legacy)","Përdorues (rol i mëparshëm)")}</option>
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
                              tr("Enter ban reason (optional):","Shkruaj arsyen e bllokimit (opsionale):"),
                            );
                            if(reason===null)return;
                            handleUserAction(user.id, "update", {
                              is_banned: true,
                              ban_reason: reason || "Banned by admin",
                            });
                          }
                        }}
                      >
                        {user.is_banned ? tr("Unban","Zhblloko") : tr("Ban","Blloko")}
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
                        {user.is_active ? tr("Deactivate","Çaktivizo") : tr("Activate","Aktivizo")}
                      </button>

                      <button
                        className="admin-btn danger"
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: tr("Delete user?","Fshi përdoruesin?"),
                            message: tr(`Are you sure you want to delete ${user.username}?`, `Je i sigurt që dëshiron të fshish ${user.username}?`),
                            confirmText: tr("Delete","Fshi"),
                            cancelText: tr("Cancel","Anulo"),
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
                          alt={tr("Delete","Fshi")}
                          style={{
                            width: "16px",
                            height: "16px",
                            objectFit: "contain",
                            marginRight: "8px",
                          }}
                        />{tr("Delete","Fshi")}</button>
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
            >{tr("Previous","Para")}</button>

            <span
              style={{
                display: "flex",
                alignItems: "center",
                padding: "0 15px",
                color: "#495057",
              }}
            >
              {tr(`Page ${filters.page} of ${pagination.pages}`, `Faqja ${filters.page} nga ${pagination.pages}`)}
            </span>

            <button
              className="admin-btn secondary"
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page >= pagination.pages}
            >{tr("Next","Tjetër")}</button>
          </div>
        )}
      </div>
        </section>
      </div>
    </div>
  );
};

export default AdminUsers;
