from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Text, JSON, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    role = Column(String, default="student")  # 'admin', 'moderator', 'user'
    preferred_language = Column(String(2), nullable=False, default="sq")
    bio = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    profile_picture = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    verification_code = Column(String, nullable=True)
    verification_expires = Column(DateTime, nullable=True)
    marketing_emails = Column(Boolean, default=False)
    reset_token = Column(String, nullable=True)
    is_banned = Column(Boolean, default=False)
    banned_at = Column(DateTime, nullable=True)
    ban_reason = Column(String, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)
    trial_used_at = Column(DateTime, nullable=True)
    trial_expires_at = Column(DateTime, nullable=True)
    subscription_plan = Column(String(20), default="free", nullable=False)
    subscription_expires_at = Column(DateTime, nullable=True)
    # Session tracking fields
    last_login = Column(DateTime, nullable=True)
    login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    problems = relationship("Problem", back_populates="author")
    comments = relationship("Comment", back_populates="author")
    votes = relationship("Vote", back_populates="user")
    bookmarks = relationship("Bookmark", back_populates="user")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower")
    followers = relationship("Follow", foreign_keys="Follow.following_id", back_populates="following")
    notifications = relationship("Notification", back_populates="user")
    notification_preferences = relationship("NotificationPreferences", back_populates="user", uselist=False)
    sent_invitations = relationship("ForumInvitation", foreign_keys="ForumInvitation.inviter_id", back_populates="inviter")
    received_invitations = relationship("ForumInvitation", foreign_keys="ForumInvitation.invitee_id", back_populates="invitee")
    forum_join_requests = relationship("ForumJoinRequest", back_populates="user")
    drafts = relationship("Draft", back_populates="author")
    password_reset_tokens = relationship("PasswordResetToken", back_populates="user")

class Problem(Base):
    __tablename__ = "problems"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    tags = Column(String)
    subject = Column(String, nullable=False)
    level = Column(String, default="Any Level")
    year = Column(Integer, nullable=True)
    view_count = Column(Integer, default=0)
    author_id = Column(Integer, ForeignKey("users.id"))
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=True)  # Link to forum if posted in forum
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="problems")
    forum = relationship("Forum", back_populates="problems")
    comments = relationship("Comment", back_populates="problem")
    votes = relationship("Vote", back_populates="problem")
    bookmarks = relationship("Bookmark", back_populates="problem")
    images = relationship("ProblemImage", back_populates="problem")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    parent_comment_id = Column(Integer, ForeignKey("comments.id"), nullable=True)
    is_solution = Column(Boolean, default=False)
    images = Column(JSON, nullable=True)  # Store array of image URLs
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    author = relationship("User", back_populates="comments")
    problem = relationship("Problem", back_populates="comments")
    parent_comment = relationship("Comment", remote_side=[id], backref="replies")

class Vote(Base):
    __tablename__ = "votes"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uix_user_problem"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    vote_type = Column(String, nullable=False)
    user = relationship("User", back_populates="votes")
    problem = relationship("Problem", back_populates="votes")

class Bookmark(Base):
    __tablename__ = "bookmarks"
    __table_args__ = (UniqueConstraint("user_id", "problem_id", name="uix_user_problem_bookmark"),)
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    problem_id = Column(Integer, ForeignKey("problems.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="bookmarks")
    problem = relationship("Problem", back_populates="bookmarks")

class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uix_follower_following"),)
    id = Column(Integer, primary_key=True, index=True)
    follower_id = Column(Integer, ForeignKey("users.id"))  # User who is following
    following_id = Column(Integer, ForeignKey("users.id"))  # User being followed
    created_at = Column(DateTime, default=datetime.utcnow)
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following = relationship("User", foreign_keys=[following_id], back_populates="followers")

class ProblemImage(Base):
    __tablename__ = "problem_images"
    id = Column(Integer, primary_key=True, index=True)
    problem_id = Column(Integer, ForeignKey("problems.id"))
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    problem = relationship("Problem", back_populates="images")

class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    email_likes = Column(Boolean, default=True)
    email_comments = Column(Boolean, default=True)
    email_follows = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    # Forum notification preferences
    email_forum_invitations = Column(Boolean, default=True)
    email_forum_join_requests = Column(Boolean, default=True)
    email_forum_deleted = Column(Boolean, default=True)
    in_app_likes = Column(Boolean, default=True)
    in_app_comments = Column(Boolean, default=True)
    in_app_follows = Column(Boolean, default=True)
    # Forum in-app notifications (invitations and join requests are always on)
    in_app_forum_deleted = Column(Boolean, default=True)
    # Removed push notification preferences
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notification_preferences")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    type = Column(String, nullable=False)  # 'like', 'comment', 'follow', etc.
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    data = Column(JSON, nullable=True)  # Additional data for notifications
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    user = relationship("User", back_populates="notifications")

# Forum Models
class Forum(Base):
    __tablename__ = "forums"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_private = Column(Boolean, default=False)
    max_members = Column(Integer, default=100)
    # Badge fields
    subject = Column(String, nullable=True)  # Primary subject badge
    level = Column(String, nullable=True)    # Level badge
    tags = Column(String, nullable=True)    # Up to 5 tags as comma-separated string
    is_approved = Column(Boolean, default=True)  # Forum approval status
    required_plan = Column(String(20), nullable=False, default="basic")
    created_at = Column(DateTime, default=datetime.utcnow)
    last_activity = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User", foreign_keys=[creator_id])
    members = relationship("ForumMembership", back_populates="forum")
    problems = relationship("Problem", back_populates="forum")
    invitations = relationship("ForumInvitation", back_populates="forum")
    join_requests = relationship("ForumJoinRequest", back_populates="forum")

class ForumMembership(Base):
    __tablename__ = "forum_memberships"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="member")  # 'creator', 'moderator', 'member'
    joined_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_banned = Column(Boolean, default=False)  # Temporarily commented out until migration is applied
    
    # Relationships
    forum = relationship("Forum", back_populates="members")
    user = relationship("User")
    
    # Unique constraint to prevent duplicate memberships
    __table_args__ = (UniqueConstraint('forum_id', 'user_id', name='unique_forum_membership'),)

class ForumMessage(Base):
    __tablename__ = "forum_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message_type = Column(String, default="text")  # 'text', 'problem', 'system', 'file'
    content = Column(String, nullable=False)  # For text messages
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=True)  # For problem messages
    
    # File attachment fields
    attachment_url = Column(String, nullable=True)  # Cloudinary URL for uploaded files
    attachment_type = Column(String, nullable=True)  # 'pdf', 'docx', 'xlsx', 'image'
    attachment_name = Column(String, nullable=True)  # Original filename for display
    
    created_at = Column(DateTime, default=datetime.utcnow)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime, nullable=True)
    is_pinned = Column(Boolean, default=False)
    
    # Relationships
    forum = relationship("Forum")
    author = relationship("User", foreign_keys=[author_id])
    problem = relationship("Problem", foreign_keys=[problem_id])

class ForumInvitation(Base):
    __tablename__ = "forum_invitations"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    invitee_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted, declined, expired
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Relationships
    forum = relationship("Forum", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id], back_populates="sent_invitations")
    invitee = relationship("User", foreign_keys=[invitee_id], back_populates="received_invitations")

class ForumJoinRequest(Base):
    __tablename__ = "forum_join_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String, default="pending")  # pending, accepted, declined
    created_at = Column(DateTime, default=datetime.utcnow)
    responded_at = Column(DateTime, nullable=True)
    response_message = Column(Text, nullable=True)
    
    # Relationships
    forum = relationship("Forum", back_populates="join_requests")
    user = relationship("User", back_populates="forum_join_requests")

class Draft(Base):
    __tablename__ = "drafts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    subject = Column(String, nullable=False)
    level = Column(String, default="Any Level")
    year = Column(Integer, nullable=True)
    tags = Column(String, nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    author = relationship("User", back_populates="drafts")

class UserOnlineStatus(Base):
    __tablename__ = "user_online_status"
    
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), primary_key=True)
    last_heartbeat = Column(DateTime, default=datetime.utcnow)
    is_online = Column(Boolean, default=True)
    is_typing = Column(Boolean, default=False)
    last_typing = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User")
    forum = relationship("Forum")

class ForumReply(Base):
    __tablename__ = "forum_replies"
    
    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    parent_message_id = Column(Integer, ForeignKey("forum_messages.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
    
    # Relationships
    author = relationship("User")
    forum = relationship("Forum")
    parent_message = relationship("ForumMessage")

# Admin Models
class AdminAction(Base):
    __tablename__ = "admin_actions"
    
    id = Column(Integer, primary_key=True, index=True)
    admin_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action_type = Column(String, nullable=False)  # 'suspend_user', 'delete_forum', 'send_email', etc.
    target_id = Column(Integer, nullable=True)  # ID of affected resource
    target_type = Column(String, nullable=True)  # 'user', 'forum', 'problem', etc.
    details = Column(Text, nullable=True)  # Additional details about the action
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = relationship("User")

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"
    
    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    target_audience = Column(String, nullable=False)  # 'all', 'admins', 'moderators', 'users', 'specific'
    target_user_ids = Column(JSON, nullable=True)  # For specific users
    status = Column(String, default="draft")  # 'draft', 'sent', 'scheduled', 'failed'
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    sent_at = Column(DateTime, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    recipient_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    creator = relationship("User")

class SiteReport(Base):
    __tablename__ = "site_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_type = Column(String, nullable=False)  # 'user', 'forum', 'problem', 'comment', 'message'
    target_id = Column(Integer, nullable=False)  # ID of reported content
    reason = Column(String, nullable=False)  # 'spam', 'inappropriate', 'harassment', etc.
    description = Column(Text, nullable=True)
    status = Column(String, default="pending")  # 'pending', 'under_review', 'resolved', 'dismissed'
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Who is handling the report
    investigation_notes = Column(Text, nullable=True)  # Notes from investigation
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    resolution = Column(Text, nullable=True)
    email_sent = Column(Boolean, default=False)  # Whether email was sent to reporter
    email_content = Column(Text, nullable=True)  # Content of email sent
    email_sent_at = Column(DateTime, nullable=True)  # When email was sent
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    reporter = relationship("User", foreign_keys=[reporter_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    assignee = relationship("User", foreign_keys=[assigned_to])

class UserModerationHistory(Base):
    __tablename__ = "user_moderation_history"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who was moderated
    moderator_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Admin/mod who took action
    action_type = Column(String, nullable=False)  # 'warn', 'ban', 'unban', 'deactivate', 'activate', 'time_ban'
    reason = Column(Text, nullable=False)  # Reason for the action
    duration = Column(Integer, nullable=True)  # Duration in days for time-limited bans
    report_id = Column(Integer, ForeignKey("site_reports.id"), nullable=True)  # Related report if any
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    moderator = relationship("User", foreign_keys=[moderator_id])
    report = relationship("SiteReport")

class SystemSettings(Base):
    __tablename__ = "system_settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False)
    value = Column(Text, nullable=True)
    description = Column(String, nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    updater = relationship("User")

class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)

    user = relationship("User", back_populates="password_reset_tokens")

# Phase 1: paid access, explicitly claimed trials and administrative finance.
class UserSession(Base):
    __tablename__ = "user_sessions"
    id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    last_activity_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

class PaymentSubmission(Base):
    __tablename__ = "payment_submissions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan = Column(String(20), nullable=False)
    months = Column(Integer, nullable=False)
    amount_all = Column(Integer, nullable=False)
    receipt_public_id = Column(String, nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_note = Column(Text, nullable=True)

class TeacherSubject(Base):
    __tablename__ = "teacher_subjects"
    __table_args__ = (UniqueConstraint("teacher_id", "subject", name="uq_teacher_subject"),)
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(100), nullable=False)

class TutoringRequest(Base):
    __tablename__ = "tutoring_requests"
    id = Column(Integer, primary_key=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject = Column(String(100), nullable=False)
    message = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    admin_note = Column(Text, nullable=True)

class LearningResource(Base):
    __tablename__ = "learning_resources"
    id = Column(Integer, primary_key=True)
    kind = Column(String(20), nullable=False)
    title = Column(String(250), nullable=False)
    subject = Column(String(100), nullable=False, default="")
    body = Column(Text, nullable=False, default="")
    scheduled_at = Column(DateTime, nullable=True)

class MonthlyExpense(Base):
    __tablename__ = "monthly_expenses"
    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=False, default="")
    amount_all = Column(Integer, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

class AnnualReportDelivery(Base):
    __tablename__ = "annual_report_deliveries"
    year = Column(Integer, primary_key=True)
    sent_at = Column(DateTime, nullable=True)
    status = Column(String(20), nullable=False, default="pending")


# Phase 2: Weekly competition, scheduled coursework and protected library.
class WeeklyChallenge(Base):
    __tablename__ = "weekly_challenges"
    id = Column(Integer, primary_key=True)
    # The Monday local calendar date, unique even across daylight saving changes.
    week_date = Column(String(10), nullable=False, unique=True)
    problem_id = Column(Integer, ForeignKey("problems.id"), nullable=False)
    starts_at = Column(DateTime, nullable=False)
    closes_at = Column(DateTime, nullable=False)
    official_solution = Column(Text, nullable=False, default="")
    status = Column(String(20), nullable=False, default="scheduled")
    published_at = Column(DateTime, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

class WeeklySubmission(Base):
    __tablename__ = "weekly_submissions"
    __table_args__ = (UniqueConstraint("challenge_id", "student_id", name="uq_weekly_student"),)
    id = Column(Integer, primary_key=True)
    challenge_id = Column(Integer, ForeignKey("weekly_challenges.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    answer_text = Column(Text, nullable=False, default="")
    file_key = Column(String(250), nullable=True)
    status = Column(String(20), nullable=False, default="pending")
    review_note = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class CourseItem(Base):
    __tablename__ = "course_items"
    id = Column(Integer, primary_key=True)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=True)
    kind = Column(String(20), nullable=False)  # material, homework, test
    title = Column(String(250), nullable=False)
    subject = Column(String(100), nullable=False)
    instructions = Column(Text, nullable=False, default="")
    body = Column(Text, nullable=False)
    published_at = Column(DateTime, nullable=False)
    due_at = Column(DateTime, nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)

class CourseAttempt(Base):
    __tablename__ = "course_attempts"
    __table_args__ = (UniqueConstraint("item_id", "student_id", name="uq_attempt_per_student_item"),)
    id = Column(Integer, primary_key=True)
    item_id = Column(Integer, ForeignKey("course_items.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime, nullable=True)
    answers = Column(Text, nullable=False, default="")
    score = Column(Integer, nullable=True)
    feedback = Column(Text, nullable=True)
    graded_at = Column(DateTime, nullable=True)

class LibraryDocument(Base):
    __tablename__ = "library_documents"
    id = Column(Integer, primary_key=True)
    title = Column(String(250), nullable=False)
    category = Column(String(30), nullable=False)
    subject = Column(String(100), nullable=False)
    level = Column(String(30), nullable=False)
    olympiad = Column(String(100), nullable=True)
    year = Column(Integer, nullable=True)
    storage_key = Column(String(250), nullable=False)
    page_count = Column(Integer, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class TeacherApplication(Base):
    __tablename__ = "teacher_applications"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    first_name = Column(String(90), nullable=False)
    last_name = Column(String(90), nullable=False)
    birth_date = Column(Date, nullable=False)
    bio = Column(Text, nullable=False)
    subject = Column(String(100), nullable=False)
    id_photo_key = Column(String(250), nullable=False)
    portrait_key = Column(String(250), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"))
    reviewed_at = Column(DateTime)
    review_note = Column(Text)

class TeacherForumAssignment(Base):
    __tablename__ = "teacher_forum_assignments"
    __table_args__ = (UniqueConstraint("teacher_id","forum_id",name="uq_teacher_forum"),)
    id = Column(Integer, primary_key=True)
    teacher_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    forum_id = Column(Integer, ForeignKey("forums.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class EmailTemplate(Base):
    __tablename__ = "email_templates"
    id = Column(Integer, primary_key=True)
    key = Column(String(80), nullable=False, unique=True)
    subject_sq = Column(String(250), nullable=False)
    subject_en = Column(String(250), nullable=False)
    body_sq = Column(Text, nullable=False)
    body_en = Column(Text, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    updated_by = Column(Integer, ForeignKey("users.id"))

class EmailDeliveryLog(Base):
    __tablename__ = "email_delivery_logs"
    id = Column(Integer, primary_key=True)
    template_key = Column(String(80), nullable=False)
    recipient_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), nullable=False)
    error_code = Column(String(60))
    sent_at = Column(DateTime)

class ParentStudentLink(Base):
    __tablename__ = "parent_student_links"
    __table_args__ = (UniqueConstraint("parent_id","student_id",name="uq_parent_student"),)
    id = Column(Integer, primary_key=True)
    parent_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"))

class SupportTicket(Base):
    __tablename__ = "support_tickets"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(120), nullable=False)
    email = Column(String(254), nullable=False)
    category = Column(String(50), nullable=False)
    subject = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    status = Column(String(20), default="open", nullable=False)
    admin_response = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)

class FaqEntry(Base):
    __tablename__ = "faq_entries"
    id = Column(Integer, primary_key=True)
    category = Column(String(60), nullable=False)
    question_sq = Column(String(300), nullable=False)
    answer_sq = Column(Text, nullable=False)
    question_en = Column(String(300), nullable=False)
    answer_en = Column(Text, nullable=False)
    position = Column(Integer, default=0, nullable=False)
    active = Column(Boolean, default=True, nullable=False)

class SiteContentBlock(Base):
    __tablename__ = "site_content_blocks"
    key = Column(String(100), primary_key=True)
    title_sq = Column(String(250), nullable=False)
    title_en = Column(String(250), nullable=False)
    subtitle_sq = Column(Text, nullable=False)
    subtitle_en = Column(Text, nullable=False)
    image_url = Column(Text)
    button_url = Column(String(500))
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ContentEventDelivery(Base):
    __tablename__="content_event_deliveries"
    __table_args__=(UniqueConstraint("event_key","recipient_user_id",name="uq_content_event_user"),)
    id=Column(Integer,primary_key=True)
    event_key=Column(String(150),nullable=False)
    recipient_user_id=Column(Integer,ForeignKey("users.id"),nullable=False)
    created_at=Column(DateTime,default=datetime.utcnow,nullable=False)
