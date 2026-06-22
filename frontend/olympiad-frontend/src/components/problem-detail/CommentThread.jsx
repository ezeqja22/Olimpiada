/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useEffect, useState } from "react";
import ImageUpload from "../ImageUpload";
import { getDisplayName } from "../../utils";
import CommentActions from "./CommentActions";
import {
  formatDate,
  isEdited,
  ModernButton,
  Pill,
  renderMathContent,
  ui,
  UserAvatar,
} from "./commentUi";

function CommentThread({
  comment,
  currentUser,
  problem,
  onOpenAuthor,
  onEditComment,
  onDeleteComment,
  onMarkAsSolution,
  replyingTo,
  setReplyingTo,
  replyText,
  setReplyText,
  replyImages,
  setReplyImages,
  onSubmitReply,
  onReportComment,
  setCurrentImageIndex,
  setModalImages,
  setShowImageModal,
  editingCommentId,
  editText,
  setEditText,
  onSaveEdit,
  onCancelEdit,
  depth = 0,
}) {
  const maxDepth = 3;
  const [showReplies, setShowReplies] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const isNested = depth > 0;
  const currentUserRole = (currentUser?.role || "").toLowerCase();

  const isStaff =
    currentUserRole === "admin" || currentUserRole === "moderator";

  const isCommentAuthor =
    currentUser && String(currentUser.id) === String(comment.author_id);

  const isProblemAuthor =
    currentUser &&
    problem &&
    String(currentUser.id) === String(problem.author_id);

  const canEdit = Boolean(currentUser && (isCommentAuthor || isStaff));

  const canMarkSolution = Boolean(
    currentUser && problem && (isProblemAuthor || isStaff),
  );

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const openCommentImage = (index) => {
    setModalImages(comment.images || []);
    setCurrentImageIndex(index);
    setShowImageModal(true);
  };

  const closeReplyBox = () => {
    setReplyingTo(null);
    setReplyText("");
    setReplyImages([]);
  };

  return (
    <div
      style={{
        position: "relative",
        marginLeft: isNested ? (isMobile ? "12px" : "36px") : 0,
        paddingLeft: isNested ? (isMobile ? "12px" : "14px") : 0,
        marginBottom: "16px",
      }}
    >
      {isNested && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "4px",
            bottom: "4px",
            width: "3px",
            borderRadius: "999px",
            background:
              "linear-gradient(180deg, rgba(26,77,58,0.35), rgba(118,75,162,0.18))",
          }}
        />
      )}

      <article
        style={{
          position: "relative",
          overflow: "hidden",
          backgroundColor: ui.card,
          border: `1px solid ${
            comment.is_solution ? ui.primaryBorder : ui.border
          }`,
          borderLeft: comment.is_solution
            ? `4px solid ${ui.primary}`
            : `1px solid ${ui.border}`,
          borderRadius: isNested ? "14px" : "16px",
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.05)",
        }}
      >
        <div
          style={{
            height: "0px",
            background: comment.is_solution
              ? `linear-gradient(90deg, ${ui.primary}, #22c55e)`
              : `linear-gradient(90deg, ${ui.primary}, ${ui.purple})`,
            opacity: comment.is_solution ? 1 : 0.65,
          }}
        />

        <div style={{ padding: isMobile ? "15px" : "19px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "13px",
            }}
          >
            <UserAvatar
              user={comment.author}
              size={isMobile ? 36 : 44}
              onClick={() => onOpenAuthor(comment.author)}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "14px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  marginBottom: "8px",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => onOpenAuthor(comment.author)}
                    style={{
                      border: "none",
                      backgroundColor: "transparent",
                      padding: 0,
                      margin: 0,
                      color: ui.primary,
                      fontSize: isMobile ? "14px" : "15px",
                      fontWeight: 950,
                      letterSpacing: "-0.01em",
                      cursor: "pointer",
                    }}
                  >
                    {getDisplayName(comment.author?.username) || "Unknown User"}
                  </button>

                  <div
                    style={{
                      marginTop: "3px",
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                      alignItems: "center",
                      color: ui.muted,
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    <span>{formatDate(comment.created_at)}</span>

                    {isEdited(comment.created_at, comment.updated_at) && (
                      <span>Edited</span>
                    )}

                    {isNested && (
                      <span
                        style={{
                          backgroundColor: ui.purpleSoft,
                          color: ui.purple,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: 900,
                        }}
                      >
                        Reply
                      </span>
                    )}
                  </div>
                </div>

                {comment.is_solution && (
                  <Pill bg={ui.primary} color="white">
                    ✓ Accepted Solution
                  </Pill>
                )}
              </div>

              {editingCommentId === comment.id ? (
                <div
                  style={{
                    backgroundColor: "#f8fafc",
                    border: `1px solid ${ui.border}`,
                    borderRadius: "18px",
                    padding: "12px",
                    marginTop: "12px",
                  }}
                >
                  <textarea
                    value={editText}
                    onChange={(event) => setEditText(event.target.value)}
                    autoFocus
                    style={{
                      width: "100%",
                      minHeight: "105px",
                      padding: "13px 14px",
                      borderRadius: "16px",
                      border: `1px solid ${ui.primary}`,
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      lineHeight: 1.6,
                      backgroundColor: "white",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "10px",
                      flexWrap: "wrap",
                    }}
                  >
                    <ModernButton onClick={onCancelEdit}>Cancel</ModernButton>

                    <ModernButton
                      onClick={() => onSaveEdit(comment.id)}
                      variant="green"
                    >
                      Save Changes
                    </ModernButton>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    color: ui.text,
                    lineHeight: 1.75,
                    fontSize: isMobile ? "15px" : "15px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    marginTop: "10px",
                  }}
                >
                  {renderMathContent(comment.text)}
                </div>
              )}

              {comment.images && comment.images.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "repeat(auto-fill, minmax(92px, 1fr))"
                      : "repeat(auto-fill, minmax(118px, 145px))",
                    gap: "10px",
                    marginTop: "15px",
                  }}
                >
                  {comment.images.map((imageUrl, index) => (
                    <button
                      type="button"
                      key={`${imageUrl}-${index}`}
                      onClick={() => openCommentImage(index)}
                      style={{
                        border: `1px solid ${ui.border}`,
                        borderRadius: "18px",
                        padding: 0,
                        overflow: "hidden",
                        height: isMobile ? "92px" : "112px",
                        backgroundColor: "#f8fafc",
                        cursor: "pointer",
                        boxShadow: ui.shadowSm,
                      }}
                    >
                      <img
                        src={imageUrl}
                        alt={`Comment image ${index + 1}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}

              <CommentActions
                comment={comment}
                canEdit={canEdit}
                canMarkSolution={canMarkSolution}
                isMobile={isMobile}
                isReplying={replyingTo === comment.id}
                onToggleReply={() =>
                  setReplyingTo(replyingTo === comment.id ? null : comment.id)
                }
                onReport={() => onReportComment(comment)}
                onEdit={() => onEditComment(comment)}
                onDelete={() => onDeleteComment(comment.id)}
                onMarkAsSolution={() => onMarkAsSolution(comment.id)}
              />

              {replyingTo === comment.id && (
                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    borderRadius: "14px",
                    border: `1px solid ${ui.border}`,
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <textarea
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    placeholder="Write a reply..."
                    style={{
                      width: "100%",
                      minHeight: "82px",
                      padding: "12px 14px",
                      borderRadius: "16px",
                      border: `1px solid ${ui.border}`,
                      resize: "vertical",
                      outline: "none",
                      fontFamily: "inherit",
                      fontSize: "14px",
                      lineHeight: 1.55,
                      backgroundColor: "white",
                    }}
                  />

                  <div style={{ marginTop: "10px" }}>
                    <ImageUpload
                      images={replyImages}
                      onImagesChange={setReplyImages}
                      maxImages={5}
                      variant="compact"
                      showHelper={false}
                    />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: "8px",
                      marginTop: "12px",
                      flexWrap: "wrap",
                    }}
                  >
                    <ModernButton onClick={closeReplyBox}>Cancel</ModernButton>

                    <ModernButton
                      onClick={() => onSubmitReply(comment.id)}
                      disabled={!replyText.trim() && replyImages.length === 0}
                      variant="purple"
                    >
                      Send Reply
                    </ModernButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {comment.replies && comment.replies.length > 0 && depth < maxDepth && (
        <div style={{ marginTop: "10px" }}>
          <button
            type="button"
            onClick={() => setShowReplies((previous) => !previous)}
            style={{
              marginLeft: isNested ? 0 : isMobile ? "47px" : "58px",
              border: `1px solid ${ui.border}`,
              backgroundColor: showReplies ? ui.primarySoft : "#f8fafc",
              color: showReplies ? ui.primary : ui.muted,
              borderRadius: "999px",
              padding: "7px 12px",
              fontSize: "12px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {showReplies ? "Hide" : "Show"} {comment.replies.length}{" "}
            {comment.replies.length === 1 ? "reply" : "replies"}
          </button>

          {showReplies && (
            <div style={{ marginTop: "10px" }}>
              {comment.replies.map((reply) => (
                <CommentThread
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  problem={problem}
                  onOpenAuthor={onOpenAuthor}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onMarkAsSolution={onMarkAsSolution}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyText={replyText}
                  setReplyText={setReplyText}
                  replyImages={replyImages}
                  setReplyImages={setReplyImages}
                  onSubmitReply={onSubmitReply}
                  onReportComment={onReportComment}
                  setCurrentImageIndex={setCurrentImageIndex}
                  setModalImages={setModalImages}
                  setShowImageModal={setShowImageModal}
                  editingCommentId={editingCommentId}
                  editText={editText}
                  setEditText={setEditText}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CommentThread;
