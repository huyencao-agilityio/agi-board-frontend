# Feature Specification: #33 Implement feature Create Workspace

**Card:** https://trello.com/c/J9rSAEws/33-implement-feature-create-workspace
**List (status):** In Progress
**Labels:** Phase 3, Backend, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-27 (GMT+7)

---

## Description

# Create Workspace

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Trigger create workspace dialog
- Enter workspace name
- Create and initialize the workspace
- Handle errors and validation

## Business Rules

- The create workspace dialog MUST be accessible from the home page only (not the account menu; see Clarifications)
- The dialog MUST require a workspace name (non-empty, trimmed)
- The workspace name MUST be 1–100 characters after trimming; over 100 shows "Use 100 characters or fewer." and keeps Create disabled (decision #379; see Clarifications)
- Workspaces have no visibility option; only boards have visibility (BRD; see Clarifications)
- Duplicate workspace names MUST be allowed
- Creating a workspace MUST make the creator the workspace admin
- The new workspace MUST start empty (no boards, no members except creator)
- Processing MUST show a spinner and lock fields

---

## Clarifications

### Session 2026-11-27

- Q: Does creating a workspace offer a visibility option (open to all accounts / restricted)? → A: No. The BRD defines visibility for boards only; the dialog asks for the name only and the API body stays `{ name }`.
- Q: Is the workspace name length limited (the card said no maximum)? → A: Yes, 1–100 characters after trimming (decision #379, matches the backend); over 100 shows the inline error "Use 100 characters or fewer." and keeps `Create` disabled.
- Q: Is `Create workspace` also offered in the account menu, or only on Home? → A: Only on Home (the button next to the heading, in every state including the empty message); no account menu item.

---

## Acceptance Criteria

### 1. Trigger create workspace dialog

- [ ] **Given** a user on the home page, **When** they click "Create workspace", **Then** the create dialog opens.
- [ ] **Given** the dialog, **Then** the name field is focused and empty, ready for input.

### 2. Enter workspace name

- [ ] **Given** the create dialog, **When** the user types a workspace name, **Then** the name is entered and validated.
- [ ] **Given** a name over 100 characters after trimming, **Then** the inline error "Use 100 characters or fewer." shows and Create stays disabled; 100 characters is accepted.
- [ ] **Given** a valid name, **When** the user clicks Create, **Then** the workspace is created.

### 3. No workspace visibility

- [ ] **Given** the create dialog, **Then** it offers no visibility option (only the workspace name).

### 4. Create and initialize workspace

- [ ] **Given** a valid name, **When** Create is clicked, **Then** the workspace is created and opens.
- [ ] **Given** the new workspace, **Then** it shows empty with the creator as admin, ready to add boards and members.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
