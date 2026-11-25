# Feature Specification: #5 Implement feature User Sign Up

**Card:** https://trello.com/c/LakksQ9T/5-implement-feature-user-sign-up
**List (status):** In Progress
**Labels:** Feature, Backend, Phase 3, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-25 12:13 (Asia/Saigon)

---

## Description

# User Sign Up

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Create account with email and password
- Email verification with code
- Password validation and security rules
- Google sign-up integration
- Full name input and validation

## Business Rules

- The system MUST require a valid email format for sign-up
- The system MUST enforce password requirements (8+ characters, 1 letter, 1 number, no email prefix)
- Email verification MUST use a 6-digit code valid for 10 minutes
- Maximum 5 wrong verification attempts allowed
- Code resend allowed after 60 seconds
- Google sign-up MUST skip email verification
- Sign-up with a password for an email that already has an account (verified, Google-only or deactivated) is refused with "An account with this email already exists. Sign in instead."; an account whose email is not verified yet may sign up again (BRD §1)
- System MUST require full name (at least 1 non-space character)

## Acceptance Criteria

### 1. Sign up with email and password

- **Given** the sign-up screen is displayed, **When** the user enters invalid email format, **Then** an inline error appears and Sign up button stays disabled.

- **Given** the user enters a valid email and weak password, **When** the password is validated, **Then** error messages show which requirements are missing.

- **Given** the user enters all valid fields including full name, **When** the user taps Sign up, **Then** the button shows a spinner and they are sent to the email verification screen.

- **Given** the email already has a verified or Google account, **When** the user tries to sign up with it and a password, **Then** they see "An account with this email already exists. Sign in instead.".

### 2. Email verification

- **Given** the user is on the verification screen after sign-up, **When** they enter the 6-digit code, **Then** the account is verified and they proceed to the main app.

- **Given** the user enters an incorrect code 5 times, **When** they try a 6th time, **Then** the screen blocks further attempts and directs them to request a new code.

- **Given** the user has not received a code, **When** they tap Resend code after 60 seconds, **Then** a new code is sent.

### 3. Google sign-up

- **Given** the sign-up screen, **When** the user taps Continue with Google, **Then** they are redirected to Google authentication.

- **Given** the user completes Google authentication, **When** they return, **Then** the account is created and they proceed to the main app without email verification.

### 4. Password security

- **Given** the user enters their email prefix in the password field, **When** validation runs, **Then** an error appears saying the password cannot contain the email prefix.

- **Given** the user enters a password with fewer than 8 characters, **When** validation runs, **Then** an error appears.

---

## Acceptance Criteria

### 1. Sign up with email and password

- [ ] **Given** the sign-up screen is displayed, **When** the user enters invalid email format, **Then** an inline error appears and Sign up button stays disabled.

- [ ] **Given** the user enters a valid email and weak password, **When** the password is validated, **Then** error messages show which requirements are missing.

- [ ] **Given** the user enters all valid fields including full name, **When** the user taps Sign up, **Then** the button shows a spinner and they are sent to the email verification screen.

- [ ] **Given** the email already has a verified or Google account, **When** the user tries to sign up with it and a password, **Then** they see "An account with this email already exists. Sign in instead.".

### 2. Email verification

- [ ] **Given** the user is on the verification screen after sign-up, **When** they enter the 6-digit code, **Then** the account is verified and they proceed to the main app.

- [ ] **Given** the user enters an incorrect code 5 times, **When** they try a 6th time, **Then** the screen blocks further attempts and directs them to request a new code.

- [ ] **Given** the user has not received a code, **When** they tap Resend code after 60 seconds, **Then** a new code is sent.

### 3. Google sign-up

- [ ] **Given** the sign-up screen, **When** the user taps Continue with Google, **Then** they are redirected to Google authentication.

- [ ] **Given** the user completes Google authentication, **When** they return, **Then** the account is created and they proceed to the main app without email verification.

### 4. Password security

- [ ] **Given** the user enters their email prefix in the password field, **When** validation runs, **Then** an error appears saying the password cannot contain the email prefix.

- [ ] **Given** the user enters a password with fewer than 8 characters, **When** validation runs, **Then** an error appears.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
