# Feature Specification: #21 Implement feature Invite to Workspace

**Card:** https://trello.com/c/TROWNGKK/21-implement-feature-invite-to-workspace
**List (status):** In Progress
**Labels:** Feature, Phase 3, Backend, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-27 (GMT+7, Asia/Saigon)

---

## Description

# Invite to Workspace

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Send workspace invites with role assignment
- Manage invite expiration and renewal
- Accept or decline workspace invites
- Track invited members

## Business Rules

- Workspace admins can invite people via email
- Invites have expiration (14 days proposed)
- Invitees must sign in with invited email address
- Expired invites can be resent or revoked
- Invites tied to email, not to account
- Multiple invites to same workspace require re-invite
- Invite email sent to target address
- Accepting invite adds member with specified role

---

## Acceptance Criteria

### 1. Send workspace invites

- [ ] **Given** workspace admin opens invite dialog, **When** they enter email and select role, **Then** invite is sent and recipient gets email.
- [ ] **Given** valid email and role selected, **When** admin clicks Send, **Then** invite appears in pending list.

### 2. Manage invites

- [ ] **Given** pending invites exist, **When** workspace admin views Members, **Then** they can resend or revoke each invite.
- [ ] **Given** an expired invite, **When** admin clicks Resend, **Then** expiration resets to 14 days (proposed).

### 3. Accept workspace invite

- [ ] **Given** a user receives workspace invite email, **When** they sign in with that email, **Then** invite appears on home page.
- [ ] **Given** pending invite displayed, **When** user clicks Accept, **Then** they join workspace with specified role.

### 4. Decline invite

- [ ] **Given** a pending workspace invite, **When** user clicks Decline, **Then** invite is removed from their home page.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
