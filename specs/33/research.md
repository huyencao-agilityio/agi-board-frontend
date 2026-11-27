# Research: #33 Create Workspace

## R1. What is already built (gap analysis)

- **Decision**: Reuse `CreateWorkspaceDialog` from #6; change only what spec 029 still misses.
- **Rationale**: Compared each 029 FR with the code and `HomePage.test.tsx`:

| 029 requirement                                               | State                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| FR-001/002 Home entry, title, field, buttons                  | Done (button in every state)                                                                |
| FR-003/004/005 blank and >100 errors, trim, repeats allowed   | Done + tested                                                                               |
| FR-006/014 create, open `/w/:id`, no toast                    | Done + tested                                                                               |
| FR-007 Cancel / Esc / outside click                           | Done (Radix); Esc tested only while processing                                              |
| FR-008 spinner, lock, ignore Esc; one request on double click | Done (submit disabled while pending); double click not tested                               |
| FR-009/015 banner, cleared on edit/reopen                     | Done + tested                                                                               |
| FR-012 session ended → WEB-01                                 | Done globally (`MutationCache` `SESSION_ENDED`); not tested for this dialog                 |
| FR-016 focus in field, trapped, returned to trigger; `Enter`  | Done (Radix + `autoFocus`); return focus and blank `Enter` not tested                       |
| FR-017 line breaks → spaces                                   | Done; not tested                                                                            |
| FR-018 spinner text alternative "Creating workspace"          | **Gap**: hidden label is "Create"                                                           |
| FR-019 long names one line with "…" + tooltip                 | Done (`truncate` + `title` on Home, sidebar, WEB-04)                                        |
| FR-020 Back closes only the dialog; reload without it         | **Gap**                                                                                     |
| FR-021 order A–Z                                              | Done (`byName`)                                                                             |
| FR-015 other tabs, real-time                                  | Out of scope (#6 R7); TanStack refetch on window focus refreshes Home when the tab is shown |
| 029 AS1.8 `Create new board` tile on WEB-04                   | Belongs to WEB-D01 / card Create board, not this card                                       |

- **Alternatives considered**: Rebuilding the dialog from the card text: rejected, it would duplicate tested code.

## R2. Back button closes only the dialog

- **Decision**: On open, push a router entry with the same URL and `state: { createWorkspace: true }` (`navigate('.', { state })`); keep `open` in local state. A `useLocation` effect closes the dialog when that state disappears (Back). While processing, Back re-pushes the entry so the dialog stays (029 AS3.11). Cancel / Esc / outside click call `navigate(-1)` to drop the entry. Success navigates to `/w/:id` with `replace: true`, so Back from WEB-04 returns to Home, not to an open dialog.
- **Rationale**: Uses react-router's own history (no raw `history.pushState` that bypasses the router's index). Local `open` means a reload never reopens the dialog even though `history.state` survives reload.
- **Alternatives considered**: `?create=1` in the URL: a reload would reopen it, against FR-020. Raw `popstate` listener: fights the data router. Doing nothing: fails FR-020.

## R3. Spinner text alternative

- **Decision**: While pending the button renders `<Spinner />` + `<span className="sr-only">Creating workspace</span>`, as `InviteList` ("Accepting invite") and `ResetPasswordPage` do.
- **Rationale**: Text from 029 US5 AS5 / WEB-D16 (proposed); matches the house pattern.
