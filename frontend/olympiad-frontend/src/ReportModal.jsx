/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import axios from "axios";
import { useFeatureSettings } from "./hooks/useFeatureSettings";
import { useToast } from "./components/ToastProvider";

const ReportModal = ({ isOpen, onClose, reportType, targetId, targetUser }) => {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feature settings
  const { checkFeatureEnabled, showFeatureDisabledAlert } =
    useFeatureSettings();
  const { showToast } = useToast();

  const reportCategories = [
    {
      value: "harassment",
      label: "Harassment - Bullying, threats, personal attacks",
    },
    { value: "spam", label: "Spam - Repetitive, unwanted content" },
    {
      value: "inappropriate",
      label: "Inappropriate Content - NSFW, offensive material",
    },
    {
      value: "copyright",
      label: "Copyright Violation - Plagiarism, stolen content",
    },
    { value: "fake", label: "Fake Information - Misleading or false content" },
    { value: "other", label: "Other - Miscellaneous violations" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!category || !description.trim()) {
      showToast("Please select a category and provide a description", "error");
      return;
    }

    // Check if reports are enabled
    if (!checkFeatureEnabled("reports_enabled")) {
      showFeatureDisabledAlert("Reports");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const reportData = {
        category,
        description: description.trim(),
      };

      let endpoint = "";
      let data = {};

      if (reportType === "comment") {
        endpoint = `/reports/comment`;
        data = { comment_id: targetId, ...reportData };
      } else if (reportType === "message") {
        endpoint = `/reports/message`;
        data = { message_id: targetId, ...reportData };
      } else if (reportType === "user") {
        endpoint = `/reports/user`;
        data = { user_id: targetId, ...reportData };
      }

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://127.0.0.1:8000"}/auth${endpoint}`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      showToast(
        "Report submitted successfully! We will review it and contact you via email if further action is needed.",
        "success",
      );
      onClose();
      setCategory("");
      setDescription("");
    } catch (error) {
      console.error("Error submitting report:", error);
      console.error("Error response:", error.response?.data);
      console.error("Error status:", error.response?.status);
      showToast(
        `Failed to submit report: ${error.response?.data?.detail || error.message}. Please try again.`,
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "32px",
          width: "520px",
          maxWidth: "90vw",
          maxHeight: "90vh",
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          animation: "slideUp 0.3s ease-out",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <h2
            style={{
              fontSize: "24px",
              fontWeight: "700",
              color: "#111827",
              margin: 0,
            }}
          >
            Report{" "}
            {reportType === "user"
              ? "User"
              : reportType === "comment"
                ? "Comment"
                : "Message"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              color: "#9ca3af",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f3f4f6";
              e.target.style.color = "#6b7280";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.color = "#9ca3af";
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div
          style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: "8px" }}
        >
          {targetUser && (
            <div
              style={{
                backgroundColor: "#f8fafc",
                padding: "16px",
                borderRadius: "12px",
                marginBottom: "24px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontWeight: "600",
                    fontSize: "16px",
                  }}
                >
                  {targetUser.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#374151",
                      marginBottom: "2px",
                    }}
                  >
                    Reporting
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      color: "#6b7280",
                    }}
                  >
                    {targetUser.username}
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#374151",
                }}
              >
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  backgroundColor: "#f9fafb",
                  cursor: "pointer",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#dc2626";
                  e.target.style.backgroundColor = "white";
                  e.target.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.backgroundColor = "#f9fafb";
                  e.target.style.boxShadow = "none";
                }}
                required
              >
                <option value="">Select a category</option>
                {reportCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "8px",
                  color: "#374151",
                }}
              >
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide details about why you're reporting this content..."
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  border: "2px solid #e5e7eb",
                  borderRadius: "10px",
                  fontSize: "16px",
                  outline: "none",
                  minHeight: "120px",
                  resize: "vertical",
                  fontFamily: "inherit",
                  transition: "all 0.2s ease",
                  backgroundColor: "#f9fafb",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#dc2626";
                  e.target.style.backgroundColor = "white";
                  e.target.style.boxShadow = "0 0 0 3px rgba(220, 38, 38, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e5e7eb";
                  e.target.style.backgroundColor = "#f9fafb";
                  e.target.style.boxShadow = "none";
                }}
                required
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "flex-end",
            paddingTop: "20px",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: "transparent",
              color: "#6b7280",
              border: "2px solid #d1d5db",
              padding: "12px 24px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "#f9fafb";
              e.target.style.borderColor = "#9ca3af";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "transparent";
              e.target.style.borderColor = "#d1d5db";
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: isSubmitting ? "#9ca3af" : "#dc2626",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "10px",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "600",
              transition: "all 0.2s ease",
              boxShadow: isSubmitting
                ? "none"
                : "0 4px 12px rgba(220, 38, 38, 0.3)",
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = "#b91c1c";
                e.target.style.transform = "translateY(-1px)";
                e.target.style.boxShadow = "0 6px 16px rgba(220, 38, 38, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.target.style.backgroundColor = "#dc2626";
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 12px rgba(220, 38, 38, 0.3)";
              }
            }}
          >
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ReportModal;
