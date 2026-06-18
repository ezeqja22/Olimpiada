import React from "react";
import { buttonBase, MiniAction, ui } from "./commentUi";

function CommentActions({
  comment,
  canEdit,
  canMarkSolution,
  isMobile,
  isReplying,
  onToggleReply,
  onReport,
  onEdit,
  onDelete,
  onMarkAsSolution,
}) {
  return (
    <div
      style={{
        marginTop: "16px",
        paddingTop: "13px",
        borderTop: `1px solid ${ui.border}`,
        display: "flex",
        gap: "6px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <MiniAction tone={isReplying ? "green" : "default"} onClick={onToggleReply}>
        Reply
      </MiniAction>

      <MiniAction tone="danger" onClick={onReport}>
        Report
      </MiniAction>

      {canEdit && (
        <>
          <MiniAction onClick={onEdit}>Edit</MiniAction>

          <MiniAction tone="danger" onClick={onDelete}>
            Delete
          </MiniAction>
        </>
      )}

      {canMarkSolution && (
        <button
          type="button"
          onClick={onMarkAsSolution}
          style={{
            ...buttonBase,
            marginLeft: isMobile ? 0 : "auto",
            padding: "8px 12px",
            fontSize: "12px",
            backgroundColor: comment.is_solution ? "#fff7ed" : ui.primarySoft,
            color: comment.is_solution ? "#9a3412" : ui.primary,
            border: comment.is_solution
              ? "1px solid #fed7aa"
              : `1px solid ${ui.primaryBorder}`,
          }}
        >
          {comment.is_solution ? "Unmark Solution" : "Mark Solution"}
        </button>
      )}
    </div>
  );
}

export default CommentActions;
