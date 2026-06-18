import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ImageUpload from "../ImageUpload";
import { buttonBase, ModernButton, ui, UserAvatar } from "./commentUi";

function CommentComposer({
  onSubmit,
  currentUser,
  isMobile,
  editCommentRef,
  newComment,
  setNewComment,
  commentImages,
  setCommentImages,
  imageResetKey,
  openCommentMathEditor,
  openImageModal,
  commentImageUrls,
}) {
  const navigate = useNavigate();
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);

  const isDisabled = !newComment.trim() && commentImages.length === 0;

  return (
    <form onSubmit={onSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "12px",
          alignItems: "stretch",
          backgroundColor: "#f8fafc",
          border: `1px solid ${
            isTextareaFocused ? "rgba(26,77,58,0.42)" : ui.border
          }`,
          borderRadius: "16px",
          padding: "12px",
          boxShadow: isTextareaFocused
            ? "0 2px 10px rgba(26, 77, 58, 0.08)"
            : "none",
          transition: "all 0.2s ease",
          marginBottom: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={() => currentUser && navigate("/profile")}
            style={{
              border: `1px solid ${ui.border}`,
              backgroundColor: "white",
              borderRadius: "14px",
              padding: "9px",
              cursor: currentUser ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              boxShadow: ui.shadowSm,
            }}
          >
            <UserAvatar user={currentUser || { username: "User" }} size={34} />

            <span
              style={{
                display: isMobile ? "inline" : "none",
                color: ui.primary,
                fontWeight: 900,
                fontSize: "13px",
                maxWidth: "130px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {currentUser?.username || "User"}
            </span>
          </button>

          <div
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              justifyContent: "flex-start",
            }}
          >
            <ModernButton
              onClick={openCommentMathEditor}
              style={{
                padding: "8px 10px",
                fontSize: "12px",
                backgroundColor: "white",
              }}
            >
              Symbols
            </ModernButton>

            <div
              style={{
                backgroundColor: "white",
                borderRadius: "999px",
                padding: "2px 6px",
                border: `1px solid ${ui.border}`,
              }}
            >
              <ImageUpload
                images={commentImages}
                onImagesChange={setCommentImages}
                maxImages={5}
                resetTrigger={imageResetKey}
                variant="compact"
                showHelper={false}
              />
            </div>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            backgroundColor: "white",
            border: `1px solid ${ui.border}`,
            borderRadius: "14px",
            overflow: "hidden",
          }}
        >
          <textarea
            ref={editCommentRef}
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            onFocus={() => setIsTextareaFocused(true)}
            onBlur={() => setIsTextareaFocused(false)}
            placeholder="Write a solution idea, question, or comment..."
            style={{
              width: "100%",
              minHeight: isMobile ? "110px" : "118px",
              border: "none",
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              fontSize: isMobile ? "16px" : "15px",
              lineHeight: 1.65,
              padding: "16px",
              paddingBottom: commentImages.length > 0 ? "78px" : "16px",
              backgroundColor: "transparent",
              color: ui.text,
            }}
          />

          {commentImages.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: "14px",
                right: "14px",
                bottom: "12px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {commentImages.map((image, index) => (
                <button
                  type="button"
                  key={image.id || index}
                  onClick={() => openImageModal(index, commentImageUrls)}
                  style={{
                    position: "relative",
                    width: "62px",
                    height: "46px",
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: `1px solid ${ui.border}`,
                    padding: 0,
                    cursor: "pointer",
                    backgroundColor: "#f8fafc",
                  }}
                >
                  <img
                    src={image.preview}
                    alt={image.name || `Comment image ${index + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />

                  <span
                    onClick={(event) => {
                      event.stopPropagation();
                      setCommentImages((previous) =>
                        previous.filter((img) => img.id !== image.id),
                      );
                    }}
                    style={{
                      position: "absolute",
                      top: "-5px",
                      right: "-5px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: ui.danger,
                      color: "white",
                      fontSize: "12px",
                      fontWeight: 950,
                      display: "grid",
                      placeItems: "center",
                      border: "2px solid white",
                    }}
                  >
                    ×
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          style={{
            ...buttonBase,
            minWidth: "112px",
            minHeight: "42px",
            padding: "10px 16px",
            justifySelf: "flex-end",
            backgroundColor: ui.purple,
            color: "white",
            boxShadow: "0 2px 6px rgba(118, 75, 162, 0.14)",
            opacity: isDisabled ? 0.55 : 1,
            cursor: isDisabled ? "not-allowed" : "pointer",
          }}
        >
          Send →
        </button>
      </div>
    </form>
  );
}

export default CommentComposer;
