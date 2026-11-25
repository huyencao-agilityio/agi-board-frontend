# Feature Specification: #18 Implement feature Forgot Password

**Card:** https://trello.com/c/VAr8qzqj/18-implement-feature-forgot-password
**List (status):** In Progress
**Labels:** Feature, Backend, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-25 15:08 (Asia/Saigon)

---

## Description

# Forgot Password

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Password reset request form
- Password reset link validation
- New password entry and validation
- Password reset confirmation and sign-in

## Business Rules

- Reset link valid for 30 minutes only
- Reset link is single-use (requesting new link voids old one)
- Password must meet strength requirements (8+ chars, 1 letter, 1 number)
- Password cannot contain email prefix
- Email verification not required after reset
- Google-only accounts cannot request password reset
- Successful reset signs out all existing sessions
- Generic error messages for security (don't reveal if email exists)

---

## Acceptance Criteria

### 1. Request password reset

- [ ] **Given** the sign-in page, **When** the user clicks Forgot password, **Then** WEB-14 opens with email field.

- [ ] **Given** valid email entered, **When** the user submits, **Then** reset email is sent and confirmation message appears.

### 2. Validate reset link and set new password

- [ ] **Given** a user receives password reset email, **When** they click the link, **Then** WEB-15 opens with new password form.

- [ ] **Given** the reset form, **When** the user enters a valid password, **Then** Submit button becomes enabled and password strength is shown.

### 3. Complete password reset

- [ ] **Given** a valid password entered and form submitted, **When** reset processes successfully, **Then** all sessions are signed out and user returns to sign-in screen with confirmation message.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
