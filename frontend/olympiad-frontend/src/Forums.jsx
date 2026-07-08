/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Layout from "./components/Layout";
import Card from "./components/Card";
import Button from "./components/Button";
import AnimatedLoader from "./components/AnimatedLoader";
import ForumInviteModal from "./ForumInviteModal";
import SearchBar from "./SearchBar";
import { colors, spacing, typography, borderRadius } from "./designSystem";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import { useToast } from "./components/ToastProvider";
import "./forumModern.css";

const Forums = () => {
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Feature settings
  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newForum, setNewForum] = useState({
    title: "",
    description: "",
    is_private: false,
    max_members: 100,
    subject: "",
    level: "",
    tags: [""],
  });
  const [activeTab, setActiveTab] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState(null);
  const [allForums, setAllForums] = useState([]); // Store all forums for filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [forumOnlineCounts, setForumOnlineCounts] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isMobile, setIsMobile] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Check if forums are enabled
  useEffect(() => {
    if (!checkFeatureEnabled("forums_enabled")) {
      showFeatureDisabledAlert("Forums");
      navigate("/");
      return;
    }
  }, [checkFeatureEnabled, showFeatureDisabledAlert, navigate]);

  // Tag management functions
  const handleTagChange = (index, value) => {
    const newTags = [...newForum.tags];
    newTags[index] = value;
    setNewForum({ ...newForum, tags: newTags });
  };

  const addTag = () => {
    if (newForum.tags.length < 5) {
      setNewForum({ ...newForum, tags: [...newForum.tags, ""] });
    } else {
      showToast("Maximum 5 tags allowed", "error");
    }
  };

  const removeTag = (index) => {
    if (newForum.tags.length > 1) {
      const newTags = newForum.tags.filter((_, i) => i !== index);
      setNewForum({ ...newForum, tags: newTags });
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchForums();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setCurrentUser(response.data);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchForums = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Please log in to view forums");
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setForums(response.data);
      setAllForums(response.data); // Store all forums for filtering

      // Fetch online counts for all forums
      fetchAllOnlineCounts(response.data);
    } catch (error) {
      console.error("Error fetching forums:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      setError(
        `Failed to load forums: ${error.response?.data?.detail || error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOnlineCounts = async (forums) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const onlineCountPromises = forums.map(async (forum) => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forum.id}/online-count`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          return { forumId: forum.id, onlineCount: response.data.online_count };
        } catch (error) {
          console.error(
            `Error fetching online count for forum ${forum.id}:`,
            error,
          );
          return { forumId: forum.id, onlineCount: 0 };
        }
      });

      const results = await Promise.all(onlineCountPromises);
      const onlineCountsMap = {};
      results.forEach(({ forumId, onlineCount }) => {
        onlineCountsMap[forumId] = onlineCount;
      });

      setForumOnlineCounts(onlineCountsMap);
    } catch (error) {
      console.error("Error fetching online counts:", error);
    }
  };

  const handleCreateForum = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Process tags: filter out empty tags and join with commas
      const validTags = newForum.tags.filter((tag) => tag.trim() !== "");
      const processedTags = validTags.join(", ");

      const forumData = {
        ...newForum,
        tags: processedTags,
      };

      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums`,
        forumData,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setNewForum({
        title: "",
        description: "",
        is_private: false,
        max_members: 100,
        subject: "",
        level: "",
        tags: [""],
      });
      setShowCreateForm(false);
      fetchForums();
    } catch (error) {
      console.error("Error creating forum:", error);
      showToast("Failed to create forum", "error");
    }
  };

  const handleJoinForum = async (forumId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}/join`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      fetchForums();
    } catch (error) {
      console.error("Error joining forum:", error);
      if (error.response?.status === 400) {
        showToast("Already a member of this forum", "error");
      } else if (
        error.response?.status === 400 &&
        error.response?.data?.detail?.includes("full")
      ) {
        showToast("Forum is full", "error");
      } else {
        showToast("Failed to join forum", "error");
      }
    }
  };

  const handleRequestToJoin = async (forumId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}/request-join`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("Request sent to forum creator", "success");
      fetchForums(); // Refresh to update button state
    } catch (error) {
      console.error("Error requesting to join forum:", error);
      if (error.response?.status === 400) {
        showToast("Request already sent or you are already a member", "error");
      } else {
        showToast("Failed to send request", "error");
      }
    }
  };

  const handleRetractRequest = async (forumId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await axios.delete(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth/forums/${forumId}/retract-request`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast("Request retracted successfully", "success");
      fetchForums(); // Refresh to update button state
    } catch (error) {
      console.error("Error retracting request:", error);
      if (error.response?.status === 404) {
        showToast("No pending request found", "error");
      } else {
        showToast("Failed to retract request", "error");
      }
    }
  };

  const handleForumClick = (forum) => {
    navigate(`/forum/${forum.id}/info`);
  };

  const handleInviteClick = (forumId, e) => {
    e.stopPropagation();
    setSelectedForumId(forumId);
    setShowInviteModal(true);
  };

  const handleInviteModalClose = () => {
    setShowInviteModal(false);
    setSelectedForumId(null);
  };

  const handleInviteSuccess = () => {
    fetchForums(); // Refresh forums to update member counts
  };

  // Local search filtering
  const handleLocalSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
    filterForums(query);
  };

  // Local advanced search filtering
  const handleLocalAdvancedSearch = (advancedData) => {
    setSearchQuery(advancedData.query || "");
    setCurrentPage(1);
    filterForumsAdvanced(advancedData);
  };

  // Filter forums based on search query
  const filterForums = (query) => {
    if (!query.trim()) {
      setForums(allForums);
      return;
    }

    const filtered = allForums.filter((forum) => {
      const searchTerm = query.toLowerCase();
      return (
        forum.title.toLowerCase().includes(searchTerm) ||
        forum.description.toLowerCase().includes(searchTerm) ||
        (forum.subject && forum.subject.toLowerCase().includes(searchTerm)) ||
        (forum.level && forum.level.toLowerCase().includes(searchTerm)) ||
        (forum.tags &&
          forum.tags.some((tag) => tag.toLowerCase().includes(searchTerm)))
      );
    });

    setForums(filtered);
  };

  // Advanced filtering for forums
  const filterForumsAdvanced = (filters) => {
    let filtered = [...allForums];

    // Text search
    if (filters.query && filters.query.trim()) {
      const searchTerm = filters.query.toLowerCase();
      filtered = filtered.filter(
        (forum) =>
          forum.title.toLowerCase().includes(searchTerm) ||
          forum.description.toLowerCase().includes(searchTerm) ||
          (forum.tags &&
            forum.tags.some((tag) => tag.toLowerCase().includes(searchTerm))),
      );
    }

    // Subject filter
    if (filters.subjects && filters.subjects.length > 0) {
      filtered = filtered.filter((forum) =>
        filters.subjects.includes(forum.subject),
      );
    }

    // Level filter
    if (filters.level && filters.level.trim()) {
      filtered = filtered.filter(
        (forum) =>
          forum.level &&
          forum.level.toLowerCase().includes(filters.level.toLowerCase()),
      );
    }

    // Tags filter
    if (filters.tags && filters.tags.trim()) {
      const tagTerms = filters.tags
        .toLowerCase()
        .split(",")
        .map((tag) => tag.trim());
      filtered = filtered.filter(
        (forum) =>
          forum.tags &&
          tagTerms.some((term) =>
            forum.tags.some((forumTag) =>
              forumTag.toLowerCase().includes(term),
            ),
          ),
      );
    }

    setForums(filtered);
  };

  // Filter forums based on active tab, search query, and advanced filters
  const filteredForums = forums.filter((forum) => {
    // Tab filtering
    if (activeTab === "public" && forum.is_private) return false;
    if (activeTab === "private" && !forum.is_private) return false;

    // No local filtering needed - search is now handled by SearchBar component

    return true;
  });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentForums = filteredForums.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredForums.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="profile"
          message="Loading forums..."
          size="large"
        />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showHomeButton={true}>
        <div style={{ textAlign: "center", padding: spacing.xl }}>
          <h2 style={{ color: colors.error }}>{error}</h2>
          <Button
            onClick={() => navigate("/login")}
            style={{ marginTop: spacing.md }}
          >
            Go to Login
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <div
        className="forums-page"
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: spacing.lg,
          "--forum-primary": colors.primary,
        }}
      >
        {/* Header */}
        <div
          className="forums-page__header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: spacing.xl,
          }}
        >
          <h1
            className="forums-page__title"
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              color: colors.primary,
              margin: 0,
            }}
          >
            Forums
          </h1>
          <div
            className="forums-create-button-wrap"
            style={{
              position: "fixed",
              bottom: spacing.xl,
              right: spacing.xl,
              zIndex: 1000,
            }}
          >
            <div
              className="forums-create-button"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setShowCreateForm(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              onClick={() => {
                setShowCreateForm(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              style={{
                width: "60px",
                height: "60px",
                backgroundColor: colors.primary,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                transition: "all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                fontSize: "24px",
                color: colors.white,
                fontWeight: typography.fontWeight.bold,
                overflow: "hidden",
                whiteSpace: "nowrap",
                position: "relative",
              }}
              title="Create New Forum"
            >
              <span className="forums-create-button__label">Create forum</span>
              <span className="forums-create-button__icon" aria-hidden="true">
                +
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div
          className="forums-search-wrap"
          style={{ marginBottom: spacing.lg }}
        >
          <SearchBar
            placeholder="Search forums, users, tags..."
            searchMode="forums"
            onLocalSearch={handleLocalSearch}
            onAdvancedSearch={handleLocalAdvancedSearch}
          />
        </div>

        {/* Tabs */}
        <div
          className="forums-tabs"
          style={{
            display: "flex",
            borderBottom: `2px solid ${colors.gray[200]}`,
            marginBottom: spacing.lg,
          }}
        >
          {[
            { id: "all", label: "All Forums" },
            { id: "public", label: "Public" },
            { id: "private", label: "Private" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              style={{
                padding: `${spacing.md} ${spacing.lg}`,
                border: "none",
                background: "none",
                borderBottom: `2px solid ${
                  activeTab === tab.id ? colors.primary : "transparent"
                }`,
                color: activeTab === tab.id ? colors.primary : colors.gray[600],
                cursor: "pointer",
                fontSize: typography.sm,
                fontWeight: activeTab === tab.id ? "600" : "400",
                transition: "all 0.2s ease",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Forum Form */}
        {showCreateForm && (
          <Card
            className="forums-create-form"
            style={{ marginBottom: spacing.xl, padding: spacing.lg }}
          >
            <h3 style={{ marginBottom: spacing.md }}>Create New Forum</h3>
            <form onSubmit={handleCreateForum}>
              <div style={{ marginBottom: spacing.md }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontWeight: "600",
                  }}
                >
                  Forum Title
                </label>
                <input
                  type="text"
                  value={newForum.title}
                  onChange={(e) =>
                    setNewForum({ ...newForum, title: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.body,
                  }}
                />
              </div>
              <div style={{ marginBottom: spacing.md }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontWeight: "600",
                  }}
                >
                  Description
                </label>
                <textarea
                  value={newForum.description}
                  onChange={(e) =>
                    setNewForum({ ...newForum, description: e.target.value })
                  }
                  rows={3}
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.body,
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Badge Fields */}
              <div style={{ marginBottom: spacing.md }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontWeight: "600",
                  }}
                >
                  Subject
                </label>
                <select
                  value={newForum.subject}
                  onChange={(e) =>
                    setNewForum({ ...newForum, subject: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.body,
                  }}
                >
                  <option value="">Select Subject (Optional)</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ marginBottom: spacing.md }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontWeight: "600",
                  }}
                >
                  Level
                </label>
                <input
                  type="text"
                  value={newForum.level}
                  onChange={(e) =>
                    setNewForum({ ...newForum, level: e.target.value })
                  }
                  placeholder="e.g., National Albanian Olympiad 5th Class Phase 1, EGMO Phase 2, IMO, etc."
                  style={{
                    width: "100%",
                    padding: spacing.sm,
                    border: `1px solid ${colors.gray[300]}`,
                    borderRadius: borderRadius.md,
                    fontSize: typography.body,
                  }}
                />
              </div>

              <div style={{ marginBottom: spacing.md }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: spacing.xs,
                    fontWeight: "600",
                  }}
                >
                  Tags (Optional) - {newForum.tags.length}/5
                </label>
                {newForum.tags.map((tag, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginBottom: "10px",
                    }}
                  >
                    <input
                      type="text"
                      value={tag}
                      onChange={(e) => handleTagChange(index, e.target.value)}
                      style={{
                        flex: 1,
                        padding: "10px",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        fontSize: "14px",
                      }}
                      placeholder={`Tag ${index + 1}`}
                    />
                    {newForum.tags.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        style={{
                          padding: "10px",
                          backgroundColor: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {newForum.tags.length < 5 && (
                  <button
                    type="button"
                    onClick={addTag}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#28a745",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    + Add New Tag
                  </button>
                )}
                <small
                  style={{
                    color: "#666",
                    fontSize: "12px",
                    display: "block",
                    marginTop: "5px",
                  }}
                >
                  Add up to 5 tags to help categorize your forum
                </small>
              </div>

              <div style={{ marginBottom: spacing.md }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: spacing.sm,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newForum.is_private}
                    onChange={(e) =>
                      setNewForum({ ...newForum, is_private: e.target.checked })
                    }
                  />
                  <span>Private Forum (requires approval to join)</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: spacing.sm }}>
                <button
                  type="submit"
                  style={{
                    padding: "16px 32px",
                    backgroundColor: colors.primary,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    flex: 1,
                    boxShadow: "0 4px 12px rgba(26, 77, 58, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-2px)";
                    e.target.style.boxShadow =
                      "0 6px 16px rgba(26, 77, 58, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(26, 77, 58, 0.3)";
                  }}
                >
                  Create Forum
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    padding: "16px 32px",
                    backgroundColor: colors.gray[500],
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        )}

        {/* Forum Count */}
        {filteredForums.length > 0 && (
          <div
            className="forums-count"
            style={{
              marginBottom: spacing.md,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: "1.1rem",
                color: colors.gray[600],
                margin: 0,
              }}
            >
              {filteredForums.length} forum
              {filteredForums.length !== 1 ? "s" : ""} found
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        )}

        {/* Forums Grid */}
        <div
          className="forums-grid"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: spacing.lg,
          }}
        >
          {currentForums.map((forum) => (
            <Card
              key={forum.id}
              className="forum-list-card"
              hover={true}
              style={{
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={() => handleForumClick(forum)}
            >
              <div style={{ marginBottom: spacing.md, pointerEvents: "none" }}>
                <h3
                  style={{
                    margin: "0 0 8px 0",
                    color: colors.primary,
                    fontSize: "1.25rem",
                  }}
                >
                  {forum.title}
                </h3>
                <p
                  className="forum-list-card__description"
                  style={{
                    margin: "0 0 12px 0",
                    color: colors.gray[600],
                    fontSize: "0.9rem",
                  }}
                >
                  {forum.description}
                </p>

                {/* Forum Badges */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "6px",
                    marginBottom: "12px",
                    pointerEvents: "none",
                  }}
                >
                  {forum.subject && (
                    <span
                      className="forum-list-card__badge forum-list-card__badge--subject"
                      style={{
                        backgroundColor: "#e0e7ff",
                        color: "#3730a3",
                        padding: "6px 12px",
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {forum.subject}
                    </span>
                  )}
                  {forum.level && (
                    <span
                      className="forum-list-card__badge forum-list-card__badge--level"
                      style={{
                        backgroundColor: "#fef3c7",
                        color: "#92400e",
                        padding: "6px 12px",
                        borderRadius: "16px",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      {forum.level}
                    </span>
                  )}
                  {forum.tags &&
                    forum.tags
                      .split(",")
                      .slice(0, 3)
                      .map((tag, index) => (
                        <span
                          key={index}
                          className="forum-list-card__badge forum-list-card__badge--tag"
                          style={{
                            backgroundColor: "#dcfce7",
                            color: "#166534",
                            padding: "6px 12px",
                            borderRadius: "16px",
                            fontSize: "12px",
                            fontWeight: "600",
                          }}
                        >
                          {tag.trim()}
                        </span>
                      ))}
                </div>

                <div
                  className="forum-list-card__meta"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: spacing.sm,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <span
                      style={{
                        color: colors.gray[500],
                        fontSize: "0.85rem",
                      }}
                    >
                      {forum.member_count}/{forum.max_members} members
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          backgroundColor:
                            (forumOnlineCounts[forum.id] || 0) > 0
                              ? "#10b981"
                              : "#ef4444",
                        }}
                      ></div>
                      <span
                        style={{
                          color: colors.gray[600],
                          fontSize: "0.8rem",
                          fontWeight: "500",
                        }}
                      >
                        {forumOnlineCounts[forum.id] || 0} online
                      </span>
                    </div>
                  </div>
                  <span
                    className="forum-list-card__privacy"
                    style={{
                      color: colors.gray[700], // Changed from colors.warning to black
                      fontSize: "0.85rem",
                      fontWeight: "600",
                    }}
                  >
                    {forum.is_private ? "Private" : "Public"}
                  </span>
                </div>
              </div>

              <div
                className="forum-card-actions"
                style={{
                  display: "flex",
                  gap: spacing.sm,
                  justifyContent: "flex-end",
                  pointerEvents: "none",
                }}
              >
                {/* Show invite button for forum creators */}
                {currentUser && forum.creator_id === currentUser.id && (
                  <Button
                    size="sm"
                    onClick={(e) => handleInviteClick(forum.id, e)}
                    style={{
                      backgroundColor: colors.secondary,
                      pointerEvents: "auto",
                    }}
                  >
                    Invite Users
                  </Button>
                )}

                {/* Show appropriate button for non-creators who are not members */}
                {currentUser &&
                  forum.creator_id !== currentUser.id &&
                  !forum.is_member &&
                  (forum.is_private ? (
                    forum.has_pending_request ? (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetractRequest(forum.id);
                        }}
                        style={{
                          backgroundColor: colors.gray[500],
                          cursor: "pointer",
                          border: "none",
                          pointerEvents: "auto",
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = colors.danger;
                          e.target.textContent = "Retract Request";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = colors.gray[500];
                          e.target.textContent = "Requested";
                        }}
                      >
                        Requested
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestToJoin(forum.id);
                        }}
                        style={{
                          backgroundColor: colors.primary,
                          pointerEvents: "auto",
                        }}
                      >
                        Request to Join
                      </Button>
                    )
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinForum(forum.id);
                      }}
                      style={{
                        backgroundColor: colors.primary,
                        pointerEvents: "auto",
                      }}
                    >
                      Join Forum
                    </Button>
                  ))}
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination Controls */}
        {filteredForums.length > itemsPerPage && (
          <div
            className="forums-pagination"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: spacing.md,
              marginTop: spacing.xl,
              flexWrap: "wrap",
            }}
          >
            <Button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              variant="secondary"
              style={{
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </Button>

            <div style={{ display: "flex", gap: spacing.xs }}>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                // Logic to show pages around current page
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: borderRadius.md,
                      border: `1px solid ${currentPage === pageNum ? colors.primary : colors.gray[300]}`,
                      backgroundColor:
                        currentPage === pageNum ? colors.primary : "white",
                      color:
                        currentPage === pageNum ? "white" : colors.gray[700],
                      cursor: "pointer",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              variant="secondary"
              style={{
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </Button>

            <button
              type="button"
              className="forum-create-fab"
              onClick={() => {
                setShowCreateForm(true);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              aria-label="Create Forum"
            >
              <span className="forum-create-fab__label">Create Forum</span>
              <span className="forum-create-fab__plus">+</span>
            </button>
          </div>
        )}

        {filteredForums.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: spacing.xl,
              color: colors.gray[500],
            }}
          >
            <h3>No forums found</h3>
            <p>
              {searchQuery
                ? `No forums found matching "${searchQuery}"`
                : activeTab === "public"
                  ? "No public forums available"
                  : activeTab === "private"
                    ? "No private forums available"
                    : "Be the first to create a forum!"}
            </p>
          </div>
        )}

        {/* Invite Modal */}
        {showInviteModal && selectedForumId && (
          <ForumInviteModal
            isOpen={showInviteModal}
            onClose={handleInviteModalClose}
            forumId={selectedForumId}
            onInvite={handleInviteSuccess}
          />
        )}
      </div>
    </Layout>
  );
};

export default Forums;
