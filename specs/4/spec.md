# Feature Specification: #4 Implement feature User Sign In

**Card:** https://trello.com/c/MQpsqnSQ/4-implement-feature-user-sign-in
**List (status):** In Progress
**Labels:** Feature, Frontend, Backend, Phase 3, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-23 14:30 (Asia/Saigon)

---

## Description

# User Sign In

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Sign in with email and password
- Sign in with Google
- Email format check
- Navigate to related screens
- Show/hide password

## Business Rules

- The system MUST offer two sign-in methods on one screen: Google and email + password
- The system MUST accept any email address with a valid format, for both email + password and Google sign-in, with no company-domain restriction
- The system MUST show the invalid-email error inline under the Email field in red
- The Sign in button MUST be disabled until both fields are valid, and disabled when the screen first opens
- While signing in, the system MUST replace the button label with a spinner and lock the inputs
- The system MUST show the same "Email or password is incorrect." banner (no red input border) whether or not the account exists
- The system MUST NOT apply password-strength rules or hints at sign-in
- The system MUST send a verified user to WEB-03 after a successful sign-in by either method

---

## Acceptance Criteria

### 1. Sign in with email and password (P1)

- [ ] **Given** the sign-in screen is freshly opened, **When** the user views it, **Then** the Sign in button is disabled.
- [ ] **Given** both fields hold valid values, **When** the user taps Sign in, **Then** the button shows a spinner, inputs are locked, and on success the user goes to WEB-03.
- [ ] **Given** the email and password do not match an account, **When** the user taps Sign in, **Then** a banner "Email or password is incorrect." appears, neither the Email nor the Password input gets a red border, and the text is identical whether or not the account exists.
- [ ] **Given** the account's email is not yet verified, **When** the user signs in with correct credentials, **Then** no error is shown and the user goes to WEB-16.
- [ ] **Given** the account is deactivated and the email and password are correct, **When** the user signs in, **Then** a banner shows "This account has been deactivated. Contact your administrator." - If the password is wrong, the generic "Email or password is incorrect." is shown instead.
- [ ] **Given** the user has entered a wrong password 5 times in a row for the same email (proposed), **When** they try again within 15 minutes (proposed), **Then** the banner "Too many attempts. Try again in 15 minutes." (proposed) is shown and the attempt is not counted, whether or not the account exists.
- [ ] **Given** the sign-in is locked, **When** the person sets a new password with a reset link, **Then** the lock is lifted and they can sign in with the new password.

### 2. Sign in with Google (P1)

- [ ] **Given** the sign-in screen, **When** the user taps `Continue with Google`, **Then** the button shows a loading state while redirecting.
- [ ] **Given** a Google email that already has a password account, **When** the user signs in with Google, **Then** no message is shown and both methods merge into one account.
- [ ] **Given** a successful Google sign-in, **When** it completes, **Then** the user goes to WEB-03.
- [ ] **Given** the user closes the Google window or declines access, **When** they return, **Then** the sign-in screen is in its Default state with no message.
- [ ] **Given** Google itself fails during sign-in, **When** the user returns, **Then** a banner shows "Google sign-in failed. Try again." (proposed).

### 3. Email format check (P1)

- [ ] **Given** the user enters an email that is not a valid email format, **When** the field is validated, **Then** a red inline error "Enter a valid email address." (proposed) appears under the Email field.
- [ ] **Given** the email field has that error, **When** the user views Sign in, **Then** it stays disabled.
- [ ] **Given** the user signs in with a Google account of any domain, **When** Google returns, **Then** the domain does not matter and sign-in continues as for any other account.

### 4. Navigate to related screens (P2)

- [ ] **Given** the sign-in screen, **When** the user taps `Forgot your password?`, **Then** they go to WEB-14.
- [ ] **Given** the sign-in screen, **When** the user taps `Create an account`, **Then** they go to WEB-02.
- [ ] **Given** the user arrives after setting a new password (from WEB-15), **When** the screen opens, **Then** an info notice "Password updated. Sign in with your new password." is shown.
- [ ] **Given** the session ended without the person logging out (signed out of all sessions by an admin, password changed elsewhere, or session expired), **When** the sign-in screen opens, **Then** an info notice "You were signed out. Sign in again." (proposed) is shown; after a normal log out no notice is shown.

### 5. Show/hide password (P3)

- [ ] **Given** a masked password, **When** the user taps the eye button, **Then** the password becomes visible, and tapping again masks it.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
