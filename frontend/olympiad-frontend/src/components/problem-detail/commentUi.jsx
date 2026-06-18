import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";
import { getUserInitial } from "../../utils";

export const ui = {
  primary: "#1a4d3a",
  primaryDark: "#103829",
  primarySoft: "#edf7f2",
  primaryBorder: "#cae8d7",
  purple: "rgb(118, 75, 162)",
  purpleDark: "rgb(91, 57, 128)",
  purpleSoft: "#f5effa",
  purpleBorder: "#e7d8f2",
  text: "#17202a",
  muted: "#64748b",
  faint: "#94a3b8",
  border: "#e2e8f0",
  card: "#ffffff",
  page: "#f7faf8",
  danger: "#dc2626",
  dangerSoft: "#fee2e2",
  shadowSm: "0 1px 2px rgba(15, 23, 42, 0.04)",
  shadowMd: "0 6px 18px rgba(15, 23, 42, 0.05)",
  shadowLg: "0 10px 30px rgba(15, 23, 42, 0.06)",
};

export const buttonBase = {
  border: "none",
  cursor: "pointer",
  borderRadius: "999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontWeight: 850,
  transition: "all 0.2s ease",
  fontFamily: "inherit",
};

export const renderMathContent = (text) => {
  if (!text) return "";

  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);

  return parts.map((part, index) => {
    if (part.startsWith("$$") && part.endsWith("$$")) {
      const content = part.slice(2, -2);

      return (
        <div key={index} style={{ textAlign: "left", margin: "12px 0" }}>
          <BlockMath math={content} />
        </div>
      );
    }

    if (part.startsWith("$") && part.endsWith("$")) {
      const content = part.slice(1, -1);
      return <InlineMath key={index} math={content} />;
    }

    return <span key={index}>{part}</span>;
  });
};

export const formatDate = (dateValue) => {
  if (!dateValue) return "Unknown date";

  try {
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
};

export const isEdited = (createdAt, updatedAt) => {
  if (!createdAt || !updatedAt) return false;
  return new Date(updatedAt).getTime() > new Date(createdAt).getTime();
};

export const ModernButton = ({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "soft",
  style = {},
}) => {
  const variants = {
    soft: {
      backgroundColor: "#f8fafc",
      color: ui.text,
      border: `1px solid ${ui.border}`,
      boxShadow: "none",
    },
    green: {
      backgroundColor: ui.primary,
      color: "white",
      border: `1px solid ${ui.primary}`,
      boxShadow: "0 2px 6px rgba(26, 77, 58, 0.14)",
    },
    purple: {
      backgroundColor: ui.purple,
      color: "white",
      border: `1px solid ${ui.purple}`,
      boxShadow: "0 2px 6px rgba(118, 75, 162, 0.14)",
    },
    danger: {
      backgroundColor: ui.danger,
      color: "white",
      border: `1px solid ${ui.danger}`,
      boxShadow: "0 2px 6px rgba(220, 38, 38, 0.12)",
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...buttonBase,
        padding: "10px 15px",
        fontSize: "13px",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...variants[variant],
        ...style,
      }}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(event) => {
        if (disabled) return;
        event.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {children}
    </button>
  );
};

export const UserAvatar = ({ user, size = 42, onClick }) => {
  const hasImage = !!user?.profile_picture;

  return (
    <div
      onClick={onClick}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "50%",
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: ui.primary,
        backgroundImage: hasImage ? `url(${user.profile_picture})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
        fontSize: `${Math.max(11, size * 0.38)}px`,
        fontWeight: 950,
        cursor: onClick ? "pointer" : "default",
        border: "3px solid white",
        outline: `1px solid ${ui.border}`,
        boxShadow: "0 1px 3px rgba(26, 77, 58, 0.10)",
      }}
    >
      {!hasImage && getUserInitial(user?.username || "U")}
    </div>
  );
};

export const Pill = ({ children, bg, color, borderColor }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "7px 12px",
      borderRadius: "999px",
      backgroundColor: bg,
      color,
      border: borderColor ? `1px solid ${borderColor}` : "none",
      fontSize: "12px",
      fontWeight: 900,
      boxShadow: ui.shadowSm,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

export const MiniAction = ({ children, onClick, tone = "default" }) => {
  const tones = {
    default: { color: ui.muted, bg: "transparent" },
    green: { color: ui.primary, bg: ui.primarySoft },
    purple: { color: ui.purple, bg: ui.purpleSoft },
    danger: { color: ui.danger, bg: "transparent" },
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "none",
        backgroundColor: tones[tone].bg,
        color: tones[tone].color,
        cursor: "pointer",
        fontSize: "13px",
        fontWeight: 850,
        padding: "8px 10px",
        borderRadius: "999px",
        transition: "all 0.2s ease",
      }}
    >
      {children}
    </button>
  );
};
