# Feature Specification: #23 Implement feature Create Board

**Card:** https://trello.com/c/zGMzmLuO/23-implement-feature-create-board
**List (status):** In Progress
**Labels:** Feature, Phase 3, Backend, Frontend, Sprint 1
**Members:** Huyen Cao
**Due:** —
**Pulled:** 2026-11-27 (GMT+7)

---

## Clarifications

### Session 2026-11-27

- Q: Where does the dialog open from (the card names a "workspace dropdown" that does not exist)? → A: The admin-only `Create new board` tile of a workspace on Home (WEB-03) and Workspace boards (WEB-04), per `../specs/019-create-board` FR-001/FR-011 and decision #59.
- Q: Field label: `Name` (card) or `Board title` (019 / WEB-D01)? → A: `Board title`, blank error "Enter a board title." (proposed).
- Q: Can the workspace be chosen in the dialog? → A: No. The workspace is shown read-only (decision #59); "Choose visibility and workspace" means visibility only (same answer as backend card #23).
- Q: Tooltip wording for `Visibility`? → A: (proposed) `Private`: "Only board members can see this board." · `Workspace`: "All members of the workspace can see this board."
- Not on the card, taken from 019 / WEB-D01: close actions ignored while Processing (decision #120); failure banner "Something went wrong. Try again." (proposed) keeps the entered values (decision #119); "Creating board" screen-reader label on the spinner.

---

## Description

# Create Board

## Overview

Support the following user scenarios and functional requirements:

## User Value

Implement core functionality to support user workflows and system requirements.

## Scope

- Trigger create board dialog
- Enter board name
- Choose visibility and workspace
- Create and open the board

## Business Rules

- The dialog MUST open from the `Create board` button in the workspace dropdown and MUST show the title `Create board`, a `Name` field, a `Visibility` section and the buttons `Cancel` (default) and `Create`
- `Name` MUST require at least one non-space character, with no maximum length, and MUST be trimmed of leading and trailing spaces before saving; `Create` MUST be disabled until the name is valid
- `Visibility` MUST show `Workspace` (default) and `Private`; hovering MUST show tooltips explaining the difference
- `Create` MUST show a spinner while processing and lock all fields
- Creating a new board MUST create a workspace board with the chosen name, the current person as admin, all workspace members as members with the default permissions, an initially empty board without built-in template columns, and move the person to the new board
- `Cancel`, `Esc` and clicking outside MUST close the dialog without creating anything and return to the workspace view

---

## Acceptance Criteria

### 1. Enter board name

- [ ] **Given** the dialog just opened, **Then** `Name` is empty and `Create` is disabled.
- [ ] **Given** a valid name (at least 1 non-space character), **Then** `Create` is enabled; **When** clicked, **Then** only a spinner shows in the button, all fields are locked while processing.

### 2. Create and open the board

- [ ] **Given** the name is valid, **Then** a new board is created with that name, the person is an admin, all workspace members are members (with default permissions), and the board opens.
- [ ] **Given** the new board opens, **Then** it shows the board header, navigation, and an empty state (proposed) with no built-in template columns.

### 3. Choose visibility

- [ ] **Given** the dialog, **Then** `Visibility` shows `Workspace` selected and `Private` unselected.
- [ ] **Given** a private board in the workspace, **Then** only the board admin and the person who created it can open it.

### 4. Cancel without creating

- [ ] **Given** the dialog, **When** the person clicks `Cancel`, **Then** it closes, nothing is created and they stay in the workspace view.
- [ ] **Given** the dialog, **When** they press `Esc` or click outside it, **Then** it closes the same way.

---

## Checklists

None

## Comments

None

## Attachments / Links

None
