# Contract used: Auth password reset

Source: `../agi-board-backend-18/specs/18/contracts/` and its code (uncommitted, 2026-11-25). Errors are `{ error: { code, message, details } }`; branch on `code`. All are POST with the CSRF header and need no session.

| Request                                      | Success                                             | Errors                                                                               |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `/auth/forgot-password` `{ email }`          | 200 `{ sent: true }`, the same for every email      | 400 `VALIDATION_FAILED`; 403 `CSRF_INVALID`                                          |
| `/auth/reset-password/check` `{ token }`     | 200 `{ email }`; the link is not used up            | 400 `RESET_LINK_INVALID`; 403 `CSRF_INVALID`                                         |
| `/auth/reset-password` `{ token, password }` | 200 `{ next: "sign-in" }`; all account sessions end | 400 `RESET_LINK_INVALID`, `VALIDATION_FAILED` (link stays valid); 403 `CSRF_INVALID` |

- A repeat within 60 seconds also answers 200 and sends nothing.
- Emailed link: `<APP_ORIGIN>/reset-password#token=<base64url token>`.
