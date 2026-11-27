# Data Model: #23 Create Board

Client-side shapes only; `BoardTile` already exists in `src/features/workspaces/api.ts`.

| Entity | Client shape | Rules |
| --- | --- | --- |
| Create request | `{ name: string; visibility: 'workspace' \| 'private' }` | `name` trimmed, ≥1 non-space character, no max, may repeat (decision #118); `visibility` default `'workspace'` (decision #3) |
| Board (response) | `BoardTile` (`id`, `name`, `workspaceId`, `visibility`, …) | creator is board admin; no lists; access for others from visibility + workspace role (backend #23) |
| Workspace (context) | `WorkspaceTile` (`id`, `name`, `role`) | tile and dialog only when `role === 'admin'`; name shown read-only |

## Dialog states (WEB-D01)

| State | Trigger | UI |
| --- | --- | --- |
| Default | tile clicked | empty `Board title`, focused; workspace name read-only; `Workspace` checked; `Create` disabled |
| Valid | title with a non-space character | `Create` enabled |
| Blank title | cleared or spaces only after typing | "Enter a board title." under the field, red border; `Create` disabled |
| Processing | `Create` / `Enter` | spinner, hidden label "Creating board"; field read-only, radios disabled, `Cancel` disabled; Esc and outside click ignored |
| Failed | request error (incl. 404 no longer admin / archived) | banner "Something went wrong. Try again."; title and visibility kept; `Create` enabled |
| Closed | Cancel, Esc, outside click, success | values and banner discarded; success → `/b/:id` |
