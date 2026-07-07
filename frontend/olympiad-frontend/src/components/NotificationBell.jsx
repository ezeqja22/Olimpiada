/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { colors } from "../designSystem";
import { useToast } from "./ToastProvider";
import notificationStyles from "./notificationStyles.css";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const NOTIFICATION_ICON =
  "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760789591/Notification_Icon_fm5zqx.svg";

const BellIcon = () => (
  <svg
    className="notification-bell-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const EmptyBellIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

function NotificationBell({ onNotificationClick }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userPreferences, setUserPreferences] = useState(null);

  const rootRef = useRef(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchUserPreferences();
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showDropdown) return undefined;

    const handleOutsideClick = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showDropdown]);

  useEffect(() => {
    if (!showDropdown || window.innerWidth > 768) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showDropdown]);

  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/auth/notification-preferences`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setUserPreferences(response.data);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${API_URL}/auth/notifications/unread-count`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setUnreadCount(response.data?.unread_count ?? 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const filterNotificationsByPreferences = (notificationList) => {
    if (!userPreferences) return notificationList;

    return notificationList.filter((notification) => {
      switch (notification.type) {
        case "like":
        case "comment":
          return userPreferences.in_app_likes;

        case "follow":
          return userPreferences.in_app_follows;

        case "forum_join_request":
        case "forum_request_accepted":
        case "forum_request_declined":
        case "forum_invitation":
        case "forum_invitation_accepted":
        case "forum_invitation_declined":
          return true;

        case "forum_deleted":
          return userPreferences.in_app_forum_deleted;

        default:
          return true;
      }
    });
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(`${API_URL}/auth/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const filteredNotifications = filterNotificationsByPreferences(
        response.data,
      );

      setNotifications(filteredNotifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBellClick = () => {
    setShowDropdown((previous) => {
      const willOpen = !previous;

      if (willOpen) {
        fetchNotifications();
      }

      return willOpen;
    });
  };

  const handleNotificationSelect = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (onNotificationClick) {
      onNotificationClick(notification);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/auth/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification,
        ),
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");

      await axios.put(
        `${API_URL}/auth/notifications/mark-all-read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          is_read: true,
        })),
      );

      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const handleAcceptJoinRequest = async (notification) => {
    try {
      const token = localStorage.getItem("token");
      const { forum_id, request_id } = notification.data || {};

      if (!forum_id || !request_id) {
        const message = notification.message || "";
        const usernameMatch = message.match(/^(\w+) wants to join/);
        const forumMatch = message.match(/wants to join '([^']+)'/);

        if (usernameMatch && forumMatch) {
          const forumTitle = forumMatch[1];

          showToast(
            `This is an old notification. Please go to the Forums page and check the join requests for "${forumTitle}" to accept/decline manually.`,
            "error",
          );

          return;
        }

        showToast(
          "Unable to process this old notification. Please refresh the page.",
          "error",
        );

        return;
      }

      await axios.post(
        `${API_URL}/auth/forums/${forum_id}/join-requests/${request_id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                title: "Join Request Accepted",
                message: `You accepted ${
                  notification.data?.requester_name || "user"
                }'s request to join your forum`,
                type: "forum_request_accepted",
              }
            : item,
        ),
      );

      showToast("Join request accepted!", "success");
    } catch (error) {
      console.error("Error accepting join request:", error);
      showToast("Failed to accept join request", "error");
    }
  };

  const handleDeclineJoinRequest = async (notification) => {
    try {
      const token = localStorage.getItem("token");
      const { forum_id, request_id } = notification.data || {};

      await axios.post(
        `${API_URL}/auth/forums/${forum_id}/join-requests/${request_id}/decline`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                title: "Join Request Declined",
                message: `You declined ${
                  notification.data?.requester_name || "user"
                }'s request to join your forum`,
                type: "forum_request_declined",
              }
            : item,
        ),
      );

      showToast("Join request declined", "error");
    } catch (error) {
      console.error("Error declining join request:", error);
      showToast("Failed to decline join request", "error");
    }
  };

  const handleAcceptInvitation = async (notification) => {
    try {
      const token = localStorage.getItem("token");
      const { forum_id, invitation_id } = notification.data || {};

      if (!forum_id || !invitation_id) {
        showToast(
          "This is an old notification without proper data. Please go to the Forums page to manage your invitations manually.",
          "error",
        );

        return;
      }

      await axios.post(
        `${API_URL}/auth/forums/${forum_id}/invitations/${invitation_id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                title: "Invitation Accepted",
                message: `You accepted the invitation to join '${
                  notification.data?.forum_title || "forum"
                }'`,
                type: "forum_invitation_accepted",
              }
            : item,
        ),
      );

      showToast("Forum invitation accepted!", "success");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      showToast("Failed to accept invitation", "error");
    }
  };

  const handleDeclineInvitation = async (notification) => {
    try {
      const token = localStorage.getItem("token");
      const { forum_id, invitation_id } = notification.data || {};

      if (!forum_id || !invitation_id) {
        showToast(
          "This is an old notification without proper data. Please go to the Forums page to manage your invitations manually.",
          "error",
        );

        return;
      }

      await axios.post(
        `${API_URL}/auth/forums/${forum_id}/invitations/${invitation_id}/decline`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                title: "Invitation Declined",
                message: `You declined the invitation to join '${
                  notification.data?.forum_title || "forum"
                }'`,
                type: "forum_invitation_declined",
              }
            : item,
        ),
      );

      showToast("Forum invitation declined", "error");
    } catch (error) {
      console.error("Error declining invitation:", error);
      showToast("Failed to decline invitation", "error");
    }
  };

  const getNotificationIcon = (notification) => {
    const type = notification.type;
    const title = notification.title || "";
    const message = notification.message || "";

    if (title.includes("Accepted") || message.includes("accepted")) {
      return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811399/Tick_Icon_Green_a28qin.svg";
    }

    if (title.includes("Declined") || message.includes("declined")) {
      return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760907040/kryq_icon_red_kl8yvv.svg";
    }

    switch (type) {
      case "like":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795079/Like_Icon_hf3gef.svg";

      case "comment":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811309/Comment_Icon_Green_x7qrz6.svg";

      case "follow":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760795125/Profile_Icon_Green_rupznp.svg";

      case "forum_join_request":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811442/Forums_admin_panel_bmseel.svg";

      case "forum_request_accepted":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811399/Tick_Icon_Green_a28qin.svg";

      case "forum_request_declined":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760907040/kryq_icon_red_kl8yvv.svg";

      case "forum_invitation":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811297/Email_admin_panel_zjmkz7.svg";

      case "forum_invitation_accepted":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811399/Tick_Icon_Green_a28qin.svg";

      case "forum_invitation_declined":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760907040/kryq_icon_red_kl8yvv.svg";

      case "forum_deleted":
        return "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760811026/Delete_Icon_Green_padbr7.svg";

      default:
        return NOTIFICATION_ICON;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "Just now";

    if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`;
    }

    if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    }

    if (diffInSeconds < 2592000) {
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }

    if (diffInSeconds < 31536000) {
      return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    }

    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  };

  const renderActionButtons = (notification) => {
    if (notification.type === "forum_join_request") {
      return (
        <div className="notification-actions">
          <button
            type="button"
            className="notification-action-button accept"
            onClick={(event) => {
              event.stopPropagation();
              handleAcceptJoinRequest(notification);
            }}
          >
            Accept
          </button>

          <button
            type="button"
            className="notification-action-button decline"
            onClick={(event) => {
              event.stopPropagation();
              handleDeclineJoinRequest(notification);
            }}
          >
            Decline
          </button>
        </div>
      );
    }

    if (notification.type === "forum_invitation") {
      return (
        <div className="notification-actions">
          <button
            type="button"
            className="notification-action-button accept"
            onClick={(event) => {
              event.stopPropagation();
              handleAcceptInvitation(notification);
            }}
          >
            Accept
          </button>

          <button
            type="button"
            className="notification-action-button decline"
            onClick={(event) => {
              event.stopPropagation();
              handleDeclineInvitation(notification);
            }}
          >
            Decline
          </button>
        </div>
      );
    }

    return null;
  };

  const rootStyles = {
    "--notification-primary": colors.primary || "#1a4d3a",
    "--notification-secondary": colors.secondary || "#2d7a5f",
    "--notification-danger": colors.danger || colors.error || "#dc2626",
    "--notification-header-bg": colors.primary || "#1a4d3a",
  };

  return (
    <>
      <style>{notificationStyles}</style>

      <div ref={rootRef} className="notification-bell-root" style={rootStyles}>
        <button
          type="button"
          className={`notification-bell-button ${
            showDropdown ? "is-open" : ""
          }`}
          onClick={handleBellClick}
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
          aria-expanded={showDropdown}
          aria-haspopup="dialog"
        >
          <BellIcon />

          {unreadCount > 0 && (
            <span className="notification-count-badge">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <>
            <div
              className="notification-mobile-backdrop"
              onClick={() => setShowDropdown(false)}
              aria-hidden="true"
            />

            <div
              className="notification-panel"
              role="dialog"
              aria-modal="false"
              aria-label="Notifications"
            >
              <div className="notification-panel-header">
                <div className="notification-panel-header-main">
                  <div className="notification-panel-title-group">
                    <div className="notification-panel-title-row">
                      <h3 className="notification-panel-title">
                        Notifications
                      </h3>

                      {unreadCount > 0 && (
                        <span className="notification-header-count">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </div>

                    <p className="notification-panel-subtitle">
                      Stay updated with activity on Olimpiada.al
                    </p>
                  </div>

                  <div className="notification-header-actions">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notification-mark-all-button"
                        onClick={markAllAsRead}
                      >
                        Mark all read
                      </button>
                    )}

                    <button
                      type="button"
                      className="notification-close-button"
                      onClick={() => setShowDropdown(false)}
                      aria-label="Close notifications"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
              </div>

              <div className="notification-list">
                {loading ? (
                  <div className="notification-skeleton-list">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="notification-skeleton">
                        <div className="notification-skeleton-icon" />

                        <div className="notification-skeleton-content">
                          <div className="notification-skeleton-line first" />
                          <div className="notification-skeleton-line second" />
                          <div className="notification-skeleton-line third" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="notification-state">
                    <div className="notification-empty-icon">
                      <EmptyBellIcon />
                    </div>

                    <p className="notification-state-title">
                      You&apos;re all caught up
                    </p>

                    <p className="notification-state-description">
                      New likes, comments, follows, and forum activity will
                      appear here.
                    </p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`notification-item ${
                        notification.is_read ? "" : "is-unread"
                      }`}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationSelect(notification)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNotificationSelect(notification);
                        }
                      }}
                    >
                      <div className="notification-item-content">
                        <div className="notification-icon-wrapper">
                          <img
                            className="notification-icon"
                            src={getNotificationIcon(notification)}
                            alt=""
                            aria-hidden="true"
                            onError={(event) => {
                              event.currentTarget.src = NOTIFICATION_ICON;
                            }}
                          />
                        </div>

                        <div className="notification-body">
                          <div className="notification-title-row">
                            <p className="notification-item-title">
                              {notification.title}
                            </p>

                            {!notification.is_read && (
                              <span
                                className="notification-unread-dot"
                                aria-label="Unread"
                              />
                            )}
                          </div>

                          <p className="notification-message">
                            {notification.message}
                          </p>

                          {renderActionButtons(notification)}

                          <time className="notification-time">
                            {formatTimeAgo(notification.created_at)}
                          </time>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default NotificationBell;
