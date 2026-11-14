import React, { useState } from 'react';
import ImageUpload from '../ImageUpload';
import { getDisplayName } from '../../utils';
import { formatDate, isEdited, renderMathContent } from './commentUi';
import './DiscussionEntry.css';

export default function CommentThread(props) {
  const { comment, currentUser, problem, onOpenAuthor, onEditComment, onDeleteComment,
    onMarkAsSolution, replyingTo, setReplyingTo, replyText, setReplyText, replyImages,
    setReplyImages, onSubmitReply, onReportComment, setCurrentImageIndex, setModalImages,
    setShowImageModal, editingCommentId, editText, setEditText, onSaveEdit, onCancelEdit,
    depth = 0 } = props;
  const [showReplies, setShowReplies] = useState(true);
  const staff = ['admin', 'moderator'].includes((currentUser?.role || '').toLowerCase());
  const canEdit = Boolean(currentUser && (String(currentUser.id) === String(comment.author_id) || staff));
  const canMarkSolution = Boolean(currentUser && problem && (String(currentUser.id) === String(problem.author_id) || staff));
  const openImage = index => { setModalImages(comment.images || []); setCurrentImageIndex(index); setShowImageModal(true); };
  const cancelReply = () => { setReplyingTo(null); setReplyText(''); setReplyImages([]); };

  return <div className={`discussion-entry${depth > 0 ? ' discussion-entry-nested' : ''}`}>
    <article className={comment.is_solution ? 'discussion-entry-solution' : ''}>
      <header className="discussion-entry-heading">
        <button type="button" className="discussion-entry-author" onClick={() => onOpenAuthor(comment.author)}>
          {comment.author?.profile_picture && <img src={comment.author.profile_picture} alt="" />}
          {getDisplayName(comment.author?.username) || 'Unknown User'}
        </button>
        <div className="discussion-entry-meta"><time dateTime={comment.created_at}>{formatDate(comment.created_at)}</time>{isEdited(comment.created_at, comment.updated_at) && <span>Edited</span>}{comment.is_solution && <strong>✓ Accepted Solution</strong>}</div>
      </header>
      {editingCommentId === comment.id ? <div className="discussion-entry-editor">
        <label htmlFor={`edit-comment-${comment.id}`}>Edit comment</label><textarea id={`edit-comment-${comment.id}`} value={editText} onChange={e=>setEditText(e.target.value)} autoFocus rows={4} />
        <div className="discussion-entry-buttons"><button onClick={onCancelEdit}>Cancel</button><button className="discussion-entry-primary" onClick={()=>onSaveEdit(comment.id)}>Save Changes</button></div>
      </div> : <div className="discussion-entry-body">{renderMathContent(comment.text)}</div>}
      {!!comment.images?.length && <div className="discussion-entry-images">{comment.images.map((url,index)=><button type="button" key={`${url}-${index}`} onClick={()=>openImage(index)}><img src={url} alt={`Comment image ${index+1}`} loading="lazy"/></button>)}</div>}
      <div className="discussion-entry-actions">
        <button type="button" aria-expanded={replyingTo===comment.id} onClick={()=>setReplyingTo(replyingTo===comment.id?null:comment.id)}>Reply</button>
        <button type="button" onClick={()=>onReportComment(comment)}>Report</button>
        {canEdit && <><button type="button" onClick={()=>onEditComment(comment)}>Edit</button><button type="button" className="discussion-entry-danger" onClick={()=>onDeleteComment(comment.id)}>Delete</button></>}
        {canMarkSolution && <button type="button" className="discussion-entry-solution-action" onClick={()=>onMarkAsSolution(comment.id)}>{comment.is_solution?'Unmark Solution':'Mark Solution'}</button>}
      </div>
      {replyingTo===comment.id && <div className="discussion-entry-editor">
        <label htmlFor={`reply-comment-${comment.id}`}>Your reply</label><textarea id={`reply-comment-${comment.id}`} value={replyText} onChange={e=>setReplyText(e.target.value)} placeholder="Write a reply..." rows={3}/>
        <ImageUpload images={replyImages} onImagesChange={setReplyImages} maxImages={5} variant="compact" showHelper={false}/>
        <div className="discussion-entry-buttons"><button onClick={cancelReply}>Cancel</button><button className="discussion-entry-primary" onClick={()=>onSubmitReply(comment.id)} disabled={!replyText.trim()&&replyImages.length===0}>Send Reply</button></div>
      </div>}
    </article>
    {!!comment.replies?.length && depth<3 && <div className="discussion-entry-children">
      <button className="discussion-entry-toggle" type="button" aria-expanded={showReplies} onClick={()=>setShowReplies(value=>!value)}>{showReplies?'Hide':'Show'} {comment.replies.length} {comment.replies.length===1?'reply':'replies'}</button>
      {showReplies && comment.replies.map(reply=><CommentThread {...props} key={reply.id} comment={reply} depth={depth+1}/>)}
    </div>}
  </div>;
}
