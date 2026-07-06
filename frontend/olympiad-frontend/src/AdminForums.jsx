/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useToast } from "./components/ToastProvider";
import { useConfirm } from "./components/ConfirmProvider";
import "./AdminLayout.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const AdminForums = () => {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    search: "",
    privacy: "",
    page: 1,
  });

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    fetchForums();
  }, [filters]);

  const fetchForums = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const params = new URLSearchParams();

      if (filters.search) params.append("search", filters.search);
      if (filters.privacy) params.append("privacy", filters.privacy);
      params.append("page", filters.page);
      params.append("limit", 20);

      const response = await axios.get(`${API_URL}/admin/forums?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setForums(response.data.forums);
      setPagination(response.data.pagination);
    } catch (err) {
      setError("Failed to load forums");
      console.error("Forums error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: 1,
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handleDeleteForum = async (forumId, forumTitle) => {
    const confirmed = await confirm({
      title: "Delete forum?",
      message: `Are you sure you want to delete the forum "${forumTitle}"? This action cannot be undone.`,
      confirmText: "Delete forum",
      cancelText: "Cancel",
      variant: "success",
    });

    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/admin/forums/${forumId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      showToast("Forum deleted successfully", "success");
      fetchForums();
    } catch (err) {
      console.error("Delete forum error:", err);
      showToast("Failed to delete forum", "error");
    }
  };

  const getPrivacyBadge = (isPrivate) => (
    <span className={`status-badge ${isPrivate ? "inactive" : "active"}`}>
      {isPrivate ? "Private" : "Public"}
    </span>
  );

  const formatDate = (dateString) => {
    if (!dateString) return "—";

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card admin-error-card">
        <h2>Error</h2>
        <p>{error}</p>
        <button className="admin-btn" onClick={fetchForums}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="admin-page admin-forums-page">
      <section className="admin-card">
        <h2>Forum Management</h2>

        <div className="admin-filter-grid admin-filter-grid-two">
          <div className="admin-field">
            <label htmlFor="forum-search">Search</label>
            <input
              id="forum-search"
              type="text"
              placeholder="Forum title..."
              value={filters.search}
              onChange={(event) =>
                handleFilterChange("search", event.target.value)
              }
            />
          </div>

          <div className="admin-field">
            <label htmlFor="forum-privacy">Privacy</label>
            <select
              id="forum-privacy"
              value={filters.privacy}
              onChange={(event) =>
                handleFilterChange("privacy", event.target.value)
              }
            >
              <option value="">All Forums</option>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>
        </div>
      </section>

      <section className="admin-card">
        <div className="admin-table admin-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Forum</th>
                <th>Creator</th>
                <th>Type</th>
                <th>Members</th>
                <th>Created</th>
                <th>Last Activity</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {forums.map((forum) => (
                <tr key={forum.id}>
                  <td>
                    <div className="admin-primary-cell admin-wide-cell">
                      <strong>{forum.title}</strong>
                      {forum.description && (
                        <small>
                          {forum.description.length > 100
                            ? `${forum.description.substring(0, 100)}...`
                            : forum.description}
                        </small>
                      )}
                    </div>
                  </td>
                  <td>
                    <strong>{forum.creator}</strong>
                  </td>
                  <td>{getPrivacyBadge(forum.is_private)}</td>
                  <td>
                    <span className="admin-neutral-badge">
                      {forum.max_members} max
                    </span>
                  </td>
                  <td>{formatDate(forum.created_at)}</td>
                  <td>{formatDate(forum.last_activity)}</td>
                  <td>
                    <div className="admin-table-actions">
                      <button
                        className="admin-btn secondary admin-btn-small"
                        onClick={() =>
                          window.open(`/forum/${forum.id}`, "_blank")
                        }
                      >
                        View
                      </button>

                      <button
                        className="admin-btn danger admin-btn-small"
                        onClick={() => handleDeleteForum(forum.id, forum.title)}
                      >
                        <img
                          src="https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811026/Delete_Icon_White_pjg21g.svg"
                          alt=""
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

        {forums.length === 0 && (
          <div className="empty-state">
            <h3>No forums found</h3>
            <p>No forums match your current filters.</p>
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="admin-pagination">
            <span className="admin-pagination-text">
              Page {filters.page} of {pagination.pages}
            </span>

            <div className="admin-pagination-actions">
              <button
                className="admin-btn secondary"
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page <= 1}
              >
                Previous
              </button>

              <button
                className="admin-btn secondary"
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page >= pagination.pages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminForums;
