# Data Model: #33 Create Workspace

No change. The client sends and reads the types already in `src/features/workspaces/api.ts`.

| Entity | Client shape | Rules |
|---|---|---|
| Create request | `{ name: string }` | trimmed, line breaks → spaces, 1–100 characters; may repeat; no visibility (spec Clarifications) |
| Workspace (response) | `WorkspaceTile` (`id`, `name`, `role: 'admin'`, `boards: []`, …) | creator is the only admin; starts with no boards |

## Dialog states (WEB-D16)

| State | Trigger | UI |
|---|---|---|
| Default | opened | empty field, focused; `Create` disabled; no error |
| Valid | name with a non-space character, ≤100 | `Create` enabled |
| Blank name | cleared or spaces only after typing | "Enter a workspace name."; `Create` disabled |
| Name too long | >100 after trim | "Use 100 characters or fewer."; `Create` disabled |
| Processing | `Create` / `Enter` | spinner, hidden label "Creating workspace"; field read-only; `Cancel` disabled; Esc, outside click, Back ignored |
| Failed | request error | banner "Something went wrong. Try again."; name kept; `Create` enabled; banner clears on edit |
| Closed | Cancel, Esc, outside click, Back, success | text and banner discarded; success → `/w/:id` |
