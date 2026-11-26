# Feature Specification: #22 Implement feature Profile and Account Settings

**Card:** https://trello.com/c/j51SdTvw/22-implement-feature-profile-and-account-settings
**List (status):** In Progress
**Labels:** Feature, Phase 3, Backend, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-26 (GMT+7)

---

## Description

# Profile and Account Settings

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Display and edit user profile information
- Manage account security settings
- Handle password changes
- Track active sessions

## Business Rules

- Users can edit full name (at least 1 non-space character required)
- Default avatar shows user initials
- Users can upload profile photo
- Password change requires current password verification
- Password must meet strength requirements
- Password change signs out other sessions
- Google sign-in status shown but not modifiable
- Active sessions can be listed and individually signed out

---

## Clarifications

### Session 2026-11-26

- Q: Should this card implement the full behaviour of the parent spec `../specs/018-profile-account-settings/spec.md` and screen `../docs/ui-pipeline/screens/WEB-17-profile-account-settings.md`, or only what the card lists? → A: Full 018 / WEB-17. Its user stories, acceptance scenarios, FR-001…FR-017, edge cases and messages are in scope for this card (including `Sign out of all other sessions`, the JPG/PNG/WebP up to 5 MB photo rule, the same-password error, the 15-minute lockout after 5 wrong current passwords, the error banner and the "Password updated" toast), except FR-016 as changed below.
- Q: What happens when this session is signed out elsewhere while Profile is open? → A: It is detected on the next API request (401 / `SESSION_ENDED`) and handled by the existing auth guard: the person goes to `/signin?notice=signed-out` and lands on Home after signing in. There is no real-time channel on Profile and no return to the Profile address (`?next` was dropped in 0657ed6); this replaces 018 FR-016 / decision #105 for this card.
- Q: What does a session row show when the user agent is missing or not recognised? → A: "Unknown device" (proposed); a partly recognised agent shows the known part (e.g. "Chrome" or "Windows"). (Asked during `/speckit-plan`.)
- Q: Who refuses a new password equal to the current one? → A: Both. The client disables `Change password` and shows the inline error as soon as the two fields match; the backend also refuses it (after the current password is verified) with 400 `NEW_PASSWORD_SAME_AS_CURRENT` (proposed code name), shown with the same inline error.
- Q: Does the header show the avatar? → A: Yes. The header account button shows the avatar (photo or initials) next to the name, and it updates right after a photo is uploaded or removed and after a name change.
- Q: Does the page keep the `Home` link at the bottom (018 FR-012, mockup)? → A: No. The header logo already opens Home (WEB-03), so the bottom `Home` link is removed.
- Q: Where does the success toast ("Password updated") show? → A: Top center of the screen (instead of the mockup's bottom right).
- Q: Does the 15-minute change-password lock survive a page reload? → A: Yes. The backend returns the lock end time (`changePasswordLockedUntil` in `GET /users/me`, `details.lockedUntil` in the 429 body; proposed names) and the page keeps `Change password` disabled with the "Too many attempts. Try again in 15 minutes." error until that time, also after a reload.

---

## Acceptance Criteria

### 1. Edit profile information

- [ ] **Given** user opens Profile settings, **When** they view their information, **Then** name, email, and avatar are displayed.
- [ ] **Given** profile editing enabled, **When** user changes their name, **Then** changes are saved and reflected immediately.

### 2. Manage account security

- [ ] **Given** account has a password, **When** user opens password section, **Then** current password field appears.
- [ ] **Given** current password verified, **When** user enters new password meeting requirements, **Then** password is updated and other sessions are signed out.

### 3. Manage active sessions

- [ ] **Given** user views active sessions, **When** they see the list, **Then** each session shows device/browser info and last active time.

### 4. From clarifications

- [ ] All acceptance scenarios of `../specs/018-profile-account-settings/spec.md` (User Stories 1–4) pass, except US4 scenario 6.
- [ ] **Given** this session was signed out elsewhere while Profile is open, **When** the next API request returns 401 / `SESSION_ENDED`, **Then** the person is sent to `/signin?notice=signed-out` and unsaved changes are lost.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
