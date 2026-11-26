# Feature Specification: #54 Implement feature user logout

**Card:** https://trello.com/c/y6qqh1Bh/54-implement-feature-user-logout
**List (status):** In Progress
**Labels:** Backend, Phase 3, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-26 (GMT+7, Asia/Saigon)

---

## Description

## Overview

Let a signed-in user end their current session. The backend revokes the session and clears the auth cookies; the frontend calls the endpoint, clears client state and returns to the sign-in screen.

## User Value

Users can sign out safely, especially on shared devices. A logged-out session can no longer be used to call the API, even if its cookie was copied.

## Scope

- Backend: `POST /auth/logout` endpoint
- Backend: end the current session in DB (`endedAt = now`, `endReason = 'logout'`)
- Backend: clear the session cookie and CSRF cookie in the response
- Frontend: Logout action in the user menu
- Frontend: clear user state / query cache and redirect to Sign in

## Business Rules

- Logout ends only the current session; other devices stay signed in (logout-all is out of scope)
- Endpoint requires a valid session and CSRF token (`SessionGuard` + `CsrfGuard`)
- Session cookie is `httpOnly`, so only the server can clear it
- Idempotent: calling logout on an already-ended session still returns 204
- A request with a session ended by logout returns 401 (not SESSION_ENDED), as already handled by `SessionGuard`
- Frontend clears local state even if the logout request fails due to network errors

---

## Acceptance Criteria

### 1. Backend

- [ ] Given a signed-in user, When `POST /auth/logout`, Then response is 204, session has `endedAt` set and `endReason = 'logout'`
- [ ] Given logout succeeded, Then response clears session and CSRF cookies
- [ ] Given a logged-out session cookie, When calling any protected API, Then response is 401
- [ ] Given a missing/invalid CSRF token, When `POST /auth/logout`, Then request is rejected
- [ ] Given an already-ended session, When `POST /auth/logout`, Then response is 204
- [ ] Unit tests cover the session-ending logic

### 2. Frontend

- [ ] Given a signed-in user, When clicking Logout, Then the app calls the endpoint and redirects to Sign in
- [ ] Given logout, Then cached user data is cleared and Back does not show protected pages
- [ ] Given the logout request fails, Then client state is still cleared and user lands on Sign in

---

## Checklists

None

## Comments

None

## Attachments / Links

None
