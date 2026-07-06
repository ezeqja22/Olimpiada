/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import Layout from "./Layout";
import BackButton from "./BackButton";
import FollowButton from "./FollowButton";
import AnimatedLoader from "./AnimatedLoader";
import { getDisplayName, getUserInitial } from "../utils";
import "./FollowersFollowing.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";
const VALID_TYPES = new Set(["followers", "following"]);

const FollowersFollowing = ({ type }) => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialType = VALID_TYPES.has(type) ? type : "followers";

  const [activeTab, setActiveTab] = useState(initialType);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [followingStatus, setFollowingStatus] = useState({});
  const [followLoading, setFollowLoading] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const storedReturnTo = sessionStorage.getItem(
    `connectionsReturnTo:${userId}`,
  );

  const requestedReturnTo = location.state?.returnTo || storedReturnTo;

  const returnTo =
    typeof requestedReturnTo === "string" && requestedReturnTo.startsWith("/")
      ? requestedReturnTo
      : "/profile";

  const users = activeTab === "followers" ? followers : following;

  useEffect(() => {
    if (VALID_TYPES.has(type)) {
      setActiveTab(type);
    }
  }, [type]);

  useEffect(() => {
    fetchPageData();
  }, [userId]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: getAuthHeaders(),
      });

      setCurrentUser(response.data);
      return response.data;
    } catch (requestError) {
      console.error("Error fetching current user:", requestError);
      setCurrentUser(null);
      return null;
    }
  };

  const fetchFollowStatuses = async (userIds) => {
    const token = localStorage.getItem("token");

    if (!token || userIds.length === 0) {
      setFollowingStatus({});
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/auth/follow/status/bulk`,
        userIds,
        {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
        },
      );

      setFollowingStatus(response.data || {});
    } catch (requestError) {
      console.error("Error fetching follow status:", requestError);

      const fallbackStatus = {};
      userIds.forEach((id) => {
        fallbackStatus[id] = false;
      });
      setFollowingStatus(fallbackStatus);
    }
  };

  const fetchPageData = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = getAuthHeaders();

      const [followersResponse, followingResponse] = await Promise.all([
        axios.get(`${API_URL}/auth/followers/${userId}`, { headers }),
        axios.get(`${API_URL}/auth/following/${userId}`, { headers }),
      ]);

      const nextFollowers = Array.isArray(followersResponse.data)
        ? followersResponse.data
        : [];
      const nextFollowing = Array.isArray(followingResponse.data)
        ? followingResponse.data
        : [];

      setFollowers(nextFollowers);
      setFollowing(nextFollowing);

      await fetchCurrentUser();

      const userIds = [
        ...new Set(
          [...nextFollowers, ...nextFollowing]
            .map((user) => user?.id)
            .filter(Boolean),
        ),
      ];

      await fetchFollowStatuses(userIds);
    } catch (requestError) {
      console.error("Error fetching followers/following:", requestError);
      setError("Failed to load this user list.");
      setFollowers([]);
      setFollowing([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (nextType) => {
    if (!VALID_TYPES.has(nextType) || nextType === activeTab) return;

    setActiveTab(nextType);
    navigate(`/${nextType}/${userId}`, {
      replace: true,
      state: { returnTo },
    });
  };

  const navigateToUser = (user) => {
    if (!user?.username) return;

    const currentListPath = `${location.pathname}${location.search || ""}`;

    sessionStorage.setItem(`connectionsReturnTo:${user.id}`, currentListPath);

    const targetPath =
      currentUser && currentUser.id === user.id
        ? "/profile"
        : `/user/${user.username}`;

    navigate(targetPath, {
      state: { returnTo: currentListPath },
    });
  };

  const setUserFollowLoading = (targetUserId, value) => {
    setFollowLoading((prev) => ({
      ...prev,
      [targetUserId]: value,
    }));
  };

  const handleFollow = async (targetUserId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setUserFollowLoading(targetUserId, true);

      await axios.post(
        `${API_URL}/auth/follow/${targetUserId}`,
        {},
        { headers: getAuthHeaders() },
      );

      setFollowingStatus((prev) => ({
        ...prev,
        [targetUserId]: true,
      }));
    } catch (requestError) {
      console.error("Error following user:", requestError);
    } finally {
      setUserFollowLoading(targetUserId, false);
    }
  };

  const handleUnfollow = async (targetUserId) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setUserFollowLoading(targetUserId, true);

      await axios.delete(`${API_URL}/auth/follow/${targetUserId}`, {
        headers: getAuthHeaders(),
      });

      setFollowingStatus((prev) => ({
        ...prev,
        [targetUserId]: false,
      }));
    } catch (requestError) {
      console.error("Error unfollowing user:", requestError);
    } finally {
      setUserFollowLoading(targetUserId, false);
    }
  };

  const pageTitle = useMemo(
    () => (activeTab === "followers" ? "Followers" : "Following"),
    [activeTab],
  );

  if (loading) {
    return (
      <Layout showHomeButton={true}>
        <AnimatedLoader
          type="profile"
          message={`Loading ${initialType}...`}
          size="large"
        />
      </Layout>
    );
  }

  return (
    <Layout showHomeButton={true}>
      <main className="connections-page">
        <div className="connections-back-row">
          <BackButton fallbackPath={returnTo} />
        </div>

        <section className="connections-header">
          <div>
            <span className="connections-eyebrow">Community</span>
            <h1>{pageTitle}</h1>
            <p>
              Browse the people connected to this profile and discover other
              students in the Olimpiada.al community.
            </p>
          </div>
        </section>

        <section
          className="connections-tabs-card"
          aria-label="User connections"
        >
          <button
            type="button"
            className={`connections-tab ${
              activeTab === "followers" ? "active" : ""
            }`}
            onClick={() => handleTabChange("followers")}
          >
            <span>Followers</span>
            <strong>{followers.length}</strong>
          </button>

          <button
            type="button"
            className={`connections-tab ${
              activeTab === "following" ? "active" : ""
            }`}
            onClick={() => handleTabChange("following")}
          >
            <span>Following</span>
            <strong>{following.length}</strong>
          </button>
        </section>

        {error ? (
          <section className="connections-state connections-state--error">
            <div className="connections-state-icon">!</div>
            <h2>Could not load users</h2>
            <p>{error}</p>
            <button type="button" onClick={fetchPageData}>
              Try Again
            </button>
          </section>
        ) : users.length === 0 ? (
          <section className="connections-state">
            <div className="connections-state-icon">○</div>
            <h2>No {activeTab} yet</h2>
            <p>This list is empty right now.</p>
          </section>
        ) : (
          <section className="connections-list" aria-label={pageTitle}>
            {users.map((user) => {
              const isCurrentUser = currentUser?.id === user.id;
              const isFollowing = Boolean(followingStatus[user.id]);

              return (
                <article className="connection-card" key={user.id}>
                  <button
                    type="button"
                    className="connection-profile-button"
                    onClick={() => navigateToUser(user)}
                  >
                    <div
                      className="connection-avatar"
                      style={{
                        backgroundImage: user.profile_picture
                          ? `url(${user.profile_picture})`
                          : "none",
                      }}
                    >
                      {!user.profile_picture && getUserInitial(user.username)}
                    </div>

                    <div className="connection-copy">
                      <h2>{getDisplayName(user.username)}</h2>
                      {user.bio ? (
                        <p>{user.bio}</p>
                      ) : (
                        <p className="connection-copy-muted">No bio yet.</p>
                      )}
                    </div>
                  </button>

                  {currentUser && !isCurrentUser && (
                    <div
                      className="connection-follow-action"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <FollowButton
                        isFollowing={isFollowing}
                        onFollow={() => handleFollow(user.id)}
                        onUnfollow={() => handleUnfollow(user.id)}
                        loading={Boolean(followLoading[user.id])}
                        size="md"
                        isDeletedUser={Boolean(
                          user.username?.startsWith("__deleted_user_"),
                        )}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        )}
      </main>
    </Layout>
  );
};

export default FollowersFollowing;
