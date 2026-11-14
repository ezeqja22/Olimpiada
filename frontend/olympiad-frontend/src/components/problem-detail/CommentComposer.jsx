import React from "react";
import { Link } from "react-router-dom";
import ImageUpload from "../ImageUpload";
import "./CommentComposer.css";

export default function CommentComposer({ onSubmit, currentUser, editCommentRef, newComment, setNewComment, commentImages, setCommentImages, imageResetKey, openCommentMathEditor, openImageModal, commentImageUrls }) {
  const isDisabled = !newComment.trim() && commentImages.length === 0;
  return (
    <form className="discussion-composer" onSubmit={onSubmit}>
      <div className="discussion-composer__identity">
        <label htmlFor="problem-discussion-text">Add to the discussion</label>
        {currentUser && <Link to="/profile">{currentUser.username}</Link>}
      </div>
      <div className="discussion-composer__writing">
        <textarea id="problem-discussion-text" ref={editCommentRef} value={newComment} onChange={event => setNewComment(event.target.value)} placeholder="Write a solution idea, question, or comment..." />
        {commentImages.length > 0 && <div className="discussion-composer__images">
          {commentImages.map((image, index) => <div key={image.id || index}>
            <button type="button" onClick={() => openImageModal(index, commentImageUrls)} aria-label={`Open attachment ${index + 1}`}><img src={image.preview || image.cloudinaryUrl} alt={image.name || `Comment image ${index + 1}`} /></button>
            <button type="button" className="discussion-composer__remove" aria-label={`Remove attachment ${index + 1}`} onClick={() => setCommentImages(previous => previous.filter((_, position) => position !== index))}>Remove</button>
          </div>)}
        </div>}
        <div className="discussion-composer__toolbar">
          <div className="discussion-composer__tools">
            <button type="button" onClick={openCommentMathEditor}>∑ Symbols</button>
            <ImageUpload images={commentImages} onImagesChange={setCommentImages} maxImages={5} resetTrigger={imageResetKey} variant="compact" showHelper={false} />
          </div>
          <button type="submit" disabled={isDisabled}>Send <span aria-hidden="true">→</span></button>
        </div>
      </div>
    </form>
  );
}
