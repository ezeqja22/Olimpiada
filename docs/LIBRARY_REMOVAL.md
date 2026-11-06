# Release scope: no library

The library catalogue, PDF reader/watermarking, book uploads, admin page and
homepage/navigation sections have been removed. The public and /core library APIs
return 404. Old /library and /library/:id bookmarks redirect to Explore; the former
admin library URL redirects to content management.

No SQL migration is required. Existing library_documents rows, files and historical
migrations are preserved. The ORM mapping is retained solely to keep schema metadata
compatible; no application endpoint queries it. No production changes were applied.

The remaining private object-storage helpers live in backend/private_storage.py.
Weekly solution attachments, teacher application documents and branding still use
them. Removing the library does NOT remove their need for persistent private storage.
The PDF-rendering dependency is no longer needed or installed.

Deploy backend and frontend from this commit together. Reverting this commit and
redeploying both restores the library; no database rollback is needed. Existing
custom CMS text may still refer to a library and can be edited separately.

This document supersedes library-related deployment steps in older phase/staging
notes and in NO_SUBSCRIPTIONS_RELEASE.md. Courses, homework and tests remain.
