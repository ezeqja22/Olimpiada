/* eslint-disable no-unused-vars */
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { colors } from "../designSystem";
import { useToast } from "./ToastProvider";

const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";

const NOTIFICATION_ICON =
  "https://res.cloudinary.com/dqmmgk88b/image/upload/v1760789591/Notification_Icon_fm5zqx.svg";

const notificationStyles = `
  .notification-bell-root {
    position: relative;
    display: flex;
    align-items: center;
  }

  .notification-bell-button {
    position: relative;
    width: 42px;
    height: 42px;
    padding: 0;
    border: 0;
    border-radius: 12px;
    background: transparent;
    color: #ffffff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color 160ms ease,
      transform 160ms ease;
  }

  .notification-bell-button:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  .notification-bell-button:active {
    transform: scale(0.96);
  }

  .notification-bell-button:focus-visible {
    outline: 2px solid rgba(255, 255, 255, 0.85);
    outline-offset: 2px;
  }

  .notification-bell-button.is-open {
    background: rgba(255, 255, 255, 0.14);
  }

  .notification-bell-svg {
    width: 22px;
    height: 22px;
    display: block;
  }

  .notification-count-badge {
    position: absolute;
    top: 1px;
    right: 0;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border: 2px solid var(--notification-header-bg);
    border-radius: 999px;
    background: var(--notification-danger);
    color: #ffffff;
    font-size: 10px;
    line-height: 1;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .notification-mobile-backdrop {
    display: none;
  }

  .notification-panel {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    z-index: 10001;

    width: min(420px, calc(100vw - 24px));
    max-height: min(620px, calc(100dvh - 90px));

    background: #ffffff;
    border: 1px solid #e5e9e7;
    border-radius: 16px;
    box-shadow:
      0 20px 50px rgba(18, 56, 43, 0.14),
      0 4px 14px rgba(18, 56, 43, 0.06);

    display: flex;
    flex-direction: column;
    overflow: hidden;

    transform-origin: top right;
    animation: notification-panel-enter 160ms ease-out;
  }

  @keyframes notification-panel-enter {
    from {
      opacity: 0;
      transform: translateY(-6px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .notification-panel-header {
    flex-shrink: 0;
    padding: 18px 18px 15px;
    border-bottom: 1px solid #edf0ef;
    background: #ffffff;
  }

  .notification-panel-header-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .notification-panel-title-group {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .notification-panel-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notification-panel-title {
    margin: 0;
    color: var(--notification-primary);
    font-size: 18px;
    line-height: 1.25;
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .notification-header-count {
    min-width: 22px;
    height: 22px;
    padding: 0 7px;
    border-radius: 999px;
    background: #edf6f2;
    color: var(--notification-primary);
    font-size: 11px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .notification-panel-subtitle {
    margin: 0;
    color: #7a8782;
    font-size: 12px;
    line-height: 1.4;
  }

  .notification-mark-all-button {
    flex-shrink: 0;
    min-height: 34px;
    padding: 7px 10px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--notification-primary);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 150ms ease;
  }

  .notification-mark-all-button:hover {
    background: #f1f7f4;
  }

  .notification-close-button {
    display: none;
  }

  .notification-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #cfd8d4 transparent;
  }

  .notification-list::-webkit-scrollbar {
    width: 6px;
  }

  .notification-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .notification-list::-webkit-scrollbar-thumb {
    background: #cfd8d4;
    border-radius: 999px;
  }

  .notification-item {
    position: relative;
    padding: 15px 16px;
    border-bottom: 1px solid #f0f2f1;
    background: #ffffff;
    cursor: pointer;
    outline: none;
    -webkit-tap-highlight-color: transparent;
    transition: background-color 150ms ease;
  }

  .notification-item:last-child {
    border-bottom: 0;
  }

  .notification-item:hover {
    background: #f8faf9;
  }

  .notification-item:focus-visible {
    box-shadow: inset 0 0 0 2px var(--notification-primary);
  }

  .notification-item.is-unread {
    background: #f5faf7;
  }

  .notification-item.is-unread:hover {
    background: #eff7f3;
  }

  .notification-item-content {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
  }

  .notification-icon-wrapper {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 11px;
    background: #edf6f2;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification-icon {
    width: 20px;
    height: 20px;
    display: block;
    object-fit: contain;
  }

  .notification-body {
    flex: 1;
    min-width: 0;
  }

  .notification-title-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .notification-item-title {
    flex: 1;
    min-width: 0;
    margin: 0;
    color: #1f2d28;
    font-size: 14px;
    line-height: 1.35;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .notification-item.is-unread .notification-item-title {
    font-weight: 700;
  }

  .notification-unread-dot {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    margin-top: 5px;
    border-radius: 50%;
    background: var(--notification-primary);
  }

  .notification-message {
    margin: 5px 0 0;
    color: #66736e;
    font-size: 12.5px;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }

  .notification-time {
    display: block;
    margin-top: 7px;
    color: #98a29e;
    font-size: 11px;
    line-height: 1.3;
  }

  .notification-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 11px;
  }

  .notification-action-button {
    min-height: 34px;
    padding: 7px 14px;
    border-radius: 8px;
    font: inherit;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition:
      background-color 150ms ease,
      border-color 150ms ease,
      transform 150ms ease;
  }

  .notification-action-button:active {
    transform: scale(0.98);
  }

  .notification-action-button.accept {
    border: 1px solid var(--notification-primary);
    background: var(--notification-primary);
    color: #ffffff;
  }

  .notification-action-button.accept:hover {
    background: var(--notification-secondary);
    border-color: var(--notification-secondary);
  }

  .notification-action-button.decline {
    border: 1px solid #dce2df;
    background: #ffffff;
    color: #596660;
  }

  .notification-action-button.decline:hover {
    border-color: #c7cfcb;
    background: #f6f8f7;
    color: var(--notification-danger);
  }

  .notification-state {
    min-height: 250px;
    padding: 34px 24px;
    color: #7a8782;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .notification-empty-icon {
    width: 54px;
    height: 54px;
    margin-bottom: 14px;
    border-radius: 16px;
    background: #edf6f2;
    color: var(--notification-primary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .notification-empty-icon svg {
    width: 25px;
    height: 25px;
  }

  .notification-state-title {
    margin: 0;
    color: #33423c;
    font-size: 15px;
    font-weight: 650;
  }

  .notification-state-description {
    max-width: 250px;
    margin: 6px 0 0;
    color: #8a9591;
    font-size: 12px;
    line-height: 1.5;
  }

  .notification-skeleton-list {
    padding: 6px 0;
  }

  .notification-skeleton {
    padding: 14px 16px;
    display: flex;
    gap: 12px;
  }

  .notification-skeleton-icon,
  .notification-skeleton-line {
    background: linear-gradient(
      90deg,
      #eef1ef 25%,
      #f7f8f7 50%,
      #eef1ef 75%
    );
    background-size: 200% 100%;
    animation: notification-shimmer 1.3s infinite;
  }

  .notification-skeleton-icon {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    border-radius: 11px;
  }

  .notification-skeleton-content {
    flex: 1;
    padding-top: 2px;
  }

  .notification-skeleton-line {
    height: 10px;
    margin-bottom: 9px;
    border-radius: 999px;
  }

  .notification-skeleton-line.first {
    width: 58%;
  }

  .notification-skeleton-line.second {
    width: 92%;
  }

  .notification-skeleton-line.third {
    width: 36%;
  }

  @keyframes notification-shimmer {
    0% {
      background-position: 200% 0;
    }

    100% {
      background-position: -200% 0;
    }
  }

  @media (max-width: 768px) {
    .notification-bell-button {
      width: 40px;
      height: 40px;
      border-radius: 10px;
    }

    .notification-bell-svg {
      width: 21px;
      height: 21px;
    }

    .notification-count-badge {
      top: 0;
      right: -1px;
    }

    .notification-mobile-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9998;
      display: block;
      background: rgba(7, 28, 21, 0.34);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      animation: notification-backdrop-enter 160ms ease-out;
    }

    @keyframes notification-backdrop-enter {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    .notification-panel {
      position: fixed;
      top: calc(env(safe-area-inset-top, 0px) + 68px);
      right: 8px;
      bottom: max(8px, env(safe-area-inset-bottom, 8px));
      left: 8px;
      z-index: 9999;

      width: auto;
      max-height: none;

      border-radius: 16px;
      transform-origin: top center;
      animation: notification-mobile-enter 180ms ease-out;
    }

    @keyframes notification-mobile-enter {
      from {
        opacity: 0;
        transform: translateY(10px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .notification-panel-header {
      padding: 16px;
    }

    .notification-panel-title {
      font-size: 17px;
    }

    .notification-panel-subtitle {
      font-size: 11.5px;
    }

    .notification-header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .notification-mark-all-button {
      min-height: 38px;
      padding: 8px;
    }

    .notification-close-button {
      width: 38px;
      height: 38px;
      padding: 0;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #69766f;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      -webkit-tap-highlight-color: transparent;
    }

    .notification-close-button:active {
      background: #f1f4f2;
    }

    .notification-close-button svg {
      width: 20px;
      height: 20px;
    }

    .notification-item {
      padding: 15px 14px;
    }

    .notification-icon-wrapper {
      width: 40px;
      height: 40px;
      flex-basis: 40px;
    }

    .notification-item-title {
      font-size: 14px;
    }

    .notification-message {
      font-size: 12.5px;
    }

    .notification-action-button {
      min-height: 40px;
      flex: 1;
      padding: 9px 12px;
    }
  }

  @media (max-width: 430px) {
    .notification-panel {
      top: calc(env(safe-area-inset-top, 0px) + 62px);
      right: 4px;
      bottom: max(4px, env(safe-area-inset-bottom, 4px));
      left: 4px;
      border-radius: 14px;
    }

    .notification-panel-header {
      padding: 14px;
    }

    .notification-panel-header-main {
      gap: 8px;
    }

    .notification-panel-title {
      font-size: 16px;
    }

    .notification-mark-all-button {
      font-size: 11px;
    }

    .notification-item-content {
      gap: 10px;
    }

    .notification-item {
      padding: 14px 12px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .notification-panel,
    .notification-mobile-backdrop,
    .notification-skeleton-icon,
    .notification-skeleton-line {
      animation: none;
    }

    .notification-bell-button,
    .notification-item,
    .notification-action-button {
      transition: none;
    }
  }
`;

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
