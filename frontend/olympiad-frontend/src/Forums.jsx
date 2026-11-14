import "./ForumDirectory.css";
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useRef } from "react";
import {useDialogFocus} from "./hooks/useDialogFocus";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  const [params,setParams]=useSearchParams();
  const paramsRef=useRef(params);paramsRef.current=params;
  const updateParam=(key,value)=>{const next=new URLSearchParams(paramsRef.current);if(value===null)next.delete(key);else next.set(key,String(value));paramsRef.current=next;setParams(next,{replace:true})};
  const [forums, setForums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Feature settings
  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const createModalRef=useDialogFocus(showCreateForm,()=>setShowCreateForm(false));
  const [newForum, setNewForum] = useState({
    title: "",
    description: "",
    is_private: false,
    max_members: 100,
    subject: "",
    level: "",
    tags: [""],
  });
  const activeTab=["all","public","private"].includes(params.get("tab"))?params.get("tab"):"all";
  const setActiveTab=value=>updateParam("tab",value);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedForumId, setSelectedForumId] = useState(null);
  const [allForums, setAllForums] = useState([]); // Store all forums for filtering
  const searchQuery=params.get("q")||"";
  const setSearchQuery=value=>updateParam("q",value);
  const [forumOnlineCounts, setForumOnlineCounts] = useState({});
  const currentPage=Math.max(1,Number(params.get("page"))||1);
  const setCurrentPage=value=>updateParam("page",value);
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

  useEffect(() => {
    if (!showCreateForm) return undefined;

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowCreateForm(false);
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateForm]);

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
      // Online presence is fetched for the current page below, not every forum.
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

      const fetchCount = async (forum) => {
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
      };
      // Presence requires membership. Bound concurrency instead of bursting one
      // request per forum into the backend connection pool.
      const eligible = forums.filter(forum => forum.is_member);
      const results = [];
      for (let start = 0; start < eligible.length; start += 4) {
        results.push(...await Promise.all(eligible.slice(start,start+4).map(fetchCount)));
      }
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
    updateParam("filters",null);
    setSearchQuery(query);
    setCurrentPage(1);
    filterForums(query);
  };

  // Local advanced search filtering
  const handleLocalAdvancedSearch = (advancedData) => {
    updateParam("filters",JSON.stringify(advancedData));
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

  const advancedParam=params.get("filters");
  useEffect(()=>{try{if(advancedParam){filterForumsAdvanced(JSON.parse(advancedParam));return}}catch{}filterForums(searchQuery)},[allForums,searchQuery,advancedParam]);

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
  useEffect(()=>{fetchAllOnlineCounts(currentForums)},[allForums,currentPage,activeTab,searchQuery]);

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
        {/* Header */}
        <div className="forums-page__header">
          <div className="forums-page__heading-wrap">
            <h1 className="forums-page__title">Forums</h1>

            <p className="forums-page__subtitle">
              Discover communities, discuss olympiad problems, and learn
              together.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div
          className="forums-search-wrap"
          style={{ marginBottom: spacing.lg }}
        >
          <SearchBar
            placeholder="Search forums, subjects, tags..."
            initialQuery={searchQuery}
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

        {/* Create Forum Modal */}
        {showCreateForm && (
          <div
            className="forum-create-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setShowCreateForm(false);
              }
            }}
          >
            <div
              className="forum-create-modal" ref={createModalRef} tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-labelledby="create-forum-title"
            >
              <div className="forum-create-modal__header">
                <div>
                  <h2 id="create-forum-title">Create New Forum</h2>

                  <p>
                    Create a space for discussing problems, competitions, and
                    ideas.
                  </p>
                </div>

                <button
                  type="button"
                  className="forum-create-modal__close"
                  onClick={() => setShowCreateForm(false)}
                  aria-label="Close create forum modal"
                >
                  ×
                </button>
              </div>

              <form className="forums-create-form" onSubmit={handleCreateForum}>
                <div className="forum-create-modal__body">
                  <div className="forum-create-modal__field">
                    <label htmlFor="forum-title">Forum Title</label>

                    <input
                      id="forum-title"
                      type="text"
                      value={newForum.title}
                      onChange={(event) =>
                        setNewForum({
                          ...newForum,
                          title: event.target.value,
                        })
                      }
                      placeholder="Give your forum a clear name"
                      required
                      autoFocus
                    />
                  </div>

                  <div className="forum-create-modal__field">
                    <label htmlFor="forum-description">Description</label>

                    <textarea
                      id="forum-description"
                      value={newForum.description}
                      onChange={(event) =>
                        setNewForum({
                          ...newForum,
                          description: event.target.value,
                        })
                      }
                      rows={4}
                      placeholder="What will this forum be about?"
                    />
                  </div>

                  <div className="forum-create-modal__grid">
                    <div className="forum-create-modal__field">
                      <label htmlFor="forum-subject">Subject</label>

                      <select
                        id="forum-subject"
                        value={newForum.subject}
                        onChange={(event) =>
                          setNewForum({
                            ...newForum,
                            subject: event.target.value,
                          })
                        }
                      >
                        <option value="">Select subject</option>
                        <option value="Mathematics">Mathematics</option>
                        <option value="Physics">Physics</option>
                        <option value="Chemistry">Chemistry</option>
                        <option value="Biology">Biology</option>
                        <option value="Computer Science">
                          Computer Science
                        </option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="forum-create-modal__field">
                      <label htmlFor="forum-level">Level</label>

                      <input
                        id="forum-level"
                        type="text"
                        value={newForum.level}
                        onChange={(event) =>
                          setNewForum({
                            ...newForum,
                            level: event.target.value,
                          })
                        }
                        placeholder="e.g. IMO, EGMO, National Olympiad"
                      />
                    </div>
                  </div>

                  <div className="forum-create-modal__field">
                    <div className="forum-create-modal__label-row">
                      <label>Tags</label>

                      <span>{newForum.tags.length}/5</span>
                    </div>

                    <div className="forum-create-modal__tags">
                      {newForum.tags.map((tag, index) => (
                        <div
                          key={index}
                          className="forum-create-modal__tag-row"
                        >
                          <input
                            type="text"
                            value={tag}
                            onChange={(event) =>
                              handleTagChange(index, event.target.value)
                            }
                            placeholder={`Tag ${index + 1}`}
                          />

                          {newForum.tags.length > 1 && (
                            <button
                              type="button"
                              className="forum-create-modal__remove-tag"
                              onClick={() => removeTag(index)}
                              aria-label={`Remove tag ${index + 1}`}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {newForum.tags.length < 5 && (
                      <button
                        type="button"
                        className="forum-create-modal__add-tag"
                        onClick={addTag}
                      >
                        + Add tag
                      </button>
                    )}

                    <small className="forum-create-modal__hint">
                      Add up to 5 tags to help people discover your forum.
                    </small>
                  </div>

                  <label className="forum-create-modal__privacy">
                    <input
                      type="checkbox"
                      checked={newForum.is_private}
                      onChange={(event) =>
                        setNewForum({
                          ...newForum,
                          is_private: event.target.checked,
                        })
                      }
                    />

                    <span className="forum-create-modal__privacy-copy">
                      <strong>Private forum</strong>

                      <span>
                        New members will need approval before joining.
                      </span>
                    </span>
                  </label>
                </div>

                <div className="forum-create-modal__actions">
                  <button
                    type="button"
                    className="forum-create-modal__cancel"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="forum-create-modal__submit">
                    Create Forum
                  </button>
                </div>
              </form>
            </div>
          </div>
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

        <div className="forum-directory-layout"><aside className="forum-directory-rail"><h2>Your communities</h2>{allForums.filter(f=>f.is_member||f.creator_id===currentUser?.id).length?allForums.filter(f=>f.is_member||f.creator_id===currentUser?.id).map(f=><button key={f.id} onClick={()=>handleForumClick(f)}><span>{f.title}</span><span aria-hidden="true">↗</span></button>):<p>Join a forum to keep its discussions close at hand.</p>}<div className="forum-directory-note"><span>COMMUNITY</span><h3>A place for the full discussion.</h3><p>Share your reasoning, ask a question or work through a problem with others.</p></div><button className="forum-directory-create" aria-label="Create New Forum" onClick={()=>setShowCreateForm(true)}>+ Create Forum</button></aside>
        <section className="forum-directory" aria-label="Forum directory"><div className="forum-directory-label"><span>Community</span><span>Participation</span></div>{currentForums.map(forum=><article className="forum-directory-entry" key={forum.id}>
          <div className="forum-directory-symbol" aria-hidden="true">{forum.title?.charAt(0)}</div>
          <div className="forum-directory-content"><div className="forum-directory-meta"><span>{forum.subject}</span><span>{forum.is_private?'Private':'Public'}</span>{forum.level&&<span>{forum.level}</span>}</div><h2><Link to={`/forum/${forum.id}/info`}>{forum.title}</Link></h2><p>{forum.description}</p><div className="forum-directory-tags">{String(forum.tags||'').split(',').filter(Boolean).slice(0,3).map(tag=><span key={tag}>{tag.trim()}</span>)}</div><div className="forum-directory-members"><span>{forum.member_count}/{forum.max_members} members</span><span>{forumOnlineCounts[forum.id]||0} online</span></div></div>
          <div className="forum-directory-actions">
           {(forum.is_member||forum.creator_id===currentUser?.id)&&<button onClick={()=>handleForumClick(forum)}>Open forum ↗</button>}
           {currentUser&&forum.creator_id===currentUser.id&&<button onClick={e=>handleInviteClick(forum.id,e)}>Invite Users</button>}
           {currentUser&&forum.creator_id!==currentUser.id&&!forum.is_member&&(forum.is_private?forum.has_pending_request?<button onClick={()=>handleRetractRequest(forum.id)}>Retract Request</button>:<button onClick={()=>handleRequestToJoin(forum.id)}>Request to Join</button>:<button onClick={()=>handleJoinForum(forum.id)}>Join Forum</button>)}
          </div>
        </article>)}</section></div>

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
